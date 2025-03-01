import uuid
from django.db import models
from django.conf import settings
from django_countries.fields import CountryField
from django.utils import timezone

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

class PaymentMethod(models.Model):
    """Payment methods stored for employees or businesses"""
    METHOD_TYPE_CHOICES = [
        ('bank_account', 'Bank Account'),
        ('mobile_money', 'Mobile Money'),
        ('card', 'Credit/Debit Card'),
        ('digital_wallet', 'Digital Wallet'),
        ('cash', 'Cash Payment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        'business.Business',
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
    
    # Method details
    provider = models.ForeignKey(PaymentProvider, on_delete=models.PROTECT)
    method_type = models.CharField(max_length=20, choices=METHOD_TYPE_CHOICES)
    nickname = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)
    
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
    
    # External provider references
    provider_token = models.CharField(max_length=255, blank=True, null=True)
    provider_account_id = models.CharField(max_length=255, blank=True, null=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Status and metadata
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = [
            ('business', 'employee', 'provider', 'method_type', 'external_id')
        ]
    
    def __str__(self):
        entity = self.employee or self.business
        return f"{self.method_type} for {entity} via {self.provider.name}"
    
    def save(self, *args, **kwargs):
        # Make sure only one default payment method exists per employee
        if self.is_default and self.employee:
            PaymentMethod.objects.filter(
                employee=self.employee,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
            
        super().save(*args, **kwargs)

class PaymentTransaction(models.Model):
    """Record of a payment transaction"""
    TRANSACTION_TYPE_CHOICES = [
        ('payroll', 'Payroll Payment'),
        ('tax', 'Tax Payment'),
        ('vendor', 'Vendor Payment'),
        ('refund', 'Refund'),
        ('fee', 'Fee'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.CASCADE,
        related_name='payment_transactions'
    )
    
    # Transaction details
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3)
    description = models.TextField(blank=True)
    
    # Payroll specific
    payroll_run = models.ForeignKey(
        'payroll.PayrollRun',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions'
    )
    employee = models.ForeignKey(
        'hr.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions'
    )
    
    # Payment method used
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transactions'
    )
    provider = models.ForeignKey(
        PaymentProvider,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    
    # Transaction status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    # Provider references
    provider_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    provider_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    provider_reference = models.CharField(max_length=255, blank=True, null=True)
    
    # For international payments
    exchange_rate = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Timing fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} {self.currency} - {self.status}"
    
    def mark_as_processed(self, success=True, error=None):
        """Mark the transaction as processed (completed or failed)"""
        self.processed_at = timezone.now()
        
        if success:
            self.status = 'completed'
        else:
            self.status = 'failed'
            if error:
                self.error_message = str(error)
                
        self.save()
        
        # Update the payment method last_used timestamp
        if self.payment_method and success:
            self.payment_method.last_used = timezone.now()
            self.payment_method.save(update_fields=['last_used'])
            
        return self

class WebhookEvent(models.Model):
    """Records of webhook events from payment providers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(PaymentProvider, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100)
    event_id = models.CharField(max_length=255)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    transaction = models.ForeignKey(
        PaymentTransaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='webhooks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = [('provider', 'event_id')]
    
    def __str__(self):
        return f"{self.provider.name} - {self.event_type} - {self.created_at}"

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