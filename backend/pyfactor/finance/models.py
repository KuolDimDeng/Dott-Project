#/Users/kuoldeng/projectx/backend/pyfactor/finance/models.py
from django.conf import settings
from django.db import models, transaction as db_transaction
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from users.models import Business
from banking.models import BankAccount, BankTransaction
from custom_auth.models import TenantAwareModel, TenantManager
from purchases.models import Bill
from sales.models import Invoice
from pyfactor.logging_config import get_logger

logger = get_logger()

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

class Account(TenantAwareModel):
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
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('frozen', 'Frozen'),
        ('pending_reconciliation', 'Pending Reconciliation')
    ]
    
    account_number = models.CharField(max_length=20, null=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="accounts", null=True)
    name = models.CharField(max_length=100)
    account_type = models.ForeignKey(AccountType, on_delete=models.CASCADE, related_name='accounts')
    objects = TenantManager()
    all_objects = models.Manager()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='active')
    last_reconciled = models.DateTimeField(null=True, blank=True)
    parent_account = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='sub_accounts')
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'account_number']),
            models.Index(fields=['tenant_id', 'business', 'account_type']),
            models.Index(fields=['tenant_id', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'account_number'], name='unique_account_number_per_tenant'),
        ]
        
    def __str__(self):
        return f"{self.name} ({self.account_number})"
    
    def clean(self):
        if self.balance < 0 and self.account_type.name not in ['Accounts Payable', 'Payroll Liabilities']:
            raise ValidationError('Only liability accounts can have negative balances')
            
        if self.status == 'frozen' and self.transactions.filter(created_at__gt=self.updated_at).exists():
            raise ValidationError('Cannot freeze account with pending transactions')
            
    def get_balance_at_date(self, date):
        """Calculate account balance as of a specific date"""
        transactions = self.transactions.filter(date__lte=date)
        credits = transactions.filter(type='credit').aggregate(models.Sum('amount'))['amount__sum'] or 0
        debits = transactions.filter(type='debit').aggregate(models.Sum('amount'))['amount__sum'] or 0
        return credits - debits
        
    def reconcile(self, statement_balance, reconciliation_date):
        """Reconcile account with bank statement"""
        with db_transaction.atomic():
            # Get all unreconciled transactions up to reconciliation date
            transactions = self.transactions.filter(
                date__lte=reconciliation_date,
                is_reconciled=False
            ).select_for_update()
            
            book_balance = self.get_balance_at_date(reconciliation_date)
            
            # Create reconciliation record
            reconciliation = AccountReconciliation.objects.create(
                bank_account=self,
                reconciliation_date=reconciliation_date,
                statement_balance=statement_balance,
                book_balance=book_balance
            )
            
            # Mark transactions as reconciled
            transactions.update(is_reconciled=True)
            
            # Update account
            self.last_reconciled = timezone.now()
            if self.status == 'pending_reconciliation':
                self.status = 'active'
            self.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=None,  # Should be passed from view
                action_type='reconcile',
                transaction_id=reconciliation.id,
                transaction_type='reconciliation',
                affected_accounts=str(self.id),
                business=self.business,
                metadata={
                    'statement_balance': str(statement_balance),
                    'book_balance': str(book_balance),
                    'difference': str(statement_balance - book_balance),
                    'transaction_count': transactions.count()
                }
            )
            
            return reconciliation

class FinanceTransaction(TenantAwareModel):
    TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('posted', 'Posted'),
        ('reconciled', 'Reconciled'),
        ('voided', 'Voided')
    ]
    
    CATEGORY_CHOICES = [
        ('sale', 'Sale'),
        ('purchase', 'Purchase'),
        ('expense', 'Expense'),
        ('income', 'Income'),
        ('transfer', 'Transfer'),
        ('adjustment', 'Adjustment')
    ]
    
    transaction_id = models.CharField(max_length=50)
    date = models.DateField(default=timezone.now)
    description = models.CharField(max_length=255)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    invoice = models.OneToOneField(Invoice, on_delete=models.SET_NULL, related_name='finance_transaction', null=True, blank=True)
    bill = models.ForeignKey(Bill, on_delete=models.SET_NULL, related_name='finance_transactions', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_transactions')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='posted_transactions')
    posted_at = models.DateTimeField(null=True, blank=True)
    is_reconciled = models.BooleanField(default=False)
    reconciliation = models.ForeignKey('AccountReconciliation', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'transaction_id']),
            models.Index(fields=['tenant_id', 'account', 'date']),
            models.Index(fields=['tenant_id', 'category', 'status']),
            models.Index(fields=['tenant_id', 'business']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'transaction_id'], name='unique_transaction_id_per_tenant'),
        ]
    
    def __str__(self):
        return f"{self.transaction_id} - {self.description} ({self.amount})"
    
    def save(self, *args, **kwargs):
        if not self.transaction_id:
            # Generate unique transaction ID
            prefix = self.category[:3].upper()
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            random_suffix = ''.join(random.choices('0123456789', k=4))
            self.transaction_id = f"{prefix}-{timestamp}-{random_suffix}"
        super().save(*args, **kwargs)

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Transaction amount must be positive.')
            
        if not self.account:
            raise ValidationError('Account is required.')
            
        if self.type == 'debit' and self.account.balance < self.amount:
            raise ValidationError('Insufficient account balance for this debit transaction.')
            
        if self.date and self.date > timezone.now().date():
            raise ValidationError('Transaction date cannot be in the future.')
            
        if self.status == 'posted' and not self.posted_by:
            raise ValidationError('Posted transactions must have a posting user.')
            
        if self.is_reconciled and not self.reconciliation:
            raise ValidationError('Reconciled transactions must be linked to a reconciliation record.')
            
    def update_account_balance(self, user=None):
        """Update account balance with proper validation and audit trail"""
        if self.status != 'pending':
            raise ValidationError('Only pending transactions can update account balance')
            
        with db_transaction.atomic():
            # Lock the account row for update
            account = Account.objects.select_for_update().get(pk=self.account.pk)
            
            # Calculate new balance
            old_balance = account.balance
            if self.type == 'credit':
                account.balance += self.amount
            elif self.type == 'debit':
                account.balance -= self.amount
                
            # Save account changes
            account.save()
            
            # Update transaction status
            self.status = 'posted'
            self.posted_by = user
            self.posted_at = timezone.now()
            self.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='modify',
                transaction_id=self.transaction_id,
                transaction_type='finance_transaction',
                affected_accounts=str(account.id),
                old_value=str(old_balance),
                new_value=str(account.balance),
                business=self.business,
                metadata={
                    'category': self.category,
                    'type': self.type,
                    'amount': str(self.amount)
                }
            )
            
    def void(self, user, reason):
        """Void a transaction with proper validation and audit trail"""
        if self.status not in ['posted', 'reconciled']:
            raise ValidationError('Only posted or reconciled transactions can be voided')
            
        with db_transaction.atomic():
            # Reverse the account balance change
            account = Account.objects.select_for_update().get(pk=self.account.pk)
            old_balance = account.balance
            
            if self.type == 'credit':
                account.balance -= self.amount
            elif self.type == 'debit':
                account.balance += self.amount
                
            account.save()
            
            # Update transaction status
            self.status = 'voided'
            self.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='void',
                transaction_id=self.transaction_id,
                transaction_type='finance_transaction',
                affected_accounts=str(account.id),
                old_value=str(old_balance),
                new_value=str(account.balance),
                business=self.business,
                metadata={
                    'reason': reason,
                    'original_amount': str(self.amount),
                    'original_type': self.type
                }
            )

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
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('posted', 'Posted'),
        ('voided', 'Voided')
    ]
    
    date = models.DateField()
    description = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_entries')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='posted_entries')
    posted_at = models.DateTimeField(null=True, blank=True)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    reference = models.CharField(max_length=50, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
            models.Index(fields=['business']),
        ]

    def __str__(self):
        return f"Journal Entry {self.id} - {self.date}"
    
    def clean(self):
        if self.status == 'posted' and not self.lines.exists():
            raise ValidationError('Cannot post journal entry without lines')
            
        if self.status == 'posted':
            total_debits = sum(line.debit_amount for line in self.lines.all())
            total_credits = sum(line.credit_amount for line in self.lines.all())
            if abs(total_debits - total_credits) > 0.01:  # Allow for small rounding differences
                raise ValidationError('Journal entry is not balanced. Debits must equal credits.')
                
        if self.date and self.date > timezone.now().date():
            raise ValidationError('Journal entry date cannot be in the future')
            
    def post(self, user):
        if self.status != 'draft':
            raise ValidationError('Only draft entries can be posted')
            
        self.clean()  # Validate the entry
        
        with db_transaction.atomic():
            # Update account balances
            for line in self.lines.all():
                account = line.account
                if line.debit_amount > 0:
                    account.balance += line.debit_amount
                if line.credit_amount > 0:
                    account.balance -= line.credit_amount
                account.save()
                
            # Update entry status
            self.status = 'posted'
            self.posted_by = user
            self.posted_at = timezone.now()
            self.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='approve',
                transaction_id=self.id,
                transaction_type='journal_entry',
                affected_accounts=','.join(str(line.account.id) for line in self.lines.all()),
                business=self.business,
                metadata={
                    'total_debits': str(sum(line.debit_amount for line in self.lines.all())),
                    'total_credits': str(sum(line.credit_amount for line in self.lines.all())),
                    'reference': self.reference
                }
            )

class JournalEntryLine(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, related_name='lines', on_delete=models.CASCADE)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    description = models.CharField(max_length=255, blank=True)
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    def clean(self):
        if self.debit_amount > 0 and self.credit_amount > 0:
            raise ValidationError('Line item cannot have both debit and credit amounts')
            
        if self.debit_amount == 0 and self.credit_amount == 0:
            raise ValidationError('Line item must have either a debit or credit amount')
            
        if self.journal_entry.status == 'posted':
            raise ValidationError('Cannot modify lines of a posted journal entry')

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
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]
    
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, to_field="id", db_column="bank_account_id")
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True)
    reconciliation_date = models.DateField()
    statement_balance = models.DecimalField(max_digits=15, decimal_places=2)
    book_balance = models.DecimalField(max_digits=15, decimal_places=2)
    adjusted_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='completed_reconciliations')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_reconciliations')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_reconciliations')
    notes = models.TextField(blank=True)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    period_start = models.DateField()
    period_end = models.DateField()
    
    class Meta:
        indexes = [
            models.Index(fields=['reconciliation_date']),
            models.Index(fields=['status']),
            models.Index(fields=['business']),
        ]
        
    def __str__(self):
        return f"Reconciliation for {self.bank_account} on {self.reconciliation_date}"
        
    def clean(self):
        if self.period_end < self.period_start:
            raise ValidationError('Period end date must be after start date')
            
        if self.reconciliation_date < self.period_start or self.reconciliation_date > self.period_end:
            raise ValidationError('Reconciliation date must be within the period range')
            
        if self.status == 'completed' and not self.completed_by:
            raise ValidationError('Completed reconciliations must have a completing user')
            
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved reconciliations must have an approving user')
            
    def complete(self, user):
        """Complete the reconciliation process"""
        if self.status != 'in_progress':
            raise ValidationError('Only in-progress reconciliations can be completed')
            
        unmatched_items = self.items.filter(is_matched=False)
        if unmatched_items.exists():
            raise ValidationError('Cannot complete reconciliation with unmatched items')
            
        with db_transaction.atomic():
            # Calculate final balances
            matched_items = self.items.filter(is_matched=True)
            total_adjustments = sum(item.adjustment_amount for item in matched_items)
            self.adjusted_balance = self.book_balance + total_adjustments
            
            # Update status
            self.status = 'completed'
            self.completed_by = user
            self.completed_at = timezone.now()
            self.save()
            
            # Update account status
            self.account.last_reconciled = timezone.now()
            if self.account.status == 'pending_reconciliation':
                self.account.status = 'active'
            self.account.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='reconcile',
                transaction_id=self.id,
                transaction_type='reconciliation',
                affected_accounts=str(self.account.id),
                business=self.business,
                metadata={
                    'statement_balance': str(self.statement_balance),
                    'book_balance': str(self.book_balance),
                    'adjusted_balance': str(self.adjusted_balance),
                    'total_adjustments': str(total_adjustments),
                    'matched_items_count': matched_items.count()
                }
            )
            
    def approve(self, user):
        """Approve a completed reconciliation"""
        if self.status != 'completed':
            raise ValidationError('Only completed reconciliations can be approved')
            
        if user == self.completed_by:
            raise ValidationError('Reconciliation must be approved by a different user')
            
        self.status = 'approved'
        self.approved_by = user
        self.save()
        
        AuditTrail.log_transaction(
            user=user,
            action_type='approve',
            transaction_id=self.id,
            transaction_type='reconciliation',
            affected_accounts=str(self.account.id),
            business=self.business,
            metadata={
                'statement_balance': str(self.statement_balance),
                'adjusted_balance': str(self.adjusted_balance)
            }
        )

class ReconciliationItem(models.Model):
    MATCH_STATUS_CHOICES = [
        ('unmatched', 'Unmatched'),
        ('auto_matched', 'Auto Matched'),
        ('manually_matched', 'Manually Matched'),
        ('reviewed', 'Reviewed'),
        ('disputed', 'Disputed')
    ]
    
    reconciliation = models.ForeignKey(AccountReconciliation, on_delete=models.CASCADE, related_name='items')
    bank_transaction = models.ForeignKey(BankTransaction, on_delete=models.SET_NULL, null=True)
    finance_transaction = models.ForeignKey('FinanceTransaction', on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    match_status = models.CharField(max_length=20, choices=MATCH_STATUS_CHOICES, default='unmatched')
    match_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    match_criteria = models.JSONField(default=dict)
    adjustment_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    adjustment_reason = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    matched_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='matched_items')
    matched_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_items')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['match_status']),
            models.Index(fields=['matched_at']),
        ]
        
    def __str__(self):
        return f"Reconciliation Item {self.id} - {self.match_status}"
    
    def clean(self):
        if not self.bank_transaction and not self.finance_transaction:
            raise ValidationError('At least one transaction (bank or finance) must be specified.')
            
        if self.bank_transaction and self.finance_transaction:
            bank_amount = self.bank_transaction.amount
            finance_amount = self.finance_transaction.amount
            
            # Check if amounts match within tolerance, considering adjustments
            total_amount = finance_amount + self.adjustment_amount
            if abs(bank_amount - total_amount) > 0.01:
                raise ValidationError('Bank and finance transaction amounts must match (including adjustments).')
                
        if self.match_status in ['auto_matched', 'manually_matched'] and not self.matched_by:
            raise ValidationError('Matched items must have a matching user.')
            
        if self.match_status == 'reviewed' and not self.reviewed_by:
            raise ValidationError('Reviewed items must have a reviewing user.')
            
        if self.match_status == 'auto_matched' and self.match_confidence < 0.7:
            raise ValidationError('Match confidence too low for automatic matching.')
            
    def match(self, user, manual=False):
        """Match this reconciliation item"""
        if self.match_status != 'unmatched':
            raise ValidationError('Can only match unmatched items')
            
        self.matched_by = user
        self.matched_at = timezone.now()
        self.match_status = 'manually_matched' if manual else 'auto_matched'
        self.save()
        
        # Update related transactions
        if self.finance_transaction:
            self.finance_transaction.is_reconciled = True
            self.finance_transaction.reconciliation = self.reconciliation
            self.finance_transaction.save()
            
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='reconcile',
            transaction_id=self.id,
            transaction_type='reconciliation',
            affected_accounts=str(self.reconciliation.account.id),
            business=self.reconciliation.business,
            metadata={
                'match_type': 'manual' if manual else 'auto',
                'match_confidence': str(self.match_confidence),
                'adjustment_amount': str(self.adjustment_amount),
                'bank_transaction_id': str(self.bank_transaction.id) if self.bank_transaction else None,
                'finance_transaction_id': str(self.finance_transaction.id) if self.finance_transaction else None
            }
        )
        
    def unmatch(self, user, reason):
        """Unmatch this reconciliation item"""
        if self.match_status == 'unmatched':
            raise ValidationError('Item is already unmatched')
            
        old_status = self.match_status
        
        self.match_status = 'unmatched'
        self.matched_by = None
        self.matched_at = None
        self.reviewed_by = None
        self.reviewed_at = None
        self.save()
        
        # Update related transactions
        if self.finance_transaction:
            self.finance_transaction.is_reconciled = False
            self.finance_transaction.reconciliation = None
            self.finance_transaction.save()
            
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='reconciliation',
            affected_accounts=str(self.reconciliation.account.id),
            old_value=old_status,
            new_value='unmatched',
            business=self.reconciliation.business,
            metadata={
                'reason': reason,
                'bank_transaction_id': str(self.bank_transaction.id) if self.bank_transaction else None,
                'finance_transaction_id': str(self.finance_transaction.id) if self.finance_transaction else None
            }
        )
    
    
class MonthEndClosing(models.Model):
    MONTH_CHOICES = [
        (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
        (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
        (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December')
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('pending_review', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('reopened', 'Reopened')
    ]
    
    month = models.IntegerField(choices=MONTH_CHOICES)
    year = models.IntegerField()
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='completed_closings')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_closings')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_closings')
    notes = models.TextField(blank=True)
    closing_date = models.DateField()
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    net_income = models.DecimalField(max_digits=15, decimal_places=2, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('month', 'year', 'business')
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['business', 'year', 'month']),
        ]

    def __str__(self):
        return f"Month-End Closing - {self.get_month_display()} {self.year}"
        
    def clean(self):
        if self.month < 1 or self.month > 12:
            raise ValidationError('Invalid month')
            
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved closings must have an approving user')
            
        if self.status == 'reviewed' and not self.reviewed_by:
            raise ValidationError('Reviewed closings must have a reviewing user')
            
        if self.status == 'completed' and not self.completed_by:
            raise ValidationError('Completed closings must have a completing user')
            
    def start_closing(self, user):
        """Start the month-end closing process"""
        if self.status != 'draft':
            raise ValidationError('Only draft closings can be started')
            
        self.status = 'in_progress'
        self.save()
        
        # Create default tasks
        MonthEndTask.create_default_tasks(self)
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='month_end',
            affected_accounts='',
            business=self.business,
            metadata={
                'action': 'start_closing',
                'month': self.month,
                'year': self.year
            }
        )
        
    def complete(self, user):
        """Complete the month-end closing process"""
        if self.status != 'in_progress':
            raise ValidationError('Only in-progress closings can be completed')
            
        incomplete_tasks = self.tasks.filter(is_completed=False)
        if incomplete_tasks.exists():
            raise ValidationError('All tasks must be completed before closing')
            
        with db_transaction.atomic():
            # Calculate final totals
            self.calculate_totals()
            
            # Update status
            self.status = 'pending_review'
            self.completed_by = user
            self.completed_at = timezone.now()
            self.save()
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='modify',
                transaction_id=self.id,
                transaction_type='month_end',
                affected_accounts='',
                business=self.business,
                metadata={
                    'action': 'complete',
                    'total_revenue': str(self.total_revenue),
                    'total_expenses': str(self.total_expenses),
                    'net_income': str(self.net_income)
                }
            )
            
    def calculate_totals(self):
        """Calculate revenue, expenses and net income for the period"""
        start_date = timezone.datetime(self.year, self.month, 1).date()
        if self.month == 12:
            end_date = timezone.datetime(self.year + 1, 1, 1).date()
        else:
            end_date = timezone.datetime(self.year, self.month + 1, 1).date()
            
        transactions = FinanceTransaction.objects.filter(
            business=self.business,
            date__gte=start_date,
            date__lt=end_date,
            status='posted'
        )
        
        self.total_revenue = transactions.filter(
            account__account_type__name='Revenue'
        ).aggregate(models.Sum('amount'))['amount__sum'] or 0
        
        self.total_expenses = transactions.filter(
            account__account_type__name__in=['Operating Expense', 'Cost of Goods Sold']
        ).aggregate(models.Sum('amount'))['amount__sum'] or 0
        
        self.net_income = self.total_revenue - self.total_expenses
        self.save()

class MonthEndTask(models.Model):
    TASK_TYPES = [
        ('reconciliation', 'Bank Reconciliation'),
        ('adjustments', 'Adjusting Entries'),
        ('accruals', 'Accruals'),
        ('depreciation', 'Depreciation'),
        ('inventory', 'Inventory Count'),
        ('review', 'Account Review')
    ]
    
    closing = models.ForeignKey(MonthEndClosing, on_delete=models.CASCADE, related_name='tasks')
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sequence = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['sequence']
        
    def __str__(self):
        return f"{self.name} - {self.closing}"
        
    @classmethod
    def create_default_tasks(cls, closing):
        """Create default tasks for a new closing"""
        default_tasks = [
            {
                'task_type': 'reconciliation',
                'name': 'Bank Reconciliation',
                'description': 'Reconcile all bank accounts',
                'sequence': 1
            },
            {
                'task_type': 'adjustments',
                'name': 'Review and Post Adjusting Entries',
                'description': 'Review and post all necessary adjusting entries',
                'sequence': 2
            },
            {
                'task_type': 'accruals',
                'name': 'Record Accruals',
                'description': 'Record all necessary accruals',
                'sequence': 3
            },
            {
                'task_type': 'depreciation',
                'name': 'Record Depreciation',
                'description': 'Calculate and record monthly depreciation',
                'sequence': 4
            },
            {
                'task_type': 'inventory',
                'name': 'Inventory Reconciliation',
                'description': 'Reconcile inventory counts and values',
                'sequence': 5
            },
            {
                'task_type': 'review',
                'name': 'Final Account Review',
                'description': 'Review all account balances for accuracy',
                'sequence': 6
            }
        ]
        
        for task in default_tasks:
            cls.objects.create(closing=closing, **task)
    
    
class FinancialStatement(models.Model):
    STATEMENT_TYPES = [
        ('PL', 'Profit and Loss'),
        ('BS', 'Balance Sheet'),
        ('CF', 'Cash Flow'),
        ('TB', 'Trial Balance'),
        ('AR', 'Accounts Receivable Aging'),
        ('AP', 'Accounts Payable Aging'),
        ('CC', 'Cost Center Report'),
        ('BR', 'Budget Report')
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('published', 'Published'),
        ('archived', 'Archived')
    ]
    
    PERIOD_TYPES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
        ('ytd', 'Year to Date'),
        ('custom', 'Custom Period')
    ]
    
    # Basic information
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    statement_type = models.CharField(max_length=2, choices=STATEMENT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Period information
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    fiscal_year = models.IntegerField()
    
    # Statement data
    data = models.JSONField()  # Structured financial data
    comparative_data = models.JSONField(null=True, blank=True)  # Previous period data for comparison
    notes = models.JSONField(default=dict, blank=True)  # Statement notes and annotations
    
    # Formatting and display
    currency = models.CharField(max_length=3, default='USD')
    display_options = models.JSONField(default=dict, blank=True)  # Display preferences
    
    # Additional information
    department = models.CharField(max_length=100, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    segment = models.CharField(max_length=100, blank=True)
    
    # Workflow
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='generated_statements')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_statements')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_statements')
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    # Version control
    version = models.IntegerField(default=1)
    is_revised = models.BooleanField(default=False)
    revision_reason = models.TextField(blank=True)
    previous_version = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='revisions')
    
    class Meta:
        indexes = [
            models.Index(fields=['statement_type']),
            models.Index(fields=['status']),
            models.Index(fields=['business', 'fiscal_year']),
            models.Index(fields=['start_date', 'end_date']),
        ]
        unique_together = ('business', 'statement_type', 'start_date', 'end_date', 'version')

    def __str__(self):
        return f"{self.get_statement_type_display()} - {self.start_date} to {self.end_date} (v{self.version})"
        
    def clean(self):
        if self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date')
            
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved statements must have an approving user')
            
        if self.status == 'reviewed' and not self.reviewed_by:
            raise ValidationError('Reviewed statements must have a reviewing user')
            
        if self.is_revised and not self.previous_version:
            raise ValidationError('Revised statements must reference previous version')
            
    def approve(self, user):
        """Approve the financial statement"""
        if self.status != 'reviewed':
            raise ValidationError('Only reviewed statements can be approved')
            
        if user == self.generated_by:
            raise ValidationError('Statement must be approved by a different user')
            
        self.status = 'approved'
        self.approved_by = user
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='approve',
            transaction_id=self.id,
            transaction_type='financial_statement',
            affected_accounts='',
            business=self.business,
            metadata={
                'statement_type': self.get_statement_type_display(),
                'period': f"{self.start_date} to {self.end_date}",
                'version': self.version
            }
        )
        
    def publish(self, user):
        """Publish the financial statement"""
        if self.status != 'approved':
            raise ValidationError('Only approved statements can be published')
            
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='financial_statement',
            affected_accounts='',
            old_value='approved',
            new_value='published',
            business=self.business,
            metadata={
                'statement_type': self.get_statement_type_display(),
                'period': f"{self.start_date} to {self.end_date}",
                'version': self.version
            }
        )
        
    def create_revision(self, user, reason):
        """Create a new revision of the statement"""
        if self.status not in ['published', 'archived']:
            raise ValidationError('Only published or archived statements can be revised')
            
        # Create new version
        new_version = self
        new_version.pk = None
        new_version.version = self.version + 1
        new_version.is_revised = True
        new_version.revision_reason = reason
        new_version.previous_version = self
        new_version.status = 'draft'
        new_version.generated_by = user
        new_version.reviewed_by = None
        new_version.approved_by = None
        new_version.published_at = None
        new_version.archived_at = None
        new_version.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='create',
            transaction_id=new_version.id,
            transaction_type='financial_statement',
            affected_accounts='',
            business=self.business,
            metadata={
                'action': 'revision',
                'previous_version': self.version,
                'new_version': new_version.version,
                'reason': reason
            }
        )
        
        return new_version
        
    def archive(self, user):
        """Archive the financial statement"""
        if self.status != 'published':
            raise ValidationError('Only published statements can be archived')
            
        self.status = 'archived'
        self.archived_at = timezone.now()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='financial_statement',
            affected_accounts='',
            old_value='published',
            new_value='archived',
            business=self.business,
            metadata={
                'statement_type': self.get_statement_type_display(),
                'period': f"{self.start_date} to {self.end_date}",
                'version': self.version
            }
        )
        
    def get_comparative_data(self):
        """Get comparative data for the same period in previous year"""
        previous_start = self.start_date - timezone.timedelta(days=365)
        previous_end = self.end_date - timezone.timedelta(days=365)
        
        try:
            previous_statement = FinancialStatement.objects.get(
                business=self.business,
                statement_type=self.statement_type,
                start_date=previous_start,
                end_date=previous_end,
                status='published'
            )
            return previous_statement.data
        except FinancialStatement.DoesNotExist:
            return None
    

class FixedAsset(models.Model):
    DEPRECIATION_METHOD_CHOICES = [
        ('SL', 'Straight Line'),
        ('DB', 'Declining Balance'),
        ('SYD', 'Sum of Years Digits'),
        ('UOP', 'Units of Production'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('disposed', 'Disposed'),
        ('impaired', 'Impaired'),
        ('maintenance', 'Under Maintenance'),
        ('retired', 'Retired')
    ]
    
    ASSET_TYPE_CHOICES = [
        ('land', 'Land'),
        ('building', 'Building'),
        ('equipment', 'Equipment'),
        ('vehicle', 'Vehicle'),
        ('furniture', 'Furniture'),
        ('computer', 'Computer Equipment'),
        ('software', 'Software'),
        ('other', 'Other')
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    department = models.CharField(max_length=100, blank=True)
    
    # Acquisition details
    acquisition_date = models.DateField()
    acquisition_cost = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    vendor = models.CharField(max_length=255, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    purchase_order = models.CharField(max_length=100, blank=True)
    
    # Depreciation settings
    depreciation_method = models.CharField(max_length=3, choices=DEPRECIATION_METHOD_CHOICES)
    useful_life = models.PositiveIntegerField(help_text="Useful life in years")
    salvage_value = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    depreciation_start_date = models.DateField()
    last_depreciation_date = models.DateField(null=True, blank=True)
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    book_value = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Asset tracking
    location = models.CharField(max_length=255)
    asset_tag = models.CharField(max_length=100, unique=True)
    serial_number = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    
    # Maintenance and warranty
    warranty_expiry = models.DateField(null=True, blank=True)
    maintenance_schedule = models.JSONField(default=dict, blank=True)
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)
    
    # Disposal information
    disposal_date = models.DateField(null=True, blank=True)
    disposal_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    disposal_method = models.CharField(max_length=100, blank=True)
    disposal_reason = models.TextField(blank=True)
    
    # Insurance and valuation
    insured_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    insurance_policy = models.CharField(max_length=100, blank=True)
    last_valuation_date = models.DateField(null=True, blank=True)
    current_market_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_assets')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['asset_tag']),
            models.Index(fields=['status']),
            models.Index(fields=['business', 'asset_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.asset_tag})"
        
    def clean(self):
        if self.disposal_date and self.disposal_date < self.acquisition_date:
            raise ValidationError('Disposal date cannot be before acquisition date')
            
        if self.depreciation_start_date < self.acquisition_date:
            raise ValidationError('Depreciation cannot start before acquisition date')
            
        if self.status == 'disposed' and not self.disposal_date:
            raise ValidationError('Disposed assets must have a disposal date')
            
        if self.disposal_date and not self.disposal_price:
            raise ValidationError('Disposal price is required when asset is disposed')
            
    def save(self, *args, **kwargs):
        # Calculate book value
        self.book_value = self.acquisition_cost - self.accumulated_depreciation
        
        # Update maintenance dates if schedule exists
        if self.maintenance_schedule and self.last_maintenance_date:
            frequency = self.maintenance_schedule.get('frequency_days')
            if frequency:
                self.next_maintenance_date = self.last_maintenance_date + timezone.timedelta(days=frequency)
                
        super().save(*args, **kwargs)
        
    def calculate_depreciation(self, as_of_date=None):
        """Calculate depreciation amount based on method"""
        if not as_of_date:
            as_of_date = timezone.now().date()
            
        if self.status != 'active' or as_of_date < self.depreciation_start_date:
            return 0
            
        years_used = (as_of_date - self.depreciation_start_date).days / 365.25
        if years_used >= self.useful_life:
            return 0
            
        depreciable_base = self.acquisition_cost - self.salvage_value
        
        if self.depreciation_method == 'SL':
            annual_depreciation = depreciable_base / self.useful_life
            return annual_depreciation
            
        elif self.depreciation_method == 'DB':
            rate = 2 / self.useful_life  # Double declining rate
            return self.book_value * rate
            
        elif self.depreciation_method == 'SYD':
            remaining_life = self.useful_life - years_used
            sum_of_years = (self.useful_life * (self.useful_life + 1)) / 2
            return (remaining_life / sum_of_years) * depreciable_base
            
        return 0
        
    def record_maintenance(self, date, cost, description, performed_by):
        """Record a maintenance event"""
        if self.status not in ['active', 'maintenance']:
            raise ValidationError('Cannot record maintenance for inactive assets')
            
        maintenance_history = self.metadata.get('maintenance_history', [])
        maintenance_history.append({
            'date': date.isoformat(),
            'cost': str(cost),
            'description': description,
            'performed_by': performed_by,
        })
        
        self.metadata['maintenance_history'] = maintenance_history
        self.last_maintenance_date = date
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=None,  # Should be passed from view
            action_type='modify',
            transaction_id=self.id,
            transaction_type='fixed_asset',
            affected_accounts='',
            business=self.business,
            metadata={
                'action': 'maintenance',
                'cost': str(cost),
                'description': description
            }
        )
        
    def dispose(self, date, price, method, reason, user):
        """Record asset disposal"""
        if self.status == 'disposed':
            raise ValidationError('Asset is already disposed')
            
        with db_transaction.atomic():
            old_status = self.status
            
            self.status = 'disposed'
            self.disposal_date = date
            self.disposal_price = price
            self.disposal_method = method
            self.disposal_reason = reason
            self.save()
            
            # Create disposal journal entry
            gain_loss = price - self.book_value
            
            # Create audit trail
            AuditTrail.log_transaction(
                user=user,
                action_type='modify',
                transaction_id=self.id,
                transaction_type='fixed_asset',
                affected_accounts='',
                old_value=old_status,
                new_value='disposed',
                business=self.business,
                metadata={
                    'action': 'disposal',
                    'price': str(price),
                    'method': method,
                    'gain_loss': str(gain_loss)
                }
            )
            
    def record_valuation(self, date, value, method, appraiser=None):
        """Record a new valuation"""
        valuation_history = self.metadata.get('valuation_history', [])
        valuation_history.append({
            'date': date.isoformat(),
            'value': str(value),
            'method': method,
            'appraiser': appraiser,
        })
        
        self.metadata['valuation_history'] = valuation_history
        self.last_valuation_date = date
        self.current_market_value = value
        self.save()
        
        
class Budget(TenantAwareModel):
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('closed', 'Closed')
    ]
    
    CATEGORY_CHOICES = [
        ('operating', 'Operating Budget'),
        ('capital', 'Capital Budget'),
        ('project', 'Project Budget'),
        ('department', 'Department Budget'),
        ('cash_flow', 'Cash Flow Budget')
    ]
    
    name = models.CharField(max_length=255)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    fiscal_year = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Budget amounts
    total_budget = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_actual = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_committed = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_available = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Approval workflow
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='submitted_budgets')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviewed_budgets')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_budgets')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'business', 'fiscal_year']),
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'category']),
        ]
        
    def __str__(self):
        return f"{self.name} - {self.fiscal_year} ({self.get_status_display()})"
        
    def clean(self):
        if self.end_date <= self.start_date:
            raise ValidationError('End date must be after start date')
            
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved budgets must have an approving user')
            
        if self.status == 'submitted' and not self.submitted_by:
            raise ValidationError('Submitted budgets must have a submitting user')
            
    def save(self, *args, **kwargs):
        # Calculate totals
        self.total_budget = sum(item.budgeted_amount for item in self.items.all())
        self.total_actual = sum(item.actual_amount for item in self.items.all())
        self.total_committed = sum(item.committed_amount for item in self.items.all())
        self.total_available = self.total_budget - self.total_actual - self.total_committed
        super().save(*args, **kwargs)
        
    def submit(self, user):
        """Submit budget for review"""
        if self.status != 'draft':
            raise ValidationError('Only draft budgets can be submitted')
            
        if not self.items.exists():
            raise ValidationError('Cannot submit empty budget')
            
        self.status = 'submitted'
        self.submitted_by = user
        self.submitted_at = timezone.now()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='budget',
            affected_accounts='',
            business=self.business,
            metadata={
                'action': 'submit',
                'total_budget': str(self.total_budget)
            }
        )
        
    def approve(self, user):
        """Approve the budget"""
        if self.status not in ['submitted', 'under_review']:
            raise ValidationError('Only submitted or reviewed budgets can be approved')
            
        if user == self.submitted_by:
            raise ValidationError('Budget must be approved by a different user')
            
        self.status = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='approve',
            transaction_id=self.id,
            transaction_type='budget',
            affected_accounts='',
            business=self.business,
            metadata={
                'total_budget': str(self.total_budget),
                'total_available': str(self.total_available)
            }
        )
        
    def reject(self, user, reason):
        """Reject the budget"""
        if self.status not in ['submitted', 'under_review']:
            raise ValidationError('Only submitted or reviewed budgets can be rejected')
            
        old_status = self.status
        self.status = 'rejected'
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='budget',
            affected_accounts='',
            old_value=old_status,
            new_value='rejected',
            business=self.business,
            metadata={
                'reason': reason,
                'total_budget': str(self.total_budget)
            }
        )
        
    def close(self, user):
        """Close the budget"""
        if self.status != 'active':
            raise ValidationError('Only active budgets can be closed')
            
        if timezone.now().date() < self.end_date:
            raise ValidationError('Cannot close budget before end date')
            
        self.status = 'closed'
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.id,
            transaction_type='budget',
            affected_accounts='',
            old_value='active',
            new_value='closed',
            business=self.business,
            metadata={
                'total_budget': str(self.total_budget),
                'total_actual': str(self.total_actual),
                'variance': str(self.total_budget - self.total_actual)
            }
        )

class BudgetItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
        ('capital', 'Capital'),
        ('transfer', 'Transfer')
    ]
    
    budget = models.ForeignKey(Budget, related_name='items', on_delete=models.CASCADE)
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    
    # Budget amounts
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    actual_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    committed_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    forecast_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Distribution
    monthly_distribution = models.JSONField(default=dict, blank=True)  # Monthly breakdown of budget
    cost_center = models.CharField(max_length=100, blank=True)
    project_code = models.CharField(max_length=100, blank=True)
    
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['item_type']),
            models.Index(fields=['account']),
        ]
    
    def __str__(self):
        return f"{self.account.name} - {self.budgeted_amount}"
        
    @property
    def variance(self):
        """Calculate variance between budgeted and actual amounts"""
        return self.actual_amount - self.budgeted_amount
        
    @property
    def available_amount(self):
        """Calculate remaining available budget"""
        return self.budgeted_amount - self.actual_amount - self.committed_amount
        
    @property
    def utilization_percentage(self):
        """Calculate budget utilization percentage"""
        if self.budgeted_amount == 0:
            return 0
        return ((self.actual_amount + self.committed_amount) / self.budgeted_amount) * 100
        
    def clean(self):
        if self.committed_amount < 0:
            raise ValidationError('Committed amount cannot be negative')
            
        if self.actual_amount < 0:
            raise ValidationError('Actual amount cannot be negative')
            
        if self.budget.status == 'approved' and self.budget.items.count() == 0:
            raise ValidationError('Cannot add items to an approved budget')
    
    
class CostCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='subcategories')
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['business']),
        ]
        unique_together = ('business', 'code')

    def __str__(self):
        return f"{self.code} - {self.name}"

    def clean(self):
        if self.parent and self.parent.business != self.business:
            raise ValidationError('Parent category must belong to the same business')

class CostEntry(models.Model):
    COST_TYPE_CHOICES = [
        ('direct', 'Direct'),
        ('indirect', 'Indirect'),
    ]
    
    COST_NATURE_CHOICES = [
        ('fixed', 'Fixed'),
        ('variable', 'Variable'),
        ('mixed', 'Mixed'),
        ('step', 'Step'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('posted', 'Posted'),
        ('voided', 'Voided')
    ]

    # Basic information
    cost_id = models.AutoField(primary_key=True)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    description = models.CharField(max_length=255)
    category = models.ForeignKey(CostCategory, on_delete=models.PROTECT)
    cost_type = models.CharField(max_length=10, choices=COST_TYPE_CHOICES)
    cost_nature = models.CharField(max_length=10, choices=COST_NATURE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Amounts
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='USD')
    
    # Dates
    date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    
    # Organization
    department = models.CharField(max_length=100, blank=True)
    project = models.CharField(max_length=100, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    cost_driver = models.CharField(max_length=100, blank=True)
    job_process_id = models.CharField(max_length=50, blank=True)
    
    # References
    invoice_number = models.CharField(max_length=100, blank=True)
    purchase_order = models.CharField(max_length=100, blank=True)
    vendor = models.CharField(max_length=255, blank=True)
    
    # Attachments and notes
    attachments = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Workflow
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_costs')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_costs')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='posted_costs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['date']),
            models.Index(fields=['business', 'category']),
        ]

    def __str__(self):
        return f"{self.cost_id} - {self.description}"
        
    def clean(self):
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved costs must have an approving user')
            
        if self.status == 'posted' and not self.posted_by:
            raise ValidationError('Posted costs must have a posting user')
            
        if self.total_amount != self.amount + self.tax_amount:
            raise ValidationError('Total amount must equal amount plus tax amount')
            
    @property
    def variance(self):
        """Calculate variance between actual and budgeted amounts"""
        return self.amount - self.budgeted_amount
        
    @property
    def variance_percentage(self):
        """Calculate variance as a percentage of budget"""
        if self.budgeted_amount == 0:
            return 0
        return (self.variance / self.budgeted_amount) * 100
        
    def approve(self, user):
        """Approve the cost entry"""
        if self.status != 'pending':
            raise ValidationError('Only pending costs can be approved')
            
        self.status = 'approved'
        self.approved_by = user
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='approve',
            transaction_id=self.cost_id,
            transaction_type='cost_entry',
            affected_accounts='',
            business=self.business,
            metadata={
                'amount': str(self.amount),
                'category': self.category.name
            }
        )
        
    def post(self, user):
        """Post the cost entry"""
        if self.status != 'approved':
            raise ValidationError('Only approved costs can be posted')
            
        self.status = 'posted'
        self.posted_by = user
        self.posting_date = timezone.now().date()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.cost_id,
            transaction_type='cost_entry',
            affected_accounts='',
            old_value='approved',
            new_value='posted',
            business=self.business,
            metadata={
                'amount': str(self.amount),
                'category': self.category.name
            }
        )
        
    def void(self, user, reason):
        """Void the cost entry"""
        if self.status not in ['posted', 'approved']:
            raise ValidationError('Only posted or approved costs can be voided')
            
        old_status = self.status
        self.status = 'voided'
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='void',
            transaction_id=self.cost_id,
            transaction_type='cost_entry',
            affected_accounts='',
            old_value=old_status,
            new_value='voided',
            business=self.business,
            metadata={
                'reason': reason,
                'amount': str(self.amount),
                'category': self.category.name
            }
        )

class CostAllocation(models.Model):
    ALLOCATION_METHOD_CHOICES = [
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage'),
        ('unit', 'Per Unit'),
        ('activity', 'Activity Based')
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('inactive', 'Inactive')
    ]
    
    cost_entry = models.ForeignKey(CostEntry, on_delete=models.CASCADE, related_name='allocations')
    department = models.CharField(max_length=100)
    cost_center = models.CharField(max_length=100)
    project = models.CharField(max_length=100, blank=True)
    allocation_method = models.CharField(max_length=20, choices=ALLOCATION_METHOD_CHOICES)
    allocation_base = models.CharField(max_length=100)
    allocation_percentage = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    units = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['department', 'cost_center']),
        ]

    def __str__(self):
        return f"Allocation for {self.cost_entry} - {self.allocation_base}"
        
    def clean(self):
        if self.allocation_method == 'percentage' and self.allocation_percentage > 100:
            raise ValidationError('Allocation percentage cannot exceed 100%')
            
        if self.allocation_method == 'unit' and (not self.units or not self.unit_cost):
            raise ValidationError('Units and unit cost are required for unit-based allocation')
            
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError('End date must be after start date')
            
    def calculate_allocated_amount(self):
        """Calculate allocated amount based on allocation method"""
        if self.allocation_method == 'percentage':
            return (self.cost_entry.amount * self.allocation_percentage) / 100
        elif self.allocation_method == 'unit':
            return self.units * self.unit_cost
        return self.allocated_amount
    
    
class IntercompanyTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('sale', 'Sale'),
        ('purchase', 'Purchase'),
        ('loan', 'Loan'),
        ('asset_transfer', 'Asset Transfer'),
        ('service', 'Service'),
        ('cost_allocation', 'Cost Allocation'),
        ('dividend', 'Dividend'),
        ('investment', 'Investment')
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('posted', 'Posted'),
        ('voided', 'Voided')
    ]
    
    RECONCILIATION_STATUS = [
        ('unmatched', 'Unmatched'),
        ('partially_matched', 'Partially Matched'),
        ('fully_matched', 'Fully Matched'),
        ('disputed', 'Disputed')
    ]
    
    # Basic information
    transaction_id = models.AutoField(primary_key=True)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Entities involved
    entity_from = models.CharField(max_length=100)
    entity_to = models.CharField(max_length=100)
    department_from = models.CharField(max_length=100, blank=True)
    department_to = models.CharField(max_length=100, blank=True)
    
    # Amounts and currency
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3)
    converted_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Dates
    date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    
    # References
    document_reference = models.CharField(max_length=50, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    purchase_order = models.CharField(max_length=100, blank=True)
    contract_reference = models.CharField(max_length=100, blank=True)
    
    # Status tracking
    reconciliation_status = models.CharField(max_length=20, choices=RECONCILIATION_STATUS, default='unmatched')
    matched_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Transfer pricing
    transfer_pricing_method = models.CharField(max_length=100, blank=True)
    transfer_pricing_documentation = models.JSONField(default=dict, blank=True)
    
    # Additional information
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    attachments = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Workflow
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_intercompany_transactions')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='approved_intercompany_transactions')
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='posted_intercompany_transactions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['date']),
            models.Index(fields=['business', 'transaction_type']),
            models.Index(fields=['entity_from', 'entity_to']),
        ]

    def __str__(self):
        return f"{self.transaction_id} - {self.transaction_type} from {self.entity_from} to {self.entity_to}"
        
    def clean(self):
        if self.entity_from == self.entity_to:
            raise ValidationError('Source and destination entities cannot be the same')
            
        if self.status == 'approved' and not self.approved_by:
            raise ValidationError('Approved transactions must have an approving user')
            
        if self.status == 'posted' and not self.posted_by:
            raise ValidationError('Posted transactions must have a posting user')
            
        if self.total_amount != self.amount + self.tax_amount:
            raise ValidationError('Total amount must equal amount plus tax amount')
            
        if self.matched_amount > self.total_amount:
            raise ValidationError('Matched amount cannot exceed total amount')
            
    def approve(self, user):
        """Approve the transaction"""
        if self.status != 'pending':
            raise ValidationError('Only pending transactions can be approved')
            
        self.status = 'approved'
        self.approved_by = user
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='approve',
            transaction_id=self.transaction_id,
            transaction_type='intercompany_transaction',
            affected_accounts='',
            business=self.business,
            metadata={
                'amount': str(self.amount),
                'transaction_type': self.transaction_type
            }
        )
        
    def post(self, user):
        """Post the transaction"""
        if self.status != 'approved':
            raise ValidationError('Only approved transactions can be posted')
            
        self.status = 'posted'
        self.posted_by = user
        self.posting_date = timezone.now().date()
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='modify',
            transaction_id=self.transaction_id,
            transaction_type='intercompany_transaction',
            affected_accounts='',
            old_value='approved',
            new_value='posted',
            business=self.business,
            metadata={
                'amount': str(self.amount),
                'transaction_type': self.transaction_type
            }
        )
        
    def void(self, user, reason):
        """Void the transaction"""
        if self.status not in ['posted', 'approved']:
            raise ValidationError('Only posted or approved transactions can be voided')
            
        old_status = self.status
        self.status = 'voided'
        self.save()
        
        # Create audit trail
        AuditTrail.log_transaction(
            user=user,
            action_type='void',
            transaction_id=self.transaction_id,
            transaction_type='intercompany_transaction',
            affected_accounts='',
            old_value=old_status,
            new_value='voided',
            business=self.business,
            metadata={
                'reason': reason,
                'amount': str(self.amount),
                'transaction_type': self.transaction_type
            }
        )

class IntercompanyAccount(models.Model):
    ACCOUNT_TYPES = [
        ('receivable', 'Receivable'),
        ('payable', 'Payable'),
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
        ('loan', 'Loan'),
        ('investment', 'Investment')
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('frozen', 'Frozen'),
        ('pending_reconciliation', 'Pending Reconciliation')
    ]
    
    # Basic information
    name = models.CharField(max_length=100)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='active')
    
    # Entity details
    entity = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    
    # Financial details
    currency = models.CharField(max_length=3, default='USD')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    
    # Reconciliation
    last_reconciled = models.DateTimeField(null=True, blank=True)
    reconciliation_frequency = models.CharField(max_length=50, blank=True)
    
    # Additional information
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_intercompany_accounts')
    
    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['business', 'entity']),
            models.Index(fields=['account_type']),
        ]
        unique_together = ('business', 'entity', 'account_type')

    def __str__(self):
        return f"{self.name} - {self.entity} ({self.account_type})"
        
    def clean(self):
        if self.balance < 0 and self.account_type not in ['payable', 'loan']:
            raise ValidationError('Only payable and loan accounts can have negative balances')
            
        if self.credit_limit and self.credit_limit < 0:
            raise ValidationError('Credit limit cannot be negative')
            
        if self.status == 'frozen' and self.transactions.filter(created_at__gt=self.updated_at).exists():
            raise ValidationError('Cannot freeze account with pending transactions')
            
    def get_balance_at_date(self, date):
        """Calculate account balance as of a specific date"""
        transactions = self.transactions.filter(date__lte=date, status='posted')
        total = sum(t.amount for t in transactions)
        return total
        
    def get_aging_report(self, as_of_date=None):
        """Generate aging report for receivables/payables"""
        if self.account_type not in ['receivable', 'payable']:
            raise ValidationError('Aging report only available for receivables and payables')
            
        if not as_of_date:
            as_of_date = timezone.now().date()
            
        aging_buckets = {
            '0-30': 0,
            '31-60': 0,
            '61-90': 0,
            '90+': 0
        }
        
        transactions = self.transactions.filter(
            status='posted',
            date__lte=as_of_date
        ).exclude(reconciliation_status='fully_matched')
        
        for transaction in transactions:
            days = (as_of_date - transaction.date).days
            amount = transaction.amount - transaction.matched_amount
            
            if days <= 30:
                aging_buckets['0-30'] += amount
            elif days <= 60:
                aging_buckets['31-60'] += amount
            elif days <= 90:
                aging_buckets['61-90'] += amount
            else:
                aging_buckets['90+'] += amount
                
        return aging_buckets
    
    
class AuditTrail(models.Model):
    ACTION_TYPES = [
        ('create', 'Create'),
        ('modify', 'Modify'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reconcile', 'Reconcile'),
        ('void', 'Void'),
        ('reverse', 'Reverse')
    ]
    
    TRANSACTION_TYPES = [
        ('finance_transaction', 'Finance Transaction'),
        ('bank_transaction', 'Bank Transaction'),
        ('journal_entry', 'Journal Entry'),
        ('reconciliation', 'Reconciliation'),
        ('account_balance', 'Account Balance'),
        ('month_end', 'Month End Closing')
    ]
    
    date_time = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=10, choices=ACTION_TYPES)
    transaction_id = models.CharField(max_length=50)
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    affected_accounts = models.CharField(max_length=255)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    approval_status = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField()
    module = models.CharField(max_length=50)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['date_time']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['business']),
            models.Index(fields=['user']),
        ]
        
    def __str__(self):
        return f"{self.date_time} - {self.user} - {self.action_type}"
    
    @classmethod
    def log_transaction(cls, user, action_type, transaction_id, transaction_type, 
                       affected_accounts, old_value=None, new_value=None, 
                       business=None, metadata=None, **kwargs):
        """
        Helper method to create audit trail entries with proper validation and formatting
        """
        try:
            audit = cls.objects.create(
                user=user,
                action_type=action_type,
                transaction_id=str(transaction_id),
                transaction_type=transaction_type,
                affected_accounts=affected_accounts,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                business=business,
                metadata=metadata or {},
                **kwargs
            )
            return audit
        except Exception as e:
            logger.error(f"Failed to create audit trail: {str(e)}")
            raise
