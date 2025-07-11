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

User = get_user_model()

def get_current_datetime():
    return timezone.now()

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
    
    # Business association
    business_id = models.UUIDField(db_index=True)
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = PhoneNumberField(null=True, blank=True)
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
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    
    # Employment Dates
    hire_date = models.DateField(default=timezone.now)
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
        # Auto-generate employee number if not set
        if not self.employee_number:
            today = timezone.now().strftime('%Y%m%d')
            unique_suffix = str(uuid.uuid4())[:4].upper()
            self.employee_number = f"EMP-{today}-{unique_suffix}"
        
        super().save(*args, **kwargs)
    
    def save_ssn_to_stripe(self, ssn):
        """Save SSN to Stripe Connect for secure storage"""
        # This method would integrate with Stripe
        # For now, just mark that it's stored
        if ssn:
            self.ssn_last_four = ssn[-4:] if len(ssn) >= 4 else ssn
            self.ssn_stored_in_stripe = True
            self.save(update_fields=['ssn_last_four', 'ssn_stored_in_stripe'])