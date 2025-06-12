#/Users/kuoldeng/projectx/backend/pyfactor/banking/models.py
from django.db import models

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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
    # Replace ForeignKey with UUID field to break circular dependency
    # employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
    employee_id = models.UUIDField(null=True, blank=True)  # Store the UUID of the employee
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    account_type = models.CharField(max_length=50, null=True, blank=True)
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