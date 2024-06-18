from django.db import models
from django.utils import timezone
from users.models import User
from sales.models import Customer, Vendor, Bill

class AccountType(models.Model):
    name = models.CharField(max_length=100)
    # Add any other fields you need for the AccountType model

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

    def __str__(self):
        return f"{self.name} ({self.id})"

class Transaction(models.Model):
    date = models.DateField(default=timezone.now)
    description = models.CharField(max_length=255)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20)  # Set a default value for 'type' field
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    invoice = models.OneToOneField('sales.Invoice', on_delete=models.CASCADE, related_name='finance_transaction', null=True, blank=True)

class Income(models.Model):
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='income')
    # Add any other fields you need for the Income model

class Expense(models.Model):
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='expense')
    # Add any other fields you need for the Expense model

class RevenueAccount(models.Model):
    date = models.DateField(default=timezone.now)
    credit = models.DecimalField(max_digits=10, decimal_places=2)
    debit = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    account_type = models.ForeignKey(AccountType, on_delete=models.CASCADE, related_name='revenue_accounts')
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='revenue_account', null=True)

class CashAccount(models.Model):
    date = models.DateField(default=timezone.now)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='cash_accounts')
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='cash_account', null=True)
