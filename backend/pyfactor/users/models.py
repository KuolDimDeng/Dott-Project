import re
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, connections
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError
from business.models import Business
import uuid



class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)
    
    def get_by_natural_key(self, email):
        return self.get(email=email)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('email address', unique=True)
    name = models.CharField(max_length=255, blank=True)  # Added name field
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    email_confirmed = models.BooleanField(default=False)
    confirmation_token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_onboarded = models.BooleanField(default=False)



    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()
    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
        ('ACCOUNTANT', 'Accountant'),
        ('HR-ADMIN','HR-Admin'),
        ('PAYROLL-ADMIN', 'Payroll-Admin'),
        ('ACCOUNTS-PAYABLE', 'Accounts-Payable'),
        ('ACCOUNTS-RECEIVABLE', 'Accounts-Receivable'),
        ('ANALYST','Analyst')
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE')
    OCCUPATION_CHOICES = [
        ('OWNER', 'Owner'),
        ('Freelaancer', 'Freelancer'),
        ('CEO', 'Chief Executive Officer'),
        ('CFO', 'Chief Financial Officer'),
        ('CTO', 'Chief Technology Officer'),
        ('COO', 'Chief Operating Officer'),
        ('MANAGER', 'Manager'),
        ('DIRECTOR', 'Director'),
        ('SUPERVISOR', 'Supervisor'),
        ('TEAM_LEAD', 'Team Lead'),
        ('ACCOUNTANT', 'Accountant'),
        ('FINANCIAL_ANALYST', 'Financial Analyst'),
        ('HR_MANAGER', 'HR Manager'),
        ('MARKETING_MANAGER', 'Marketing Manager'),
        ('SALES_MANAGER', 'Sales Manager'),
        ('CUSTOMER_SERVICE_REP', 'Customer Service Representative'),
        ('ADMINISTRATIVE_ASSISTANT', 'Administrative Assistant'),
        ('CLERK', 'Clerk'),
        ('DEVELOPER', 'Developer'),
        ('DESIGNER', 'Designer'),
        ('CONSULTANT', 'Consultant'),
        ('STAFF', 'Staff'),
        ('EMPLOYEE', 'Employee'),
        ('ENGINEER', 'Engineer'),
        ('CONTRACTOR', 'Contractor'),
        ('TRAINER', 'Trainer'),
        ('IT_ADMIN', 'IT Admin'),
        ('IT_SUPPORT', 'IT Support'),
        ('OTHER', 'Other'),
    ]
    occupation = models.CharField(max_length=50, choices=OCCUPATION_CHOICES, default='OTHER')


    class Meta:
        db_table = 'users_user'

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    business = models.ForeignKey('business.Business', on_delete=models.SET_NULL, null=True, related_name='employees')
    occupation = models.CharField(max_length=200, null=True)
    street = models.CharField(max_length=200, null=True)
    city = models.CharField(max_length=200, null=True)
    state = models.CharField(max_length=200, null=True)
    postcode = models.CharField(max_length=200, null=True)
    country = CountryField(default='US')
    phone_number = models.CharField(max_length=200, null=True)
    database_name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True, null=True)
    is_business_owner = models.BooleanField(default=False)
    shopify_access_token = models.CharField(max_length=255, null=True, blank=True)

    def to_dict(self):
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': self.business.name if self.business_id is not None else None,
            'database_name': self.database_name,
            # Add other fields as needed
        }

    def save(self, *args, **kwargs):
        if not self.database_name and self.user:
            safe_id = re.sub(r'[^a-zA-Z0-9_]', '', str(self.user.id).replace('-', '_'))
            safe_email = re.sub(r'[^a-zA-Z0-9_]', '', self.user.email.split('@')[0])
            self.database_name = f"{safe_id}_{safe_email}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"User Profile: {self.id}"  # Changed from self.user.email to self.id

