#/Users/kuoldeng/projectx/backend/pyfactor/finance/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from banking.models import BankAccount, BankTransaction
from purchases.models import Bill

class AccountType(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('Current Asset', 'Current Asset'),
        ('Current Liability', 'Current Liability'),
        ('Equity', 'Equity'),
        ('Revenue', 'Revenue'),
        ('Operating Expense', 'Operating Expense'),
        ('Cost of Goods Sold', 'Cost of Goods Sold'),
        ('Non-Operating Expense', 'Non-Operating Expense'),
    ]
    name = models.CharField(max_length=100, unique=True)
    account_type_id = models.IntegerField(unique=True, null=True)

    class Meta:
        unique_together = ('name', 'account_type_id')

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
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)


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
    
class AccountCategory(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class ChartOfAccount(models.Model):
    account_number = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category = models.ForeignKey(AccountCategory, on_delete=models.CASCADE, related_name='accounts')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children')

    def __str__(self):
        return f"{self.account_number} - {self.name}"
    

class JournalEntry(models.Model):
    date = models.DateField()
    description = models.CharField(max_length=255)
    is_posted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Journal Entry {self.id} - {self.date}"

class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, related_name='lines', on_delete=models.CASCADE)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    description = models.CharField(max_length=255, blank=True)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def __str__(self):
        return f"Line for Journal Entry {self.journal_entry.id} - {self.account.name}"
    


class GeneralLedgerEntry(models.Model):
    account = models.ForeignKey('ChartOfAccount', on_delete=models.PROTECT)    
    date = models.DateField()
    description = models.CharField(max_length=255)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f"{self.date} - {self.account.name} - {self.description}"
    

class AccountReconciliation(models.Model):
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    reconciliation_date = models.DateField()
    statement_balance = models.DecimalField(max_digits=10, decimal_places=2)
    book_balance = models.DecimalField(max_digits=10, decimal_places=2)
    is_reconciled = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

class ReconciliationItem(models.Model):
    reconciliation = models.ForeignKey(AccountReconciliation, on_delete=models.CASCADE, related_name='items')
    bank_transaction = models.ForeignKey(BankTransaction, on_delete=models.SET_NULL, null=True)
    finance_transaction = models.ForeignKey('FinanceTransaction', on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_matched = models.BooleanField(default=False)
    notes = models.CharField(max_length=255, blank=True)
    
    
class MonthEndClosing(models.Model):
    MONTH_CHOICES = [
        (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
        (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
        (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December')
    ]

    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved')
    ]

    month = models.IntegerField(choices=MONTH_CHOICES)
    year = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('month', 'year')

    def __str__(self):
        return f"Month-End Closing - {self.get_month_display()} {self.year}"

class MonthEndTask(models.Model):
    closing = models.ForeignKey(MonthEndClosing, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.closing}"
    
    
class FinancialStatement(models.Model):
    STATEMENT_TYPES = (
        ('PL', 'Profit and Loss'),
        ('BS', 'Balance Sheet'),
        ('CF', 'Cash Flow'),
    )
    statement_type = models.CharField(max_length=2, choices=STATEMENT_TYPES)
    date = models.DateField(default=timezone.now)
    data = models.JSONField()  # This will store the statement data as JSON

    class Meta:
        unique_together = ('statement_type', 'date')

    def __str__(self):
        return f"{self.get_statement_type_display()} - {self.date}"