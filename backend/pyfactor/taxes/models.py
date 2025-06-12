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