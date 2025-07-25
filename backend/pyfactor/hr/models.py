# New Employee model that doesn't inherit from AbstractUser
import datetime
import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from decimal import Decimal
from django.conf import settings
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger

User = get_user_model()
logger = get_logger()

def get_current_datetime():
    return timezone.now()

def get_current_date():
    return timezone.now().date()

def get_current_year():
    return timezone.now().year

class Employee(models.Model):
    """
    Employee model for HR management
    Employees are separate from Users - not all employees need system access
    """
    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # Link to User account (optional - not all employees need login access)
    user = models.OneToOneField(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='employee_profile'
    )
    
    # Business association - synced from User on save
    business_id = models.UUIDField(db_index=True, null=True, blank=True,
                                   help_text="Business ID - automatically synced from User")
    
    # Tenant ID for Row Level Security (RLS)
    # This should match business_id for proper tenant isolation
    tenant_id = models.UUIDField(db_index=True, null=True, blank=True,
                                 help_text="The tenant ID this record belongs to. Used by Row Level Security.")
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = PhoneNumberField(null=True, blank=True)
    phone_country_code = models.CharField(max_length=2, default='US', blank=True, null=True, 
                                        help_text="ISO country code for phone number (e.g., 'US', 'CA', 'KE')")
    date_of_birth = models.DateField(null=True, blank=True)
    
    # Demographics (optional)
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    
    MARITAL_STATUS_CHOICES = [
        ('S', 'Single'),
        ('M', 'Married'),
        ('D', 'Divorced'),
        ('W', 'Widowed'),
    ]
    marital_status = models.CharField(max_length=1, choices=MARITAL_STATUS_CHOICES, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    
    # Address Information
    street = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='US')
    
    # Employment Information
    EMPLOYMENT_TYPE_CHOICES = [
        ('FT', 'Full-time'),
        ('PT', 'Part-time'),
    ]
    employment_type = models.CharField(max_length=2, choices=EMPLOYMENT_TYPE_CHOICES, default='FT')
    department = models.CharField(max_length=100, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    is_supervisor = models.BooleanField(default=False, help_text="Can this employee supervise others?")
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    
    # Employment Dates
    hire_date = models.DateField(default=get_current_date)
    termination_date = models.DateField(null=True, blank=True)
    
    # Employment Status
    active = models.BooleanField(default=True)
    onboarded = models.BooleanField(default=False)
    
    # Compensation
    COMPENSATION_TYPE_CHOICES = [
        ('SALARY', 'Salary (Yearly)'),
        ('WAGE', 'Wage (Hourly)'),
    ]
    compensation_type = models.CharField(max_length=10, choices=COMPENSATION_TYPE_CHOICES, default='SALARY')
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wage_per_hour = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Security/Tax Information (stored in Stripe for security)
    SECURITY_NUMBER_TYPE_CHOICES = [
        ('SSN', 'Social Security Number (US)'),
        ('EIN', 'Employer Identification Number'),
        ('ITIN', 'Individual Taxpayer ID Number'),
        ('SIN', 'Social Insurance Number (Canada)'),
        ('NIN', 'National Insurance Number (UK)'),
        ('TFN', 'Tax File Number (Australia)'),
        ('PAN', 'PAN Card Number (India)'),
        ('OTHER', 'Other National ID'),
    ]
    security_number_type = models.CharField(max_length=10, choices=SECURITY_NUMBER_TYPE_CHOICES, default='SSN')
    ssn_last_four = models.CharField(max_length=4, blank=True, null=True)
    
    # Stripe integration for secure data storage
    stripe_person_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    ssn_stored_in_stripe = models.BooleanField(default=False)
    
    # Benefits
    direct_deposit = models.BooleanField(default=False)
    vacation_time = models.BooleanField(default=False)
    vacation_days_per_year = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'hr_employee'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['business_id', 'active']),
            models.Index(fields=['email']),
            models.Index(fields=['employee_number']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_number})"
    
    def get_full_name(self):
        """Return the employee's full name"""
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return ' '.join(parts)
    
    def save(self, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        # Auto-generate employee number if not set
        if not self.employee_number:
            today = timezone.now().strftime('%Y%m%d')
            unique_suffix = str(uuid.uuid4())[:4].upper()
            self.employee_number = f"EMP-{today}-{unique_suffix}"
            logger.info(f'🏷️ [Employee Model] Generated employee_number: {self.employee_number}')
        
        # Sync business_id from User if available
        if self.user and self.user.business_id:
            self.business_id = self.user.business_id
            self.tenant_id = self.user.business_id
            logger.info(f'🏢 [Employee Model] Synced business_id from user: {self.business_id}')
        elif self.business_id:
            # If only business_id is set, use it for tenant_id
            self.tenant_id = self.business_id
        
        # Ensure tenant_id matches business_id for RLS
        if self.business_id and not self.tenant_id:
            self.tenant_id = self.business_id
            logger.info(f'🔄 [Employee Model] Set tenant_id = business_id: {self.tenant_id}')
        
        logger.info(f'💾 [Employee Model] Saving employee: email={self.email}, business_id={self.business_id}, tenant_id={self.tenant_id}')
        super().save(*args, **kwargs)
        logger.info(f'✅ [Employee Model] Employee saved with id: {self.id}')
    
    def save_ssn_to_stripe(self, ssn):
        """Save SSN to Stripe Connect for secure storage"""
        # Use Express Connect account service
        from .stripe_ssn_service_express import StripeSSNService
        
        if not ssn:
            return False, "No SSN provided"
        
        # Use the Stripe service to securely store the SSN
        success, message = StripeSSNService.store_ssn(self, ssn)
        
        if not success:
            logger.error(f"[Employee Model] Failed to store SSN: {message}")
            raise Exception(f"Failed to store SSN: {message}")
        
        return success, message
    
    def delete(self, *args, **kwargs):
        """Override delete to also remove Stripe data"""
        from .stripe_ssn_service_express import StripeSSNService
        
        # Delete Stripe account if exists
        if self.stripe_account_id:
            StripeSSNService.delete_stripe_account(self)
        
        super().delete(*args, **kwargs)


# Import TenantAwareModel for other models
from custom_auth.tenant_base_model import TenantAwareModel


class Role(TenantAwareModel):
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    def __str__(self):
        return self.name

class EmployeeRole(TenantAwareModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.employee} - {self.role}"

class AccessPermission(TenantAwareModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.CharField(max_length=100)
    can_view = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.role} - {self.module} permissions"


class PreboardingForm(TenantAwareModel):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    verified = models.BooleanField(default=False)
    # Add other relevant fields

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.position}"

# Timesheet Management Models

class TimesheetSetting(TenantAwareModel):
    """Timesheet settings for a business"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)
    
    # Approval frequency
    APPROVAL_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    approval_frequency = models.CharField(
        max_length=10,
        choices=APPROVAL_FREQUENCY_CHOICES,
        default='WEEKLY'
    )
    
    # Input frequency
    INPUT_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
    ]
    input_frequency = models.CharField(
        max_length=10,
        choices=INPUT_FREQUENCY_CHOICES,
        default='DAILY'
    )
    
    # PTO configuration
    class_tiers = models.JSONField(default=dict, help_text='JSON containing PTO tiers by role')
    default_pto_days_per_year = models.PositiveIntegerField(default=10)
    default_sick_days_per_year = models.PositiveIntegerField(default=5)
    
    # Additional settings
    allow_overtime = models.BooleanField(default=True)
    overtime_rate = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('1.0'))],
        default=Decimal('1.5')
    )
    require_manager_approval = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Timesheet Settings for Business {self.business_id}"
    
    class Meta:
        verbose_name = "Timesheet Setting"
        verbose_name_plural = "Timesheet Settings"


class CompanyHoliday(TenantAwareModel):
    """Company observed holidays"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)
    
    name = models.CharField(max_length=100)
    date = models.DateField()
    paid = models.BooleanField(default=True)
    recurring_yearly = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.date.strftime('%Y-%m-%d')}"
    
    class Meta:
        verbose_name = "Company Holiday"
        verbose_name_plural = "Company Holidays"
        unique_together = ('business_id', 'date', 'name')


class Timesheet(TenantAwareModel):
    """Employee timesheet record"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet_number = models.CharField(max_length=20, unique=True, editable=False, null=True)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='timesheets')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT')
    
    # Timesheet period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Approval information
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_timesheets'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Totals
    total_regular_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00')
    )
    total_overtime_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00')
    )
    
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.timesheet_number:
            self.timesheet_number = self.generate_timesheet_number()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_timesheet_number():
        last_timesheet = Timesheet.objects.order_by('-created_at').first()
        if last_timesheet and last_timesheet.timesheet_number:
            last_number = int(last_timesheet.timesheet_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"TMS{new_number:06d}"
    
    def __str__(self):
        return f"Timesheet {self.timesheet_number or self.employee.employee_number} - {self.period_start} to {self.period_end}"
    
    class Meta:
        verbose_name = "Timesheet"
        verbose_name_plural = "Timesheets"
        unique_together = ('employee', 'period_start', 'period_end')


class TimesheetEntry(TenantAwareModel):
    """Individual timesheet entry for a day"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name='entries')
    
    date = models.DateField()
    
    # Hours
    regular_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    overtime_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Additional fields
    project = models.CharField(max_length=100, blank=True, null=True)
    task = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    # Location tracking references
    clock_in_location = models.ForeignKey(
        'LocationLog', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='clock_in_entries'
    )
    clock_out_location = models.ForeignKey(
        'LocationLog', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='clock_out_entries'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Entry for {self.date} - {self.regular_hours} hours"
    
    class Meta:
        verbose_name = "Timesheet Entry"
        verbose_name_plural = "Timesheet Entries"
        unique_together = ('timesheet', 'date')


class TimeOffRequest(TenantAwareModel):
    """Base model for PTO and sick leave requests"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='time_off_requests')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    REQUEST_TYPE_CHOICES = [
        ('PTO', 'Paid Time Off'),
        ('SICK', 'Sick Leave'),
    ]
    request_type = models.CharField(max_length=4, choices=REQUEST_TYPE_CHOICES)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Request details
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    
    # Approval information
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_time_off'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.request_type} Request - {self.employee.employee_number} ({self.start_date} to {self.end_date})"
    
    class Meta:
        verbose_name = "Time Off Request"
        verbose_name_plural = "Time Off Requests"


def get_current_year():
    """Return the current year for TimeOffBalance default"""
    return datetime.datetime.now().year

class TimeOffBalance(TenantAwareModel):
    """Employee PTO and sick leave balance"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField('Employee', on_delete=models.CASCADE, related_name='time_off_balance')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    year = models.PositiveIntegerField(default=get_current_year)
    
    # Allowances
    pto_allowance = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_allowance = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Used amounts
    pto_used = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_used = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Carryover from previous year
    pto_carryover = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_carryover = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Time Off Balance - {self.employee.employee_number} ({self.year})"
    
    class Meta:
        verbose_name = "Time Off Balance"
        verbose_name_plural = "Time Off Balances"
        unique_together = ('employee', 'year')


class Benefits(TenantAwareModel):
    """Employee benefits model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField('Employee', on_delete=models.CASCADE, related_name='benefits')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Health Insurance
    HEALTH_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    health_insurance_plan = models.CharField(max_length=20, choices=HEALTH_PLAN_CHOICES, default='NONE')
    health_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    health_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    health_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Dental Insurance
    DENTAL_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    dental_insurance_plan = models.CharField(max_length=20, choices=DENTAL_PLAN_CHOICES, default='NONE')
    dental_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    dental_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    dental_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Vision Insurance
    VISION_PLAN_CHOICES = [
        ('NONE', 'No Coverage'),
        ('BASIC', 'Basic Coverage'),
        ('STANDARD', 'Standard Coverage'),
        ('PREMIUM', 'Premium Coverage'),
        ('FAMILY', 'Family Coverage'),
    ]
    vision_insurance_plan = models.CharField(max_length=20, choices=VISION_PLAN_CHOICES, default='NONE')
    vision_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    vision_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    vision_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Retirement Plan
    RETIREMENT_PLAN_CHOICES = [
        ('NONE', 'None'),
        ('401K', '401(k)'),
        ('ROTH_401K', 'Roth 401(k)'),
        ('IRA', 'Individual Retirement Account'),
        ('ROTH_IRA', 'Roth IRA'),
        ('PENSION', 'Pension Plan'),
        ('OTHER', 'Other Retirement Plan'),
    ]
    retirement_plan = models.CharField(max_length=20, choices=RETIREMENT_PLAN_CHOICES, default='NONE')
    retirement_contribution_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        default=0
    )
    employer_match_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        default=0
    )
    
    # Life Insurance
    has_life_insurance = models.BooleanField(default=False)
    life_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    life_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    life_insurance_coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    life_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Disability Insurance
    has_disability_insurance = models.BooleanField(default=False)
    disability_insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    disability_insurance_policy_number = models.CharField(max_length=100, blank=True, null=True)
    disability_insurance_coverage_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    disability_insurance_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Flexible Spending Account (FSA)
    has_fsa = models.BooleanField(default=False)
    fsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Health Savings Account (HSA)
    has_hsa = models.BooleanField(default=False)
    hsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employer_hsa_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Additional Benefits
    additional_benefits = models.JSONField(default=dict, blank=True)
    
    # Enrollment Status
    is_enrolled = models.BooleanField(default=False)
    enrollment_date = models.DateField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Open Enrollment
    next_enrollment_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if hasattr(self, 'employee') and self.employee:
            return f"Benefits for {self.employee.first_name} {self.employee.last_name}"
        return f"Benefits (ID: {self.id})"

    class Meta:
        verbose_name = "Benefits"
        verbose_name_plural = "Benefits"


class PerformanceReview(TenantAwareModel):
    """Employee performance review model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review_number = models.CharField(max_length=20, unique=True, editable=False, null=True)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='performance_reviews')
    reviewer = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='reviews_conducted')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    REVIEW_TYPE_CHOICES = [
        ('ANNUAL', 'Annual Review'),
        ('SEMI_ANNUAL', 'Semi-Annual Review'),
        ('QUARTERLY', 'Quarterly Review'),
        ('PROBATION', 'Probation Review'),
        ('PROJECT', 'Project-based Review'),
        ('PEER', 'Peer Review'),
        ('SELF', 'Self Review'),
    ]
    review_type = models.CharField(max_length=15, choices=REVIEW_TYPE_CHOICES, default='ANNUAL')
    
    REVIEW_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('IN_PROGRESS', 'In Progress'),
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('COMPLETED', 'Completed'),
    ]
    status = models.CharField(max_length=16, choices=REVIEW_STATUS_CHOICES, default='DRAFT')
    
    period_start = models.DateField()
    period_end = models.DateField()
    review_date = models.DateField()
    
    # Overall ratings
    RATING_CHOICES = [
        (1, 'Unsatisfactory'),
        (2, 'Needs Improvement'),
        (3, 'Meets Expectations'),
        (4, 'Exceeds Expectations'),
        (5, 'Outstanding'),
    ]
    overall_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, null=True, blank=True)
    
    # Review details
    strengths = models.TextField(blank=True, null=True)
    areas_for_improvement = models.TextField(blank=True, null=True)
    goals_achieved = models.TextField(blank=True, null=True)
    general_comments = models.TextField(blank=True, null=True)
    
    # Approval information
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_reviews'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Feedback
    employee_feedback = models.TextField(blank=True, null=True)
    employee_acknowledgement = models.BooleanField(default=False)
    employee_acknowledgement_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.review_number:
            self.review_number = self.generate_review_number()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_review_number():
        last_review = PerformanceReview.objects.order_by('-review_number').first()
        if last_review:
            last_number = int(last_review.review_number[4:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"PRF-{new_number:06d}"
    
    def __str__(self):
        return f"Review {self.review_number} - {self.employee.first_name} {self.employee.last_name}"
    
    class Meta:
        verbose_name = "Performance Review"
        verbose_name_plural = "Performance Reviews"


class PerformanceMetric(TenantAwareModel):
    """Performance metrics categories for reviews"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Whether this is an active metric for the business
    active = models.BooleanField(default=True)
    
    # Departments or roles this metric applies to (JSON field)
    applicable_departments = models.JSONField(default=list, blank=True)
    applicable_roles = models.JSONField(default=list, blank=True)
    
    # Weighting in overall assessment (percentage)
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        default=Decimal('0')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Performance Metric"
        verbose_name_plural = "Performance Metrics"
        unique_together = ('business_id', 'name')


class PerformanceRating(TenantAwareModel):
    """Individual metric ratings within a performance review"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(PerformanceReview, on_delete=models.CASCADE, related_name='ratings')
    metric = models.ForeignKey(PerformanceMetric, on_delete=models.CASCADE)
    
    # Rating value from 1-5
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    comments = models.TextField(blank=True, null=True)
    examples = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.metric.name}: {self.rating}/5"
    
    class Meta:
        verbose_name = "Performance Rating"
        verbose_name_plural = "Performance Ratings"
        unique_together = ('review', 'metric')


class PerformanceGoal(TenantAwareModel):
    """Employee performance goals"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='performance_goals')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    GOAL_TYPE_CHOICES = [
        ('PERFORMANCE', 'Performance'),
        ('DEVELOPMENT', 'Development'),
        ('BEHAVIORAL', 'Behavioral'),
        ('STRATEGIC', 'Strategic'),
        ('PROJECT', 'Project'),
    ]
    goal_type = models.CharField(max_length=15, choices=GOAL_TYPE_CHOICES)
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    # Timeline
    start_date = models.DateField()
    target_date = models.DateField()
    
    # Success criteria
    success_criteria = models.TextField()
    
    # Goal status
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('DEFERRED', 'Deferred'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='NOT_STARTED')
    
    # Progress tracking (percentage)
    progress = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    
    # Linked review if applicable
    related_review = models.ForeignKey(
        PerformanceReview, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='related_goals'
    )
    
    # Approval and tracking
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_goals'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.employee.first_name} {self.employee.last_name} - {self.title}"
    
    class Meta:
        verbose_name = "Performance Goal"
        verbose_name_plural = "Performance Goals"


class FeedbackRecord(TenantAwareModel):
    """Record of feedback given to or about an employee"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='feedback_received')
    provider = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='feedback_given')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    FEEDBACK_TYPE_CHOICES = [
        ('POSITIVE', 'Positive'),
        ('CONSTRUCTIVE', 'Constructive'),
        ('COACHING', 'Coaching'),
        ('RECOGNITION', 'Recognition'),
    ]
    feedback_type = models.CharField(max_length=15, choices=FEEDBACK_TYPE_CHOICES)
    
    # The feedback itself
    content = models.TextField()
    
    # Context for the feedback
    context = models.TextField(blank=True, null=True)
    
    # Associated project or task
    related_project = models.CharField(max_length=200, blank=True, null=True)
    
    # Whether the feedback has been shared with the employee
    is_shared = models.BooleanField(default=True)
    
    # Linked review if applicable
    related_review = models.ForeignKey(
        PerformanceReview,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='related_feedback'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Feedback from {self.provider.first_name} to {self.employee.first_name} ({self.feedback_type})"
    
    class Meta:
        verbose_name = "Feedback Record"
        verbose_name_plural = "Feedback Records"


class PerformanceSetting(TenantAwareModel):
    """Performance management settings for a business"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Review frequency
    REVIEW_FREQUENCY_CHOICES = [
        ('ANNUAL', 'Annual'),
        ('SEMI_ANNUAL', 'Semi-Annual'),
        ('QUARTERLY', 'Quarterly'),
        ('MONTHLY', 'Monthly'),
    ]
    review_frequency = models.CharField(
        max_length=15,
        choices=REVIEW_FREQUENCY_CHOICES,
        default='ANNUAL'
    )
    
    # Goal setting frequency
    GOAL_FREQUENCY_CHOICES = [
        ('ANNUAL', 'Annual'),
        ('SEMI_ANNUAL', 'Semi-Annual'),
        ('QUARTERLY', 'Quarterly'),
        ('MONTHLY', 'Monthly'),
    ]
    goal_frequency = models.CharField(
        max_length=15,
        choices=GOAL_FREQUENCY_CHOICES,
        default='ANNUAL'
    )
    
    # Review components
    require_self_assessment = models.BooleanField(default=True)
    require_peer_feedback = models.BooleanField(default=False)
    require_manager_approval = models.BooleanField(default=True)
    
    # Rating scale configuration
    use_custom_rating_scale = models.BooleanField(default=False)
    custom_rating_definitions = models.JSONField(default=dict, blank=True)
    
    # Permissions
    managers_can_view_all_reviews = models.BooleanField(default=False)
    employees_can_view_team_metrics = models.BooleanField(default=False)
    
    # Reminders and notifications
    send_review_reminders = models.BooleanField(default=True)
    days_before_reminder = models.PositiveIntegerField(default=7)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Performance Settings for Business {self.business_id}"
    
    class Meta:
        verbose_name = "Performance Setting"
        verbose_name_plural = "Performance Settings"


# Location Tracking Models

class LocationLog(TenantAwareModel):
    """
    Logs location data for clock in/out and random checks
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='location_logs')
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Location type
    LOCATION_TYPE_CHOICES = [
        ('CLOCK_IN', 'Clock In'),
        ('CLOCK_OUT', 'Clock Out'),
        ('RANDOM_CHECK', 'Random Check'),
        ('BREAK_START', 'Break Start'),
        ('BREAK_END', 'Break End'),
    ]
    location_type = models.CharField(max_length=15, choices=LOCATION_TYPE_CHOICES)
    
    # Coordinates
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    accuracy = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Location accuracy in meters"
    )
    
    # Address information
    street_address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    formatted_address = models.TextField(blank=True, null=True)
    
    # Device information
    device_type = models.CharField(max_length=50, blank=True, null=True)
    device_id = models.CharField(max_length=255, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Verification status
    is_verified = models.BooleanField(default=True)
    verification_method = models.CharField(max_length=50, blank=True, null=True)
    
    # Associated timesheet entry (if applicable)
    timesheet_entry = models.ForeignKey(
        'TimesheetEntry', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='location_logs'
    )
    
    # Timestamps
    logged_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.location_type} at {self.logged_at}"
    
    class Meta:
        verbose_name = "Location Log"
        verbose_name_plural = "Location Logs"
        indexes = [
            models.Index(fields=['employee', 'logged_at']),
            models.Index(fields=['business_id', 'location_type', 'logged_at']),
        ]
        ordering = ['-logged_at']


class EmployeeLocationConsent(TenantAwareModel):
    """
    Tracks employee consent for location tracking
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField(
        'Employee', 
        on_delete=models.CASCADE, 
        related_name='location_consent'
    )
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Consent status
    has_consented = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    revoked_date = models.DateTimeField(null=True, blank=True)
    
    # Consent preferences
    allow_clock_in_out_tracking = models.BooleanField(default=True)
    allow_random_checks = models.BooleanField(default=False)
    allow_continuous_tracking = models.BooleanField(default=False)
    
    # Privacy preferences
    share_with_manager = models.BooleanField(default=True)
    share_with_hr = models.BooleanField(default=True)
    
    # Legal/compliance
    consent_version = models.CharField(
        max_length=20, 
        default='1.0',
        help_text="Version of privacy policy/terms accepted"
    )
    ip_address_at_consent = models.GenericIPAddressField(blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Update consent/revoked dates based on status changes
        if self.has_consented and not self.consent_date:
            self.consent_date = timezone.now()
        elif not self.has_consented and self.consent_date and not self.revoked_date:
            self.revoked_date = timezone.now()
        super().save(*args, **kwargs)
    
    def __str__(self):
        status = "Consented" if self.has_consented else "Not Consented"
        return f"{self.employee.get_full_name()} - Location Tracking {status}"
    
    class Meta:
        verbose_name = "Employee Location Consent"
        verbose_name_plural = "Employee Location Consents"


class LocationCheckIn(TenantAwareModel):
    """
    Simplified model for active check-ins (can be used for real-time tracking)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField(
        'Employee', 
        on_delete=models.CASCADE, 
        related_name='active_location'
    )
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Current location
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Check-in details
    check_in_time = models.DateTimeField(default=timezone.now)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Associated location log
    check_in_location_log = models.ForeignKey(
        LocationLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_checkins'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.employee.get_full_name()} - Active since {self.check_in_time}"
    
    class Meta:
        verbose_name = "Location Check In"
        verbose_name_plural = "Location Check Ins"


class Geofence(TenantAwareModel):
    """
    Geofence for work sites and locations
    """
    GEOFENCE_TYPES = [
        ('OFFICE', 'Office Building'),
        ('CONSTRUCTION', 'Construction Site'),
        ('CLIENT', 'Client Location'),
        ('DELIVERY', 'Delivery Zone'),
        ('FIELD', 'Field Location'),
        ('CUSTOM', 'Custom Location'),
    ]
    
    SHAPE_TYPES = [
        ('CIRCLE', 'Circle'),
        ('POLYGON', 'Polygon'),  # For future use
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    # Basic info
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    location_type = models.CharField(max_length=20, choices=GEOFENCE_TYPES, default='OFFICE')
    shape_type = models.CharField(max_length=20, choices=SHAPE_TYPES, default='CIRCLE')
    
    # Location data
    center_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    center_longitude = models.DecimalField(max_digits=11, decimal_places=7)
    radius_meters = models.IntegerField(default=200, help_text='Radius in meters for circle type')
    address = models.TextField(blank=True, null=True)
    
    # Polygon data (for future use)
    polygon_points = models.JSONField(blank=True, null=True, help_text='Array of lat/lng points for polygon')
    
    # Rules and actions
    require_for_clock_in = models.BooleanField(default=True)
    require_for_clock_out = models.BooleanField(default=False)
    auto_clock_out_on_exit = models.BooleanField(default=False)
    alert_on_unexpected_exit = models.BooleanField(default=False)
    track_time_inside = models.BooleanField(default=True)
    
    # Notifications
    notify_manager_on_entry = models.BooleanField(default=False)
    notify_manager_on_exit = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'custom_auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_geofences'
    )
    
    def __str__(self):
        return f"{self.name} ({self.radius_meters}m radius)"
    
    class Meta:
        verbose_name = "Geofence"
        verbose_name_plural = "Geofences"
        unique_together = ('business_id', 'name')


class EmployeeGeofence(TenantAwareModel):
    """
    Assignment of employees to geofences
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    employee = models.ForeignKey(
        'Employee',
        on_delete=models.CASCADE,
        related_name='assigned_geofences'
    )
    geofence = models.ForeignKey(
        Geofence,
        on_delete=models.CASCADE,
        related_name='assigned_employees'
    )
    
    # Assignment details
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        'custom_auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='geofence_assignments_made'
    )
    
    # Permissions
    can_clock_in_outside = models.BooleanField(default=False, help_text='Override geofence requirement')
    
    # Status
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.geofence.name}"
    
    class Meta:
        verbose_name = "Employee Geofence"
        verbose_name_plural = "Employee Geofences"
        unique_together = ('employee', 'geofence')


class GeofenceEvent(TenantAwareModel):
    """
    Log of geofence entry/exit events
    """
    EVENT_TYPES = [
        ('ENTER', 'Entered Geofence'),
        ('EXIT', 'Exited Geofence'),
        ('CLOCK_IN', 'Clocked In'),
        ('CLOCK_OUT', 'Clocked Out'),
        ('VIOLATION', 'Geofence Violation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)  # For RLS tenant isolation
    
    employee = models.ForeignKey(
        'Employee',
        on_delete=models.CASCADE,
        related_name='geofence_events'
    )
    geofence = models.ForeignKey(
        Geofence,
        on_delete=models.CASCADE,
        related_name='events'
    )
    
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    event_time = models.DateTimeField(default=timezone.now)
    
    # Location at time of event
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=11, decimal_places=7)
    distance_from_center = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Distance in meters from geofence center'
    )
    
    # Associated records
    location_log = models.ForeignKey(
        LocationLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='geofence_events'
    )
    
    # Additional data
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.employee.get_full_name()} - {self.event_type} - {self.geofence.name}"
    
    class Meta:
        verbose_name = "Geofence Event"
        verbose_name_plural = "Geofence Events"
        ordering = ['-event_time']
