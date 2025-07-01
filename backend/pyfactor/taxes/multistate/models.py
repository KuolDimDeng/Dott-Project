"""
Django models for multi-state tax operations.
Handles nexus tracking, apportionment factors, multi-state filings, and compliance monitoring.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
# Removed deprecated import - JSONField is now from django.db.models
from django.utils import timezone
from custom_auth.tenant_base_model import TenantAwareModel
from audit.mixins import AuditMixin
from decimal import Decimal
import uuid


class MultistateNexusProfile(AuditMixin, TenantAwareModel):
    """
    Main profile for tracking multi-state nexus and filing requirements.
    One per tenant to manage overall multi-state operations.
    """
    
    FILING_METHOD_CHOICES = [
        ('separate', 'Separate Filing'),
        ('combined', 'Combined Filing'),
        ('consolidated', 'Consolidated Filing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_name = models.CharField(max_length=200)
    federal_ein = models.CharField(max_length=20, blank=True, null=True)
    
    # Primary business information
    home_state = models.CharField(max_length=2, help_text="Home state where business is domiciled")
    business_type = models.CharField(max_length=50, default='LLC')
    tax_year_end = models.DateField(default='2024-12-31')
    
    # Filing preferences
    preferred_filing_method = models.CharField(
        max_length=20, 
        choices=FILING_METHOD_CHOICES, 
        default='separate'
    )
    
    # Tracking settings
    enable_nexus_monitoring = models.BooleanField(default=True)
    nexus_check_frequency = models.IntegerField(
        default=30, 
        help_text="Days between automatic nexus threshold checks"
    )
    threshold_warning_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('80.00'),
        help_text="Percentage of threshold to trigger warnings"
    )
    
    # Compliance tracking
    last_nexus_review = models.DateTimeField(auto_now_add=True)
    next_nexus_review = models.DateTimeField(null=True, blank=True)
    compliance_status = models.CharField(max_length=20, default='active')
    
    # Configuration
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = "Multistate Nexus Profile"
        verbose_name_plural = "Multistate Nexus Profiles"
    
    def __str__(self):
        return f"{self.business_name} - Multistate Profile"


class StateNexusStatus(AuditMixin, TenantAwareModel):
    """
    Tracks nexus status for each state and tax type combination.
    """
    
    NEXUS_TYPE_CHOICES = [
        ('physical_presence', 'Physical Presence'),
        ('economic_sales', 'Economic - Sales Threshold'),
        ('economic_transactions', 'Economic - Transaction Threshold'),
        ('affiliate', 'Affiliate Nexus'),
        ('click_through', 'Click-Through Nexus'),
        ('marketplace', 'Marketplace Nexus'),
        ('factor_presence', 'Factor Presence'),
    ]
    
    TAX_TYPE_CHOICES = [
        ('sales_tax', 'Sales Tax'),
        ('income_tax', 'Income Tax'),
        ('franchise_tax', 'Franchise Tax'),
        ('gross_receipts', 'Gross Receipts Tax'),
        ('payroll_tax', 'Payroll Tax'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nexus_profile = models.ForeignKey(
        MultistateNexusProfile, 
        on_delete=models.CASCADE, 
        related_name='state_nexus_statuses'
    )
    
    state = models.CharField(max_length=2, help_text="State abbreviation")
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    
    # Nexus determination
    has_nexus = models.BooleanField(default=False)
    nexus_types = models.models.JSONField(default=list, help_text="List of nexus types established")
    nexus_effective_date = models.DateField(null=True, blank=True)
    nexus_determination_date = models.DateTimeField(auto_now_add=True)
    
    # Threshold analysis
    current_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_transactions = models.IntegerField(default=0)
    current_payroll = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    current_property = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    sales_threshold = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    transaction_threshold = models.IntegerField(null=True, blank=True)
    
    # Analysis details
    threshold_analysis = models.JSONField(default=dict, blank=True)
    last_threshold_check = models.DateTimeField(auto_now=True)
    
    # Registration and compliance
    is_registered = models.BooleanField(default=False)
    registration_date = models.DateField(null=True, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)
    
    # Filing requirements
    filing_frequency = models.CharField(max_length=20, default='monthly')
    next_filing_due = models.DateField(null=True, blank=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['nexus_profile', 'state', 'tax_type']
        verbose_name = "State Nexus Status"
        verbose_name_plural = "State Nexus Statuses"
    
    def __str__(self):
        return f"{self.state} - {self.tax_type} - {'Nexus' if self.has_nexus else 'No Nexus'}"


class BusinessActivity(AuditMixin, TenantAwareModel):
    """
    Tracks business activities that may create or affect nexus.
    """
    
    ACTIVITY_TYPE_CHOICES = [
        ('office', 'Office Location'),
        ('warehouse', 'Warehouse/Distribution Center'),
        ('retail_location', 'Retail Location'),
        ('employee', 'Employee'),
        ('independent_contractor', 'Independent Contractor'),
        ('sales_rep', 'Sales Representative'),
        ('repair_service', 'Repair/Service Activity'),
        ('installation', 'Installation Services'),
        ('trade_show', 'Trade Show/Event'),
        ('delivery', 'Delivery Services'),
        ('property_ownership', 'Property Ownership'),
        ('inventory_storage', 'Inventory Storage'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nexus_profile = models.ForeignKey(
        MultistateNexusProfile, 
        on_delete=models.CASCADE, 
        related_name='business_activities'
    )
    
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPE_CHOICES)
    state = models.CharField(max_length=2, help_text="State where activity occurs")
    
    # Activity details
    description = models.TextField(help_text="Description of the business activity")
    start_date = models.DateField(help_text="When activity started")
    end_date = models.DateField(null=True, blank=True, help_text="When activity ended (if applicable)")
    
    # Location details
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    
    # Economic impact
    annual_value = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Annual economic value of this activity"
    )
    
    # Nexus determination
    creates_nexus = models.BooleanField(
        default=False, 
        help_text="Whether this activity creates nexus"
    )
    nexus_analysis = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = "Business Activity"
        verbose_name_plural = "Business Activities"
        ordering = ['state', 'activity_type', 'start_date']
    
    def __str__(self):
        return f"{self.activity_type} in {self.state} - {self.description}"


class ApportionmentFactors(AuditMixin, TenantAwareModel):
    """
    Stores calculated apportionment factors for multi-state income tax filings.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nexus_profile = models.ForeignKey(
        MultistateNexusProfile, 
        on_delete=models.CASCADE, 
        related_name='apportionment_factors'
    )
    
    # Tax period
    tax_year = models.IntegerField()
    calculation_date = models.DateTimeField(auto_now_add=True)
    
    # Business totals
    total_sales = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_payroll = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_property = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # State-by-state data (stored as JSON for flexibility)
    state_sales = models.JSONField(default=dict, help_text="Sales by state")
    state_payroll = models.JSONField(default=dict, help_text="Payroll by state")
    state_property = models.JSONField(default=dict, help_text="Property by state")
    
    # Calculated factors
    sales_factors = models.JSONField(default=dict, help_text="Sales apportionment factors by state")
    payroll_factors = models.JSONField(default=dict, help_text="Payroll apportionment factors by state")
    property_factors = models.JSONField(default=dict, help_text="Property apportionment factors by state")
    apportionment_percentages = models.JSONField(default=dict, help_text="Final apportionment percentages by state")
    
    # Throwback/throwout adjustments
    throwback_adjustments = models.JSONField(default=dict, help_text="Throwback adjustments by state")
    nowhere_sales = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        help_text="Sales with no nexus anywhere"
    )
    
    # Validation and analysis
    validation_warnings = models.JSONField(default=list, help_text="Validation warnings from calculation")
    calculation_method = models.CharField(max_length=50, default='separate_filing')
    
    # Status
    is_final = models.BooleanField(default=False, help_text="Whether these factors are finalized")
    approved_by = models.CharField(max_length=100, blank=True)
    approved_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['nexus_profile', 'tax_year']
        verbose_name = "Apportionment Factors"
        verbose_name_plural = "Apportionment Factors"
    
    def __str__(self):
        return f"{self.nexus_profile.business_name} - {self.tax_year} Apportionment"


class MultistateReturn(AuditMixin, TenantAwareModel):
    """
    Represents a multi-state tax return filing.
    """
    
    RETURN_TYPE_CHOICES = [
        ('income_tax', 'Income Tax Return'),
        ('franchise_tax', 'Franchise Tax Return'),
        ('gross_receipts', 'Gross Receipts Tax Return'),
        ('combined_report', 'Combined Report'),
    ]
    
    FILING_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_preparation', 'In Preparation'),
        ('ready_for_review', 'Ready for Review'),
        ('filed', 'Filed'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('amended', 'Amended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nexus_profile = models.ForeignKey(
        MultistateNexusProfile, 
        on_delete=models.CASCADE, 
        related_name='multistate_returns'
    )
    apportionment_factors = models.ForeignKey(
        ApportionmentFactors, 
        on_delete=models.CASCADE, 
        related_name='tax_returns'
    )
    
    # Return identification
    return_type = models.CharField(max_length=20, choices=RETURN_TYPE_CHOICES)
    tax_year = models.IntegerField()
    filing_period = models.CharField(max_length=20, default='annual')
    
    # Filing details
    filing_status = models.CharField(max_length=20, choices=FILING_STATUS_CHOICES, default='draft')
    due_date = models.DateField()
    filed_date = models.DateTimeField(null=True, blank=True)
    extended_due_date = models.DateField(null=True, blank=True)
    
    # Tax calculations
    state_tax_calculations = models.JSONField(default=dict, help_text="Tax calculations by state")
    total_tax_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_payments_made = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    refund_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Filing method and documents
    filing_method = models.CharField(max_length=20, default='separate')
    electronic_filing = models.BooleanField(default=True)
    
    # Compliance tracking
    compliance_issues = models.JSONField(default=list, help_text="Any compliance issues identified")
    review_notes = models.TextField(blank=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['nexus_profile', 'return_type', 'tax_year']
        verbose_name = "Multistate Return"
        verbose_name_plural = "Multistate Returns"
    
    def __str__(self):
        return f"{self.nexus_profile.business_name} - {self.tax_year} {self.return_type}"


class StateReturnFiling(AuditMixin, TenantAwareModel):
    """
    Individual state return filing as part of multi-state process.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    multistate_return = models.ForeignKey(
        MultistateReturn, 
        on_delete=models.CASCADE, 
        related_name='state_filings'
    )
    
    state = models.CharField(max_length=2)
    state_return_type = models.CharField(max_length=50)
    state_form_number = models.CharField(max_length=20, blank=True)
    
    # Apportioned amounts for this state
    apportioned_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    apportionment_percentage = models.DecimalField(max_digits=8, decimal_places=6, default=0)
    
    # State-specific tax calculation
    taxable_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=6, decimal_places=4, default=0)
    gross_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credits = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    minimum_tax = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_tax_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Payments and balance
    estimated_payments = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    withholding = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    refund = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Filing details
    filing_status = models.CharField(max_length=20, default='draft')
    confirmation_number = models.CharField(max_length=50, blank=True)
    acknowledgment_date = models.DateTimeField(null=True, blank=True)
    
    # State-specific data
    state_specific_data = models.JSONField(default=dict, help_text="State-specific form data")
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['multistate_return', 'state']
        verbose_name = "State Return Filing"
        verbose_name_plural = "State Return Filings"
    
    def __str__(self):
        return f"{self.state} - {self.multistate_return.tax_year} Filing"


class NexusThresholdMonitoring(AuditMixin, TenantAwareModel):
    """
    Automated monitoring of nexus thresholds and compliance alerts.
    """
    
    ALERT_TYPE_CHOICES = [
        ('approaching_threshold', 'Approaching Threshold'),
        ('threshold_exceeded', 'Threshold Exceeded'),
        ('nexus_established', 'Nexus Established'),
        ('registration_required', 'Registration Required'),
        ('filing_due', 'Filing Due'),
        ('compliance_issue', 'Compliance Issue'),
    ]
    
    ALERT_PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nexus_profile = models.ForeignKey(
        MultistateNexusProfile, 
        on_delete=models.CASCADE, 
        related_name='threshold_monitoring'
    )
    
    # Alert details
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    priority = models.CharField(max_length=10, choices=ALERT_PRIORITY_CHOICES)
    state = models.CharField(max_length=2)
    tax_type = models.CharField(max_length=20)
    
    # Threshold information
    current_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    threshold_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    percentage_of_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Alert message and recommendations
    message = models.TextField()
    recommendations = models.models.JSONField(default=list, help_text="Recommended actions")
    
    # Alert status
    is_active = models.BooleanField(default=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.CharField(max_length=100, blank=True)
    acknowledged_date = models.DateTimeField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    resolved_date = models.DateTimeField(null=True, blank=True)
    
    # Monitoring metadata
    next_check_date = models.DateTimeField()
    check_frequency_days = models.IntegerField(default=7)
    
    class Meta:
        app_label = 'taxes'
        verbose_name = "Nexus Threshold Monitoring"
        verbose_name_plural = "Nexus Threshold Monitoring"
        ordering = ['-created_at', '-priority']
    
    def __str__(self):
        return f"{self.alert_type} - {self.state} - {self.priority}"


class ReciprocityAgreement(TenantAwareModel):
    """
    Tracks reciprocity agreements between states that affect multi-state taxation.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Agreement details
    state_a = models.CharField(max_length=2, help_text="First state in agreement")
    state_b = models.CharField(max_length=2, help_text="Second state in agreement")
    
    agreement_type = models.CharField(max_length=50, help_text="Type of reciprocity agreement")
    effective_date = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)
    
    # Agreement terms
    description = models.TextField()
    tax_types_covered = models.JSONField(default=list, help_text="Tax types covered by agreement")
    conditions = models.JSONField(default=dict, help_text="Conditions and limitations")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['state_a', 'state_b', 'agreement_type']
        verbose_name = "Reciprocity Agreement"
        verbose_name_plural = "Reciprocity Agreements"
    
    def __str__(self):
        return f"{self.state_a} - {self.state_b} {self.agreement_type}"


class ConsolidatedGroup(AuditMixin, TenantAwareModel):
    """
    Manages consolidated group filings for related entities.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Group details
    group_name = models.CharField(max_length=200)
    parent_company = models.CharField(max_length=200)
    federal_ein = models.CharField(max_length=20)
    
    # Filing details
    tax_year = models.IntegerField()
    filing_method = models.CharField(max_length=20, default='consolidated')
    
    # Group members (stored as JSON for flexibility)
    member_entities = models.JSONField(default=list, help_text="List of group member entities")
    ownership_percentages = models.JSONField(default=dict, help_text="Ownership percentages")
    
    # Combined financials
    combined_income = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    combined_apportionment = models.JSONField(default=dict, help_text="Combined apportionment factors")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        app_label = 'taxes'
        unique_together = ['parent_company', 'tax_year']
        verbose_name = "Consolidated Group"
        verbose_name_plural = "Consolidated Groups"
    
    def __str__(self):
        return f"{self.group_name} - {self.tax_year}"