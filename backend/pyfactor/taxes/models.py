# taxes/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django_countries.fields import CountryField
from django.conf import settings
from custom_auth.tenant_base_model import TenantAwareModel
from django.contrib.auth import get_user_model

import uuid
from decimal import Decimal
# Removed deprecated import - JSONField is now from django.db.models
from django.utils import timezone
from audit.mixins import AuditMixin

User = get_user_model()



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
    e_file_api_version = models.CharField(max_length=20, blank=True, null=True,
        help_text="API version (e.g., 'v1', '2.0')")
    e_file_formats = models.JSONField(default=list, blank=True,
        help_text="Supported file formats ['XML', 'JSON', 'PDF']")
    
    # State-specific rates and thresholds
    base_tax_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Base state income tax rate (for estimates)")
    filing_frequency_thresholds = models.JSONField(default=dict, blank=True,
        help_text="Thresholds for determining filing frequency")
    
    # State-specific forms and rules
    form_number = models.CharField(max_length=20, blank=True,
        help_text="Primary state tax form number (e.g., CA-3522)")
    form_name = models.CharField(max_length=100, blank=True,
        help_text="Primary state tax form name")
    filing_due_day = models.IntegerField(default=15,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when filings are typically due")
    vendor_discount_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(0.05)],
        help_text="Vendor discount rate for timely filing (e.g., 0.02 = 2%)")
    
    # Local tax complexity
    has_district_taxes = models.BooleanField(default=False,
        help_text="State has special tax districts")
    has_home_rule_cities = models.BooleanField(default=False,
        help_text="Cities can set their own tax rates")
    requires_location_reporting = models.BooleanField(default=False,
        help_text="Sales must be reported by location")
    
    class Meta:
        app_label = 'taxes'
        ordering = ['name']

class IncomeTaxRate(TenantAwareModel):
    """Income tax rates by state and income bracket"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='income_tax_rates')
    tax_year = models.IntegerField(default=2024)
    
    # Filing status
    FILING_STATUS_CHOICES = [
        ('single', 'Single'),
        ('married_joint', 'Married Filing Jointly'),
        ('married_separate', 'Married Filing Separately'),
        ('head_of_household', 'Head of Household'),
    ]
    filing_status = models.CharField(max_length=20, choices=FILING_STATUS_CHOICES, default='single')
    
    # Income brackets
    income_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    income_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Tax rate
    tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    
    # Additional amounts
    base_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Deductions and exemptions
    standard_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    personal_exemption = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Flags
    is_flat_rate = models.BooleanField(default=False)
    is_no_tax_state = models.BooleanField(default=False)
    
    effective_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['state', 'filing_status', 'income_min']
        unique_together = ['state', 'tax_year', 'filing_status', 'income_min']

class PayrollTaxFiling(TenantAwareModel):
    """Tracks payroll tax filings by state"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='payroll_tax_filings')
    
    FILING_TYPE_CHOICES = [
        ('quarterly', 'Quarterly'),
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
        ('semi-annual', 'Semi-Annual'),
    ]
    filing_type = models.CharField(max_length=20, choices=FILING_TYPE_CHOICES)
    
    # Rates
    state_unemployment_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    state_disability_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        default=0
    )
    
    # Wage bases
    unemployment_wage_base = models.DecimalField(max_digits=12, decimal_places=2)
    disability_wage_base = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Form information
    form_number = models.CharField(max_length=50)
    form_name = models.CharField(max_length=200)
    
    # Filing deadlines
    due_date_description = models.TextField()
    
    effective_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['state', 'filing_type', '-effective_date']

class TaxFilingInstruction(TenantAwareModel):
    """Step-by-step instructions for tax filings"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, null=True, blank=True, related_name='filing_instructions')
    
    TAX_TYPE_CHOICES = [
        ('sales', 'Sales Tax'),
        ('payroll', 'Payroll Tax'),
        ('income', 'Income Tax'),
        ('franchise', 'Franchise Tax'),
        ('property', 'Property Tax'),
    ]
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    estimated_time_minutes = models.IntegerField(default=30)
    
    # JSON field for step-by-step instructions
    steps = models.JSONField(default=list)
    
    # Related resources
    related_forms = models.JSONField(default=list)
    helpful_links = models.JSONField(default=list)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    last_updated = models.DateTimeField(auto_now=True)
    version = models.CharField(max_length=20, default='1.0')
    
    class Meta:
        app_label = 'taxes'
        ordering = ['state', 'tax_type', 'title']

class TaxForm(TenantAwareModel):
    """Tax forms repository"""
    form_name = models.CharField(max_length=200)
    form_number = models.CharField(max_length=50)
    form_year = models.IntegerField(default=2024)
    
    state = models.ForeignKey(State, on_delete=models.CASCADE, null=True, blank=True, related_name='tax_forms')
    
    # Form categorization
    FORM_TYPE_CHOICES = [
        ('sales', 'Sales Tax'),
        ('payroll', 'Payroll Tax'),
        ('income', 'Income Tax'),
        ('w2', 'W-2'),
        ('1099', '1099'),
        ('other', 'Other'),
    ]
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    
    # Agency information
    AGENCY_CHOICES = [
        ('irs', 'IRS'),
        ('state', 'State Tax Agency'),
        ('local', 'Local Tax Agency'),
    ]
    agency = models.CharField(max_length=20, choices=AGENCY_CHOICES)
    
    description = models.TextField()
    
    # Filing frequency
    FREQUENCY_CHOICES = [
        ('annual', 'Annual'),
        ('quarterly', 'Quarterly'),
        ('monthly', 'Monthly'),
        ('as_needed', 'As Needed'),
    ]
    filing_frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    
    due_date_rule = models.TextField(help_text="Description of when this form is due")
    
    # Form file and links
    form_file = models.FileField(
        upload_to='tax_forms/', 
        null=True, 
        blank=True,
        validators=[FileExtensionValidator(['pdf', 'doc', 'docx'])]
    )
    official_url = models.URLField(help_text="Link to official form on agency website", blank=True)
    instructions_url = models.URLField(help_text="Link to form instructions", blank=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    # AI-generated fields
    ai_generated_instructions = models.TextField(blank=True)
    ai_common_mistakes = models.JSONField(default=list)
    ai_tips = models.JSONField(default=list)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['state', 'form_type', 'form_number']
        unique_together = ['form_number', 'form_year', 'state']

class GlobalCompliance(models.Model):
    """Global tax compliance information for different countries"""
    country = CountryField(unique=True)
    
    # Tax types in this country
    has_vat = models.BooleanField(default=False)
    vat_name = models.CharField(max_length=50, default='VAT', help_text="Local name for VAT")
    standard_vat_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    has_gst = models.BooleanField(default=False)
    gst_name = models.CharField(max_length=50, default='GST', help_text="Local name for GST")
    standard_gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    has_sales_tax = models.BooleanField(default=False)
    sales_tax_name = models.CharField(max_length=50, default='Sales Tax')
    
    # Income tax
    has_income_tax = models.BooleanField(default=True)
    corporate_tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Payroll taxes
    has_payroll_tax = models.BooleanField(default=True)
    employer_social_insurance_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    employee_social_insurance_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Digital services tax
    has_digital_services_tax = models.BooleanField(default=False)
    digital_services_tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    digital_services_tax_threshold = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Revenue threshold in local currency"
    )
    
    # Filing requirements
    vat_registration_threshold = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Annual revenue threshold for VAT registration in local currency"
    )
    
    vat_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
            ('varies', 'Varies by revenue'),
        ],
        default='varies'
    )
    
    # Currency and formatting
    currency_code = models.CharField(max_length=3, default='USD')
    currency_symbol = models.CharField(max_length=5, default='$')
    currency_position = models.CharField(
        max_length=10,
        choices=[
            ('before', 'Before amount'),
            ('after', 'After amount'),
        ],
        default='before'
    )
    decimal_separator = models.CharField(max_length=1, default='.')
    thousands_separator = models.CharField(max_length=1, default=',')
    
    # Date formats
    date_format = models.CharField(
        max_length=20,
        choices=[
            ('MM/DD/YYYY', 'MM/DD/YYYY'),
            ('DD/MM/YYYY', 'DD/MM/YYYY'),
            ('YYYY-MM-DD', 'YYYY-MM-DD'),
        ],
        default='MM/DD/YYYY'
    )
    
    fiscal_year_start_month = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    
    # E-invoicing requirements
    requires_e_invoicing = models.BooleanField(default=False)
    e_invoice_format = models.CharField(max_length=50, blank=True)
    e_invoice_portal_url = models.URLField(blank=True)
    
    # Tax authority information
    tax_authority_name = models.CharField(max_length=200)
    tax_authority_website = models.URLField()
    tax_authority_contact = models.CharField(max_length=50, blank=True)
    
    # Compliance notes
    compliance_notes = models.TextField(blank=True)
    special_requirements = models.JSONField(default=dict, blank=True)
    
    # AI assistance availability
    ai_tax_calculation_available = models.BooleanField(default=True)
    ai_compliance_check_available = models.BooleanField(default=True)
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True)
    verified_by_expert = models.BooleanField(default=False)
    expert_verification_date = models.DateField(null=True, blank=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['country']
        verbose_name = 'Global Tax Compliance'
        verbose_name_plural = 'Global Tax Compliance Records'
    
    def __str__(self):
        return f"{self.country.name} Tax Compliance"

# Add audit trail for sensitive tax data
class TaxDataEntryControl(models.Model):
    """Control and rate limit tax data entry to prevent abuse"""
    tenant_id = models.CharField(max_length=255, db_index=True)
    
    # Limits per period
    max_entries_per_hour = models.IntegerField(default=100)
    max_entries_per_day = models.IntegerField(default=1000)
    max_bulk_entries = models.IntegerField(default=50, help_text="Max entries in single bulk operation")
    
    # Suspicious activity thresholds
    duplicate_entry_threshold = models.IntegerField(default=5, help_text="Max identical entries before flag")
    rapid_entry_seconds = models.IntegerField(default=2, help_text="Min seconds between entries")
    
    # Actions when limits exceeded
    ACTION_CHOICES = [
        ('warn', 'Warn Only'),
        ('throttle', 'Throttle Requests'),
        ('block', 'Block Temporarily'),
        ('suspend', 'Suspend Feature'),
    ]
    action_on_limit = models.CharField(max_length=10, choices=ACTION_CHOICES, default='throttle')
    
    # Feature flags
    ai_entry_enabled = models.BooleanField(default=True)
    bulk_import_enabled = models.BooleanField(default=True)
    manual_entry_enabled = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['tenant_id']
        
    def __str__(self):
        return f"Tax Entry Control for {self.tenant_id}"

class TaxDataEntryLog(models.Model):
    """Log all tax data entries for audit and abuse detection"""
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    ENTRY_TYPE_CHOICES = [
        ('manual', 'Manual Entry'),
        ('ai_assisted', 'AI Assisted'),
        ('bulk_import', 'Bulk Import'),
        ('api', 'API Entry'),
    ]
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    
    # What was entered
    entry_count = models.IntegerField(default=1)
    data_hash = models.CharField(max_length=64, help_text="Hash of entered data for duplicate detection")
    
    # Suspicious activity flags
    is_duplicate = models.BooleanField(default=False)
    is_rapid_entry = models.BooleanField(default=False)
    is_after_hours = models.BooleanField(default=False)
    is_unusual_amount = models.BooleanField(default=False)
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'created_at']),
            models.Index(fields=['data_hash']),
        ]
        
    def __str__(self):
        return f"{self.entry_type} by {self.user} at {self.created_at}"

class TaxDataAbuseReport(models.Model):
    """Track and manage reported tax data abuse"""
    tenant_id = models.CharField(max_length=255, db_index=True)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tax_abuse_reports')
    
    ABUSE_TYPE_CHOICES = [
        ('fake_data', 'Fake/Test Data Entry'),
        ('excessive_entries', 'Excessive Entries'),
        ('duplicate_spam', 'Duplicate Spam'),
        ('malicious_data', 'Malicious Data'),
        ('other', 'Other'),
    ]
    abuse_type = models.CharField(max_length=20, choices=ABUSE_TYPE_CHOICES)
    
    description = models.TextField()
    evidence = models.JSONField(default=dict, help_text="Screenshots, logs, etc.")
    
    # Investigation
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('investigating', 'Under Investigation'),
        ('confirmed', 'Confirmed'),
        ('dismissed', 'Dismissed'),
        ('resolved', 'Resolved'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    investigator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tax_investigations')
    investigation_notes = models.TextField(blank=True)
    
    # Actions taken
    action_taken = models.TextField(blank=True)
    feature_suspended = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='tax_resolutions')
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.abuse_type} report for {self.tenant_id}"

class TaxDataBlacklist(models.Model):
    """Blacklist for preventing known bad data patterns"""
    pattern = models.CharField(max_length=255, unique=True, help_text="Regex pattern or exact match")
    pattern_type = models.CharField(
        max_length=20,
        choices=[
            ('regex', 'Regular Expression'),
            ('exact', 'Exact Match'),
            ('contains', 'Contains'),
        ],
        default='exact'
    )
    
    field_name = models.CharField(max_length=50, help_text="Field to check (e.g., 'company_name', 'tax_id')")
    
    reason = models.TextField()
    severity = models.CharField(
        max_length=10,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ],
        default='medium'
    )
    
    # Actions
    action = models.CharField(
        max_length=20,
        choices=[
            ('warn', 'Warn User'),
            ('block', 'Block Entry'),
            ('flag', 'Flag for Review'),
        ],
        default='block'
    )
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-severity', 'pattern']
        
    def __str__(self):
        return f"{self.field_name}: {self.pattern} ({self.severity})"


# New models for enhanced tax features
class TaxSettings(models.Model):
    """Tenant-specific tax settings and preferences"""
    tenant_id = models.CharField(max_length=255, unique=True, db_index=True)
    
    # General settings
    tax_year_start_month = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text="Month when tax year starts (1=January, 12=December)"
    )
    
    # Sales tax settings
    include_tax_in_prices = models.BooleanField(
        default=False,
        help_text="Whether displayed prices include tax"
    )
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Default tax rate for new items"
    )
    tax_rounding_method = models.CharField(
        max_length=20,
        choices=[
            ('standard', 'Standard Rounding'),
            ('round_up', 'Always Round Up'),
            ('round_down', 'Always Round Down'),
            ('swedish', 'Swedish Rounding'),
        ],
        default='standard'
    )
    
    # Invoice settings
    show_tax_breakdown = models.BooleanField(default=True)
    tax_id_label = models.CharField(
        max_length=50,
        default='Tax ID',
        help_text="Label for tax ID on invoices (e.g., 'VAT Number', 'GST Number')"
    )
    business_tax_id = models.CharField(max_length=100, blank=True)
    
    # Compliance settings
    enable_tax_compliance_checks = models.BooleanField(default=True)
    compliance_check_frequency_days = models.IntegerField(default=30)
    last_compliance_check = models.DateTimeField(null=True, blank=True)
    
    # AI features
    enable_ai_tax_suggestions = models.BooleanField(default=True)
    enable_ai_compliance_alerts = models.BooleanField(default=True)
    ai_confidence_threshold = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.80,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Minimum confidence score for AI suggestions"
    )
    
    # Notification preferences
    notify_tax_rate_changes = models.BooleanField(default=True)
    notify_filing_deadlines = models.BooleanField(default=True)
    deadline_reminder_days = models.JSONField(
        default=list,
        help_text="Days before deadline to send reminders [30, 14, 7, 1]"
    )
    
    # Feature flags
    enable_multi_state_filing = models.BooleanField(default=False)
    enable_international_tax = models.BooleanField(default=False)
    enable_tax_planning_tools = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = 'Tax Settings'
        verbose_name_plural = 'Tax Settings'

class TaxRateCache(models.Model):
    """Cache for frequently accessed tax rates"""
    cache_key = models.CharField(max_length=255, unique=True, db_index=True)
    tenant_id = models.CharField(max_length=255, db_index=True)
    
    # Cached data
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    tax_type = models.CharField(max_length=50)
    jurisdiction = models.CharField(max_length=255)
    
    # Additional cached info
    metadata = models.JSONField(default=dict)
    
    # Cache management
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    hit_count = models.IntegerField(default=0)
    last_accessed = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'expires_at']),
            models.Index(fields=['cache_key', 'expires_at']),
        ]

class TaxApiUsage(models.Model):
    """Track usage of tax calculation APIs"""
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # API details
    api_endpoint = models.CharField(max_length=255)
    api_method = models.CharField(max_length=10)
    api_version = models.CharField(max_length=20)
    
    # Request/Response
    request_data = models.JSONField(default=dict)
    response_data = models.JSONField(default=dict)
    response_status = models.IntegerField()
    response_time_ms = models.IntegerField()
    
    # Cost tracking
    api_credits_used = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0
    )
    
    # Error tracking
    is_error = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'created_at']),
            models.Index(fields=['api_endpoint', 'created_at']),
        ]

# Model for tax filing locations
class TaxFilingLocation(models.Model):
    """Physical and online locations for tax filing"""
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='filing_locations', null=True, blank=True)
    country = CountryField(default='US')
    
    LOCATION_TYPE_CHOICES = [
        ('online', 'Online Portal'),
        ('mail', 'Mailing Address'),
        ('office', 'Physical Office'),
        ('dropbox', 'Drop Box'),
    ]
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES)
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Address fields
    street_address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state_province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Online fields
    portal_url = models.URLField(blank=True)
    portal_hours = models.CharField(max_length=200, blank=True)
    requires_registration = models.BooleanField(default=False)
    
    # Contact information
    phone_number = models.CharField(max_length=50, blank=True)
    fax_number = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    
    # Operating hours
    hours_of_operation = models.JSONField(default=dict, blank=True)
    
    # Special instructions
    special_instructions = models.TextField(blank=True)
    accepted_payment_methods = models.JSONField(default=list, blank=True)
    
    # Metadata
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['state', '-is_primary', 'location_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.location_type})"

# Model for tax reminders
class TaxReminder(models.Model):
    """Tax filing reminders and deadlines"""
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tax_reminders')
    
    REMINDER_TYPE_CHOICES = [
        ('filing_deadline', 'Filing Deadline'),
        ('payment_due', 'Payment Due'),
        ('document_collection', 'Document Collection'),
        ('quarterly_estimate', 'Quarterly Estimate'),
        ('annual_return', 'Annual Return'),
        ('custom', 'Custom Reminder'),
    ]
    reminder_type = models.CharField(max_length=30, choices=REMINDER_TYPE_CHOICES)
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Tax specifics
    tax_type = models.CharField(max_length=50, blank=True)
    tax_period = models.CharField(max_length=50, blank=True)
    state = models.ForeignKey(State, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timing
    due_date = models.DateField()
    reminder_date = models.DateField()
    
    # Status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('acknowledged', 'Acknowledged'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Notification preferences
    send_email = models.BooleanField(default=True)
    send_sms = models.BooleanField(default=False)
    send_in_app = models.BooleanField(default=True)
    
    # Completion tracking
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='completed_tax_reminders'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['due_date', 'reminder_date']
        indexes = [
            models.Index(fields=['tenant_id', 'status', 'reminder_date']),
            models.Index(fields=['user', 'status', 'due_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - Due: {self.due_date}"

# Enhanced models for new tax filing features
class TaxFiling(models.Model):
    """Record of actual tax filings made"""
    filing_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tax_filings')
    
    # Filing details
    TAX_TYPE_CHOICES = [
        ('sales', 'Sales Tax'),
        ('payroll', 'Payroll Tax'),
        ('income', 'Income Tax'),
        ('franchise', 'Franchise Tax'),
        ('w2', 'W-2 Forms'),
        ('1099', '1099 Forms'),
    ]
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    
    SERVICE_TYPE_CHOICES = [
        ('full', 'Full Service'),
        ('self', 'Self Service'),
    ]
    service_type = models.CharField(max_length=10, choices=SERVICE_TYPE_CHOICES)
    
    # Period information
    filing_period = models.CharField(max_length=50)  # e.g., "Q1 2024", "January 2024"
    filing_year = models.IntegerField()
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Jurisdiction
    state = models.ForeignKey(State, on_delete=models.SET_NULL, null=True, blank=True)
    jurisdiction = models.CharField(max_length=255)
    
    # Status tracking
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('ready_to_file', 'Ready to File'),
        ('filing', 'Filing in Progress'),
        ('filed', 'Filed'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('amended', 'Amended'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Financial details
    gross_receipts = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Due dates
    due_date = models.DateField()
    filed_date = models.DateField(null=True, blank=True)
    
    # Confirmation
    confirmation_number = models.CharField(max_length=100, blank=True)
    
    # Payment tracking
    payment_method = models.CharField(max_length=50, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    payment_confirmation = models.CharField(max_length=100, blank=True)
    
    # Service details (for full service)
    assigned_preparer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='prepared_filings'
    )
    preparer_notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_filings'
    )
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # New Filing Service Fields
    country = CountryField(blank=True, help_text="Country for international tax filing")
    filing_type_service = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual Filing'),
            ('online', 'Online Filing'),
        ],
        blank=True,
        help_text="Type of filing service (manual vs online)"
    )
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
        ],
        blank=True,
        help_text="Filing period type"
    )
    period_month = models.IntegerField(
        null=True,
        blank=True,
        help_text="Month (1-12) for monthly filings"
    )
    period_quarter = models.IntegerField(
        null=True,
        blank=True,
        choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3'), (4, 'Q4')],
        help_text="Quarter (1-4) for quarterly filings"
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Stripe Payment Intent ID for filing service"
    )
    tax_report_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL to generated tax report PDF"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('paid', 'Paid'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        ],
        default='pending',
        help_text="Payment status for filing service"
    )
    region_code = models.CharField(
        max_length=10,
        blank=True,
        help_text="Region/State code for sub-national filings (e.g., CA for California)"
    )
    filing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Filing service fee charged"
    )
    special_instructions = models.TextField(
        blank=True,
        help_text="Special instructions from the user"
    )
    total_sales = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Total sales for the period"
    )
    taxable_sales = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Taxable sales for the period"
    )
    tax_collected = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text="Tax collected for the period"
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0,
        help_text="Applied tax rate"
    )
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-filing_year', '-period_end']
        indexes = [
            models.Index(fields=['tenant_id', 'tax_type', 'status']),
            models.Index(fields=['due_date', 'status']),
        ]
    
    def __str__(self):
        return f"{self.tax_type} - {self.filing_period} ({self.status})"

class FilingDocument(models.Model):
    """Documents associated with tax filings"""
    document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='documents')
    
    DOCUMENT_TYPE_CHOICES = [
        ('return', 'Tax Return'),
        ('schedule', 'Schedule/Attachment'),
        ('receipt', 'Receipt/Proof of Filing'),
        ('payment_proof', 'Payment Proof'),
        ('correspondence', 'Tax Authority Correspondence'),
        ('supporting', 'Supporting Document'),
    ]
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()  # in bytes
    
    # Security
    is_encrypted = models.BooleanField(default=True)
    
    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # Status
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.document_type} - {self.file_name}"

# New confirmation tracking models
class FilingConfirmation(models.Model):
    """Track filing confirmations from tax authorities"""
    confirmation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.OneToOneField(TaxFiling, on_delete=models.CASCADE, related_name='confirmation')
    
    # Authority details
    authority_name = models.CharField(max_length=200)
    authority_confirmation_number = models.CharField(max_length=100, unique=True)
    
    # Confirmation details
    confirmed_at = models.DateTimeField()
    confirmation_method = models.CharField(
        max_length=30,
        choices=[
            ('electronic', 'Electronic'),
            ('email', 'Email'),
            ('mail', 'Mail'),
            ('phone', 'Phone'),
        ]
    )
    
    # Documents
    confirmation_document = models.ForeignKey(
        FilingDocument, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='confirmations'
    )
    
    # Additional tracking
    tracking_url = models.URLField(blank=True)
    expected_refund_date = models.DateField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
    
    def __str__(self):
        return f"Confirmation: {self.authority_confirmation_number}"

class FilingNotification(models.Model):
    """Notifications related to tax filings"""
    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filing = models.ForeignKey(TaxFiling, on_delete=models.CASCADE, related_name='notifications')
    
    # Notification details
    notification_type = models.ForeignKey('NotificationType', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Recipients
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='filing_notifications'
    )
    recipient_email = models.EmailField()
    
    # Status
    status = models.ForeignKey('NotificationStatus', on_delete=models.CASCADE)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} - {self.title}"

class NotificationType(models.Model):
    """Types of filing notifications"""
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Timing
    days_before_due = models.IntegerField(null=True, blank=True)
    
    # Template
    email_template = models.TextField(blank=True)
    sms_template = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class NotificationStatus(models.Model):
    """Status options for notifications"""
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=50)
    is_final = models.BooleanField(default=False)
    
    class Meta:
        app_label = 'taxes'
        ordering = ['name']
        verbose_name_plural = 'Notification Statuses'
    
    def __str__(self):
        return self.name

# Tax suggestion feedback model
class TaxSuggestionFeedback(models.Model):
    """Track user feedback on AI tax suggestions"""
    feedback_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # What was suggested
    tax_type = models.CharField(max_length=50)
    suggested_rate = models.DecimalField(max_digits=5, decimal_places=4)
    suggested_jurisdiction = models.CharField(max_length=255)
    
    # User feedback
    FEEDBACK_CHOICES = [
        ('accept', 'Accepted'),
        ('reject', 'Rejected'),
        ('modify', 'Modified'),
    ]
    feedback = models.CharField(max_length=10, choices=FEEDBACK_CHOICES)
    
    # If modified, what was the final value
    final_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    
    # Optional user comment
    comment = models.TextField(blank=True)
    
    # AI metadata
    ai_confidence_score = models.DecimalField(max_digits=3, decimal_places=2)
    ai_model_version = models.CharField(max_length=50)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Location info
    country_code = models.CharField(max_length=2)
    country_name = models.CharField(max_length=100)
    state_code = models.CharField(max_length=10, blank=True)
    
    class Meta:
        app_label = 'taxes'
        indexes = [
            models.Index(fields=['tenant_id', 'created_at']),
            models.Index(fields=['feedback', 'created_at']),
        ]
    
    def __str__(self):
        return f"Tax Suggestion Feedback: {self.tax_type} for {self.country_name} - {self.status}"
class GlobalSalesTaxRate(models.Model):
    """Global sales tax rates for all countries/regions - AI populated"""
    TAX_TYPE_CHOICES = [
        ('sales_tax', 'Sales Tax'),
        ('vat', 'VAT'),
        ('gst', 'GST'),
        ('consumption_tax', 'Consumption Tax'),
        ('none', 'No Tax'),
    ]
    
    # Location
    country = CountryField(db_index=True)
    country_name = models.CharField(max_length=100)
    region_code = models.CharField(max_length=10, blank=True, db_index=True)
    region_name = models.CharField(max_length=100, blank=True)
    locality = models.CharField(max_length=100, blank=True, db_index=True)
    
    # Tax info
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Tax rate as decimal (0.075 = 7.5%)"
    )
    
    # AI metadata
    ai_populated = models.BooleanField(default=True)
    ai_confidence_score = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="AI confidence in this rate (0-1)"
    )
    ai_source_notes = models.TextField(
        blank=True,
        help_text="Where AI found this information"
    )
    ai_last_verified = models.DateTimeField(default=timezone.now)
    
    # Validity
    effective_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True, db_index=True)
    manually_verified = models.BooleanField(default=False)
    manual_notes = models.TextField(blank=True)
    
    # Filing Service Fields
    tax_authority_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Name of the tax authority (e.g., Kenya Revenue Authority)"
    )
    filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
            ('bi_monthly', 'Bi-Monthly'),
            ('transaction', 'Per Transaction'),
        ],
        blank=True,
        help_text="How often tax returns must be filed"
    )
    filing_day_of_month = models.IntegerField(
        null=True,
        blank=True,
        help_text="Day of month when filing is due (e.g., 20)"
    )
    online_filing_available = models.BooleanField(
        default=False,
        help_text="Whether online filing is available through government portal"
    )
    online_portal_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of online filing portal (e.g., iTax, HMRC)"
    )
    online_portal_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL of online filing portal"
    )
    main_form_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Main tax form name (e.g., VAT3, Form ST-1)"
    )
    filing_instructions = models.TextField(
        blank=True,
        help_text="Basic instructions for manual filing"
    )
    
    # County-Level Filing Information (for US counties)
    county_filing_website = models.URLField(
        max_length=500,
        blank=True,
        help_text="County-specific filing website (if different from state)"
    )
    county_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="County tax office phone number"
    )
    county_contact_email = models.EmailField(
        blank=True,
        help_text="County tax office email"
    )
    county_mailing_address = models.TextField(
        blank=True,
        help_text="Physical address for mailing tax returns"
    )
    county_filing_instructions = models.TextField(
        blank=True,
        help_text="County-specific filing instructions and requirements"
    )
    county_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('', 'Same as State'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
            ('bi_monthly', 'Bi-Monthly'),
        ],
        blank=True,
        default='',
        help_text="County filing frequency (if different from state)"
    )
    county_filing_deadline = models.CharField(
        max_length=50,
        blank=True,
        help_text="County filing deadline (e.g., '20th of following month')"
    )
    county_online_portal_available = models.BooleanField(
        default=False,
        help_text="Whether county has its own online filing portal"
    )
    county_online_portal_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of county online portal (if available)"
    )
    county_online_portal_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL of county online filing portal"
    )
    county_special_requirements = models.TextField(
        blank=True,
        help_text="Special county-specific requirements (permits, registrations, etc.)"
    )
    county_payment_methods = models.JSONField(
        default=list,
        blank=True,
        help_text="Accepted payment methods ['check', 'online', 'ach', 'wire']"
    )
    
    # Service Pricing (in USD)
    manual_filing_fee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=35.00,
        help_text="Fee for manual filing service (USD)"
    )
    online_filing_fee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=65.00,
        help_text="Fee for online filing service (USD)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = 'Global Sales Tax Rate'
        verbose_name_plural = 'Global Sales Tax Rates'
        ordering = ['country', 'region_code', 'locality', '-effective_date']
        indexes = [
            models.Index(fields=['country', 'is_current']),
            models.Index(fields=['country', 'region_code', 'locality', 'is_current']),
            models.Index(fields=['tax_type', 'is_current']),
        ]
    
    def __str__(self):
        location = self.country_name
        if self.region_name:
            location += f", {self.region_name}"
        if self.locality:
            location += f", {self.locality}"
        return f"{location}: {self.tax_type} {self.rate*100}%"
    
    @property
    def rate_percentage(self):
        """Return rate as percentage string"""
        return f"{self.rate * 100:.2f}%"


class GlobalPayrollTax(models.Model):
    """Global payroll tax rates and rules for all countries - AI populated"""
    
    # Location
    country = CountryField(db_index=True)
    country_name = models.CharField(max_length=100)
    region_code = models.CharField(max_length=10, blank=True, db_index=True)
    region_name = models.CharField(max_length=100, blank=True)
    
    # Employee Tax Rates (paid by employee)
    employee_social_security_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employee social security/pension rate as decimal"
    )
    employee_medicare_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employee healthcare/medicare rate as decimal"
    )
    employee_unemployment_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employee unemployment insurance rate as decimal"
    )
    employee_other_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Other employee taxes rate as decimal"
    )
    
    # Employer Tax Rates (paid by employer)
    employer_social_security_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employer social security/pension rate as decimal"
    )
    employer_medicare_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employer healthcare/medicare rate as decimal"
    )
    employer_unemployment_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Employer unemployment insurance rate as decimal"
    )
    employer_other_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Other employer taxes rate as decimal"
    )
    
    # Tax Thresholds and Caps
    social_security_wage_cap = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Annual wage cap for social security tax"
    )
    medicare_additional_threshold = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Threshold for additional medicare tax"
    )
    medicare_additional_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Additional medicare tax rate above threshold"
    )
    
    # Filing Information
    tax_authority_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Name of the payroll tax authority"
    )
    filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('weekly', 'Weekly'),
            ('bi_weekly', 'Bi-Weekly'),
            ('semi_monthly', 'Semi-Monthly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
        ],
        default='monthly',
        help_text="How often payroll taxes must be filed"
    )
    deposit_schedule = models.CharField(
        max_length=20,
        choices=[
            ('same_day', 'Same Day'),
            ('next_day', 'Next Business Day'),
            ('semi_weekly', 'Semi-Weekly'),
            ('monthly', 'Monthly'),
        ],
        default='monthly',
        help_text="When payroll tax deposits are due"
    )
    filing_day_of_month = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when filing is due"
    )
    quarter_end_filing_days = models.IntegerField(
        default=30,
        help_text="Days after quarter end to file quarterly returns"
    )
    year_end_filing_days = models.IntegerField(
        default=31,
        help_text="Days after year end to file annual returns"
    )
    
    # Online Filing
    online_filing_available = models.BooleanField(
        default=False,
        help_text="Whether online filing is available"
    )
    online_portal_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of online filing portal"
    )
    online_portal_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL of online filing portal"
    )
    
    # Forms
    employee_tax_form = models.CharField(
        max_length=50,
        blank=True,
        help_text="Main employee withholding form (e.g., W-4, TD1)"
    )
    employer_return_form = models.CharField(
        max_length=50,
        blank=True,
        help_text="Main employer return form (e.g., 941, T4)"
    )
    year_end_employee_form = models.CharField(
        max_length=50,
        blank=True,
        help_text="Year-end employee form (e.g., W-2, T4)"
    )
    
    # Special Rules
    has_state_taxes = models.BooleanField(
        default=False,
        help_text="Whether states/provinces have additional payroll taxes"
    )
    has_local_taxes = models.BooleanField(
        default=False,
        help_text="Whether cities/localities have payroll taxes"
    )
    requires_registration = models.BooleanField(
        default=True,
        help_text="Whether employer registration is required"
    )
    registration_info = models.TextField(
        blank=True,
        help_text="Information about employer registration process"
    )
    
    # AI metadata
    ai_populated = models.BooleanField(default=True)
    ai_confidence_score = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="AI confidence in this data (0-1)"
    )
    ai_source_notes = models.TextField(
        blank=True,
        help_text="Where AI found this information"
    )
    ai_last_verified = models.DateTimeField(default=timezone.now)
    
    # Validity
    effective_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True, db_index=True)
    manually_verified = models.BooleanField(default=False)
    manual_notes = models.TextField(blank=True)
    
    # Service Pricing (in USD) - following sales tax model
    manual_filing_fee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=65.00,
        help_text="Fee for self-service filing (USD)"
    )
    assisted_filing_fee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=125.00,
        help_text="Fee for full-service filing (USD)"
    )
    
    # Instructions
    filing_instructions = models.TextField(
        blank=True,
        help_text="Basic instructions for payroll tax filing"
    )
    common_mistakes = models.JSONField(
        default=list,
        blank=True,
        help_text="Common filing mistakes to avoid"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = 'Global Payroll Tax'
        verbose_name_plural = 'Global Payroll Taxes'
        ordering = ['country', 'region_code', '-effective_date']
        indexes = [
            models.Index(fields=['country', 'is_current']),
            models.Index(fields=['country', 'region_code', 'is_current']),
        ]
    
    def __str__(self):
        location = self.country_name
        if self.region_name:
            location += f", {self.region_name}"
        return f"{location}: Payroll Tax"
    
    @property
    def total_employee_rate(self):
        """Calculate total employee tax rate"""
        return (
            self.employee_social_security_rate +
            self.employee_medicare_rate +
            self.employee_unemployment_rate +
            self.employee_other_rate
        )
    
    @property
    def total_employer_rate(self):
        """Calculate total employer tax rate"""
        return (
            self.employer_social_security_rate +
            self.employer_medicare_rate +
            self.employer_unemployment_rate +
            self.employer_other_rate
        )


class TenantTaxSettings(models.Model):
    """
    Tenant-specific tax settings that override global defaults
    """
    TAX_TYPE_CHOICES = [
        ('sales_tax', 'Sales Tax'),
        ('vat', 'VAT'),
        ('gst', 'GST'),
        ('consumption_tax', 'Consumption Tax'),
        ('none', 'No Tax'),
    ]
    
    # Tenant identification
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tax_settings')
    
    # Sales tax settings
    sales_tax_enabled = models.BooleanField(default=True)
    sales_tax_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        help_text='Tax rate as decimal (e.g., 0.0875 for 8.75%)'
    )
    sales_tax_type = models.CharField(
        max_length=20, 
        choices=TAX_TYPE_CHOICES,
        default='sales_tax'
    )
    
    # Location info (for reference)
    country = CountryField()
    region_code = models.CharField(max_length=10, blank=True)
    region_name = models.CharField(max_length=100, blank=True)
    locality = models.CharField(max_length=100, blank=True, default='', help_text='County or local jurisdiction code')
    locality_name = models.CharField(max_length=200, blank=True, default='', help_text='County or local jurisdiction name')
    
    # Override info
    is_custom_rate = models.BooleanField(
        default=True,
        help_text='Whether this is a custom rate (True) or copied from global (False)'
    )
    original_global_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        help_text='The global rate at time of override'
    )
    
    # Additional settings
    tax_inclusive_pricing = models.BooleanField(
        default=False,
        help_text='Whether prices include tax'
    )
    show_tax_on_receipts = models.BooleanField(default=True)
    tax_registration_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text='VAT/GST/Tax registration number'
    )
    
    # Payroll Tax Settings (overrides for GlobalPayrollTax)
    payroll_tax_enabled = models.BooleanField(default=True)
    
    # Employee tax rate overrides
    override_employee_social_security_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employee social security rate (leave blank to use global)"
    )
    override_employee_medicare_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employee medicare rate"
    )
    override_employee_unemployment_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employee unemployment rate"
    )
    
    # Employer tax rate overrides
    override_employer_social_security_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employer social security rate"
    )
    override_employer_medicare_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employer medicare rate"
    )
    override_employer_unemployment_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Override employer unemployment rate"
    )
    
    # Payroll tax registration
    payroll_tax_registration_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Employer tax ID/registration number"
    )
    payroll_filing_frequency = models.CharField(
        max_length=20,
        choices=[
            ('', 'Use Default'),
            ('weekly', 'Weekly'),
            ('bi_weekly', 'Bi-Weekly'),
            ('semi_monthly', 'Semi-Monthly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
            ('annual', 'Annual'),
        ],
        blank=True,
        default='',
        help_text="Override filing frequency (leave blank to use default)"
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='tax_settings_created'
    )
    updated_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='tax_settings_updated'
    )
    
    class Meta:
        app_label = 'taxes'
        verbose_name = 'Tenant Tax Settings'
        verbose_name_plural = 'Tenant Tax Settings'
        unique_together = [['tenant_id', 'country', 'region_code']]
        indexes = [
            models.Index(fields=['tenant_id', 'country']),
        ]
    
    def __str__(self):
        return f"{self.tenant_id} - {self.country} @ {self.sales_tax_rate*100:.2f}%"
    
    @property
    def rate_percentage(self):
        """Return rate as percentage"""
        return float(self.sales_tax_rate * 100) if self.sales_tax_rate else 0.0
    
    def save(self, *args, **kwargs):
        # Mark as custom rate when saving
        if not self.pk:  # New record
            self.is_custom_rate = True
        super().save(*args, **kwargs)


class SalesTaxJurisdictionOverride(models.Model):
    """
    Tenant-specific overrides for sales tax rates by jurisdiction.
    This allows tenants to customize tax rates without affecting the global table.
    """
    # Tenant identification
    tenant_id = models.CharField(max_length=255, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tax_overrides')
    
    # Jurisdiction (matches GlobalSalesTaxRate structure)
    country = CountryField()
    region_code = models.CharField(max_length=10, blank=True, help_text='State/Province code')
    region_name = models.CharField(max_length=100, blank=True, help_text='State/Province name')
    locality = models.CharField(max_length=100, blank=True, help_text='County/City code')
    locality_name = models.CharField(max_length=200, blank=True, help_text='County/City name')
    
    # Tax rate override
    country_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0.0000,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text='Country-level tax rate (usually 0 for US)'
    )
    state_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0.0000,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text='State/Province tax rate'
    )
    county_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        default=0.0000,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text='County/Local tax rate'
    )
    
    # Computed total
    total_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text='Total combined tax rate'
    )
    
    # Override reason and audit
    override_reason = models.TextField(
        help_text='Reason for overriding the global rate (required for audit)'
    )
    original_global_rates = models.JSONField(
        default=dict,
        help_text='Original rates from GlobalSalesTaxRate at time of override'
    )
    
    # Enable/disable override
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='tax_override_updates',
        null=True,
        blank=True
    )
    
    class Meta:
        app_label = 'taxes'
        unique_together = [['tenant_id', 'country', 'region_code', 'locality']]
        indexes = [
            models.Index(fields=['tenant_id', 'country', 'region_code']),
            models.Index(fields=['tenant_id', 'is_active']),
        ]
        verbose_name = 'Sales Tax Jurisdiction Override'
        verbose_name_plural = 'Sales Tax Jurisdiction Overrides'
    
    def __str__(self):
        location = f"{self.country}"
        if self.region_name:
            location += f", {self.region_name}"
        if self.locality_name:
            location += f", {self.locality_name}"
        return f"{self.tenant_id} - {location} @ {self.total_rate_percentage:.2f}%"
    
    @property
    def total_rate_percentage(self):
        """Return total rate as percentage"""
        return float(self.total_rate * 100) if self.total_rate else 0.0
    
    @property
    def country_rate_percentage(self):
        """Return country rate as percentage"""
        return float(self.country_rate * 100) if self.country_rate else 0.0
    
    @property
    def state_rate_percentage(self):
        """Return state rate as percentage"""
        return float(self.state_rate * 100) if self.state_rate else 0.0
    
    @property
    def county_rate_percentage(self):
        """Return county rate as percentage"""
        return float(self.county_rate * 100) if self.county_rate else 0.0
    
    def save(self, *args, **kwargs):
        # Auto-calculate total rate
        self.total_rate = self.country_rate + self.state_rate + self.county_rate
        super().save(*args, **kwargs)
    
    def get_jurisdiction_display(self):
        """Get human-readable jurisdiction"""
        parts = [str(self.country)]
        if self.region_name:
            parts.append(self.region_name)
        if self.locality_name:
            parts.append(self.locality_name)
        return ", ".join(parts)

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


class TaxAccountingSettings(TenantAwareModel):
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