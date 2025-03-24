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
        ('S', 'Married Filing Separately'),
        ('H', 'Head of Household'),
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
    date_joined = models.DateField(default=get_current_datetime)
    last_work_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    role = models.CharField(max_length=20, choices=[
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee')
    ], default='EMPLOYEE')
    site_access_privileges = models.JSONField(default=list)
    email = models.EmailField(unique=True, blank=False, null=False, default='')
    phone_number = PhoneNumberField(null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
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
    
    tax_filing_status = models.CharField(max_length=1, choices=TAX_STATUS_CHOICES, blank=True, null=True)
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
    business_id = models.UUIDField(null=True, blank=True)  # Store the UUID of the business
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