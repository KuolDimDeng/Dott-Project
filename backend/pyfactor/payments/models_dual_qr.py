"""
Dual QR System Models - Everyone can Pay AND Receive
Revolutionary system where every user has both Payment and Receive QR codes
"""
import uuid
import json
import base64
import hashlib
from decimal import Decimal
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from custom_auth.tenant_base_model import TenantAwareModel
from users.models import UserProfile
import logging

logger = logging.getLogger(__name__)

class MerchantProfile(TenantAwareModel):
    """
    Every user can be a merchant - Accept payments via Receive QR
    This enables P2P, B2C, and B2B transactions
    """
    MERCHANT_TYPE_CHOICES = [
        ('personal', 'Personal Account'),
        ('business', 'Business Account'),
        ('freelancer', 'Freelancer'),
        ('non_profit', 'Non-Profit'),
        ('government', 'Government'),
    ]
    
    SETTLEMENT_METHOD_CHOICES = [
        ('instant', 'Instant Settlement'),
        ('daily', 'Daily Settlement'),
        ('weekly', 'Weekly Settlement'),
        ('manual', 'Manual Withdrawal'),
    ]
    
    QR_DISPLAY_MODE_CHOICES = [
        ('static', 'Static QR Only'),
        ('dynamic', 'Dynamic QR Only'),
        ('both', 'Both Static & Dynamic'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='merchant_profile'
    )
    
    # Merchant Identity
    merchant_id = models.CharField(max_length=20, unique=True, db_index=True)  # MER_xxxxx
    merchant_name = models.CharField(max_length=100)
    merchant_type = models.CharField(max_length=20, choices=MERCHANT_TYPE_CHOICES, default='personal')
    business_category = models.CharField(max_length=50, blank=True, null=True)
    
    # Receive QR Configuration
    receive_qr_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    static_qr_code = models.TextField(blank=True, null=True)  # Permanent QR data
    static_qr_color = models.CharField(max_length=7, default='#10b981')  # Green for receive
    qr_display_mode = models.CharField(max_length=10, choices=QR_DISPLAY_MODE_CHOICES, default='static')
    
    # Settlement Configuration
    settlement_method = models.CharField(max_length=10, choices=SETTLEMENT_METHOD_CHOICES, default='daily')
    settlement_bank_account = models.ForeignKey(
        'banking.BankAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merchant_settlements'
    )
    settlement_mpesa_number = models.CharField(max_length=20, blank=True, null=True)
    settlement_mtn_number = models.CharField(max_length=20, blank=True, null=True)
    minimum_settlement_amount = models.DecimalField(max_digits=15, decimal_places=2, default=10.00)
    
    # Premium Features
    is_premium = models.BooleanField(default=False)
    premium_expires_at = models.DateTimeField(null=True, blank=True)
    custom_branding = models.JSONField(default=dict, blank=True)  # Logo, colors, etc.
    multiple_locations = models.JSONField(default=list, blank=True)  # For chain stores
    
    # Transaction Limits (for receiving)
    daily_receive_limit = models.DecimalField(max_digits=15, decimal_places=2, default=10000.00)
    single_receive_limit = models.DecimalField(max_digits=15, decimal_places=2, default=5000.00)
    daily_received = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    daily_received_reset_at = models.DateTimeField(default=timezone.now)
    
    # Analytics
    total_received = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    total_transactions_received = models.IntegerField(default=0)
    average_transaction_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    last_received_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    verification_documents = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_merchant_profile'
        indexes = [
            models.Index(fields=['merchant_id']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['receive_qr_id']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.merchant_id:
            # Generate unique merchant ID
            prefix = 'BUS' if self.merchant_type == 'business' else 'MER'
            random_str = str(uuid.uuid4())[:8].upper()
            self.merchant_id = f"{prefix}_{random_str}"
        
        if not self.merchant_name:
            # Default to user's name or business name
            try:
                user_profile = UserProfile.objects.get(user=self.user)
                if user_profile.business_name:
                    self.merchant_name = user_profile.business_name
                else:
                    self.merchant_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email
            except UserProfile.DoesNotExist:
                self.merchant_name = self.user.email
        
        super().save(*args, **kwargs)
    
    def generate_static_qr(self):
        """Generate static Receive QR code"""
        qr_data = {
            'type': 'DOTT_RECEIVE_STATIC',
            'merchantId': self.merchant_id,
            'merchantName': self.merchant_name,
            'qrId': str(self.receive_qr_id),
            'color': self.static_qr_color,
            'version': '2.0',
        }
        
        # Base64 encode
        json_str = json.dumps(qr_data)
        encoded = base64.b64encode(json_str.encode()).decode()
        
        self.static_qr_code = encoded
        self.save()
        
        return encoded
    
    def generate_dynamic_qr(self, amount, reference=None, expires_minutes=5):
        """Generate dynamic Receive QR with amount"""
        qr_data = {
            'type': 'DOTT_RECEIVE_DYNAMIC',
            'merchantId': self.merchant_id,
            'merchantName': self.merchant_name,
            'qrId': str(uuid.uuid4()),  # Unique for each dynamic QR
            'amount': str(amount),
            'currency': 'USD',  # TODO: Get from user profile
            'reference': reference or f"PAY-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            'expiresAt': int((timezone.now() + timedelta(minutes=expires_minutes)).timestamp() * 1000),
            'color': self.static_qr_color,
            'version': '2.0',
        }
        
        json_str = json.dumps(qr_data)
        encoded = base64.b64encode(json_str.encode()).decode()
        
        # Store in DynamicQR model
        DynamicQR.objects.create(
            merchant_profile=self,
            tenant_id=self.tenant_id,
            qr_data=encoded,
            amount=amount,
            reference=qr_data['reference'],
            expires_at=timezone.now() + timedelta(minutes=expires_minutes)
        )
        
        return encoded
    
    def can_receive(self, amount):
        """Check if merchant can receive payment"""
        self.reset_daily_limit()
        
        if not self.is_active:
            return False, "Merchant account is not active"
        
        if amount > self.single_receive_limit:
            return False, f"Amount exceeds single transaction limit of {self.single_receive_limit}"
        
        if self.daily_received + amount > self.daily_receive_limit:
            return False, f"Amount would exceed daily limit of {self.daily_receive_limit}"
        
        return True, "Can receive payment"
    
    def reset_daily_limit(self):
        """Reset daily received amount if needed"""
        now = timezone.now()
        if self.daily_received_reset_at.date() < now.date():
            self.daily_received = 0
            self.daily_received_reset_at = now
            self.save()
    
    def record_received(self, amount):
        """Record a received payment"""
        self.reset_daily_limit()
        self.daily_received += amount
        self.total_received += amount
        self.total_transactions_received += 1
        self.last_received_at = timezone.now()
        
        # Update average
        if self.total_transactions_received > 0:
            self.average_transaction_value = self.total_received / self.total_transactions_received
        
        self.save()
    
    def __str__(self):
        return f"Merchant: {self.merchant_name} ({self.merchant_id})"


class DynamicQR(TenantAwareModel):
    """
    Dynamic QR codes with specific amounts and expiry
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant_profile = models.ForeignKey(
        MerchantProfile,
        on_delete=models.CASCADE,
        related_name='dynamic_qrs'
    )
    
    qr_data = models.TextField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    reference = models.CharField(max_length=100)
    
    is_used = models.BooleanField(default=False)
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='used_dynamic_qrs'
    )
    used_at = models.DateTimeField(null=True, blank=True)
    
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_dynamic_qr'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference']),
            models.Index(fields=['merchant_profile', 'is_used']),
        ]
    
    def is_valid(self):
        """Check if QR is still valid"""
        if self.is_used:
            return False, "QR code already used"
        
        if timezone.now() > self.expires_at:
            return False, "QR code expired"
        
        return True, "Valid"
    
    def mark_used(self, user):
        """Mark QR as used"""
        self.is_used = True
        self.used_by = user
        self.used_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"Dynamic QR: {self.reference} - {self.amount}"


class UniversalQR(TenantAwareModel):
    """
    Universal QR model that manages both Payment and Receive QRs
    """
    QR_TYPE_CHOICES = [
        ('payment', 'Payment QR - Blue'),
        ('receive_static', 'Receive Static QR - Green'),
        ('receive_dynamic', 'Receive Dynamic QR - Green'),
        ('request', 'Payment Request QR - Yellow'),
        ('split', 'Bill Split QR - Purple'),
        ('refund', 'Refund QR - Red'),
    ]
    
    COLOR_SCHEME = {
        'payment': '#2563eb',  # Blue
        'receive_static': '#10b981',  # Green
        'receive_dynamic': '#10b981',  # Green
        'request': '#eab308',  # Yellow
        'split': '#9333ea',  # Purple
        'refund': '#ef4444',  # Red
    }
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='universal_qrs'
    )
    
    qr_type = models.CharField(max_length=20, choices=QR_TYPE_CHOICES)
    qr_data = models.TextField()
    qr_color = models.CharField(max_length=7)
    
    is_active = models.BooleanField(default=True)
    scan_count = models.IntegerField(default=0)
    last_scanned_at = models.DateTimeField(null=True, blank=True)
    
    # For dynamic QRs
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    reference = models.CharField(max_length=100, blank=True, null=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_universal_qr'
        indexes = [
            models.Index(fields=['user', 'qr_type']),
            models.Index(fields=['qr_type', 'is_active']),
        ]
    
    def save(self, *args, **kwargs):
        # Auto-set color based on type
        if not self.qr_color:
            self.qr_color = self.COLOR_SCHEME.get(self.qr_type, '#000000')
        super().save(*args, **kwargs)
    
    def record_scan(self):
        """Record a scan of this QR"""
        self.scan_count += 1
        self.last_scanned_at = timezone.now()
        self.save()
    
    def __str__(self):
        return f"{self.get_qr_type_display()} - {self.user.email}"


class P2PTransaction(TenantAwareModel):
    """
    Person-to-Person transactions using dual QR system
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_id = models.CharField(max_length=100, unique=True)
    
    # Parties
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='p2p_sent'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='p2p_received'
    )
    
    # QR Details
    sender_qr_type = models.CharField(max_length=20)  # Should be 'payment' (blue)
    receiver_qr_type = models.CharField(max_length=20)  # Should be 'receive' (green)
    
    # Transaction Details
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    description = models.TextField(blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Fees (if any)
    platform_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_p2p_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['sender', 'status']),
            models.Index(fields=['receiver', 'status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            random_str = str(uuid.uuid4())[:6].upper()
            self.transaction_id = f"P2P-{timestamp}-{random_str}"
        
        # Calculate net amount
        if not self.net_amount:
            self.net_amount = self.amount - self.platform_fee
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"P2P: {self.sender.email} → {self.receiver.email} ({self.amount})"


class QRSafetyLog(TenantAwareModel):
    """
    Log QR color mismatches and safety errors
    """
    ERROR_TYPE_CHOICES = [
        ('both_paying', 'Both QRs are Payment (Blue)'),
        ('both_receiving', 'Both QRs are Receive (Green)'),
        ('expired_qr', 'QR Code Expired'),
        ('invalid_qr', 'Invalid QR Format'),
        ('limit_exceeded', 'Transaction Limit Exceeded'),
        ('inactive_account', 'Account Inactive'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Users involved
    scanner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='qr_scan_errors'
    )
    scanned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qr_scanned_errors'
    )
    
    # Error details
    error_type = models.CharField(max_length=20, choices=ERROR_TYPE_CHOICES)
    scanner_qr_type = models.CharField(max_length=20)
    scanned_qr_type = models.CharField(max_length=20)
    
    # Additional context
    error_message = models.TextField()
    location = models.JSONField(default=dict, blank=True)
    device_info = models.JSONField(default=dict, blank=True)
    
    # Resolution
    was_corrected = models.BooleanField(default=False)
    correction_action = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_qr_safety_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['error_type', 'created_at']),
            models.Index(fields=['scanner_user', 'error_type']),
        ]
    
    def __str__(self):
        return f"QR Error: {self.error_type} - {self.created_at}"