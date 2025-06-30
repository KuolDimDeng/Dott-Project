# taxes/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django_countries.fields import CountryField
from django.conf import settings
from custom_auth.tenant_base_model import TenantAwareModel

import uuid
from django.contrib.postgres.fields import JSONField
from django.utils import timezone
from audit.mixins import AuditMixin



class TaxJurisdiction(TenantAwareModel):
    """Base class for tax jurisdictions"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    is_active = models.BooleanField(default=True)
    country = CountryField(default='US')
    
    # Add service type field
    SERVICE_CHOICES = [
        ('full', 'Full-Service'),
        ('self', 'Self-Service'),
    ]
    service_type = models.CharField(max_length=10, choices=SERVICE_CHOICES, default='self')
    
    # Add metadata for AI compliance checks
    compliance_last_checked = models.DateTimeField(null=True, blank=True)
    compliance_check_frequency = models.IntegerField(default=30)  # days between checks
    
    class Meta:
        app_label = 'taxes'
        abstract = True
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class State(TaxJurisdiction):
    """US States and territories"""
    full_service_enabled = models.BooleanField(default=False, 
        help_text="Whether Dott provides full tax filing service for this state")
    e_file_supported = models.BooleanField(default=False,
        help_text="Whether this state supports electronic filing")
    e_file_portal_url = models.URLField(blank=True, null=True)
    has_local_taxes = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    # E-filing configuration
    e_file_api_base_url = models.URLField(blank=True, null=True,
        help_text="Base URL for state's e-filing API")
    e_file_api_version = models.CharField(max_length=20, default='v1',
        help_text="API version for e-filing")
    e_file_formats = models.CharField(max_length=100, default='XML',
        help_text="Supported e-file formats (comma-separated)")
    
    # Tax rates and thresholds
    base_tax_rate = models.DecimalField(max_digits=6, decimal_places=4, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Base state sales tax rate")
    filing_frequency_thresholds = JSONField(default=dict, blank=True,
        help_text="Revenue thresholds for filing frequency")
    
    # Filing requirements
    form_number = models.CharField(max_length=50, blank=True,
        help_text="Primary sales tax form number")
    form_name = models.CharField(max_length=200, blank=True,
        help_text="Primary sales tax form name")
    filing_due_day = models.IntegerField(default=20,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when filing is due")
    vendor_discount_rate = models.DecimalField(max_digits=6, decimal_places=4, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(0.1)],
        help_text="Discount rate for timely filing")
    
    # Special features
    has_district_taxes = models.BooleanField(default=False,
        help_text="State has special district taxes")
    has_home_rule_cities = models.BooleanField(default=False,
        help_text="State has cities that collect their own tax")
    requires_location_reporting = models.BooleanField(default=False,
        help_text="Requires separate reporting by location")
    
    class Meta:
        app_label = 'taxes'

class TaxFiling(AuditMixin, TenantAwareModel):
    """
    Main model for tracking tax filing requests and their status
    """
    FILING_STATUS_CHOICES = [
        ('payment_pending', 'Payment Pending'),
        ('payment_completed', 'Payment Completed'),
        ('documents_pending', 'Documents Pending'),
        ('in_preparation', 'In Preparation'),
        ('ready_for_review', 'Ready for Review'),
        ('submitted', 'Submitted to Tax Authority'),
        ('accepted', 'Accepted by Tax Authority'),
        ('rejected', 'Rejected - Needs Correction'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    TAX_TYPE_CHOICES = [
        ('sales', 'Sales Tax'),
        ('payroll', 'Payroll Tax'),
        ('income', 'Income Tax'),
    ]
    
    SERVICE_TYPE_CHOICES = [
        ('fullService', 'Full Service'),
        ('selfService', 'Self Service'),
    ]
    
    filing_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    status = models.CharField(max_length=30, choices=FILING_STATUS_CHOICES, default='payment_pending')
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    complexity_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.0)
    
    # Filing period information
    filing_period = models.CharField(max_length=50)  # e.g., "Q1 2024", "March 2024"
    filing_year = models.IntegerField()
    filing_month = models.IntegerField(null=True, blank=True)  # For monthly filings
    filing_quarter = models.IntegerField(null=True, blank=True)  # For quarterly filings
    due_date = models.DateField()
    
    # Payment information
    payment_status = models.CharField(max_length=20, default='pending')
    payment_session_id = models.CharField(max_length=200, null=True, blank=True)
    payment_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Filing information
    submitted_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    confirmation_number = models.CharField(max_length=100, null=True, blank=True)
    
    # Multi-location support
    locations = JSONField(default=list, blank=True)  # List of location IDs included
    
    # Calculated amounts
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    taxable_sales = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_collected = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_due = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Metadata
    filing_data = JSONField(default=dict, blank=True)  # Store form-specific data
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)  # For staff use only
    
    # User information
    user_email = models.EmailField()
    preparer_email = models.EmailField(null=True, blank=True)  # For full service
    
    # Add missing fields for the confirmation system
    filing_type = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'quarterly', 'annual'
    tax_year = models.IntegerField(null=True, blank=True)
    state = models.CharField(max_length=2, null=True, blank=True)  # State code
    payment_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    taxpayer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tax_filings')
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'tax_type']),
            models.Index(fields=['tenant_id', 'due_date']),
            models.Index(fields=['filing_year', 'filing_month']),
        ]
        
    def __str__(self):
        return f"{self.get_tax_type_display()} - {self.filing_period} - {self.get_status_display()}"
    
    def can_cancel(self):
        """Check if filing can be cancelled"""
        return self.status in ['payment_pending', 'payment_completed', 'documents_pending']
    
    def mark_paid(self):
        """Mark filing as paid"""
        self.payment_status = 'completed'
        self.payment_completed_at = timezone.now()
        self.status = 'documents_pending'
        self.save()


class FilingDocument(AuditMixin, TenantAwareModel):
    """
    Documents uploaded for tax filings
    """
    DOCUMENT_TYPE_CHOICES = [
        # Sales Tax Documents
        ('sales_report', 'Sales Report'),
        ('exemption_certificates', 'Exemption Certificates'),
        ('pos_reports', 'POS System Reports'),
        
        # Payroll Tax Documents
        ('payroll_register', 'Payroll Register'),
        ('previous_941', 'Previous Form 941'),
        ('previous_940', 'Previous Form 940'),
        ('state_ui_report', 'State UI Report'),
        ('w2_forms', 'W-2 Forms'),
        
        # Income Tax Documents
        ('profit_loss', 'Profit & Loss Statement'),
        ('balance_sheet', 'Balance Sheet'),
        ('previous_return', 'Previous Tax Return'),
        ('bank_statements', 'Bank Statements'),
        ('receipts', 'Receipts and Invoices'),
        
        # General
        ('other', 'Other Supporting Document'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
    file_name = models.CharField(max_length=255)
    file_path = models.FileField(upload_to='tax_documents/%Y/%m/')
    file_size = models.IntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    
    # Metadata
    uploaded_by = models.EmailField()
    description = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.EmailField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_documents'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.file_name}"


class FilingStatusHistory(models.Model):
    """
    Track status changes for audit trail
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='status_history')
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    changed_by = models.EmailField()
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_status_history'
        ordering = ['-changed_at']
        
    def __str__(self):
        return f"{self.filing_id}: {self.previous_status} -> {self.new_status}"


class IncomeTaxRate(TenantAwareModel):
    """Income tax rates for specific states"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='tax_rates')
    tax_year = models.IntegerField()
    effective_date = models.DateField()
    is_flat_rate = models.BooleanField(default=False)
    rate_value = models.DecimalField(
        max_digits=6, 
        decimal_places=4, 
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Tax rate as a decimal (e.g. 0.0525 for 5.25%)"
    )
    # For progressive tax brackets
    income_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    income_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    filing_status = models.CharField(max_length=20, choices=[
        ('single', 'Single'),
        ('married_joint', 'Married Filing Jointly'),
        ('married_separate', 'Married Filing Separately'),
        ('head_household', 'Head of Household'),
    ], default='single')
    last_updated = models.DateTimeField(auto_now=True)
    manual_override = models.BooleanField(default=False, 
        help_text="Set to True if this rate was manually updated")
    
    class Meta:
        app_label = 'taxes'
        unique_together = ('state', 'tax_year', 'filing_status', 'income_min')
        
    def __str__(self):
        if self.is_flat_rate:
            return f"{self.state.code} ({self.tax_year}): {self.rate_value*100}% Flat Rate"
        return f"{self.state.code} ({self.tax_year}): {self.rate_value*100}% for {self.filing_status} ({self.income_min}-{self.income_max})"

class PayrollTaxFiling(TenantAwareModel):
    """Records of payroll tax filings"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='tax_filings')
    business_id = models.CharField(max_length=50, db_index=True)
    payroll_run = models.CharField(max_length=50, db_index=True)
    filing_period_start = models.DateField()
    filing_period_end = models.DateField()
    submission_date = models.DateTimeField(auto_now_add=True)
    filing_status = models.CharField(max_length=20, choices=[
        ('preparation', 'In Preparation'),
        ('pending', 'Pending Submission'),
        ('submitted', 'Submitted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('amended', 'Amended'),
    ], default='preparation')
    total_wages = models.DecimalField(max_digits=12, decimal_places=2)
    total_withholding = models.DecimalField(max_digits=12, decimal_places=2)
    confirmation_number = models.CharField(max_length=100, blank=True, null=True)
    submission_method = models.CharField(max_length=20, choices=[
        ('api', 'Direct API'),
        ('portal', 'State Portal'),
        ('manual', 'Manual Filing'),
        ('self_service', 'Self-Service by Customer'),
    ])
    notes = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='tax_filings/%Y/%m/', blank=True, null=True)
    is_amended = models.BooleanField(default=False)
    
    class Meta:
        app_label = 'taxes'
        
    def __str__(self):
        return f"Filing {self.id} - {self.state.code} - {self.filing_period_start} to {self.filing_period_end}"

# For tracking API calls and maintaining compliance logs
class TaxApiTransaction(TenantAwareModel):
    """Records of interactions with tax APIs or state portals"""
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name='api_transactions')
    transaction_date = models.DateTimeField(auto_now_add=True)
    endpoint = models.CharField(max_length=255)
    request_payload = models.TextField()
    response_payload = models.TextField()
    status_code = models.IntegerField()
    success = models.BooleanField()
    error_message = models.TextField(blank=True, null=True)
    processing_time_ms = models.IntegerField()
    
    class Meta:
        app_label = 'taxes'

# For self-service states
class TaxFilingInstruction(TenantAwareModel):
    """Instructions for self-service tax filing"""
    state = models.OneToOneField(State, on_delete=models.CASCADE, related_name='filing_instructions')
    instructions = models.TextField()
    portal_url = models.URLField()
    filing_frequency = models.CharField(max_length=20, choices=[
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ])
    due_days = models.IntegerField(help_text="Days after period end when filing is due")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'


class TaxForm(TenantAwareModel):
    FORM_TYPE_CHOICES = [
        ('W2', 'W-2 Wage and Tax Statement'),
        ('W4', 'W-4 Employee Withholding Certificate'),
        ('1099', '1099-MISC Miscellaneous Income'),
        ('1095C', '1095-C Employer-Provided Health Insurance'),
        ('940', 'Form 940 Federal Unemployment Tax'),
        ('941', 'Form 941 Quarterly Federal Tax Return'),
        ('STATE_WH', 'State Withholding Form'),
        ('OTHER', 'Other Tax Form'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Temporarily commented out to break circular dependency
    # employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='tax_forms')
    employee_id = models.UUIDField(null=True, blank=True)  # Temporary replacement
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    tax_year = models.IntegerField()
    filing_status = models.CharField(max_length=20, blank=True, null=True)
    submission_date = models.DateField(auto_now_add=True)
    
    # Encrypted fields for highly sensitive data
    employer_id_number = models.CharField(max_length=100, blank=True)
    
    # The actual form file
    file = models.FileField(
        upload_to='tax_forms/%Y/%m/', 
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'png'])]
    )
    
    # Fields for state-specific tax forms
    state_code = models.CharField(max_length=2, blank=True, null=True)
    state_employer_id = models.CharField(max_length=100, blank=True, null=True) 
    
    # Verification and status
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_tax_forms'
    )
    verification_date = models.DateTimeField(null=True, blank=True)
    
    # For automatic filing tracking
    was_filed = models.BooleanField(default=False)
    filing_confirmation = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ('employee_id', 'form_type', 'tax_year')
        
    def __str__(self):
        return f"{self.form_type} ({self.tax_year}) - Employee ID: {self.employee_id}"
    
    def get_ssn_last_four(self):
        """
        Get the last four digits of the employee's SSN from the Employee model
        """
        # Temporarily commented out to break circular dependency
        # if self.employee.ssn_stored_in_stripe and self.employee.ssn_last_four:
        #     return self.employee.ssn_last_four
        return None


class TaxDataEntryControl(TenantAwareModel):
    """Controls and tracks tax data entry limits per tenant"""
    CONTROL_TYPE_CHOICES = [
        ('income_tax_rates', 'Income Tax Rates'),
        ('payroll_filings', 'Payroll Tax Filings'),
        ('tax_forms', 'Tax Forms'),
        ('api_calls', 'Tax API Calls'),
    ]
    
    control_type = models.CharField(max_length=50, choices=CONTROL_TYPE_CHOICES)
    max_entries_per_hour = models.IntegerField(default=100)
    max_entries_per_day = models.IntegerField(default=1000)
    max_entries_per_month = models.IntegerField(default=10000)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ('tenant_id', 'control_type')
        
    def __str__(self):
        return f"{self.get_control_type_display()} - Tenant {self.tenant_id}"


class TaxDataEntryLog(TenantAwareModel):
    """Logs all tax data entry attempts for abuse monitoring"""
    ENTRY_TYPE_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('bulk_create', 'Bulk Create'),
        ('bulk_update', 'Bulk Update'),
        ('api_call', 'API Call'),
    ]
    
    STATUS_CHOICES = [
        ('allowed', 'Allowed'),
        ('rate_limited', 'Rate Limited'),
        ('blocked', 'Blocked'),
        ('suspicious', 'Suspicious'),
    ]
    
    control_type = models.CharField(max_length=50, choices=TaxDataEntryControl.CONTROL_TYPE_CHOICES)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tax_entry_logs')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    entry_count = models.IntegerField(default=1)
    details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'control_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]
        
    def __str__(self):
        return f"{self.entry_type} - {self.control_type} - {self.status} - {self.created_at}"


class TaxDataAbuseReport(TenantAwareModel):
    """Reports of potential abuse or suspicious activity"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('investigating', 'Under Investigation'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
        ('confirmed', 'Confirmed Abuse'),
    ]
    
    report_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tax_abuse_reports')
    description = models.TextField()
    evidence = models.JSONField(null=True, blank=True)
    action_taken = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_tax_abuse_reports')
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.report_type} - {self.severity} - {self.status}"


class TaxDataBlacklist(TenantAwareModel):
    """Blacklist for blocking abusive users or tenants"""
    BLACKLIST_TYPE_CHOICES = [
        ('user', 'User'),
        ('tenant', 'Tenant'),
        ('ip', 'IP Address'),
    ]
    
    blacklist_type = models.CharField(max_length=20, choices=BLACKLIST_TYPE_CHOICES)
    identifier = models.CharField(max_length=255, db_index=True)
    reason = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tax_blacklists')
    
    class Meta:
        app_label = 'taxes'
        unique_together = ('blacklist_type', 'identifier')
        
    def __str__(self):
        return f"{self.blacklist_type} - {self.identifier}"


class TaxSettings(TenantAwareModel):
    """
    Stores tenant-specific tax configuration and rates.
    This model stores the tax information configured by users through the Tax Settings UI.
    """
    
    # Business Information
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(
        max_length=50,
        choices=[
            ('retail', 'Retail'),
            ('service', 'Service'),
            ('manufacturing', 'Manufacturing'),
            ('consulting', 'Consulting'),
            ('restaurant', 'Restaurant'),
            ('ecommerce', 'E-commerce'),
            ('other', 'Other'),
        ],
        default='retail'
    )
    
    # Location Information
    country = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    
    # Tax Rates
    sales_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Sales tax rate as a percentage (e.g., 8.75)"
    )
    income_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Income/corporate tax rate as a percentage"
    )
    payroll_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Combined employer payroll tax rate as a percentage"
    )
    
    # Filing Information
    filing_website = models.URLField(max_length=500, blank=True)
    filing_address = models.TextField(blank=True)
    filing_deadlines = models.TextField(blank=True)
    
    # AI Suggestion Metadata
    ai_suggested = models.BooleanField(
        default=False,
        help_text="Whether these rates were suggested by AI"
    )
    ai_confidence_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="AI confidence score (0-100) for the suggestions"
    )
    
    # Approval Information
    approved_by_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Digital signature - full name of approver"
    )
    approved_by_signature = models.CharField(
        max_length=255,
        blank=True,
        help_text="Digital signature text"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Email Confirmation
    confirmation_email_sent = models.BooleanField(default=False)
    confirmation_email_sent_at = models.DateTimeField(null=True, blank=True)
    confirmation_email_sent_to = models.EmailField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_settings'
        verbose_name = 'Tax Settings'
        verbose_name_plural = 'Tax Settings'
    
    def __str__(self):
        return f"{self.business_name} - {self.city}, {self.state_province}"


class TaxRateCache(models.Model):
    """
    Global cache for tax rate suggestions to avoid duplicate AI API calls.
    This is shared across all tenants to reduce costs.
    """
    
    # Location key
    country = models.CharField(max_length=100, db_index=True)
    state_province = models.CharField(max_length=100, db_index=True)
    city = models.CharField(max_length=100, db_index=True)
    business_type = models.CharField(max_length=50, db_index=True)
    
    # Cached rates
    sales_tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    income_tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    payroll_tax_rate = models.DecimalField(max_digits=5, decimal_places=2)
    
    # Cached filing info
    filing_website = models.URLField(max_length=500, blank=True)
    filing_address = models.TextField(blank=True)
    filing_deadlines = models.TextField(blank=True)
    
    # Metadata
    confidence_score = models.IntegerField(default=0)
    source = models.CharField(
        max_length=50,
        choices=[
            ('claude_api', 'Claude AI API'),
            ('manual', 'Manual Entry'),
            ('verified', 'Verified by Admin'),
        ],
        default='claude_api'
    )
    
    # Cache control
    expires_at = models.DateTimeField(db_index=True)
    hit_count = models.IntegerField(default=0)
    last_accessed = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_rate_cache'
        verbose_name = 'Tax Rate Cache'
        verbose_name_plural = 'Tax Rate Cache'
        unique_together = ['country', 'state_province', 'city', 'business_type']
        indexes = [
            models.Index(fields=['expires_at']),
            models.Index(fields=['last_accessed']),
        ]
    
    def __str__(self):
        return f"{self.city}, {self.state_province}, {self.country} - {self.business_type}"


class TaxApiUsage(TenantAwareModel):
    """
    Tracks API usage for tax suggestions per tenant.
    """
    
    # Usage tracking
    month_year = models.CharField(
        max_length=7,
        help_text="Format: YYYY-MM",
        db_index=True
    )
    api_calls_count = models.IntegerField(default=0)
    cache_hits_count = models.IntegerField(default=0)
    
    # Limits based on plan
    monthly_limit = models.IntegerField(default=5)
    plan_type = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('basic', 'Basic'),
            ('premium', 'Premium'),
        ],
        default='free'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_api_usage'
        verbose_name = 'Tax API Usage'
        verbose_name_plural = 'Tax API Usage'
        unique_together = ['tenant_id', 'month_year']
    
    def __str__(self):
        return f"Tenant {self.tenant_id} - {self.month_year} ({self.api_calls_count}/{self.monthly_limit})"


class TaxFilingLocation(models.Model):
    """Caches tax filing location information to reduce API calls."""
    # Location identifiers
    country = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=20, blank=True, default='')
    
    # Federal/National filing information
    federal_website = models.URLField(max_length=500, blank=True, default='')
    federal_name = models.CharField(max_length=255, blank=True, default='')
    federal_address = models.TextField(blank=True, default='')
    federal_phone = models.CharField(max_length=50, blank=True, default='')
    federal_email = models.EmailField(blank=True, default='')
    
    # State/Provincial filing information
    state_website = models.URLField(max_length=500, blank=True, default='')
    state_name = models.CharField(max_length=255, blank=True, default='')
    state_address = models.TextField(blank=True, default='')
    state_phone = models.CharField(max_length=50, blank=True, default='')
    state_email = models.EmailField(blank=True, default='')
    
    # Local/Municipal filing information
    local_website = models.URLField(max_length=500, blank=True, default='')
    local_name = models.CharField(max_length=255, blank=True, default='')
    local_address = models.TextField(blank=True, default='')
    local_phone = models.CharField(max_length=50, blank=True, default='')
    local_email = models.EmailField(blank=True, default='')
    
    # Additional information
    filing_deadlines = models.JSONField(default=dict, blank=True)
    special_instructions = models.TextField(blank=True, default='')
    tax_types = models.JSONField(default=list, blank=True)  # ['sales', 'income', 'property', etc.]
    
    # Cache management
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    lookup_count = models.IntegerField(default=1)  # Track popularity
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_locations'
        unique_together = ['country', 'state_province', 'city']
        indexes = [
            models.Index(fields=['country', 'state_province']),
            models.Index(fields=['last_updated']),
            models.Index(fields=['lookup_count']),
        ]
        
    def __str__(self):
        location_parts = [self.country]
        if self.state_province:
            location_parts.append(self.state_province)
        if self.city:
            location_parts.append(self.city)
        return ', '.join(location_parts)
    
    @property
    def is_stale(self):
        """Check if cache is older than 90 days."""
        from django.utils import timezone
        from datetime import timedelta
        return self.last_updated < timezone.now() - timedelta(days=90)


class TaxReminder(TenantAwareModel):
    """Stores tax filing reminders for tenants."""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    reminder_type = models.CharField(
        max_length=50,
        choices=[
            ('sales_tax', 'Sales Tax'),
            ('income_tax', 'Income Tax'),
            ('quarterly', 'Quarterly Filing'),
            ('annual', 'Annual Filing'),
            ('other', 'Other'),
        ]
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('completed', 'Completed'),
            ('overdue', 'Overdue'),
        ],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_reminders'
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['tenant_id', 'due_date']),
            models.Index(fields=['tenant_id', 'status']),
        ]


class TaxFormTemplate(models.Model):
    """
    Reference table for tax forms by state and type
    """
    form_code = models.CharField(max_length=50, unique=True)  # e.g., "CA-BOE-401-A"
    form_name = models.CharField(max_length=200)  # e.g., "California State, Local and District Sales and Use Tax Return"
    tax_type = models.CharField(max_length=20, choices=TaxFiling.TAX_TYPE_CHOICES)
    state = models.CharField(max_length=2, null=True, blank=True)  # null for federal forms
    is_federal = models.BooleanField(default=False)
    
    # Form specifications
    filing_frequency = models.CharField(max_length=20)  # monthly, quarterly, annual
    due_day = models.IntegerField()  # Day of month when due
    grace_period_days = models.IntegerField(default=0)
    
    # E-filing information
    supports_efiling = models.BooleanField(default=False)
    efiling_url = models.URLField(null=True, blank=True)
    api_endpoint = models.CharField(max_length=200, null=True, blank=True)
    
    # Form template
    template_version = models.CharField(max_length=20)
    template_data = JSONField(default=dict)  # Form field definitions
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_forms'
        indexes = [
            models.Index(fields=['tax_type', 'state']),
            models.Index(fields=['form_code']),
        ]
        
    def __str__(self):
        return f"{self.form_code} - {self.form_name}"


class StateFilingRequirement(models.Model):
    """
    State-specific filing requirements and thresholds
    """
    state = models.CharField(max_length=2, unique=True)
    state_name = models.CharField(max_length=50)
    
    # Sales tax
    has_sales_tax = models.BooleanField(default=True)
    sales_tax_threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sales_tax_registration_required = models.BooleanField(default=True)
    
    # Income tax
    has_income_tax = models.BooleanField(default=True)
    
    # Nexus rules
    economic_nexus_threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transaction_threshold = models.IntegerField(null=True, blank=True)  # Number of transactions
    
    # E-filing
    supports_sales_efiling = models.BooleanField(default=False)
    supports_payroll_efiling = models.BooleanField(default=False)
    supports_income_efiling = models.BooleanField(default=False)
    
    # URLs
    tax_website = models.URLField()
    registration_url = models.URLField(null=True, blank=True)
    
    # Additional requirements
    requirements = JSONField(default=dict)  # State-specific requirements
    
    class Meta:
        app_label = 'taxes'
        db_table = 'state_filing_requirements'
        ordering = ['state']
        
    def __str__(self):
        return f"{self.state} - {self.state_name}"


class FilingCalculation(models.Model):
    """
    Store tax calculations for each filing
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='calculations')
    
    # Calculation details
    calculation_type = models.CharField(max_length=50)  # e.g., "sales_tax", "payroll_tax"
    gross_amount = models.DecimalField(max_digits=15, decimal_places=2)
    deductions = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    exemptions = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=4)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Breakdown by location (for multi-location)
    location_id = models.CharField(max_length=50, null=True, blank=True)
    location_name = models.CharField(max_length=200, null=True, blank=True)
    
    # Metadata
    calculation_data = JSONField(default=dict)  # Detailed breakdown
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_calculations'
        
    def __str__(self):
        return f"{self.calculation_type} - ${self.tax_amount}"


class FilingPayment(models.Model):
    """
    Track payments for tax filings (both service fees and tax payments)
    """
    PAYMENT_TYPE_CHOICES = [
        ('service_fee', 'Service Fee'),
        ('tax_payment', 'Tax Payment'),
        ('penalty', 'Penalty Payment'),
        ('interest', 'Interest Payment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Stripe information
    stripe_payment_intent_id = models.CharField(max_length=200, null=True, blank=True)
    stripe_charge_id = models.CharField(max_length=200, null=True, blank=True)
    
    # Payment details
    payment_method = models.CharField(max_length=50)  # card, bank_transfer, etc
    payment_date = models.DateTimeField()
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    
    # Status
    is_successful = models.BooleanField(default=False)
    failure_reason = models.TextField(null=True, blank=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_payments'
        
    def __str__(self):
        return f"{self.get_payment_type_display()} - ${self.amount}"


# E-Signature Models

class TaxSignatureRequest(TenantAwareModel):
    """Main model for e-signature requests for tax documents"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('signed', 'Partially Signed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('declined', 'Declined'),
        ('error', 'Error'),
    ]
    
    PROVIDER_CHOICES = [
        ('docusign', 'DocuSign'),
        ('adobe_sign', 'Adobe Sign'),
        ('hellosign', 'HelloSign/Dropbox Sign'),
        ('internal', 'Internal System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_signature_requests'
    )
    
    # Document information
    document_name = models.CharField(max_length=255)
    tax_form_type = models.CharField(max_length=50, null=True, blank=True)
    tax_year = models.IntegerField(null=True, blank=True)
    
    # Status and provider information
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    provider_name = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='internal')
    provider_request_id = models.CharField(max_length=255, null=True, blank=True)
    provider_data = JSONField(default=dict, blank=True)
    
    # Timing
    sent_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    # Additional information
    metadata = JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'tax_form_type']),
            models.Index(fields=['provider_name', 'provider_request_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.document_name} - {self.get_status_display()}"


class TaxSignatureSigner(models.Model):
    """Individual signers for signature requests"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('signed', 'Signed'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
    ]
    
    ROLE_CHOICES = [
        ('signer', 'Signer'),
        ('approver', 'Approver'),
        ('witness', 'Witness'),
        ('notary', 'Notary'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    signature_request = models.ForeignKey(
        TaxSignatureRequest, 
        on_delete=models.CASCADE, 
        related_name='signers'
    )
    
    # Signer information
    email = models.EmailField()
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='signer')
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    signing_order = models.IntegerField(default=1)
    signing_url = models.URLField(max_length=1000, blank=True)
    
    # Signature details
    signed_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Provider-specific data
    provider_signer_id = models.CharField(max_length=255, null=True, blank=True)
    provider_data = JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_signers'
        ordering = ['signing_order', 'created_at']
        unique_together = ('signature_request', 'email')
        indexes = [
            models.Index(fields=['signature_request', 'status']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email}) - {self.get_status_display()}"


class TaxSignatureDocument(models.Model):
    """Documents associated with signature requests"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('original', 'Original Document'),
        ('signed', 'Signed Document'),
        ('certificate', 'Signature Certificate'),
        ('audit_trail', 'Audit Trail'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    signature_request = models.ForeignKey(
        TaxSignatureRequest, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    
    # Document information
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    document_file = models.FileField(upload_to='tax_signatures/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    mime_type = models.CharField(max_length=100, default='application/pdf')
    
    # Security
    checksum = models.CharField(max_length=64, blank=True)  # SHA-256 hash
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['signature_request', 'document_type']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.file_name and self.document_file:
            self.file_name = self.document_file.name
        if not self.checksum and self.document_file:
            # Calculate SHA-256 checksum
            import hashlib
            hash_sha256 = hashlib.sha256()
            for chunk in self.document_file.chunks():
                hash_sha256.update(chunk)
            self.checksum = hash_sha256.hexdigest()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.file_name}"


class TaxSignatureAuditLog(models.Model):
    """Audit trail for signature requests"""
    
    EVENT_TYPE_CHOICES = [
        ('request_created', 'Request Created'),
        ('request_sent', 'Request Sent'),
        ('signer_viewed', 'Signer Viewed Document'),
        ('signer_signed', 'Signer Signed Document'),
        ('signer_declined', 'Signer Declined'),
        ('request_completed', 'Request Completed'),
        ('request_cancelled', 'Request Cancelled'),
        ('document_downloaded', 'Document Downloaded'),
        ('status_changed', 'Status Changed'),
        ('webhook_received', 'Webhook Received'),
        ('send_failed', 'Send Failed'),
        ('webhook_status_update', 'Webhook Status Update'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    signature_request = models.ForeignKey(
        TaxSignatureRequest, 
        on_delete=models.CASCADE, 
        related_name='audit_logs'
    )
    
    # Event details
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    description = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Context information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = JSONField(default=dict, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['signature_request', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.created_at}"


class TaxSignatureWebhook(models.Model):
    """Log of webhook events from signature providers"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_name = models.CharField(max_length=20)
    event_type = models.CharField(max_length=100)
    
    # Webhook data
    payload = JSONField()
    headers = JSONField(default=dict)
    
    # Processing status
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_webhooks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider_name', 'processed']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.provider_name} - {self.event_type} - {'Processed' if self.processed else 'Pending'}"


# Filing Confirmation Models

class FilingConfirmation(TenantAwareModel):
    """Stores confirmation details for completed tax filings."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.OneToOneField(TaxFiling, on_delete=models.CASCADE, related_name='confirmation')
    
    # Confirmation details
    confirmation_number = models.CharField(max_length=50, unique=True, db_index=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # PDF receipt storage
    pdf_receipt = models.BinaryField(null=True, blank=True)  # Store PDF as binary
    pdf_file_path = models.FileField(upload_to='tax_confirmations/%Y/%m/', null=True, blank=True)
    
    # State-specific confirmations
    state_confirmation_number = models.CharField(max_length=100, null=True, blank=True)
    state_confirmation_data = JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_confirmations'
        indexes = [
            models.Index(fields=['tenant_id', 'confirmation_number']),
            models.Index(fields=['generated_at']),
        ]
    
    def __str__(self):
        return f"Confirmation {self.confirmation_number} for Filing {self.filing_id}"


class FilingNotification(TenantAwareModel):
    """Tracks notifications sent for filing confirmations."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    confirmation = models.ForeignKey(FilingConfirmation, on_delete=models.CASCADE, related_name='notifications')
    
    # Notification type and recipient
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    recipient = models.CharField(max_length=255)  # Email or phone number
    
    # Content
    subject = models.CharField(max_length=255, null=True, blank=True)
    content = models.TextField()
    
    # Status tracking
    status = models.CharField(max_length=20, choices=NotificationStatus.choices, default=NotificationStatus.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Error handling
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    
    # External tracking
    external_id = models.CharField(max_length=255, null=True, blank=True)  # e.g., Twilio message SID
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_notifications'
        indexes = [
            models.Index(fields=['confirmation', 'notification_type']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['tenant_id', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} to {self.recipient} - {self.get_status_display()}"


# Enums for notification models
class NotificationType(models.TextChoices):
    EMAIL = 'email', 'Email'
    SMS = 'sms', 'SMS'
    IN_APP = 'in_app', 'In-App Notification'
    PUSH = 'push', 'Push Notification'


class NotificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'
    BOUNCED = 'bounced', 'Bounced'


class TaxFilingStatus(models.TextChoices):
    """Extended status choices for tax filings."""
    DRAFT = 'draft', 'Draft'
    PAYMENT_PENDING = 'payment_pending', 'Payment Pending'
    PAYMENT_COMPLETED = 'payment_completed', 'Payment Completed'
    DOCUMENTS_PENDING = 'documents_pending', 'Documents Pending'
    IN_PREPARATION = 'in_preparation', 'In Preparation'
    READY_FOR_REVIEW = 'ready_for_review', 'Ready for Review'
    SUBMITTED = 'submitted', 'Submitted to Tax Authority'
    ACCEPTED = 'accepted', 'Accepted by Tax Authority'
    REJECTED = 'rejected', 'Rejected - Needs Correction'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    AMENDED = 'amended', 'Amended'