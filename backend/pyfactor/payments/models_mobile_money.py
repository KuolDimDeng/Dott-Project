"""
Mobile Money Payment Models
Production-ready models for MTN MoMo and M-Pesa transactions
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import RegexValidator
from django.db.models import JSONField
import uuid
from decimal import Decimal
# from encrypted_model_fields import EncryptedCharField

User = get_user_model()


class MobileMoneyProvider(models.Model):
    """Mobile money provider configuration"""
    PROVIDER_CHOICES = [
        ('MTN_MOMO', 'MTN Mobile Money'),
        ('MPESA', 'M-Pesa'),
        ('AIRTEL_MONEY', 'Airtel Money'),
        ('ORANGE_MONEY', 'Orange Money'),
    ]
    
    name = models.CharField(max_length=50, choices=PROVIDER_CHOICES, unique=True)
    is_active = models.BooleanField(default=True)
    sandbox_url = models.URLField()
    production_url = models.URLField()
    supported_countries = JSONField(default=list)
    supported_currencies = JSONField(default=list)
    
    # Credentials (TODO: Add encryption in production)
    api_user = models.CharField(max_length=255, blank=True)
    api_key = models.CharField(max_length=255, blank=True)
    subscription_key = models.CharField(max_length=255, blank=True)
    secret_key = models.CharField(max_length=255, blank=True)
    
    # Configuration
    min_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    max_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1000000.00'))
    transaction_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('2.50'))
    transaction_fee_fixed = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_providers'
        verbose_name = 'Payment Provider'
        verbose_name_plural = 'Payment Providers'
    
    def __str__(self):
        return self.get_name_display()


class MobileMoneyTransaction(models.Model):
    """Mobile money transaction record"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SUCCESSFUL', 'Successful'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
        ('REVERSED', 'Reversed'),
    ]
    
    TRANSACTION_TYPE_CHOICES = [
        ('PAYMENT', 'Payment'),
        ('REFUND', 'Refund'),
        ('TRANSFER', 'Transfer'),
        ('WITHDRAWAL', 'Withdrawal'),
    ]
    
    # Unique identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_id = models.CharField(max_length=100, unique=True, db_index=True)
    external_reference = models.CharField(max_length=100, blank=True, db_index=True)
    
    # Relationships
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='mobile_money_transactions')
    tenant_id = models.UUIDField(db_index=True)
    provider = models.ForeignKey(MobileMoneyProvider, on_delete=models.PROTECT)
    
    # Transaction details
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, default='PAYMENT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    
    # Financial details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Customer details
    phone_number = models.CharField(
        max_length=20,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$', message='Invalid phone number')]
    )
    customer_name = models.CharField(max_length=100, blank=True)
    customer_email = models.EmailField(blank=True)
    
    # Payment details
    payment_message = models.TextField(blank=True)
    payee_note = models.TextField(blank=True)
    
    # Provider response
    provider_transaction_id = models.CharField(max_length=100, blank=True, db_index=True)
    provider_status = models.CharField(max_length=50, blank=True)
    provider_response = JSONField(default=dict, blank=True)
    provider_error_code = models.CharField(max_length=50, blank=True)
    provider_error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Security
    verification_code = models.CharField(max_length=10, blank=True)
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'mobile_money_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['tenant_id', 'created_at']),
            models.Index(fields=['provider', 'status']),
            models.Index(fields=['phone_number', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.reference_id} - {self.amount} {self.currency}"
    
    def calculate_fees(self):
        """Calculate transaction fees"""
        if self.provider:
            percentage_fee = self.amount * (self.provider.transaction_fee_percentage / 100)
            total_fee = percentage_fee + self.provider.transaction_fee_fixed
            self.fee_amount = total_fee
            self.net_amount = self.amount - total_fee
            return total_fee
        return Decimal('0.00')
    
    def mark_successful(self, provider_transaction_id=None):
        """Mark transaction as successful"""
        self.status = 'SUCCESSFUL'
        self.completed_at = timezone.now()
        if provider_transaction_id:
            self.provider_transaction_id = provider_transaction_id
        self.save(update_fields=['status', 'completed_at', 'provider_transaction_id', 'updated_at'])
    
    def mark_failed(self, error_message=None, error_code=None):
        """Mark transaction as failed"""
        self.status = 'FAILED'
        self.completed_at = timezone.now()
        if error_message:
            self.provider_error_message = error_message
        if error_code:
            self.provider_error_code = error_code
        self.save(update_fields=['status', 'completed_at', 'provider_error_message', 'provider_error_code', 'updated_at'])


class PaymentWebhook(models.Model):
    """Webhook events from payment providers"""
    WEBHOOK_TYPES = [
        ('PAYMENT_SUCCESS', 'Payment Success'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('REFUND_SUCCESS', 'Refund Success'),
        ('REFUND_FAILED', 'Refund Failed'),
        ('STATUS_UPDATE', 'Status Update'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(MobileMoneyProvider, on_delete=models.CASCADE)
    webhook_type = models.CharField(max_length=30, choices=WEBHOOK_TYPES)
    
    # Related transaction
    transaction = models.ForeignKey(
        MobileMoneyTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhooks'
    )
    
    # Webhook data
    headers = JSONField(default=dict)
    payload = JSONField(default=dict)
    signature = models.TextField(blank=True)
    is_valid = models.BooleanField(default=False)
    is_processed = models.BooleanField(default=False)
    
    # Processing
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_webhooks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'is_processed']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.provider.name} - {self.webhook_type} - {self.created_at}"


class PaymentSession(models.Model):
    """Payment session for tracking user payment flow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    provider = models.ForeignKey(MobileMoneyProvider, on_delete=models.CASCADE)
    
    # Session data
    session_token = models.CharField(max_length=255, unique=True, db_index=True)
    access_token = models.CharField(max_length=500, blank=True)
    refresh_token = models.CharField(max_length=500, blank=True)
    
    # Expiry
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_sessions'
        indexes = [
            models.Index(fields=['session_token']),
            models.Index(fields=['user', 'provider', 'is_active']),
        ]
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"Session for {self.user.email} - {self.provider.name}"