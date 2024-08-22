#/Users/kuoldeng/projectx/backend/pyfactor/finance/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from sales.models import Bill

class AccountType(models.Model):
    name = models.CharField(max_length=100)
    account_type_id = models.IntegerField(unique=True, null=True)

    def __str__(self):
        return self.name

class AccountManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().using(self._db)

class Account(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('Sales', 'Sales'),
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Accounts Payable', 'Accounts Payable'),
        ('Payroll Liabilities', 'Payroll Liabilities'),
        ('Owner Investment', 'Owner Investment'),
        ('Owner Drawings', 'Owner Drawings'),
        ('Owner Equity', 'Owner Equity'),
        ('Uncategorized Income', 'Uncategorized Income'),
        ('Cash', 'Cash'),
    ]
    account_number = models.CharField(max_length=20, null=True)
    name = models.CharField(max_length=100)
    account_type = models.ForeignKey(AccountType, on_delete=models.CASCADE, related_name='accounts')
    objects = AccountManager()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.id})"

class FinanceTransaction(models.Model):
    TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    date = models.DateField(default=timezone.now)
    description = models.CharField(max_length=255)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    invoice = models.OneToOneField('sales.Invoice', on_delete=models.SET_NULL, related_name='finance_transaction', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    bill = models.ForeignKey(Bill, on_delete=models.SET_NULL, related_name='finance_transactions', null=True, blank=True)  # Add this line



    def update_account_balance(self):
        if self.type == 'credit':
            self.account.balance += self.amount
        elif self.type == 'debit':
            self.account.balance -= self.amount
        self.account.save()

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Transaction amount must be positive.')

class Income(models.Model):
    transaction = models.OneToOneField(FinanceTransaction, on_delete=models.CASCADE, related_name='income')

class Expense(models.Model):
    transaction = models.OneToOneField(FinanceTransaction, on_delete=models.CASCADE, related_name='expense')

class RevenueAccount(models.Model):
    date = models.DateField(default=timezone.now)
    credit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    debit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    type = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    account_type = models.ForeignKey(AccountType, on_delete=models.CASCADE, related_name='revenue_accounts')
    transaction = models.OneToOneField(FinanceTransaction, on_delete=models.SET_NULL, related_name='revenue_account', null=True)

class CashAccount(models.Model):
    date = models.DateField(default=timezone.now)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='cash_accounts')
    transaction = models.OneToOneField(FinanceTransaction, on_delete=models.SET_NULL, related_name='cash_account', null=True)

class SalesTaxAccount(models.Model):
    date = models.DateField(default=timezone.now)
    debit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    credit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    percentage = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    transaction = models.OneToOneField(FinanceTransaction, on_delete=models.SET_NULL, related_name='sales_tax_account', null=True)