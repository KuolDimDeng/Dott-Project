#/Users/kuoldeng/projectx/backend/pyfactor/payments/models.py
import uuid
import hashlib
import json
from decimal import Decimal
from django.db import models
from django.conf import settings
from django_countries.fields import CountryField
from django.utils import timezone
from django.core.exceptions import ValidationError
from custom_auth.tenant_base_model import TenantAwareModel
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

class PaymentGateway(TenantAwareModel):
    """
    Enhanced Payment Gateway model with tenant isolation and comprehensive features.
    Supports multiple payment providers with encrypted credential storage.
    """
    GATEWAY_CHOICES = [
        ('STRIPE', 'Stripe'),
        ('M_PESA', 'M-Pesa'),
        ('FLUTTERWAVE', 'Flutterwave'),
        ('PAYPAL', 'PayPal'),
        ('WISE', 'Wise'),
        ('PLAID', 'Plaid'),
        ('DLOCAL', 'DLocal'),
        ('RAZORPAY', 'Razorpay'),
        ('PAYU', 'PayU'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('ACH', 'ACH Transfer'),
        ('WIRE', 'Wire Transfer'),
    ]
    
    PROVIDER_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('testing', 'Testing'),
        ('deprecated', 'Deprecated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, choices=GATEWAY_CHOICES)
    display_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=PROVIDER_STATUS_CHOICES, default='active')
    
    # Configuration - Encrypted storage
    api_key_encrypted = models.TextField(blank=True, null=True)
    secret_key_encrypted = models.TextField(blank=True, null=True)
    webhook_secret_encrypted = models.TextField(blank=True, null=True)
    config_encrypted = models.TextField(blank=True, null=True)  # Additional config as JSON
    
    # API Configuration
    api_base_url = models.URLField()
    webhook_url = models.URLField(blank=True, null=True)
    
    # Capabilities
    supports_payments = models.BooleanField(default=True)
    supports_payouts = models.BooleanField(default=False)
    supports_refunds = models.BooleanField(default=False)
    supports_webhooks = models.BooleanField(default=True)
    supports_recurring = models.BooleanField(default=False)
    
    # Geographic and currency support
    supported_countries = models.JSONField(default=list)
    supported_currencies = models.JSONField(default=list)
    
    # Processing limits and fees
    min_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.01)
    max_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    processing_fee_percentage = models.DecimalField(max_digits=5, decimal_places=4, default=0.029)  # 2.9%
    processing_fee_fixed = models.DecimalField(max_digits=5, decimal_places=2, default=0.30)
    
    # Operational metrics
    priority = models.IntegerField(default=1, help_text="1=highest priority")
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=99.99)
    average_processing_time = models.IntegerField(default=5, help_text="seconds")
    
    # Security and compliance
    requires_3ds = models.BooleanField(default=False)
    pci_compliant = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_gateway'
        ordering = ['priority', 'name']
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['name', 'status']),
        ]
    
    def __str__(self):
        return f"{self.display_name} ({self.get_name_display()})"
    
    def encrypt_credential(self, value):
        """Encrypt sensitive credential data"""
        if not value:
            return None
        # Use Django's SECRET_KEY for encryption
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:32]
        f = Fernet(key)
        return f.encrypt(value.encode()).decode()
    
    def decrypt_credential(self, encrypted_value):
        """Decrypt sensitive credential data"""
        if not encrypted_value:
            return None
        try:
            key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:32]
            f = Fernet(key)
            return f.decrypt(encrypted_value.encode()).decode()
        except Exception as e:
            logger.error(f"Failed to decrypt credential: {e}")
            return None
    
    def set_api_key(self, api_key):
        """Set encrypted API key"""
        self.api_key_encrypted = self.encrypt_credential(api_key)
    
    def get_api_key(self):
        """Get decrypted API key"""
        return self.decrypt_credential(self.api_key_encrypted)
    
    def set_secret_key(self, secret_key):
        """Set encrypted secret key"""
        self.secret_key_encrypted = self.encrypt_credential(secret_key)
    
    def get_secret_key(self):
        """Get decrypted secret key"""
        return self.decrypt_credential(self.secret_key_encrypted)
    
    def set_webhook_secret(self, webhook_secret):
        """Set encrypted webhook secret"""
        self.webhook_secret_encrypted = self.encrypt_credential(webhook_secret)
    
    def get_webhook_secret(self):
        """Get decrypted webhook secret"""
        return self.decrypt_credential(self.webhook_secret_encrypted)
    
    def set_config(self, config_dict):
        """Set encrypted configuration as JSON"""
        if config_dict:
            config_json = json.dumps(config_dict)
            self.config_encrypted = self.encrypt_credential(config_json)
    
    def get_config(self):
        """Get decrypted configuration as dict"""
        config_json = self.decrypt_credential(self.config_encrypted)
        if config_json:
            try:
                return json.loads(config_json)
            except json.JSONDecodeError:
                logger.error("Failed to parse gateway config JSON")
        return {}
    
    def is_available_for_country(self, country_code):
        """Check if gateway is available for a specific country"""
        return country_code in self.supported_countries
    
    def is_available_for_currency(self, currency_code):
        """Check if gateway supports a specific currency"""
        return currency_code in self.supported_currencies
    
    def calculate_fees(self, amount):
        """Calculate processing fees for an amount"""
        percentage_fee = amount * (self.processing_fee_percentage / 100)
        total_fee = percentage_fee + self.processing_fee_fixed
        return {
            'percentage_fee': percentage_fee,
            'fixed_fee': self.processing_fee_fixed,
            'total_fee': total_fee,
            'net_amount': amount - total_fee
        }

class PaymentProvider(models.Model):
    """Model to store information about payment providers"""
    PROVIDER_TYPE_CHOICES = [
        ('card_processor', 'Credit/Debit Card Processor'),
        ('bank_connector', 'Bank Connection Service'),
        ('mobile_money', 'Mobile Money Service'),
        ('direct_transfer', 'Direct Bank Transfer'),
        ('digital_wallet', 'Digital Wallet'),
        ('crypto', 'Cryptocurrency Service'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    provider_type = models.CharField(max_length=20, choices=PROVIDER_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    
    # Configuration
    api_key_name = models.CharField(max_length=100, blank=True, null=True)
    api_secret_name = models.CharField(max_length=100, blank=True, null=True)
    api_base_url = models.URLField(blank=True, null=True)
    
    # Service availability
    available_countries = models.JSONField(default=list, help_text="List of country codes where this provider is available")
    supports_recurring = models.BooleanField(default=False)
    supports_refunds = models.BooleanField(default=False)
    
    # Mobile money specific
    is_mobile_money = models.BooleanField(default=False)
    mobile_network_operator = models.CharField(max_length=100, blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name

class CountryPaymentMethod(models.Model):
    """Mapping of countries to their preferred payment methods"""
    country = CountryField(unique=True)
    primary_provider = models.ForeignKey(
        PaymentProvider, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='primary_for_countries'
    )
    backup_provider = models.ForeignKey(
        PaymentProvider, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='backup_for_countries'
    )
    bank_connector = models.ForeignKey(
        PaymentProvider, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='bank_connector_for_countries'
    )
    mobile_money_provider = models.ForeignKey(
        PaymentProvider, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='mobile_money_for_countries'
    )
    currency_code = models.CharField(max_length=3, help_text="ISO 4217 currency code")
    currency_symbol = models.CharField(max_length=5)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Country payment methods"
    
    def __str__(self):
        return f"{self.country.name} - {self.primary_provider.name if self.primary_provider else 'No provider'}"

class PaymentMethod(TenantAwareModel):
    """Enhanced payment methods with tenant isolation and security"""
    
    METHOD_TYPE_CHOICES = [
        ('bank_account', 'Bank Account'),
        ('mobile_money', 'Mobile Money'),
        ('card', 'Credit/Debit Card'),
        ('digital_wallet', 'Digital Wallet'),
        ('cash', 'Cash Payment'),
        ('ach', 'ACH Transfer'),
        ('wire', 'Wire Transfer'),
        ('check', 'Check'),
    ]
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('failed', 'Verification Failed'),
        ('expired', 'Verification Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    employee = models.ForeignKey(
        'hr.Employee',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_methods'
    )
    gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.PROTECT,
        related_name='payment_methods'
    )
    
    # Method details
    method_type = models.CharField(max_length=20, choices=METHOD_TYPE_CHOICES)
    nickname = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)
    currency = models.CharField(max_length=3, default='USD')
    
    # Verification and security
    verification_status = models.CharField(
        max_length=20, 
        choices=VERIFICATION_STATUS_CHOICES, 
        default='pending'
    )
    verification_code = models.CharField(max_length=10, blank=True, null=True)
    verification_attempts = models.IntegerField(default=0)
    verification_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Bank account details (encrypted or tokenized)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_last_four = models.CharField(max_length=4, blank=True, null=True)
    routing_number_last_four = models.CharField(max_length=4, blank=True, null=True)
    
    # Mobile money details
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    mobile_provider = models.CharField(max_length=50, blank=True, null=True)
    
    # Digital wallet
    email = models.EmailField(blank=True, null=True)
    wallet_id = models.CharField(max_length=100, blank=True, null=True)
    
    # External provider references (encrypted)
    provider_token_encrypted = models.TextField(blank=True, null=True)
    provider_account_id = models.CharField(max_length=255, blank=True, null=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Additional encrypted fields for sensitive data
    encrypted_data = models.TextField(blank=True, null=True)  # JSON with sensitive info
    
    # Status and metadata
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_method'
        unique_together = [
            ('user', 'employee', 'gateway', 'method_type', 'external_id')
        ]
        indexes = [
            models.Index(fields=['tenant_id', 'user']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['is_default', 'is_active']),
        ]
    
    def __str__(self):
        entity = self.employee or self.user
        return f"{self.method_type} for {entity} via {self.gateway.display_name}"
    
    def encrypt_sensitive_data(self, data_dict):
        """Encrypt sensitive payment method data"""
        if data_dict:
            data_json = json.dumps(data_dict)
            key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:32]
            f = Fernet(key)
            self.encrypted_data = f.encrypt(data_json.encode()).decode()
    
    def decrypt_sensitive_data(self):
        """Decrypt sensitive payment method data"""
        if not self.encrypted_data:
            return {}
        try:
            key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:32]
            f = Fernet(key)
            data_json = f.decrypt(self.encrypted_data.encode()).decode()
            return json.loads(data_json)
        except Exception as e:
            logger.error(f"Failed to decrypt payment method data: {e}")
            return {}
    
    def verify_method(self, verification_code):
        """Verify payment method with provided code"""
        if self.verification_code == verification_code:
            self.verification_status = 'verified'
            self.verification_code = None
            self.verification_expires_at = None
            self.save()
            return True
        else:
            self.verification_attempts += 1
            self.save()
            return False
    
    def is_verification_expired(self):
        """Check if verification has expired"""
        if self.verification_expires_at:
            return timezone.now() > self.verification_expires_at
        return False
    
    def save(self, *args, **kwargs):
        # Make sure only one default payment method exists per user/employee
        if self.is_default:
            filter_kwargs = {'is_default': True}
            if self.employee:
                filter_kwargs['employee'] = self.employee
            else:
                filter_kwargs['user'] = self.user
            
            PaymentMethod.objects.filter(**filter_kwargs).exclude(id=self.id).update(is_default=False)
        
        # Handle verification expiry
        if self.is_verification_expired():
            self.verification_status = 'expired'
            
        super().save(*args, **kwargs)

class Transaction(TenantAwareModel):
    """Enhanced payment transaction with comprehensive tracking and security"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('payment', 'Payment'),
        ('payout', 'Payout'),
        ('refund', 'Refund'),
        ('chargeback', 'Chargeback'),
        ('fee', 'Fee'),
        ('adjustment', 'Adjustment'),
        ('transfer', 'Transfer'),
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('requires_action', 'Requires Action'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('disputed', 'Disputed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_transactions'
    )
    
    # Transaction identification
    reference_number = models.CharField(max_length=100, unique=True, db_index=True)
    external_reference = models.CharField(max_length=255, blank=True, null=True)
    
    # Transaction details
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    
    # Financial details
    gross_amount = models.DecimalField(max_digits=15, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Recipient information
    recipient_type = models.CharField(max_length=20, choices=[
        ('user', 'User'),
        ('employee', 'Employee'),
        ('vendor', 'Vendor'),
        ('customer', 'Customer'),
        ('bank', 'Bank'),
        ('tax_authority', 'Tax Authority'),
    ], null=True, blank=True)
    recipient_id = models.UUIDField(null=True, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_email = models.EmailField(blank=True, null=True)
    recipient_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Payment method and gateway
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transactions'
    )
    gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    
    # Transaction status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_reason = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True, null=True)
    
    # Retry mechanism
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    # Gateway/Provider references
    gateway_transaction_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    gateway_reference = models.CharField(max_length=255, blank=True, null=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    
    # Webhook tracking
    webhook_received = models.BooleanField(default=False)
    webhook_processed_at = models.DateTimeField(null=True, blank=True)
    
    # International payments and currency conversion
    source_currency = models.CharField(max_length=3, blank=True, null=True)
    target_currency = models.CharField(max_length=3, blank=True, null=True)
    exchange_rate = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    exchange_rate_source = models.CharField(max_length=50, blank=True, null=True)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Timing and audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    initiated_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # IP and security tracking
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    fraud_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Additional data and context
    metadata = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Reconciliation
    reconciled = models.BooleanField(default=False)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reconciled_transactions'
    )
    
    class Meta:
        db_table = 'payments_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'user']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['gateway', 'status']),
            models.Index(fields=['reference_number']),
            models.Index(fields=['gateway_transaction_id']),
            models.Index(fields=['transaction_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.reference_number} - {self.transaction_type} - {self.amount} {self.currency} - {self.status}"
    
    def save(self, *args, **kwargs):
        # Generate reference number if not provided
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        
        # Calculate net amount
        if hasattr(self, 'gross_amount') and self.gross_amount:
            self.net_amount = self.gross_amount - self.fee_amount - self.tax_amount
        else:
            self.net_amount = self.amount
        
        # Set initiated_at on first save
        if not self.pk and not self.initiated_at:
            self.initiated_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate unique reference number"""
        import time
        timestamp = str(int(time.time()))
        random_suffix = str(uuid.uuid4())[:8].upper()
        return f"TXN-{timestamp}-{random_suffix}"
    
    def mark_as_completed(self, gateway_transaction_id=None, gateway_response=None):
        """Mark transaction as completed"""
        self.status = 'completed'
        self.processed_at = timezone.now()
        self.completed_at = timezone.now()
        
        if gateway_transaction_id:
            self.gateway_transaction_id = gateway_transaction_id
        if gateway_response:
            self.gateway_response = gateway_response
        
        self.save()
        
        # Update payment method last_used
        if self.payment_method:
            self.payment_method.last_used = timezone.now()
            self.payment_method.save(update_fields=['last_used'])
        
        return self
    
    def mark_as_failed(self, error_message=None, error_code=None):
        """Mark transaction as failed"""
        self.status = 'failed'
        self.processed_at = timezone.now()
        
        if error_message:
            self.error_message = error_message
        if error_code:
            self.error_code = error_code
        
        # Schedule retry if under limit
        if self.retry_count < self.max_retries:
            self.schedule_retry()
        
        self.save()
        return self
    
    def schedule_retry(self, delay_minutes=None):
        """Schedule transaction for retry"""
        if delay_minutes is None:
            # Exponential backoff: 5, 15, 45 minutes
            delay_minutes = 5 * (3 ** self.retry_count)
        
        self.next_retry_at = timezone.now() + timezone.timedelta(minutes=delay_minutes)
        self.retry_count += 1
        self.save()
    
    def can_be_retried(self):
        """Check if transaction can be retried"""
        return (
            self.status == 'failed' and
            self.retry_count < self.max_retries and
            self.next_retry_at and
            timezone.now() >= self.next_retry_at
        )
    
    def is_expired(self):
        """Check if transaction has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def calculate_fees(self):
        """Calculate transaction fees using gateway configuration"""
        if self.gateway:
            fee_info = self.gateway.calculate_fees(self.gross_amount or self.amount)
            self.fee_amount = fee_info['total_fee']
            return fee_info
        return None

class WebhookEvent(TenantAwareModel):
    """Enhanced webhook event tracking with security and tenant isolation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100)
    event_id = models.CharField(max_length=255)
    payload = models.JSONField()
    headers = models.JSONField(default=dict, blank=True)
    signature = models.CharField(max_length=500, blank=True, null=True)
    
    # Processing status
    processed = models.BooleanField(default=False)
    processing_attempts = models.IntegerField(default=0)
    
    # Related transaction
    transaction = models.ForeignKey(
        Transaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='webhooks'
    )
    
    # Security and verification
    verified = models.BooleanField(default=False)
    verification_error = models.TextField(blank=True, null=True)
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'payments_webhook_event'
        ordering = ['-created_at']
        unique_together = [('gateway', 'event_id')]
        indexes = [
            models.Index(fields=['tenant_id', 'processed']),
            models.Index(fields=['gateway', 'event_type']),
            models.Index(fields=['verified', 'processed']),
        ]
    
    def __str__(self):
        return f"{self.gateway.display_name} - {self.event_type} - {self.created_at}"
    
    def verify_signature(self, secret_key):
        """Verify webhook signature"""
        if not self.signature or not secret_key:
            return False
        
        try:
            import hmac
            import hashlib
            
            payload_string = json.dumps(self.payload, sort_keys=True)
            expected_signature = hmac.new(
                secret_key.encode(),
                payload_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(self.signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False
    
    def mark_as_processed(self, success=True, error=None):
        """Mark webhook as processed"""
        self.processed = True
        self.processed_at = timezone.now()
        self.processing_attempts += 1
        
        if error:
            self.processing_error = str(error)
        
        self.save()


class PaymentAuditLog(TenantAwareModel):
    """Comprehensive audit log for all payment system activities"""
    
    ACTION_CHOICES = [
        ('gateway_added', 'Payment Gateway Added'),
        ('gateway_updated', 'Payment Gateway Updated'),
        ('gateway_removed', 'Payment Gateway Removed'),
        ('method_added', 'Payment Method Added'),
        ('method_verified', 'Payment Method Verified'),
        ('method_removed', 'Payment Method Removed'),
        ('transaction_created', 'Transaction Created'),
        ('transaction_processed', 'Transaction Processed'),
        ('transaction_failed', 'Transaction Failed'),
        ('transaction_refunded', 'Transaction Refunded'),
        ('webhook_received', 'Webhook Received'),
        ('webhook_processed', 'Webhook Processed'),
        ('config_changed', 'Configuration Changed'),
        ('security_event', 'Security Event'),
    ]
    
    RISK_LEVEL_CHOICES = [
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),  
        ('high', 'High Risk'),
        ('critical', 'Critical Risk'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Action details
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES, default='low')
    
    # Context
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.SET_NULL, null=True, blank=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Request information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_audit_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'created_at']),
            models.Index(fields=['action', 'risk_level']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.user} - {self.created_at}"


class PaymentReconciliation(TenantAwareModel):
    """Payment reconciliation records for matching transactions with bank statements"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Reconciliation'),
        ('matched', 'Matched'),
        ('unmatched', 'Unmatched'),
        ('disputed', 'Disputed'),
        ('resolved', 'Resolved'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Reconciliation period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Transaction references
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    bank_reference = models.CharField(max_length=255, blank=True, null=True)
    
    # Reconciliation details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    matched_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    variance_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    variance_reason = models.TextField(blank=True)
    
    # Processing
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reconciled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_reconciliation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['period_start', 'period_end']),
            models.Index(fields=['transaction', 'status']),
        ]
    
    def __str__(self):
        return f"Reconciliation {self.id} - {self.transaction.reference_number} - {self.status}"


class PaymentConfiguration(TenantAwareModel):
    """Tenant-specific payment system configuration"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Default gateway preferences
    default_gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_configs'
    )
    fallback_gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fallback_configs'
    )
    
    # Processing settings
    auto_retry_failed = models.BooleanField(default=True)
    max_retry_attempts = models.IntegerField(default=3)
    retry_delay_minutes = models.IntegerField(default=5)
    
    # Security settings
    require_3ds = models.BooleanField(default=False)
    fraud_detection_enabled = models.BooleanField(default=True)
    webhook_verification_required = models.BooleanField(default=True)
    
    # Notification settings
    notify_on_success = models.BooleanField(default=True)
    notify_on_failure = models.BooleanField(default=True)
    notification_email = models.EmailField(blank=True, null=True)
    
    # Limits
    daily_transaction_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    monthly_transaction_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    single_transaction_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Additional configuration
    custom_settings = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_configuration'
        indexes = [
            models.Index(fields=['tenant_id']),
        ]
    
    def __str__(self):
        return f"Payment Config for Tenant {self.tenant_id}"

class ExchangeRate(models.Model):
    """Exchange rates for currency conversion"""
    from_currency = models.CharField(max_length=3)
    to_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=15, decimal_places=6)
    source = models.CharField(max_length=50, default='exchangerate-api')
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [('from_currency', 'to_currency')]
    
    def __str__(self):
        return f"{self.from_currency} to {self.to_currency}: {self.rate}"


class InvoicePayment(models.Model):
    """Track invoice payments and platform fees"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey('sales.Invoice', on_delete=models.CASCADE, related_name='stripe_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    payment_method = models.CharField(max_length=50)
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stripe_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    platform_profit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_invoice_payment'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} for Invoice {self.invoice.invoice_number}"


class VendorPayment(models.Model):
    """Track payments to vendors/suppliers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('purchases.Vendor', on_delete=models.CASCADE, related_name='stripe_payments')
    business_id = models.UUIDField(db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    invoice_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    stripe_charge_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_transfer_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_charged = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=50, default='pending')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_vendor_payment'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.id} to vendor"


class PlatformFeeCollection(models.Model):
    """Track all platform fees collected"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(db_index=True)
    transaction_type = models.CharField(max_length=50)  # invoice_payment, vendor_payment, etc.
    transaction_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Base transaction amount
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)  # Total fee collected
    stripe_fee = models.DecimalField(max_digits=10, decimal_places=2)  # What Stripe charges us
    platform_profit = models.DecimalField(max_digits=10, decimal_places=2)  # Our profit
    fee_percentage = models.DecimalField(max_digits=5, decimal_places=4)  # e.g., 0.029 for 2.9%
    fixed_fee = models.DecimalField(max_digits=10, decimal_places=2)  # e.g., 0.60
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=50, default='collected')
    stripe_account_id = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'payments_platform_fee_collection'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business_id', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"Fee {self.id} - {self.transaction_type} - ${self.platform_fee}"