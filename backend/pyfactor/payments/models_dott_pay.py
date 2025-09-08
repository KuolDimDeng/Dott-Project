"""
Dott Pay QR Payment System Models
Revolutionary payment system where consumers have unique QR codes linked to their payment methods
"""
import uuid
import json
import base64
import hashlib
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from custom_auth.tenant_base_model import TenantAwareModel
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

class DottPayProfile(TenantAwareModel):
    """
    Consumer profile for Dott Pay QR payment system
    Each user has a unique QR code that merchants can scan for payment
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dott_pay_profile'
    )
    
    # QR Code data
    qr_code_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    qr_code_version = models.CharField(max_length=10, default='1.0')
    qr_code_encrypted = models.TextField(blank=True, null=True)  # Encrypted QR payload
    
    # Security
    pin_hash = models.CharField(max_length=256, blank=True, null=True)  # Optional PIN for high-value transactions
    biometric_enabled = models.BooleanField(default=False)
    two_factor_required = models.BooleanField(default=False)
    
    # Transaction limits
    daily_limit = models.DecimalField(max_digits=15, decimal_places=2, default=5000.00)
    single_transaction_limit = models.DecimalField(max_digits=15, decimal_places=2, default=1000.00)
    daily_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    daily_spent_reset_at = models.DateTimeField(default=timezone.now)
    
    # Preferences
    default_payment_method = models.ForeignKey(
        'payments.PaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dott_pay_default'
    )
    auto_approve_under = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=50.00,
        help_text="Auto-approve transactions under this amount"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True, null=True)
    
    # Analytics
    total_transactions = models.IntegerField(default=0)
    total_amount_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    last_transaction_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_dott_pay_profile'
        indexes = [
            models.Index(fields=['qr_code_id']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def generate_qr_payload(self):
        """Generate the QR code payload with user information"""
        payload = {
            'userId': str(self.user.id),
            'qrId': str(self.qr_code_id),
            'userEmail': self.user.email,
            'timestamp': int(timezone.now().timestamp() * 1000),
            'version': self.qr_code_version,
            'type': 'DOTT_PAY',
        }
        
        # Base64 encode the JSON payload
        json_str = json.dumps(payload)
        encoded = base64.b64encode(json_str.encode()).decode()
        
        # TODO: Add encryption here for production
        self.qr_code_encrypted = encoded
        self.save()
        
        return encoded
    
    def reset_daily_limit(self):
        """Reset daily spending limit if needed"""
        now = timezone.now()
        if self.daily_spent_reset_at.date() < now.date():
            self.daily_spent = 0
            self.daily_spent_reset_at = now
            self.save()
    
    def can_transact(self, amount):
        """Check if user can make a transaction of given amount"""
        self.reset_daily_limit()
        
        if not self.is_active or self.is_suspended:
            return False, "Dott Pay is not active for this account"
        
        if amount > self.single_transaction_limit:
            return False, f"Amount exceeds single transaction limit of {self.single_transaction_limit}"
        
        if self.daily_spent + amount > self.daily_limit:
            return False, f"Amount would exceed daily limit of {self.daily_limit}"
        
        return True, "Transaction allowed"
    
    def record_transaction(self, amount):
        """Record a successful transaction"""
        self.reset_daily_limit()
        self.daily_spent += amount
        self.total_transactions += 1
        self.total_amount_spent += amount
        self.last_transaction_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"Dott Pay - {self.user.email}"


class DottPayTransaction(TenantAwareModel):
    """
    Record of Dott Pay QR transactions
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_id = models.CharField(max_length=100, unique=True)
    
    # Parties involved
    consumer_profile = models.ForeignKey(
        DottPayProfile,
        on_delete=models.PROTECT,
        related_name='dott_pay_transactions'
    )
    merchant_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='dott_pay_merchant_transactions'
    )
    pos_transaction = models.ForeignKey(
        'sales.POSTransaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dott_pay_transaction'
    )
    
    # Payment details
    payment_method = models.ForeignKey(
        'payments.PaymentMethod',
        on_delete=models.PROTECT,
        related_name='dott_pay_transactions'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Status and processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approval_required = models.BooleanField(default=False)
    approval_code = models.CharField(max_length=10, blank=True, null=True)
    
    # Gateway response
    gateway_response = models.JSONField(default=dict, blank=True)
    gateway_transaction_id = models.CharField(max_length=200, blank=True, null=True)
    
    # Security
    qr_scan_timestamp = models.DateTimeField()
    merchant_location = models.JSONField(default=dict, blank=True)  # GPS coordinates if available
    device_fingerprint = models.CharField(max_length=200, blank=True, null=True)
    
    # Fees
    platform_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    gateway_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_dott_pay_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['consumer_profile', 'status']),
            models.Index(fields=['merchant_user', 'created_at']),
        ]
    
    def calculate_fees(self):
        """Calculate platform and gateway fees"""
        # Platform fee: 0.5% for Dott Pay
        self.platform_fee = self.amount * Decimal('0.005')
        
        # Gateway fee depends on payment method
        if self.payment_method.method_type == 'card':
            # Stripe: 2.9% + $0.30
            self.gateway_fee = (self.amount * Decimal('0.029')) + Decimal('0.30')
        elif self.payment_method.method_type == 'mobile_money':
            # Mobile money: 2%
            self.gateway_fee = self.amount * Decimal('0.02')
        else:
            self.gateway_fee = Decimal('0.00')
        
        self.net_amount = self.amount - self.platform_fee - self.gateway_fee
        
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            # Generate unique transaction ID
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            random_str = str(uuid.uuid4())[:8].upper()
            self.transaction_id = f"DOTT-{timestamp}-{random_str}"
        
        if not self.net_amount:
            self.calculate_fees()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Dott Pay Transaction {self.transaction_id} - {self.amount} {self.currency}"


class DottPaySecurityLog(TenantAwareModel):
    """
    Security audit log for Dott Pay transactions
    """
    EVENT_TYPE_CHOICES = [
        ('qr_scan', 'QR Code Scanned'),
        ('transaction_approved', 'Transaction Approved'),
        ('transaction_declined', 'Transaction Declined'),
        ('pin_failed', 'PIN Verification Failed'),
        ('limit_exceeded', 'Transaction Limit Exceeded'),
        ('suspicious_activity', 'Suspicious Activity Detected'),
        ('profile_updated', 'Profile Settings Updated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        DottPayProfile,
        on_delete=models.CASCADE,
        related_name='security_logs'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    transaction = models.ForeignKey(
        DottPayTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_logs'
    )
    
    # Event details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    location = models.JSONField(default=dict, blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    
    # Additional data
    event_data = models.JSONField(default=dict, blank=True)
    risk_score = models.IntegerField(default=0, help_text="0-100, higher is riskier")
    is_flagged = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_dott_pay_security_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['profile', 'event_type']),
            models.Index(fields=['created_at', 'is_flagged']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.profile.user.email} - {self.created_at}"