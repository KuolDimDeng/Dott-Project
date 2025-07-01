# taxes/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django_countries.fields import CountryField
from django.conf import settings
from custom_auth.tenant_base_model import TenantAwareModel

import uuid
from decimal import Decimal
# Removed deprecated import - JSONField is now from django.db.models
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
    filing_frequency_thresholds = models.JSONField(default=dict, blank=True,
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
    locations = models.JSONField(default=list, blank=True)  # List of location IDs included
    
    # Calculated amounts
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    taxable_sales = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_collected = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tax_due = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Metadata
    filing_data = models.JSONField(default=dict, blank=True)  # Store form-specific data
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
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filings'
        ordering = ['-created']
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
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
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
    created = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'control_type', 'created']),
            models.Index(fields=['user', 'created']),
            models.Index(fields=['status', 'created']),
        ]
        
    def __str__(self):
        return f"{self.entry_type} - {self.control_type} - {self.status} - {self.created}"


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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
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
    created = models.DateTimeField(auto_now_add=True)
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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
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
    created = models.DateTimeField(auto_now_add=True)
    
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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
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
    created = models.DateTimeField(auto_now_add=True)
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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
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
    template_data = models.JSONField(default=dict)  # Form field definitions
    
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
    requirements = models.JSONField(default=dict)  # State-specific requirements
    
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
    calculation_data = models.JSONField(default=dict)  # Detailed breakdown
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
    provider_data = models.JSONField(default=dict, blank=True)
    
    # Timing
    sent_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    # Additional information
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_requests'
        ordering = ['-created']
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'tax_form_type']),
            models.Index(fields=['provider_name', 'provider_request_id']),
            models.Index(fields=['created']),
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
    provider_data = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_signature_signers'
        ordering = ['signing_order', 'created']
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
    metadata = models.JSONField(default=dict, blank=True)
    
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
    payload = models.JSONField()
    headers = models.JSONField(default=dict)
    
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
    state_confirmation_data = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_confirmations'
        indexes = [
            models.Index(fields=['tenant_id', 'confirmation_number']),
            models.Index(fields=['generated_at']),
        ]
    
    def __str__(self):
        return f"Confirmation {self.confirmation_number} for Filing {self.filing_id}"


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
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_filing_notifications'
        indexes = [
            models.Index(fields=['confirmation', 'notification_type']),
            models.Index(fields=['status', 'created']),
            models.Index(fields=['tenant_id', 'created']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} to {self.recipient} - {self.get_status_display()}"


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


# Payroll Tax Models

class Form941(TenantAwareModel):
    """Quarterly Federal Payroll Tax Return (Form 941)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Period information
    quarter = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(4)])
    year = models.IntegerField()
    
    # Filing dates
    period_start = models.DateField()
    period_end = models.DateField()
    due_date = models.DateField()
    filing_date = models.DateTimeField(null=True, blank=True)
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('calculated', 'Calculated'),
        ('ready', 'Ready to File'),
        ('submitted', 'Submitted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('amended', 'Amended'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Part 1: Answer these questions for this quarter
    number_of_employees = models.IntegerField(default=0, help_text="Number of employees who received wages")
    wages_tips_compensation = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    federal_income_tax_withheld = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Social Security
    social_security_wages = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    social_security_tips = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    social_security_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Medicare
    medicare_wages_tips = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    medicare_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    additional_medicare_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Totals
    total_tax_before_adjustments = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_quarter_adjustments = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_tax_after_adjustments = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Part 2: Tell us about your deposit schedule
    DEPOSIT_SCHEDULE_CHOICES = [
        ('monthly', 'Monthly'),
        ('semiweekly', 'Semiweekly'),
    ]
    deposit_schedule = models.CharField(max_length=20, choices=DEPOSIT_SCHEDULE_CHOICES, default='monthly')
    
    # Monthly liabilities (for monthly depositors)
    month1_liability = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    month2_liability = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    month3_liability = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Total deposits and balance
    total_deposits = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    overpayment = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Schedule B (for semiweekly depositors)
    requires_schedule_b = models.BooleanField(default=False)
    schedule_b_data = models.JSONField(default=dict, blank=True)
    
    # Part 3: Tell us about your business
    business_closed = models.BooleanField(default=False)
    final_return = models.BooleanField(default=False)
    seasonal_employer = models.BooleanField(default=False)
    
    # E-filing information
    submission_id = models.CharField(max_length=100, null=True, blank=True)
    irs_tracking_number = models.CharField(max_length=100, null=True, blank=True)
    acknowledgment_number = models.CharField(max_length=100, null=True, blank=True)
    acknowledgment_date = models.DateTimeField(null=True, blank=True)
    
    # Validation
    validation_errors = models.JSONField(default=list, blank=True)
    is_valid = models.BooleanField(default=False)
    
    # Metadata
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    created_by = models.EmailField()
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_form_941'
        unique_together = ['tenant_id', 'quarter', 'year']
        indexes = [
            models.Index(fields=['tenant_id', 'year', 'quarter']),
            models.Index(fields=['status', 'due_date']),
        ]
        
    def __str__(self):
        return f"Form 941 - Q{self.quarter} {self.year} - {self.get_status_display()}"
    
    def calculate_total_tax(self):
        """Calculate total tax before adjustments"""
        self.total_tax_before_adjustments = (
            self.federal_income_tax_withheld +
            self.social_security_tax +
            self.medicare_tax +
            self.additional_medicare_tax
        )
        self.total_tax_after_adjustments = (
            self.total_tax_before_adjustments +
            self.current_quarter_adjustments
        )
        return self.total_tax_after_adjustments


class Form941ScheduleB(TenantAwareModel):
    """Schedule B - Report of Tax Liability for Semiweekly Schedule Depositors"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form_941 = models.OneToOneField(Form941, on_delete=models.CASCADE, related_name='schedule_b')
    
    # Daily tax liabilities stored as JSON
    # Format: {1: [day1_amount, day2_amount, ...], 2: [...], 3: [...]}
    daily_liabilities = models.JSONField(default=dict)
    
    # Monthly totals
    month1_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    month2_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    month3_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Total for quarter
    quarter_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_form_941_schedule_b'
        
    def __str__(self):
        return f"Schedule B for {self.form_941}"


class PayrollTaxDeposit(TenantAwareModel):
    """Track federal tax deposits"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Tax type
    TAX_TYPE_CHOICES = [
        ('941', 'Form 941 - Employment Tax'),
        ('FUTA', 'Form 940 - FUTA Tax'),
        ('OTHER', 'Other Tax'),
    ]
    tax_type = models.CharField(max_length=10, choices=TAX_TYPE_CHOICES, default='941')
    
    # Reference to payroll run (optional for FUTA)
    payroll_run_id = models.CharField(max_length=50, db_index=True, null=True, blank=True)
    pay_date = models.DateField(null=True, blank=True)
    
    # Deposit details
    deposit_date = models.DateField()
    due_date = models.DateField()
    
    # Amounts (941 taxes)
    federal_income_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    social_security_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medicare_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # FUTA specific
    futa_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quarter = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(4)], null=True, blank=True)
    year = models.IntegerField(null=True, blank=True)
    
    # Total amount
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Payment information
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    confirmation_number = models.CharField(max_length=100, null=True, blank=True)
    eftps_acknowledgment = models.CharField(max_length=100, null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_payroll_deposits'
        indexes = [
            models.Index(fields=['tenant_id', 'deposit_date']),
            models.Index(fields=['status', 'due_date']),
        ]
        
    def __str__(self):
        return f"Tax Deposit - {self.deposit_date} - ${self.total_deposit}"


class PayrollTaxFilingSchedule(TenantAwareModel):
    """Manage payroll tax filing schedules and deadlines"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Schedule type
    FORM_TYPE_CHOICES = [
        ('941', 'Form 941 - Quarterly'),
        ('940', 'Form 940 - Annual FUTA'),
        ('W2', 'Form W-2 - Annual'),
        ('1099', 'Form 1099 - Annual'),
        ('STATE_QUARTERLY', 'State Quarterly'),
        ('STATE_ANNUAL', 'State Annual'),
    ]
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    
    # Period
    year = models.IntegerField()
    quarter = models.IntegerField(null=True, blank=True)  # For quarterly forms
    
    # Deadlines
    period_start = models.DateField()
    period_end = models.DateField()
    filing_deadline = models.DateField()
    extended_deadline = models.DateField(null=True, blank=True)
    
    # Status tracking
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('in_progress', 'In Progress'),
        ('filed', 'Filed'),
        ('late', 'Late'),
        ('extended', 'Extended'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    
    # Filing details
    filed_date = models.DateTimeField(null=True, blank=True)
    confirmation_number = models.CharField(max_length=100, null=True, blank=True)
    
    # Reminders
    reminder_sent = models.BooleanField(default=False)
    reminder_date = models.DateTimeField(null=True, blank=True)
    
    # State-specific
    state_code = models.CharField(max_length=2, null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_payroll_filing_schedule'
        unique_together = ['tenant_id', 'form_type', 'year', 'quarter', 'state_code']
        indexes = [
            models.Index(fields=['tenant_id', 'filing_deadline']),
            models.Index(fields=['status', 'filing_deadline']),
        ]
        
    def __str__(self):
        quarter_str = f"Q{self.quarter}" if self.quarter else "Annual"
        return f"{self.get_form_type_display()} - {quarter_str} {self.year}"


class EmployerTaxAccount(TenantAwareModel):
    """Store employer tax account information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Federal accounts
    ein = models.CharField(max_length=20, help_text="Employer Identification Number")
    ein_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # EFTPS (Electronic Federal Tax Payment System)
    eftps_enrolled = models.BooleanField(default=False)
    eftps_pin = models.CharField(max_length=100, blank=True, help_text="Encrypted PIN")
    
    # State accounts
    state_accounts = models.JSONField(default=dict, blank=True)
    # Format: {"CA": {"account_number": "...", "access_code": "..."}, ...}
    
    # Deposit schedules
    federal_deposit_schedule = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('semiweekly', 'Semiweekly'),
            ('next_day', 'Next Day'),
        ],
        default='monthly'
    )
    
    # Previous year liability (determines deposit schedule)
    previous_year_liability = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Total tax liability for previous year"
    )
    
    # Contact information for tax notices
    tax_contact_name = models.CharField(max_length=100, blank=True)
    tax_contact_email = models.EmailField(blank=True)
    tax_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Power of Attorney
    has_poa = models.BooleanField(default=False)
    poa_firm_name = models.CharField(max_length=200, blank=True)
    poa_caf_number = models.CharField(max_length=50, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_employer_accounts'
        
    def __str__(self):
        return f"Tax Account - EIN: {self.ein}"


class Form940(TenantAwareModel):
    """Annual Federal Unemployment Tax Return (Form 940)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Period information
    year = models.IntegerField()
    
    # Employer information
    ein = models.CharField(max_length=20)
    business_name = models.CharField(max_length=200)
    trade_name = models.CharField(max_length=200, blank=True)
    address = models.JSONField(default=dict)  # Street, city, state, zip
    
    # Part 1 - Tell us about your return
    amended_return = models.BooleanField(default=False)
    successor_employer = models.BooleanField(default=False)
    no_payments_to_employees = models.BooleanField(default=False)
    final_return = models.BooleanField(default=False)
    
    # Part 2 - Determine FUTA tax before adjustments
    total_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payments_exempt_from_futa = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payments_exceeding_7000 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_taxable_futa_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 3 - Determine adjustments
    adjustments_fringe_benefits = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments_group_life = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments_retirement = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments_dependent_care = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adjustments_other = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 4 - Calculate FUTA tax
    adjusted_taxable_futa_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    futa_tax_rate = models.DecimalField(max_digits=5, decimal_places=3, default=0.006)
    futa_tax_before_adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    futa_tax_adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    futa_tax_after_adjustments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 5 - State unemployment tax credit
    state_contributions_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    state_taxable_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    additional_tax_credit_reduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_reduction_states = models.JSONField(default=list, blank=True)  # List of states with credit reduction
    total_credit_reduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    state_credit_allowable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 6 - Calculate total FUTA tax
    total_futa_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 7 - Quarterly tax liability
    first_quarter_liability = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    second_quarter_liability = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    third_quarter_liability = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fourth_quarter_liability = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax_liability = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Part 8 - Balance due or overpayment
    total_deposits = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overpayment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overpayment_applied_to_next_return = models.BooleanField(default=False)
    overpayment_refunded = models.BooleanField(default=False)
    
    # Multi-state employer information
    is_multi_state = models.BooleanField(default=False)
    schedule_a_attached = models.BooleanField(default=False)
    
    # Filing information
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ready', 'Ready to File'),
        ('filed', 'Filed'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('amended', 'Amended'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    filing_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
    confirmation_number = models.CharField(max_length=100, blank=True)
    
    # Third-party designee
    third_party_designee = models.BooleanField(default=False)
    designee_name = models.CharField(max_length=100, blank=True)
    designee_phone = models.CharField(max_length=20, blank=True)
    designee_pin = models.CharField(max_length=5, blank=True)
    
    # Signature
    signer_name = models.CharField(max_length=100, blank=True)
    signer_title = models.CharField(max_length=100, blank=True)
    signature_date = models.DateField(null=True, blank=True)
    
    # Preparer information (if applicable)
    paid_preparer = models.BooleanField(default=False)
    preparer_name = models.CharField(max_length=100, blank=True)
    preparer_ptin = models.CharField(max_length=20, blank=True)
    preparer_firm_name = models.CharField(max_length=200, blank=True)
    preparer_firm_ein = models.CharField(max_length=20, blank=True)
    preparer_firm_address = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_form940'
        unique_together = ['tenant_id', 'year']
        indexes = [
            models.Index(fields=['tenant_id', 'year']),
            models.Index(fields=['status', 'due_date']),
        ]
        
    def __str__(self):
        return f"Form 940 - {self.year} - {self.business_name}"
    
    def calculate_totals(self):
        """Calculate all derived totals"""
        # Total taxable FUTA wages
        self.total_taxable_futa_wages = (
            self.total_payments - 
            self.payments_exempt_from_futa - 
            self.payments_exceeding_7000
        )
        
        # Total adjustments
        self.total_adjustments = (
            self.adjustments_fringe_benefits +
            self.adjustments_group_life +
            self.adjustments_retirement +
            self.adjustments_dependent_care +
            self.adjustments_other
        )
        
        # Adjusted taxable FUTA wages
        self.adjusted_taxable_futa_wages = (
            self.total_taxable_futa_wages + self.total_adjustments
        )
        
        # FUTA tax calculations
        self.futa_tax_before_adjustments = (
            self.adjusted_taxable_futa_wages * Decimal('0.060')  # 6.0%
        )
        self.futa_tax_after_adjustments = (
            self.futa_tax_before_adjustments + self.futa_tax_adjustments
        )
        
        # Total FUTA tax after credit
        self.total_futa_tax = (
            self.futa_tax_after_adjustments - 
            self.state_credit_allowable + 
            self.total_credit_reduction
        )
        
        # Total quarterly liability
        self.total_tax_liability = (
            self.first_quarter_liability +
            self.second_quarter_liability +
            self.third_quarter_liability +
            self.fourth_quarter_liability
        )
        
        # Balance due or overpayment
        if self.total_tax_liability > self.total_deposits:
            self.balance_due = self.total_tax_liability - self.total_deposits
            self.overpayment = Decimal('0')
        else:
            self.balance_due = Decimal('0')
            self.overpayment = self.total_deposits - self.total_tax_liability
        
        return self


class Form940ScheduleA(TenantAwareModel):
    """Schedule A - Multi-State Employer and Credit Reduction Information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form_940 = models.ForeignKey(Form940, on_delete=models.CASCADE, related_name='schedule_a_states')
    
    # State information
    state_code = models.CharField(max_length=2)
    state_ein = models.CharField(max_length=50, blank=True)
    
    # Wages and contributions
    taxable_wages = models.DecimalField(max_digits=12, decimal_places=2)
    state_experience_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    state_unemployment_tax_paid = models.DecimalField(max_digits=12, decimal_places=2)
    additional_contributions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_contributions = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Credit reduction (if applicable)
    is_credit_reduction_state = models.BooleanField(default=False)
    credit_reduction_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=3, 
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(0.1)]
    )
    credit_reduction_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_form940_schedule_a'
        unique_together = ['form_940', 'state_code']
        
    def __str__(self):
        return f"Schedule A - {self.state_code} - Form 940 {self.form_940.year}"
    
    def calculate_credit_reduction(self):
        """Calculate credit reduction amount if applicable"""
        if self.is_credit_reduction_state:
            self.credit_reduction_amount = (
                self.taxable_wages * self.credit_reduction_rate
            )
        else:
            self.credit_reduction_amount = Decimal('0')
        return self.credit_reduction_amount


class StatePayrollConfiguration(TenantAwareModel):
    """Configuration for state payroll tax processing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state_code = models.CharField(max_length=2)
    
    # Wage bases and rates (updated annually)
    year = models.IntegerField()
    sui_wage_base = models.DecimalField(max_digits=10, decimal_places=2)
    sui_new_employer_rate = models.DecimalField(max_digits=6, decimal_places=5)
    sui_minimum_rate = models.DecimalField(max_digits=6, decimal_places=5)
    sui_maximum_rate = models.DecimalField(max_digits=6, decimal_places=5)
    
    # State disability insurance (if applicable)
    has_sdi = models.BooleanField(default=False)
    sdi_wage_base = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sdi_employee_rate = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True)
    sdi_employer_rate = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True)
    
    # Family leave insurance (if applicable)
    has_fli = models.BooleanField(default=False)
    fli_wage_base = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fli_employee_rate = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True)
    fli_employer_rate = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True)
    
    # Other state-specific taxes
    other_taxes = models.JSONField(default=dict, blank=True)
    
    # Filing requirements
    quarterly_filing_required = models.BooleanField(default=True)
    monthly_deposit_threshold = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Reciprocity agreements
    reciprocity_states = models.JSONField(default=list, blank=True)
    
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['state_code', 'year']
        
    def __str__(self):
        return f"{self.state_code} Payroll Config - {self.year}"


class StateTaxAccount(TenantAwareModel):
    """Store state-specific employer tax account information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # State information
    state_code = models.CharField(max_length=2)
    state_employer_number = models.CharField(max_length=50)
    state_unemployment_number = models.CharField(max_length=50, blank=True)
    
    # Experience rating
    experience_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="State unemployment tax experience rate"
    )
    experience_rate_effective_date = models.DateField(null=True, blank=True)
    
    # State-specific settings
    state_withholding_number = models.CharField(max_length=50, blank=True)
    filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annually', 'Annually'),
        ],
        default='quarterly'
    )
    
    # Online access
    online_portal_url = models.URLField(blank=True)
    online_username = models.CharField(max_length=100, blank=True)
    online_password_hint = models.CharField(max_length=200, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    registration_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_state_accounts'
        unique_together = ['tenant_id', 'state_code']
        
    def __str__(self):
        return f"{self.state_code} Tax Account - {self.state_employer_number}"


# Year-End Tax Form Models

class W2Form(TenantAwareModel):
    """Store W-2 form data for employees"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_id = models.UUIDField(db_index=True)
    tax_year = models.IntegerField()
    control_number = models.CharField(max_length=50, unique=True)
    
    # Box 1-11: Wages and taxes
    wages_tips_other = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    federal_income_tax_withheld = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    social_security_wages = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    social_security_tax_withheld = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medicare_wages_tips = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medicare_tax_withheld = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    social_security_tips = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allocated_tips = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance_eic_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    dependent_care_benefits = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nonqualified_plans = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Box 12: Coded items
    box12_codes = models.JSONField(default=dict, blank=True)  # {"D": 5000.00, "DD": 12000.00}
    
    # Box 13: Checkboxes
    statutory_employee = models.BooleanField(default=False)
    retirement_plan = models.BooleanField(default=False)
    third_party_sick_pay = models.BooleanField(default=False)
    
    # Box 14: Other
    box14_other = models.JSONField(default=dict, blank=True)  # {"Union Dues": 500.00}
    
    # State and local information
    state_wages_tips = models.JSONField(default=list, blank=True)
    # [{"state": "CA", "wages": 50000.00, "tax": 2500.00, "employer_state_id": "123456789"}]
    
    local_wages_tips = models.JSONField(default=list, blank=True)
    # [{"locality": "NYC", "wages": 50000.00, "tax": 1500.00}]
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('distributed', 'Distributed'),
        ('corrected', 'Corrected'),
        ('voided', 'Voided'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # PDF storage
    pdf_file = models.FileField(upload_to='w2_forms/%Y/', null=True, blank=True)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    
    # Distribution tracking
    distributed_to_employee = models.BooleanField(default=False)
    distribution_date = models.DateTimeField(null=True, blank=True)
    distribution_method = models.CharField(max_length=50, blank=True)  # email, mail, portal
    
    # E-filing
    efiled_to_ssa = models.BooleanField(default=False)
    ssa_submission_id = models.CharField(max_length=100, blank=True)
    ssa_submission_date = models.DateTimeField(null=True, blank=True)
    
    # Corrections
    is_correction = models.BooleanField(default=False)
    original_w2_id = models.UUIDField(null=True, blank=True)
    correction_code = models.CharField(max_length=10, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_w2_forms'
        unique_together = ['tenant_id', 'employee_id', 'tax_year']
        indexes = [
            models.Index(fields=['tenant_id', 'tax_year']),
            models.Index(fields=['employee_id', 'tax_year']),
            models.Index(fields=['status']),
        ]
        
    def __str__(self):
        return f"W-2 {self.tax_year} - Employee {self.employee_id} - {self.control_number}"


class W3Form(TenantAwareModel):
    """W-3 Transmittal form for W-2s"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_year = models.IntegerField()
    control_number = models.CharField(max_length=50, unique=True)
    
    # Kind of payer
    KIND_OF_PAYER_CHOICES = [
        ('941', 'Form 941'),
        ('Military', 'Military'),
        ('943', 'Form 943'),
        ('944', 'Form 944'),
        ('CT-1', 'Form CT-1'),
        ('Hshld', 'Household'),
        ('Medicare', 'Medicare govt employer'),
    ]
    kind_of_payer = models.CharField(max_length=20, choices=KIND_OF_PAYER_CHOICES, default='941')
    
    # Totals from all W-2s
    total_forms = models.IntegerField(default=0)
    total_wages = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_federal_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_ss_wages = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_ss_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_medicare_wages = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_medicare_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_ss_tips = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_allocated_tips = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_advance_eic = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_dependent_care = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_nonqualified_plans = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Other totals
    total_deferred_compensation = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Third party sick pay
    third_party_sick_pay = models.BooleanField(default=False)
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('submitted', 'Submitted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Submission
    submission_date = models.DateTimeField(null=True, blank=True)
    ssa_tracking_number = models.CharField(max_length=100, blank=True)
    
    # PDF storage
    pdf_file = models.FileField(upload_to='w3_forms/%Y/', null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_w3_forms'
        unique_together = ['tenant_id', 'tax_year']
        
    def __str__(self):
        return f"W-3 Transmittal {self.tax_year} - {self.total_forms} forms"


class Form1099(TenantAwareModel):
    """Base model for 1099 forms"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_id = models.UUIDField(db_index=True)
    tax_year = models.IntegerField()
    
    # Form type
    FORM_TYPE_CHOICES = [
        ('1099-NEC', '1099-NEC Nonemployee Compensation'),
        ('1099-MISC', '1099-MISC Miscellaneous Income'),
        ('1099-K', '1099-K Payment Card and Third Party Network Transactions'),
        ('1099-INT', '1099-INT Interest Income'),
        ('1099-DIV', '1099-DIV Dividends and Distributions'),
    ]
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    
    # Recipient information
    recipient_tin = models.CharField(max_length=20)
    recipient_name = models.CharField(max_length=200)
    recipient_address = models.JSONField(default=dict)  # street, city, state, zip
    account_number = models.CharField(max_length=50, blank=True)
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('distributed', 'Distributed'),
        ('corrected', 'Corrected'),
        ('voided', 'Voided'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Federal tax withheld
    federal_tax_withheld = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # State information
    state_tax_info = models.JSONField(default=list, blank=True)
    # [{"state": "CA", "state_tax_withheld": 500.00, "state_income": 10000.00, "payer_state_no": "123456"}]
    
    # Correction
    corrected = models.BooleanField(default=False)
    void = models.BooleanField(default=False)
    
    # PDF storage
    pdf_file = models.FileField(upload_to='1099_forms/%Y/', null=True, blank=True)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    
    # Distribution
    distributed_to_recipient = models.BooleanField(default=False)
    distribution_date = models.DateTimeField(null=True, blank=True)
    distribution_method = models.CharField(max_length=50, blank=True)
    
    # E-filing
    efiled_to_irs = models.BooleanField(default=False)
    irs_submission_id = models.CharField(max_length=100, blank=True)
    irs_submission_date = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_1099_forms'
        abstract = True
        indexes = [
            models.Index(fields=['tenant_id', 'tax_year']),
            models.Index(fields=['vendor_id', 'tax_year']),
            models.Index(fields=['form_type', 'status']),
        ]


class Form1099NEC(Form1099):
    """1099-NEC Nonemployee Compensation"""
    # Box 1 - Nonemployee compensation
    nonemployee_compensation = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Box 2 - Checkbox if payer made direct sales
    payer_made_direct_sales = models.BooleanField(default=False)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_1099_nec_forms'
        
    def __str__(self):
        return f"1099-NEC {self.tax_year} - {self.recipient_name} - ${self.nonemployee_compensation}"


class Form1099MISC(Form1099):
    """1099-MISC Miscellaneous Income"""
    # Box 1-14
    rents = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    royalties = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fishing_boat_proceeds = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    medical_healthcare_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    substitute_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    direct_sales_indicator = models.BooleanField(default=False)
    crop_insurance_proceeds = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_proceeds_attorney = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    section_409a_deferrals = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    excess_golden_parachute = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nonqualified_deferred_comp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Box 15-17 are handled in state_tax_info
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_1099_misc_forms'
        
    def __str__(self):
        total = sum([
            self.rents, self.royalties, self.other_income, self.fishing_boat_proceeds,
            self.medical_healthcare_payments, self.crop_insurance_proceeds, 
            self.gross_proceeds_attorney
        ])
        return f"1099-MISC {self.tax_year} - {self.recipient_name} - ${total}"


class Form1096(TenantAwareModel):
    """1096 Annual Summary and Transmittal of U.S. Information Returns"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_year = models.IntegerField()
    
    # Type of returns
    form_types_included = models.JSONField(default=list)  # ['1099-NEC', '1099-MISC']
    
    # Totals
    total_forms = models.IntegerField(default=0)
    total_amount_reported = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Filer information (populated from Business/Tenant)
    filer_name = models.CharField(max_length=200)
    filer_address = models.JSONField(default=dict)
    filer_tin = models.CharField(max_length=20)
    
    # Contact information
    contact_name = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()
    
    # Status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('generated', 'Generated'),
        ('submitted', 'Submitted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Submission
    submission_date = models.DateTimeField(null=True, blank=True)
    irs_tracking_number = models.CharField(max_length=100, blank=True)
    
    # PDF storage
    pdf_file = models.FileField(upload_to='1096_forms/%Y/', null=True, blank=True)
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_1096_forms'
        unique_together = ['tenant_id', 'tax_year']
        
    def __str__(self):
        return f"1096 Transmittal {self.tax_year} - {self.total_forms} forms"


class YearEndTaxGeneration(TenantAwareModel):
    """Track year-end tax form generation batches"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tax_year = models.IntegerField()
    
    # Generation type
    GENERATION_TYPE_CHOICES = [
        ('w2_w3', 'W-2 and W-3 Forms'),
        ('1099', '1099 Forms'),
        ('all', 'All Year-End Forms'),
    ]
    generation_type = models.CharField(max_length=20, choices=GENERATION_TYPE_CHOICES)
    
    # Status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partially Completed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Statistics
    total_forms_expected = models.IntegerField(default=0)
    total_forms_generated = models.IntegerField(default=0)
    total_forms_distributed = models.IntegerField(default=0)
    
    # W-2 specific
    w2_count = models.IntegerField(default=0)
    w3_generated = models.BooleanField(default=False)
    
    # 1099 specific
    form_1099_nec_count = models.IntegerField(default=0)
    form_1099_misc_count = models.IntegerField(default=0)
    form_1096_generated = models.BooleanField(default=False)
    
    # Processing details
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Generated forms references
    generated_forms = models.JSONField(default=dict, blank=True)
    # {"w2": ["uuid1", "uuid2"], "1099_nec": ["uuid3"], ...}
    
    # User who initiated
    initiated_by = models.EmailField()
    
    # Timestamps
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        db_table = 'tax_year_end_generation'
        indexes = [
            models.Index(fields=['tenant_id', 'tax_year']),
            models.Index(fields=['status', 'created']),
        ]
        
    def __str__(self):
        return f"{self.get_generation_type_display()} - {self.tax_year} - {self.get_status_display()}"