#/Users/kuoldeng/projectx/backend/pyfactor/payroll/models.py
from datetime import timedelta
from django.db import models
from django.utils import timezone
from hr.models import Employee, Timesheet
import uuid
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator


def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)


class PayrollRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_number = models.CharField(max_length=20, unique=True, editable=False)
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='draft')

    # Add global support fields
    country_code = models.CharField(max_length=2, default='US')
    is_international = models.BooleanField(default=False)
    service_type = models.CharField(max_length=10, choices=[
        ('full', 'Full-Service'),
        ('self', 'Self-Service'),
    ], default='full')
    
    # For international self-service
    filing_instructions = models.TextField(blank=True, null=True)
    tax_authority_links = models.JSONField(default=dict, blank=True, null=True)
    
    created_at = models.DateTimeField(default=default_due_datetime)
    updated_at = models.DateTimeField(default=default_due_datetime)
    tax_filings_created = models.BooleanField(default=False)
    tax_filings_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('not_applicable', 'Not Applicable'),  # For self-service

    ], default='pending')

    # Add currency fields
    currency_code = models.CharField(max_length=3, default='USD')  # ISO 4217 currency code
    currency_symbol = models.CharField(max_length=5, default='$')
    exchange_rate_to_usd = models.DecimalField(max_digits=10, decimal_places=6, default=1.0)
    show_usd_comparison = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.payroll_number:
            self.payroll_number = self.generate_payroll_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_payroll_number():
        last_payroll = PayrollRun.objects.order_by('-created_at').first()
        if last_payroll:
            last_number = int(last_payroll.payroll_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"PAY{new_number:06d}"

    def __str__(self):
        return f"Payroll {self.payroll_number}"

class PayrollTransaction(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE)
    timesheet = models.ForeignKey(
        Timesheet, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='payroll_transactions',
        help_text='Link to the HR timesheet that this transaction is based on'
    )
    gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)
    federal_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    state_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    state_code = models.CharField(max_length=2, blank=True, null=True)
    medicare_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    social_security_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    additional_withholdings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        timesheet_info = f" - Timesheet: {self.timesheet.timesheet_number}" if self.timesheet else ""
        return f"Payment for {self.employee}{timesheet_info} - {self.gross_pay}"

class TaxForm(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    form_type = models.CharField(max_length=20)
    tax_year = models.IntegerField()
    file = models.FileField(upload_to='tax_forms/')


# Pay Management Models

class PaymentDepositMethod(models.Model):
    """Employee payment deposit method"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='deposit_methods')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    METHOD_TYPE_CHOICES = [
        ('DIRECT_DEPOSIT', 'Direct Deposit (Bank)'),
        ('PAYPAL', 'PayPal'),
        ('VENMO', 'Venmo'),
        ('CASHAPP', 'Cash App'),
        ('CHECK', 'Physical Check'),
        ('CRYPTO', 'Cryptocurrency'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('OTHER', 'Other'),
    ]
    method_type = models.CharField(max_length=20, choices=METHOD_TYPE_CHOICES, default='DIRECT_DEPOSIT')
    
    # Bank account info (encrypted in production)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_last_four = models.CharField(max_length=4, blank=True, null=True) 
    routing_number_last_four = models.CharField(max_length=4, blank=True, null=True)
    account_type = models.CharField(
        max_length=10, 
        choices=[('CHECKING', 'Checking'), ('SAVINGS', 'Savings')],
        blank=True, 
        null=True
    )
    
    # Digital payment methods
    email = models.EmailField(blank=True, null=True, help_text="Email for PayPal, Venmo, etc.")
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="Phone for mobile money services")
    username = models.CharField(max_length=100, blank=True, null=True, help_text="Username for services like Cash App")
    
    # Cryptocurrency
    wallet_address = models.CharField(max_length=100, blank=True, null=True)
    crypto_currency = models.CharField(max_length=10, blank=True, null=True)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Reference to Stripe or other payment service data
    payment_provider_id = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return f"{self.get_method_type_display()} for {self.employee}"
    
    class Meta:
        verbose_name = "Payment Deposit Method"
        verbose_name_plural = "Payment Deposit Methods"


class IncomeWithholding(models.Model):
    """Employee income tax withholding preferences"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='income_withholding')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Federal W-4 Information
    tax_year = models.IntegerField()
    filing_status = models.CharField(
        max_length=2, 
        choices=[
            ('S', 'Single or Married filing separately'),
            ('M', 'Married filing jointly'),
            ('H', 'Head of household'),
        ],
        default='S'
    )
    
    multiple_jobs = models.BooleanField(default=False, help_text="Multiple Jobs or Spouse Works (Step 2)")
    claim_dependents = models.BooleanField(default=False)
    dependent_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Claim Dependents Amount (Step 3)"
    )
    other_income = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Other Income (Step 4a)"
    )
    deductions = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Deductions (Step 4b)"
    )
    extra_withholding = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Extra Withholding (Step 4c)"
    )
    
    # State-specific fields
    state_code = models.CharField(max_length=2, blank=True, null=True)
    state_allowances = models.IntegerField(default=0)
    state_additional_withholding = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Electronic signature for W-4
    is_electronically_signed = models.BooleanField(default=False)
    signature_date = models.DateField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address used for e-signature")
    
    # W-4 Form
    w4_form_file = models.FileField(upload_to='withholding_forms/', null=True, blank=True)
    
    last_updated = models.DateTimeField(auto_now=True)
    last_updated_by = models.UUIDField(null=True, blank=True)  # Reference to user who last updated
    
    def __str__(self):
        return f"Tax Withholding for {self.employee} ({self.tax_year})"
    
    class Meta:
        verbose_name = "Income Withholding"
        verbose_name_plural = "Income Withholdings"


class PaySetting(models.Model):
    """Company-wide Pay Settings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Frequency Settings
    PAY_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-Weekly'),
        ('SEMIMONTHLY', 'Semi-Monthly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
    ]
    pay_frequency = models.CharField(
        max_length=12,
        choices=PAY_FREQUENCY_CHOICES,
        default='BIWEEKLY'
    )
    
    # For semi-monthly, specifies which days of month
    pay_days = models.JSONField(default=list, blank=True, null=True, help_text="Days of month for payment (for Semi-Monthly)")
    
    # If specified, the weekday when weekly/biweekly payments are made
    pay_weekday = models.IntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text="0=Monday, 6=Sunday"
    )
    
    # General Settings
    enable_direct_deposit = models.BooleanField(default=True)
    enable_bonuses = models.BooleanField(default=True)
    enable_commissions = models.BooleanField(default=False)
    enable_recurring_allowances = models.BooleanField(default=False)
    enable_overtime = models.BooleanField(default=True)
    overtime_rate = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('1.0'))],
        default=Decimal('1.5')
    )
    
    # Default Processing Time (days before payday when processing starts)
    processing_lead_time = models.IntegerField(default=3)
    
    # Notification Settings
    notify_employees_on_payday = models.BooleanField(default=True)
    notify_payroll_admins_before_processing = models.BooleanField(default=True)
    admin_notification_days = models.IntegerField(default=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Pay Settings for Business {self.business_id}"
    
    class Meta:
        verbose_name = "Pay Setting"
        verbose_name_plural = "Pay Settings"


class BonusPayment(models.Model):
    """Tracks bonus payments to employees"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='bonuses')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    BONUS_TYPE_CHOICES = [
        ('PERFORMANCE', 'Performance Bonus'),
        ('HOLIDAY', 'Holiday Bonus'),
        ('SIGNING', 'Signing Bonus'),
        ('RETENTION', 'Retention Bonus'),
        ('REFERRAL', 'Referral Bonus'),
        ('SPOT', 'Spot Bonus'),
        ('OTHER', 'Other Bonus'),
    ]
    bonus_type = models.CharField(max_length=15, choices=BONUS_TYPE_CHOICES)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    
    # Approval
    is_approved = models.BooleanField(default=False)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Payment tracking
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)
    payroll_transaction = models.ForeignKey(
        PayrollTransaction, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='bonus_payments'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        status = "Paid" if self.is_paid else "Pending"
        return f"{self.get_bonus_type_display()} for {self.employee} - {self.amount} ({status})"
    
    class Meta:
        verbose_name = "Bonus Payment"
        verbose_name_plural = "Bonus Payments"


class PayStatement(models.Model):
    """Employee pay statements/stubs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='pay_statements')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    STATEMENT_TYPE_CHOICES = [
        ('REGULAR', 'Regular Payroll'),
        ('BONUS', 'Bonus Payment'),
        ('CORRECTION', 'Correction/Adjustment'),
        ('TERMINATION', 'Termination Pay'),
        ('OTHER', 'Other Payment'),
    ]
    statement_type = models.CharField(max_length=15, choices=STATEMENT_TYPE_CHOICES, default='REGULAR')
    
    # Key Financial Information
    pay_period_start = models.DateField()
    pay_period_end = models.DateField()
    pay_date = models.DateField()
    
    gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Hours breakdown
    regular_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    pto_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    sick_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    holiday_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    
    # Taxes and Deductions
    federal_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    state_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    local_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    medicare = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    social_security = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Benefits and Other Deductions
    health_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    dental_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    vision_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    retirement_401k = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Year-to-date figures
    ytd_gross = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    ytd_net = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    ytd_federal_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    ytd_state_tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    ytd_medicare = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    ytd_social_security = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Additional data
    additional_info = models.JSONField(default=dict, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # PDF statement
    pdf_file = models.FileField(upload_to='pay_statements/%Y/%m/', null=True, blank=True)
    
    # Reference to related PayrollTransaction
    payroll_transaction = models.OneToOneField(
        PayrollTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pay_statement'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Pay Statement for {self.employee} - {self.pay_date}"
    
    class Meta:
        verbose_name = "Pay Statement"
        verbose_name_plural = "Pay Statements"
        ordering = ['-pay_date']  # Most recent first
