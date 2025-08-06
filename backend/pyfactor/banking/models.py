#/Users/kuoldeng/projectx/backend/pyfactor/banking/models.py
from django.db import models
import uuid
from decimal import Decimal

# Create your models here.
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from difflib import SequenceMatcher
from custom_auth.tenant_base_model import TenantAwareModel

# Finance models are imported dynamically in methods to avoid circular dependencies

class BankIntegration(TenantAwareModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class PlaidItem(BankIntegration):
    access_token = models.CharField(max_length=100)
    item_id = models.CharField(max_length=100)

class TinkItem(BankIntegration):
    access_token = models.CharField(max_length=100)
    item_id = models.CharField(max_length=100)

class WiseItem(BankIntegration):
    """
    Wise integration for countries without Plaid support.
    Stores only non-sensitive data locally, sensitive data in Stripe.
    """
    # Basic bank information (non-sensitive)
    bank_name = models.CharField(max_length=255)
    bank_country = models.CharField(max_length=2)  # ISO country code
    account_holder_name = models.CharField(max_length=255)
    currency = models.CharField(max_length=3, default='USD')
    
    # Last 4 digits only for display (stored locally)
    account_number_last4 = models.CharField(max_length=4, blank=True)
    routing_number_last4 = models.CharField(max_length=4, blank=True)
    iban_last4 = models.CharField(max_length=4, blank=True)
    
    # Stripe Connect storage for sensitive data
    stripe_external_account_id = models.CharField(max_length=255, blank=True)  # Stripe's ID for the bank account
    stripe_bank_account_token = models.CharField(max_length=255, blank=True)  # Token for the bank account
    
    # Wise-specific fields
    wise_recipient_id = models.CharField(max_length=100, blank=True)  # Wise's ID for this recipient
    
    # Validation and status
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    last_transfer_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'banking_wise_item'
        
    def __str__(self):
        return f"{self.bank_name} ({self.bank_country}) - {self.account_holder_name}"
    
    def get_masked_account_number(self):
        """Return masked account number for display."""
        if self.account_number_last4:
            return f"****{self.account_number_last4}"
        elif self.iban_last4:
            return f"****{self.iban_last4}"
        return "****"

class Country(TenantAwareModel):
    """
    Model to store country information.
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=2, unique=True)
    
    class Meta:
        verbose_name = "Country"
        verbose_name_plural = "Countries"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class PaymentGateway(TenantAwareModel):
    """
    Model to store payment gateway information.
    """
    GATEWAY_CHOICES = [
        ('WISE', 'Wise'),
        ('STRIPE', 'Stripe'),
        ('PLAID', 'Plaid'),
        ('DLOCAL', 'DLocal'),
        ('PAYPAL', 'PayPal'),
        ('MERCADO_PAGO', 'Mercado Pago'),
        ('RAZORPAY', 'Razorpay'),
        ('IYZICO', 'iyzico'),
        ('M_PESA', 'M-Pesa'),
    ]
    
    name = models.CharField(max_length=20, choices=GATEWAY_CHOICES, unique=True)
    
    class Meta:
        verbose_name = "Payment Gateway"
        verbose_name_plural = "Payment Gateways"
    
    def __str__(self):
        return self.get_name_display()

class CountryPaymentGateway(TenantAwareModel):
    """
    Model to map countries to their appropriate payment gateways with priority levels.
    This mapping is used to determine which payment integration to use based on a user's country.
    """
    PRIORITY_CHOICES = [
        (1, 'Primary'),
        (2, 'Secondary'),
        (3, 'Tertiary'),
        (4, 'Quaternary'),
    ]
    
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='gateways')
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.CASCADE)
    priority = models.IntegerField(choices=PRIORITY_CHOICES)
    
    class Meta:
        verbose_name = "Country Payment Gateway"
        verbose_name_plural = "Country Payment Gateways"
        ordering = ['country', 'priority']
        unique_together = ['country', 'priority']
    
    def __str__(self):
        return f"{self.country.name} - {self.gateway.get_name_display()} (Priority: {self.get_priority_display()})"

class BankAccount(TenantAwareModel):
    PURPOSE_CHOICES = [
        ('payroll', 'Payroll'),
        ('payments', 'Customer Payments'),
        ('transfers', 'Vendor Transfers'),
        ('sales', 'Sales Revenue'),
        ('general', 'General Purpose'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
    # Replace ForeignKey with UUID field to break circular dependency
    # employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
    employee_id = models.UUIDField(null=True, blank=True)  # Store the UUID of the employee
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    account_type = models.CharField(max_length=50, null=True, blank=True)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, null=True, blank=True, help_text="The business purpose of this bank account")
    last_synced = models.DateTimeField(auto_now=True)
    
    integration_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    integration_id = models.PositiveIntegerField()
    integration = GenericForeignKey('integration_type', 'integration_id')

    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.user and not self.employee_id:
            raise ValidationError('Either user or employee_id must be set.')
        if self.user and self.employee_id:
            raise ValidationError('Only one of user or employee_id can be set.')
        
    def get_balance_at_date(self, date):
        # Import here to avoid circular imports
        from . import models
        transactions = models.BankTransaction.objects.filter(account=self, date__lte=date)
        credits = transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
        debits = transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
        return self.balance - credits + debits

class BankTransaction(TenantAwareModel):
    TRANSACTION_TYPES = [
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    ]
    
    account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=6, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255)
    date = models.DateTimeField()
    is_reconciled = models.BooleanField(default=False)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    merchant_name = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    
    # Import tracking for CSV imports
    import_id = models.CharField(max_length=255, unique=True, null=True, blank=True)  # Prevent duplicates
    import_batch = models.UUIDField(null=True, blank=True)  # Track import batches
    imported_at = models.DateTimeField(null=True, blank=True)
    imported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='imported_transactions')
    
    def find_matching_finance_transaction(self):
        """
        Find a matching finance transaction for this bank transaction.
        
        Returns a tuple of (transaction, confidence_score) or (None, 0) if no match found
        or if the finance app is not available.
        """
        try:
            # Dynamically import to avoid circular dependencies
            from finance.models import FinanceTransaction
            
            # Look for matches within a 3-day window
            date_range = (self.date - timedelta(days=3), self.date + timedelta(days=3))
            
            # Find potential matches based on amount and date
            potential_matches = FinanceTransaction.objects.filter(
                Q(amount=abs(self.amount)) &
                Q(date__range=date_range)
            )
            
            best_match = None
            highest_confidence = 0
            
            for transaction in potential_matches:
                confidence = self._calculate_match_confidence(transaction)
                if confidence > highest_confidence and confidence >= 0.7:  # Minimum threshold
                    highest_confidence = confidence
                    best_match = transaction
                    
            return best_match, highest_confidence
        except Exception:  # Catch all exceptions to be more robust
            # Finance app might not be installed or properly configured
            return None, 0
    
    def _calculate_match_confidence(self, finance_transaction):
        """
        Calculate confidence score for matching a finance transaction with this bank transaction.
        
        Returns a float between 0 and 1, where 1 is a perfect match.
        """
        try:
            confidence = 0.0
            
            # Exact amount match (50% weight)
            if abs(self.amount) == finance_transaction.amount:
                confidence += 0.5
                
            # Description similarity (30% weight)
            desc_similarity = SequenceMatcher(
                None, 
                self.description.lower(), 
                finance_transaction.description.lower()
            ).ratio()
            confidence += (desc_similarity * 0.3)
            
            # Date proximity (20% weight)
            days_diff = abs((self.date.date() - finance_transaction.date).days)
            if days_diff == 0:
                confidence += 0.2
            elif days_diff <= 1:
                confidence += 0.15
            elif days_diff <= 2:
                confidence += 0.1
            elif days_diff <= 3:
                confidence += 0.05
                
            return confidence
        except Exception:
            # Handle any errors gracefully
            return 0.0

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if not self.account:
            raise ValidationError('Bank account is required')
            
        if self.amount == 0:
            raise ValidationError('Transaction amount cannot be zero')
            
        if self.date and self.date > timezone.now():
            raise ValidationError('Transaction date cannot be in the future')


# Additional models for secure CSV processing and banking tools
class BankingRule(TenantAwareModel):
    """Auto-categorization rules for transactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    
    # Rule conditions
    CONDITION_CHOICES = [
        ('contains', 'Contains'),
        ('equals', 'Equals'),
        ('starts_with', 'Starts with'),
        ('ends_with', 'Ends with'),
        ('amount_equals', 'Amount equals'),
        ('amount_greater', 'Amount greater than'),
        ('amount_less', 'Amount less than'),
        ('amount_between', 'Amount between'),
    ]
    condition_type = models.CharField(max_length=50, choices=CONDITION_CHOICES)
    condition_field = models.CharField(max_length=50, default='description')
    condition_value = models.CharField(max_length=500)
    
    # Actions
    category = models.CharField(max_length=100)
    tags = models.JSONField(default=list, blank=True)
    
    # Usage tracking
    times_used = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'banking_rules'
        ordering = ['-times_used', 'name']

    def __str__(self):
        return f"{self.name} ({self.condition_type}: {self.condition_value})"


class PaymentSettlement(TenantAwareModel):
    """
    Tracks payments from Stripe that need to be settled to user bank accounts via Wise.
    """
    SETTLEMENT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Payment details
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    original_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Amount customer paid
    currency = models.CharField(max_length=3, default='USD')
    
    # Fee breakdown
    stripe_fee = models.DecimalField(max_digits=10, decimal_places=2)  # Stripe's fee (2.9% + $0.30)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)  # Our fee (0.1% + $0.30)
    wise_fee_estimate = models.DecimalField(max_digits=10, decimal_places=2, null=True)  # Estimated Wise fee
    wise_fee_actual = models.DecimalField(max_digits=10, decimal_places=2, null=True)  # Actual Wise fee
    
    # Settlement amounts
    settlement_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Amount to transfer via Wise
    user_receives = models.DecimalField(max_digits=10, decimal_places=2, null=True)  # Final amount user gets
    
    # Transfer details
    wise_transfer_id = models.CharField(max_length=255, blank=True)
    wise_recipient_id = models.CharField(max_length=255, blank=True)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=SETTLEMENT_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    
    # Metadata
    pos_transaction_id = models.CharField(max_length=255, blank=True)  # Reference to POS transaction
    customer_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'banking_payment_settlement'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
        ]
    
    def __str__(self):
        return f"Settlement {self.id} - {self.user} - {self.status}"
    
    def calculate_fees(self):
        """Calculate all fees for this payment."""
        # Stripe fee: 2.9% + $0.30
        self.stripe_fee = (self.original_amount * Decimal('0.029')) + Decimal('0.30')
        
        # Platform fee: 0.1% + $0.30
        self.platform_fee = (self.original_amount * Decimal('0.001')) + Decimal('0.30')
        
        # Amount to transfer via Wise
        self.settlement_amount = self.original_amount - self.stripe_fee - self.platform_fee
        
        self.save()
        
    def mark_completed(self, wise_transfer_id, actual_wise_fee):
        """Mark settlement as completed."""
        self.status = 'completed'
        self.wise_transfer_id = wise_transfer_id
        self.wise_fee_actual = actual_wise_fee
        self.user_receives = self.settlement_amount - actual_wise_fee
        self.completed_at = timezone.now()
        self.save()

class BankingAuditLog(TenantAwareModel):
    """Audit trail for all banking operations - regulatory compliance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    ACTION_CHOICES = [
        ('import_csv', 'Imported CSV'),
        ('create_rule', 'Created Rule'),
        ('update_rule', 'Updated Rule'),
        ('delete_rule', 'Deleted Rule'),
        ('reconcile', 'Reconciled Transactions'),
        ('export_data', 'Exported Data'),
        ('view_transactions', 'Viewed Transactions'),
    ]
    action = models.CharField(max_length=100, choices=ACTION_CHOICES)
    
    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Action details
    affected_records = models.IntegerField(default=0)
    details = models.JSONField(default=dict)
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('partial', 'Partial Success'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True)
    
    # Timing
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'banking_audit_log'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['started_at']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.started_at}"