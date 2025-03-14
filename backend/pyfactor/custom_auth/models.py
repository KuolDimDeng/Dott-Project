#Users/kuoldeng/projectx/backend/pyfactor/custom_auth/models.py
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

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schema_name = models.CharField(max_length=63, unique=True)
    name = models.CharField(max_length=100)
    owner = models.OneToOneField(
        'User',
        on_delete=models.PROTECT,
        related_name='owned_tenant'
    )
    created_on = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    # Move these fields from UserProfile as they're tenant-specific
    database_status = models.CharField(
        max_length=50,
        default='not_created',
        choices=[
            ('not_created', 'Not Created'),
            ('pending', 'Pending'),
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('error', 'Error')
        ]
    )
    setup_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('complete', 'Complete'),
            ('error', 'Error'),
        ],
        default='not_started'
    )
    last_setup_attempt = models.DateTimeField(null=True, blank=True)
    setup_error_message = models.TextField(null=True, blank=True)
    last_health_check = models.DateTimeField(null=True, blank=True)
    setup_task_id = models.CharField(max_length=255, null=True, blank=True)
    storage_quota_bytes = models.BigIntegerField(default=2 * 1024 * 1024 * 1024)  # Default 2GB in bytes
     # Add archive tracking fields
    last_archive_date = models.DateTimeField(null=True, blank=True)
    archive_retention_days = models.IntegerField(default=2555)  # 7 years default
    
    # Add archive notification and decision fields
    archive_expiry_notification_sent = models.BooleanField(default=False)
    archive_expiry_notification_date = models.DateTimeField(null=True, blank=True)
    archive_user_decision = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending Decision'),
            ('export', 'Export and Delete'),
            ('delete', 'Delete Without Export'),
            ('extend', 'Extend Retention'),
        ],
        default='pending'
    )



    class Meta:
        db_table = 'auth_tenant'

    def __str__(self):
        return self.name

      # Helper methods for quota management
    @property
    def storage_quota_gb(self):
        return self.storage_quota_bytes / (1024 * 1024 * 1024)
    
    @storage_quota_gb.setter
    def storage_quota_gb(self, gb_value):
        self.storage_quota_bytes = int(gb_value * 1024 * 1024 * 1024)

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
    cognito_sub = models.CharField(max_length=36, unique=True, null=True, blank=True)  # Cognito user ID

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='users',  # This allows tenant.users.all() to get all users
        null=True,  # Allow null during onboarding
        blank=True
    )

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
      
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='OWNER')

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
    occupation = models.CharField(max_length=50, choices=OCCUPATION_CHOICES, default='OWNER')

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


# Add pre-save signal to ensure schema names use underscores
from django.db.models.signals import pre_save
from django.dispatch import receiver

@receiver(pre_save, sender=Tenant)
def ensure_schema_name_uses_underscores(sender, instance, **kwargs):
    """Ensure schema name uses underscores instead of hyphens"""
    if instance.schema_name:
        # Check if schema name starts with tenant_ prefix
        if not instance.schema_name.startswith('tenant_'):
            original_schema_name = instance.schema_name
            instance.schema_name = f"tenant_{instance.schema_name}"
            print(f"[SCHEMA-NAME-FIX] Added tenant_ prefix to schema name: '{original_schema_name}' -> '{instance.schema_name}'")
            
            # Log to the Django logger
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Schema name missing tenant_ prefix and was automatically fixed. "
                f"Original: '{original_schema_name}', Fixed: '{instance.schema_name}', "
                f"Tenant ID: {instance.id}, Owner: {getattr(instance.owner, 'email', 'unknown')}"
            )
        
        # Check if schema name contains hyphens
        if '-' in instance.schema_name:
            original_schema_name = instance.schema_name
            instance.schema_name = instance.schema_name.replace('-', '_')
            print(f"[SCHEMA-NAME-FIX] Converted schema name from '{original_schema_name}' to '{instance.schema_name}'")
            
            # Also log to the Django logger
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Schema name contained hyphens and was automatically fixed. "
                f"Original: '{original_schema_name}', Fixed: '{instance.schema_name}', "
                f"Tenant ID: {instance.id}, Owner: {getattr(instance.owner, 'email', 'unknown')}"
            )
