"""
Tax Accounting Models
Handles tax collection, liability tracking, and filing preparation
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from custom_auth.tenant_base_model import TenantAwareModel

User = get_user_model()


class TaxAccount(TenantAwareModel):
    """
    General Ledger accounts for different tax types and jurisdictions.
    Links to Chart of Accounts for proper accounting.
    """
    TAX_TYPE_CHOICES = [
        ('SALES_TAX', 'Sales Tax'),
        ('VAT', 'Value Added Tax'),
        ('GST', 'Goods and Services Tax'),
        ('EXCISE', 'Excise Tax'),
        ('USE_TAX', 'Use Tax'),
        ('PAYROLL_TAX', 'Payroll Tax'),
        ('INCOME_TAX', 'Income Tax Withholding'),
    ]
    
    JURISDICTION_LEVEL_CHOICES = [
        ('FEDERAL', 'Federal'),
        ('STATE', 'State'),
        ('COUNTY', 'County'),
        ('CITY', 'City'),
        ('DISTRICT', 'Special District'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    name = models.CharField(max_length=200, help_text="e.g., 'Sales Tax Payable - California'")
    account_number = models.CharField(max_length=20, help_text="GL account number, e.g., '2150'")
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    
    # Jurisdiction Information
    jurisdiction_level = models.CharField(max_length=20, choices=JURISDICTION_LEVEL_CHOICES)
    jurisdiction_name = models.CharField(max_length=100, help_text="e.g., 'California', 'Los Angeles County'")
    jurisdiction_code = models.CharField(max_length=20, blank=True, help_text="State/county/city code")
    
    # Tax Rate Information
    tax_rate = models.DecimalField(
        max_digits=6, decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Current tax rate (e.g., 0.095 for 9.5%)"
    )
    effective_date = models.DateField(help_text="When this tax rate became effective")
    end_date = models.DateField(null=True, blank=True, help_text="When this tax rate ends (if known)")
    
    # Filing Information
    filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('MONTHLY', 'Monthly'),
            ('QUARTERLY', 'Quarterly'),
            ('SEMI_ANNUAL', 'Semi-Annual'),
            ('ANNUAL', 'Annual'),
        ],
        default='MONTHLY'
    )
    filing_due_day = models.IntegerField(
        default=20,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when filing is due"
    )
    
    # Links to Chart of Accounts
    chart_account = models.ForeignKey(
        'finance.ChartOfAccount',
        on_delete=models.SET_NULL,
        null=True,
        related_name='tax_accounts',
        help_text="Link to Chart of Accounts"
    )
    
    # Agency Information
    tax_agency_name = models.CharField(max_length=200, blank=True)
    tax_agency_id = models.CharField(max_length=50, blank=True, help_text="Your tax ID with this agency")
    
    # Status
    is_active = models.BooleanField(default=True)
    is_destination_based = models.BooleanField(
        default=False,
        help_text="True if tax rate depends on buyer's location"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tax_accounts_created')
    
    class Meta:
        ordering = ['jurisdiction_level', 'jurisdiction_name', 'name']
        indexes = [
            models.Index(fields=['tenant_id', 'tax_type']),
            models.Index(fields=['tenant_id', 'jurisdiction_name']),
            models.Index(fields=['tenant_id', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'account_number'],
                name='unique_tax_account_number_per_tenant'
            ),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.tax_rate * 100:.2f}%)"
    
    def get_current_rate(self, as_of_date=None):
        """Get the effective tax rate as of a specific date"""
        if not as_of_date:
            as_of_date = timezone.now().date()
        
        if self.end_date and as_of_date > self.end_date:
            # This rate has expired, need to find the current one
            # Would query for a newer TaxAccount with same jurisdiction
            return Decimal('0')
        
        if as_of_date >= self.effective_date:
            return self.tax_rate
        
        return Decimal('0')


class TaxTransaction(TenantAwareModel):
    """
    Record of every tax collection or payment.
    Links to source transactions (POS, Invoice, etc.) and tracks tax liability.
    """
    SOURCE_TYPE_CHOICES = [
        ('POS', 'Point of Sale'),
        ('INVOICE', 'Invoice'),
        ('MANUAL', 'Manual Entry'),
        ('IMPORT', 'Imported'),
        ('ADJUSTMENT', 'Adjustment'),
    ]
    
    STATUS_CHOICES = [
        ('COLLECTED', 'Tax Collected'),
        ('ACCRUED', 'Tax Accrued'),
        ('FILED', 'Included in Filing'),
        ('PAID', 'Paid to Authority'),
        ('ADJUSTED', 'Adjusted'),
        ('REVERSED', 'Reversed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Transaction Information
    transaction_date = models.DateTimeField()
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    source_id = models.UUIDField(help_text="ID of source transaction (POS sale, Invoice, etc.)")
    source_reference = models.CharField(max_length=50, blank=True, help_text="Transaction number for reference")
    
    # Tax Information
    tax_account = models.ForeignKey(TaxAccount, on_delete=models.PROTECT, related_name='transactions')
    tax_collected = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate_applied = models.DecimalField(
        max_digits=6, decimal_places=4,
        help_text="Actual rate applied to this transaction"
    )
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Base amount tax was calculated on")
    
    # Customer Information
    customer_name = models.CharField(max_length=200)
    customer_id = models.UUIDField(null=True, blank=True)
    customer_location = models.JSONField(
        default=dict,
        help_text="Customer address used for tax calculation"
    )
    
    # Exemption Information
    is_exempt = models.BooleanField(default=False)
    exemption_reason = models.CharField(max_length=100, blank=True)
    exemption_certificate = models.CharField(max_length=50, blank=True)
    
    # Journal Entry Link
    journal_entry = models.ForeignKey(
        'finance.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tax_transactions'
    )
    
    # Status and Filing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COLLECTED')
    tax_filing = models.ForeignKey(
        'TaxAccountingFiling',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['tenant_id', 'transaction_date']),
            models.Index(fields=['tenant_id', 'tax_account', 'status']),
            models.Index(fields=['tenant_id', 'source_type', 'source_id']),
            models.Index(fields=['tenant_id', 'tax_filing']),
        ]
    
    def __str__(self):
        return f"{self.source_type} - {self.transaction_date.date()} - ${self.tax_collected}"
    
    def reverse(self, reason=""):
        """Create a reversal transaction"""
        if self.status == 'REVERSED':
            raise ValueError("Transaction is already reversed")
        
        reversal = TaxTransaction.objects.create(
            tenant_id=self.tenant_id,
            transaction_date=timezone.now(),
            source_type='ADJUSTMENT',
            source_id=self.id,
            source_reference=f"Reversal of {self.source_reference}",
            tax_account=self.tax_account,
            tax_collected=-self.tax_collected,  # Negative amount
            tax_rate_applied=self.tax_rate_applied,
            taxable_amount=-self.taxable_amount,
            customer_name=self.customer_name,
            customer_id=self.customer_id,
            customer_location=self.customer_location,
            status='ADJUSTED',
            notes=f"Reversal: {reason}"
        )
        
        self.status = 'REVERSED'
        self.save()
        
        return reversal


class TaxPeriodSummary(TenantAwareModel):
    """
    Summarized tax data by reporting period.
    Pre-calculated for performance and used in tax reports.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Period Information
    period_start = models.DateField()
    period_end = models.DateField()
    tax_account = models.ForeignKey(TaxAccount, on_delete=models.CASCADE, related_name='period_summaries')
    
    # Sales Summary
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    non_taxable_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    exempt_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Tax Summary
    tax_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Transaction Counts
    transaction_count = models.IntegerField(default=0)
    exempt_transaction_count = models.IntegerField(default=0)
    
    # Filing Status
    filing_status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('READY', 'Ready to File'),
            ('FILED', 'Filed'),
            ('PAID', 'Paid'),
            ('OVERDUE', 'Overdue'),
        ],
        default='PENDING'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_calculated = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-period_end', 'tax_account']
        indexes = [
            models.Index(fields=['tenant_id', 'period_start', 'period_end']),
            models.Index(fields=['tenant_id', 'tax_account', 'filing_status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant_id', 'tax_account', 'period_start', 'period_end'],
                name='unique_tax_period_per_account'
            ),
        ]
    
    def __str__(self):
        return f"{self.tax_account.name} - {self.period_start} to {self.period_end}"
    
    def calculate_summary(self):
        """Recalculate summary from transactions"""
        from django.db.models import Sum, Count, Q
        
        transactions = TaxTransaction.objects.filter(
            tenant_id=self.tenant_id,
            tax_account=self.tax_account,
            transaction_date__date__gte=self.period_start,
            transaction_date__date__lte=self.period_end,
        ).exclude(status='REVERSED')
        
        # Calculate totals
        summary = transactions.aggregate(
            total_tax=Sum('tax_collected'),
            total_taxable=Sum('taxable_amount'),
            total_count=Count('id'),
            exempt_count=Count('id', filter=Q(is_exempt=True))
        )
        
        self.tax_collected = summary['total_tax'] or Decimal('0')
        self.taxable_sales = summary['total_taxable'] or Decimal('0')
        self.transaction_count = summary['total_count'] or 0
        self.exempt_transaction_count = summary['exempt_count'] or 0
        
        # Calculate tax due (collected minus paid)
        self.tax_due = self.tax_collected - self.tax_paid
        
        # Update status
        if self.tax_due > 0 and self.period_end < timezone.now().date():
            if self.filing_status not in ['FILED', 'PAID']:
                self.filing_status = 'OVERDUE'
        elif self.tax_due > 0:
            self.filing_status = 'READY'
        
        self.last_calculated = timezone.now()
        self.save()


class TaxAccountingFiling(TenantAwareModel):
    """
    Record of actual tax filings submitted to authorities.
    """
    FILING_TYPE_CHOICES = [
        ('REGULAR', 'Regular Filing'),
        ('AMENDED', 'Amended Return'),
        ('FINAL', 'Final Return'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Filing Information
    filing_date = models.DateField()
    period_start = models.DateField()
    period_end = models.DateField()
    tax_account = models.ForeignKey(TaxAccount, on_delete=models.PROTECT, related_name='filings')
    filing_type = models.CharField(max_length=20, choices=FILING_TYPE_CHOICES, default='REGULAR')
    
    # Amounts Reported
    gross_sales = models.DecimalField(max_digits=15, decimal_places=2)
    taxable_sales = models.DecimalField(max_digits=15, decimal_places=2)
    non_taxable_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_collected = models.DecimalField(max_digits=12, decimal_places=2)
    tax_due = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Adjustments
    prior_period_adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vendor_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    penalties = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    interest = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Filing Details
    confirmation_number = models.CharField(max_length=100, blank=True)
    filing_method = models.CharField(
        max_length=20,
        choices=[
            ('ELECTRONIC', 'Electronic Filing'),
            ('PAPER', 'Paper Filing'),
            ('ONLINE', 'Online Portal'),
        ],
        default='ELECTRONIC'
    )
    
    # Payment Information
    payment_date = models.DateField(null=True, blank=True)
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('ACH', 'ACH Transfer'),
            ('CHECK', 'Check'),
            ('CREDIT_CARD', 'Credit Card'),
            ('WIRE', 'Wire Transfer'),
        ],
        blank=True
    )
    payment_confirmation = models.CharField(max_length=100, blank=True)
    
    # Documents
    filing_documents = models.JSONField(
        default=dict,
        help_text="Paths to filed documents, receipts, etc."
    )
    
    # Status
    is_amended = models.BooleanField(default=False)
    amended_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='amendments')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tax_filings_created')
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-filing_date', '-period_end']
        indexes = [
            models.Index(fields=['tenant_id', 'filing_date']),
            models.Index(fields=['tenant_id', 'tax_account', 'period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"{self.tax_account.name} - {self.period_start} to {self.period_end} - Filed {self.filing_date}"


class TaxSettings(TenantAwareModel):
    """
    Business-level tax configuration and settings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    business = models.OneToOneField('users.Business', on_delete=models.CASCADE, related_name='tax_settings')
    
    # Tax Registration
    federal_tax_id = models.CharField(max_length=20, blank=True, help_text="EIN or Federal Tax ID")
    state_tax_id = models.CharField(max_length=50, blank=True)
    state_sales_tax_permit = models.CharField(max_length=50, blank=True)
    
    # Tax Calculation Settings
    auto_calculate_tax = models.BooleanField(default=True)
    include_tax_in_price = models.BooleanField(default=False, help_text="Tax-inclusive pricing")
    round_tax_at_line_item = models.BooleanField(default=False, help_text="Round tax per line vs. total")
    
    # Default Tax Accounts
    default_sales_tax_account = models.ForeignKey(
        TaxAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_for_businesses'
    )
    
    # Filing Preferences
    tax_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('MONTHLY', 'Monthly'),
            ('QUARTERLY', 'Quarterly'),
            ('ANNUAL', 'Annual'),
        ],
        default='MONTHLY'
    )
    tax_year_end_month = models.IntegerField(
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # Nexus and Multi-jurisdiction
    has_multi_state_nexus = models.BooleanField(default=False)
    nexus_states = models.JSONField(default=list, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tax Settings"
        verbose_name_plural = "Tax Settings"
    
    def __str__(self):
        return f"Tax Settings for {self.business.name}"