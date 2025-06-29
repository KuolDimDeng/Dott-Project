# taxes/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django_countries.fields import CountryField
from django.conf import settings
from custom_auth.tenant_base_model import TenantAwareModel

import uuid



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
    
    class Meta:
        app_label = 'taxes'

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