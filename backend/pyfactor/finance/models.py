#/Users/kuoldeng/projectx/backend/pyfactor/finance/models.py
from django.conf import settings
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
    

class FixedAsset(models.Model):
    DEPRECIATION_METHOD_CHOICES = [
        ('SL', 'Straight Line'),
        ('DB', 'Declining Balance'),
        ('SYD', 'Sum of Years Digits'),
        ('UOP', 'Units of Production'),
    ]

    name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=100)
    acquisition_date = models.DateField()
    acquisition_cost = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    depreciation_method = models.CharField(max_length=3, choices=DEPRECIATION_METHOD_CHOICES)
    useful_life = models.PositiveIntegerField(help_text="Useful life in years")
    salvage_value = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    book_value = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    location = models.CharField(max_length=255)
    asset_tag = models.CharField(max_length=100, unique=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    disposal_date = models.DateField(null=True, blank=True)
    disposal_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.book_value = self.acquisition_cost - self.accumulated_depreciation
        super().save(*args, **kwargs)
        
        
class Budget(models.Model):
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    name = models.CharField(max_length=255)
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    department = models.CharField(max_length=100, blank=True)
    approved = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} - {self.period} ({self.start_date} to {self.end_date})"

class BudgetItem(models.Model):
    budget = models.ForeignKey(Budget, related_name='items', on_delete=models.CASCADE)
    account_code = models.CharField(max_length=20)
    account_name = models.CharField(max_length=100)
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    actual_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    @property
    def variance(self):
        return self.actual_amount - self.budgeted_amount

    def __str__(self):
        return f"{self.account_name} - {self.budgeted_amount}"
    
    
class CostCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class CostEntry(models.Model):
    COST_TYPE_CHOICES = [
        ('direct', 'Direct'),
        ('indirect', 'Indirect'),
    ]
    COST_NATURE_CHOICES = [
        ('fixed', 'Fixed'),
        ('variable', 'Variable'),
    ]

    cost_id = models.AutoField(primary_key=True)
    description = models.CharField(max_length=255)
    category = models.ForeignKey(CostCategory, on_delete=models.SET_NULL, null=True)
    cost_type = models.CharField(max_length=10, choices=COST_TYPE_CHOICES)
    cost_nature = models.CharField(max_length=10, choices=COST_NATURE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    date = models.DateField()
    department = models.CharField(max_length=100, blank=True)
    project = models.CharField(max_length=100, blank=True)
    cost_driver = models.CharField(max_length=100, blank=True)
    job_process_id = models.CharField(max_length=50, blank=True)
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)

    @property
    def variance(self):
        return self.amount - self.budgeted_amount

    def __str__(self):
        return f"{self.cost_id} - {self.description}"

class CostAllocation(models.Model):
    cost_entry = models.ForeignKey(CostEntry, on_delete=models.CASCADE, related_name='allocations')
    allocation_base = models.CharField(max_length=100)
    allocation_percentage = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"Allocation for {self.cost_entry} - {self.allocation_base}"
    
    
class IntercompanyTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('sale', 'Sale'),
        ('purchase', 'Purchase'),
        ('loan', 'Loan'),
        ('asset_transfer', 'Asset Transfer'),
        ('service', 'Service'),
        ('cost_allocation', 'Cost Allocation'),
    ]
    
    transaction_id = models.AutoField(primary_key=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    entity_from = models.CharField(max_length=100)
    entity_to = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6)
    date = models.DateField()
    document_reference = models.CharField(max_length=50, blank=True)
    reconciliation_status = models.CharField(max_length=20, default='unmatched')
    transfer_pricing = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.transaction_id} - {self.transaction_type} from {self.entity_from} to {self.entity_to}"

class IntercompanyAccount(models.Model):
    ACCOUNT_TYPES = [
        ('receivable', 'Receivable'),
        ('payable', 'Payable'),
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
        ('loan', 'Loan'),
    ]
    
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    entity = models.CharField(max_length=100)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} - {self.entity}"
    
    
class AuditTrail(models.Model):
    ACTION_TYPES = [
        ('create', 'Create'),
        ('modify', 'Modify'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
    ]
    
    date_time = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=10, choices=ACTION_TYPES)
    transaction_id = models.CharField(max_length=50)
    transaction_type = models.CharField(max_length=50)
    affected_accounts = models.CharField(max_length=255)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    approval_status = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField()
    module = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.date_time} - {self.user} - {self.action_type}"