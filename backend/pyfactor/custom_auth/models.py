from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
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

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True.')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email):
        return self.get(email=email)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('email address', unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    email_confirmed = models.BooleanField(default=False)  # For email verification
    confirmation_token = models.UUIDField(default=uuid.uuid4, editable=False)  # For email verification
    is_onboarded = models.BooleanField(default=False)  # Tracks onboarding completion
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)  # Optional, for payment integration

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
        ('ACCOUNTANT', 'Accountant'),
        ('HR-ADMIN', 'HR-Admin'),
        ('PAYROLL-ADMIN', 'Payroll-Admin'),
        ('ACCOUNTS-PAYABLE', 'Accounts-Payable'),
        ('ACCOUNTS-RECEIVABLE', 'Accounts-Receivable'),
        ('ANALYST', 'Analyst')
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE')

    OCCUPATION_CHOICES = [
        ('OWNER', 'Owner'),
        ('Freelancer', 'Freelancer'),
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

    @property
    def full_name(self):
        """Returns the user's full name or email if names are not provided."""
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.email

    def get_short_name(self):
        """Returns the user's first name."""
        return self.first_name
