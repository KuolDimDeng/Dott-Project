#/Users/kuoldeng/projectx/backend/pyfactor/banking/models.py
from django.db import models

# Create your models here.
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class BankIntegration(models.Model):
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

class BankAccount(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
    employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='bank_accounts', null=True, blank=True)
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
        if not self.user and not self.employee:
            raise ValidationError('Either user or employee must be set.')
        if self.user and self.employee:
            raise ValidationError('Only one of user or employee can be set.')
        
    def get_balance_at_date(self, date):
        transactions = self.banktransaction_set.filter(date__lte=date)
        credits = transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
        debits = transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
        return self.balance - credits + debits

class BankTransaction(models.Model):
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


