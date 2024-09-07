import datetime
import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from .custom_fields import EncryptedCharField

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + datetime.timedelta(days=30)

class Employee(models.Model):
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
    role = models.CharField(max_length=100, blank=True, null=True)
    site_access_privileges = models.TextField(blank=True, null=True)
    email = models.EmailField(unique=True, blank=False, null=False, default='')
    phone_number = PhoneNumberField(null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    documents = models.FileField(upload_to='employee_documents/', blank=True, null=True)
    wage_per_hour = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    hours_per_day = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(24)], default=0)
    overtime_rate = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    days_per_week = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(7)], default=0)
    employment_type = models.CharField(max_length=2, choices=EMPLOYMENT_TYPE_CHOICES, default='FT')
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    onboarded = models.BooleanField(default=False)

    security_number_type = models.CharField(max_length=10, choices=SECURITY_NUMBER_TYPE_CHOICES, default='SSN')
    security_number = EncryptedCharField(max_length=255, default=None)
    bank_account_number = EncryptedCharField(max_length=255, blank=True, null=True)
    tax_id_number = EncryptedCharField(max_length=255, blank=True, null=True)
    tax_filing_status = models.CharField(max_length=1, choices=TAX_STATUS_CHOICES, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    probation = models.BooleanField(default=True)
    probation_end_date = models.DateField(null=True, blank=True)
    health_insurance_enrollment = models.BooleanField(default=False)
    pension_enrollment = models.BooleanField(default=False)
    termination_date = models.DateField(null=True, blank=True)
    reason_for_leaving = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.employee_number:
            self.employee_number = self.generate_employee_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_employee_number():
        last_employee = Employee.objects.order_by('-id').first()
        if last_employee:
            last_number = int(last_employee.employee_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"EMP-{new_number:06d}"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_number})"

class Role(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

class EmployeeRole(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)

class AccessPermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.CharField(max_length=100)
    can_view = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    
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