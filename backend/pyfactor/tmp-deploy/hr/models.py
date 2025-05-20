#/Users/kuoldeng/projectx/backend/pyfactor/hr/models.py
import datetime
import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from decimal import Decimal
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model

User = get_user_model()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + datetime.timedelta(days=30)

class Employee(AbstractUser):
    # Add related_name arguments to fix reverse accessor clashes
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='employee_set',
        related_query_name='employee'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='employee_set',
        related_query_name='employee'
    )

    # Add user field to link to User model
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='employee_profile')

    EMPLOYMENT_TYPE_CHOICES = [
        ('FT', 'Full-time'),
        ('PT', 'Part-time'),
    ]
    
    SECURITY_NUMBER_TYPE_CHOICES = [
        ('SSN', 'Social Security Number (US)'),
        ('NIN', 'National Insurance Number (UK)'),
        ('SIN', 'Social Insurance Number (Canada)'),
        ('TFN', 'Tax File Number (Australia)'),
        ('NRIC', 'National Registration Identity Card (Singapore)'),
        ('AADHAAR', 'Aadhaar Number (India)'),
        ('CPF', 'CPF Number (Brazil)'),
        ('CURP', 'CURP (Mexico)'),
        ('DNI', 'DNI Number (Spain, Argentina, Peru)'),
        ('HKID', 'Hong Kong Identity Card'),
        ('NINO', 'National Identity Number (Sweden)'),
        ('BSN', 'Citizen Service Number (Netherlands)'),
        ('PESEL', 'PESEL Number (Poland)'),
        ('RUT', 'RUT Number (Chile)'),
        ('CNIC', 'CNIC Number (Pakistan)'),
        ('GSTIN', 'GSTIN Number (India for businesses)'),
        ('MYKAD', 'MyKad Number (Malaysia)'),
        ('KTP', 'KTP Number (Indonesia)'),
        ('PAN', 'PAN Card Number (India)'),
        ('NIF', 'NIF Number (Portugal)'),
        ('STCN', 'Social Tag Card Number (China)'),
        ('IRD', 'IRD Number (New Zealand)'),
        ('PPS', 'PPS Number (Ireland)'),
        ('NPWP', 'NPWP Number (Indonesia for tax)'),
        ('CUIT', 'CUIT Number (Argentina)'),
        ('IQAMA', 'Iqama Number (Saudi Arabia)'),
        ('EKTP', 'eKTP Number (Indonesia)'),
        ('NIS', 'NIS Number (Brazil)'),
        ('KITAS', 'KITAS Number (Indonesia for foreigners)'),
        ('OTHER', 'Other National ID'),
    ]
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('N', 'Prefer not to say'),
    ]

    MARITAL_STATUS_CHOICES = [
        ('S', 'Single'),
        ('M', 'Married'),
        ('D', 'Divorced'),
        ('W', 'Widowed'),
    ]

    TAX_STATUS_CHOICES = [
        ('S', 'Single'),
        ('M', 'Married Filing Jointly'),
        ('MS', 'Married Filing Separately'),
        ('H', 'Head of Household'),
    ]
    
    COMPENSATION_TYPE_CHOICES = [
        ('SALARY', 'Salary (Yearly)'),
        ('WAGE', 'Wage (Hourly)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_number = models.CharField(max_length=20, unique=True, editable=False)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(default=get_current_datetime)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    marital_status = models.CharField(max_length=1, choices=MARITAL_STATUS_CHOICES, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    street = models.CharField(max_length=200, null=True, blank=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='USA')
    date_joined = models.DateField(default=timezone.now)
    last_work_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    role = models.CharField(max_length=20, choices=[
        ('employee', 'employee'),
        ('user', 'user')
    ], default='employee')
    site_access_privileges = models.JSONField(default=list)
    email = models.EmailField(unique=True, blank=False, null=False, default='')
    phone_number = PhoneNumberField(null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    compensation_type = models.CharField(max_length=10, choices=COMPENSATION_TYPE_CHOICES, default='SALARY')
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    documents = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    wage_per_hour = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(Decimal('0'))], default=Decimal('0'))
    hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('24'))], default=Decimal('0'))
    overtime_rate = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(Decimal('0'))], default=Decimal('0'))
    days_per_week = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)], default=0)
    employment_type = models.CharField(max_length=2, choices=EMPLOYMENT_TYPE_CHOICES, default='FT')
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    onboarded = models.BooleanField(default=False)

    # Replace direct storage with Stripe references
    security_number_type = models.CharField(max_length=10, choices=SECURITY_NUMBER_TYPE_CHOICES, default='SSN')
    
    # Stripe Connect fields for sensitive data
    stripe_person_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Flags for tracking what data is stored in Stripe
    ssn_stored_in_stripe = models.BooleanField(default=False)
    bank_account_stored_in_stripe = models.BooleanField(default=False)
    tax_id_stored_in_stripe = models.BooleanField(default=False)

    # Add payment-related fields
    payment_provider = models.CharField(max_length=50, blank=True, null=True)

    # M-Pesa specific fields
    mpesa_phone_number = models.CharField(max_length=20, blank=True, null=True)
    # PayPal specific fields
    paypal_email = models.EmailField(blank=True, null=True)
    # Bank account fields (for providers that need them)
    bank_account_last_four = models.CharField(max_length=4, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    # Mobile money fields
    mobile_wallet_provider = models.CharField(max_length=50, blank=True, null=True)
    mobile_wallet_id = models.CharField(max_length=100, blank=True, null=True)
        
    # Only store last 4 digits for reference/display
    ssn_last_four = models.CharField(max_length=4, blank=True, null=True)
    bank_account_last_four = models.CharField(max_length=4, blank=True, null=True)
    
    tax_filing_status = models.CharField(max_length=2, choices=TAX_STATUS_CHOICES, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    probation = models.BooleanField(default=True)
    probation_end_date = models.DateField(null=True, blank=True)
    health_insurance_enrollment = models.BooleanField(default=False)
    pension_enrollment = models.BooleanField(default=False)
    termination_date = models.DateField(null=True, blank=True)
    reason_for_leaving = models.TextField(blank=True, null=True)
    # Replace ForeignKey with UUID field to break circular dependency
    # business = models.ForeignKey(
    #         'users.Business',
    #         on_delete=models.CASCADE,
    #         related_name='business_employees',
    #         null=True,
    #         blank=True
    #     )
    business_id = models.UUIDField(null=True, blank=True)
    ID_verified = models.BooleanField(default=False)
    areManager = models.BooleanField(default=False)
    supervising = models.ManyToManyField('self', related_name='supervised_by', blank=True, symmetrical=False)  # Store the UUID of the business
    password_setup_token = models.CharField(max_length=100, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.employee_number:
            self.employee_number = self.generate_employee_number()
        super().save(*args, **kwargs)

    @classmethod
    def generate_employee_number(cls):
        last_employee = cls.objects.order_by('-employee_number').first()
        if last_employee:
            last_number = int(last_employee.employee_number[4:])  # Changed from [3:] to [4:]
            new_number = last_number + 1
        else:
            new_number = 1
        return f"EMP-{new_number:06d}"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_number})"
        
    def save_ssn_to_stripe(self, ssn):
        """Save SSN to Stripe instead of storing it directly"""
        import stripe
        from users.models import Business
        
        if not self.stripe_account_id:
            # Create or get a Stripe account for this employee's business
            # Get the business object using the business_id
            if self.business_id:
                try:
                    business = Business.objects.get(id=self.business_id)
                    business_account = business.get_or_create_stripe_account()
                    self.stripe_account_id = business_account.id
                except Business.DoesNotExist:
                    raise ValueError("Business not found for the given business_id")
            else:
                raise ValueError("business_id is required to save SSN to Stripe")
            
        # Create or update a Person object in Stripe
        if not self.stripe_person_id:
            # Create new Person
            person = stripe.Account.create_person(
                self.stripe_account_id,
                {
                    "first_name": self.first_name,
                    "last_name": self.last_name,
                    "id_number": ssn,  # Full SSN securely stored in Stripe
                    "relationship": {
                        "representative": True,
                    },
                }
            )
            self.stripe_person_id = person.id
        else:
            # Update existing Person
            stripe.Account.modify_person(
                self.stripe_account_id,
                self.stripe_person_id,
                {
                    "id_number": ssn,
                }
            )
        
        # Store only last 4 digits locally
        self.ssn_last_four = ssn[-4:] if ssn else None
        self.ssn_stored_in_stripe = True
        self.save()
        
        return True
        
    def save_bank_account_to_stripe(self, account_number, routing_number):
        """Save bank account details to Stripe"""
        import stripe
        from users.models import Business
        
        if not self.stripe_account_id:
            # Get the business object using the business_id
            if self.business_id:
                try:
                    business = Business.objects.get(id=self.business_id)
                    business_account = business.get_or_create_stripe_account()
                    self.stripe_account_id = business_account.id
                except Business.DoesNotExist:
                    raise ValueError("Business not found for the given business_id")
            else:
                raise ValueError("business_id is required to save bank account to Stripe")
            
        # Create external account (bank account)
        bank_account = stripe.Account.create_external_account(
            self.stripe_account_id,
            {
                "external_account": {
                    "object": "bank_account",
                    "country": "US",
                    "currency": "usd",
                    "routing_number": routing_number,
                    "account_number": account_number,
                }
            }
        )
        
        # Store only last 4 digits locally
        self.bank_account_last_four = account_number[-4:] if account_number else None
        self.bank_account_stored_in_stripe = True
        self.save()
        
        return True

    # Payment provider preferences
    def get_payment_provider(self):
        """Get the appropriate payment provider for this employee"""
        if self.payment_provider:
            # Use explicitly set provider
            from payments.providers import PaymentProviderRegistry
            return PaymentProviderRegistry.get_provider_by_name(self.payment_provider)
        else:
            # Determine provider based on country
            country_code = self.country or 'US'
            from payments.providers import PaymentProviderRegistry
            return PaymentProviderRegistry.get_provider_for_country(country_code)

class Role(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    def __str__(self):
        return self.name

class EmployeeRole(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.employee} - {self.role}"

class AccessPermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.CharField(max_length=100)
    can_view = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.role} - {self.module} permissions"


class PreboardingForm(models.Model):
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

class TimesheetSetting(models.Model):
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


class CompanyHoliday(models.Model):
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


class Timesheet(models.Model):
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


class TimesheetEntry(models.Model):
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Entry for {self.date} - {self.regular_hours} hours"
    
    class Meta:
        verbose_name = "Timesheet Entry"
        verbose_name_plural = "Timesheet Entries"
        unique_together = ('timesheet', 'date')


class TimeOffRequest(models.Model):
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

class TimeOffBalance(models.Model):
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


class Benefits(models.Model):
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


class PerformanceReview(models.Model):
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


class PerformanceMetric(models.Model):
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


class PerformanceRating(models.Model):
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


class PerformanceGoal(models.Model):
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


class FeedbackRecord(models.Model):
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


class PerformanceSetting(models.Model):
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
