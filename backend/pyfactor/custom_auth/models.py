from django.db import models
import uuid
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager

# Import the TenantAwareModel from tenant_base_model.py
from .tenant_base_model import TenantAwareModel, TenantAwareManager as TenantManager

class Tenant(models.Model):
    """
    Tenant model for multi-tenant functionality.
    This uses Row-Level Security (RLS) for data isolation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner_id = models.CharField(max_length=255, null=True, blank=True)
    # DEPRECATED: schema_name will be removed in a future version
    # This field is maintained by the SchemaNameMiddleware for backward compatibility
    # All new code should use tenant_id with RLS policies instead
    schema_name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    rls_enabled = models.BooleanField(default=True)
    rls_setup_date = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    # Account closure fields
    deactivated_at = models.DateTimeField(null=True, blank=True)
    is_recoverable = models.BooleanField(null=True, blank=True)
    # Add fields that might have been in Profile before
    setup_status = models.CharField(max_length=20, null=True, blank=True)
    last_health_check = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'custom_auth_tenant'
        managed = False  # Tell Django not to manage this table, it's shared with Next.js

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        
        # Always ensure RLS is enabled for all tenants
        self.rls_enabled = True
        if not self.rls_setup_date:
            self.rls_setup_date = timezone.now()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (ID: {self.id})"


class UserManager(BaseUserManager):
    """Custom manager for User model with no username field."""
    
    use_in_migrations = True
    
    def _create_user(self, email, password, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)
    
    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self._create_user(email, password, **extra_fields)


class UserRole(models.TextChoices):
    """User role choices - maintaining existing OWNER, ADMIN, USER structure"""
    OWNER = 'OWNER', 'Business Owner'
    ADMIN = 'ADMIN', 'Administrator'
    USER = 'USER', 'User'
    # Future roles can be added here:
    # CUSTOMER = 'CUSTOMER', 'Customer'
    # VENDOR = 'VENDOR', 'Vendor'
    # ACCOUNTANT = 'ACCOUNTANT', 'Accountant'


class User(AbstractUser):
    """Custom user model using email as the unique identifier."""
    
    username = None
    email = models.EmailField('email address', unique=True)
    is_active = models.BooleanField(default=True)
    
    # Tenant relationship
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    
    # Auth0 additional fields
    auth0_sub = models.CharField(max_length=255, null=True, blank=True, help_text='Auth0 subject identifier')
    name = models.CharField(max_length=255, null=True, blank=True, help_text='Full name from Auth0')
    picture = models.URLField(null=True, blank=True, help_text='Profile picture URL from Auth0')
    email_verified = models.BooleanField(default=False, help_text='Email verification status from Auth0')
    
    # Additional fields
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    business_id = models.UUIDField(null=True, blank=True)
    
    # Role field with choices - using enum
    ROLE_CHOICES = UserRole.choices  # Keep for backward compatibility
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.OWNER)
    
    # Onboarding status - single source of truth
    onboarding_completed = models.BooleanField(default=False, help_text='Whether user has completed onboarding')
    onboarding_completed_at = models.DateTimeField(null=True, blank=True, help_text='When onboarding was completed')
    
    # Subscription plan
    subscription_plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise')
        ],
        default='free',
        help_text='User subscription plan'
    )
    
    # Timezone field for global app support
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        null=True,
        blank=True,
        help_text='User timezone (e.g., America/New_York)',
        verbose_name='User Timezone'
    )
    
    # Account closure fields
    is_deleted = models.BooleanField(default=False, help_text='Soft delete flag - user account is closed')
    deleted_at = models.DateTimeField(null=True, blank=True, help_text='When the account was closed')
    deletion_reason = models.CharField(max_length=255, null=True, blank=True, help_text='Reason for account closure')
    deletion_feedback = models.TextField(null=True, blank=True, help_text='Additional feedback provided during account closure')
    deletion_initiated_by = models.CharField(max_length=255, null=True, blank=True, help_text='Who initiated the deletion (user/admin/system)')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()  # type: ignore
    
    class Meta:
        db_table = 'custom_auth_user'
    
    def __str__(self):
        return self.email


class AccountDeletionLog(models.Model):
    """
    Audit log for account deletions.
    Keeps a permanent record of account closures for compliance and analytics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_email = models.EmailField(help_text='Email of the deleted account')
    user_id = models.IntegerField(help_text='ID of the deleted user')
    tenant_id = models.UUIDField(null=True, blank=True, help_text='ID of the associated tenant')
    auth0_sub = models.CharField(max_length=255, null=True, blank=True, help_text='Auth0 subject identifier')
    
    # Deletion details
    deletion_date = models.DateTimeField(default=timezone.now)
    deletion_reason = models.CharField(max_length=255, null=True, blank=True)
    deletion_feedback = models.TextField(null=True, blank=True)
    deletion_initiated_by = models.CharField(max_length=255, default='user')
    
    # Status tracking
    auth0_deleted = models.BooleanField(default=False, help_text='Whether user was deleted from Auth0')
    database_deleted = models.BooleanField(default=False, help_text='Whether user was deleted from database')
    tenant_deleted = models.BooleanField(default=False, help_text='Whether tenant data was deleted')
    
    # Error tracking
    deletion_errors = models.JSONField(null=True, blank=True, help_text='Any errors encountered during deletion')
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'custom_auth_account_deletion_log'
        ordering = ['-deletion_date']
        indexes = [
            models.Index(fields=['user_email']),
            models.Index(fields=['deletion_date']),
        ]
    
    def __str__(self):
        return f"Deletion log for {self.user_email} on {self.deletion_date}"


class PagePermission(models.Model):
    """Defines available pages in the system"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    path = models.CharField(max_length=255)  # e.g., '/dashboard/products'
    category = models.CharField(max_length=50)  # e.g., 'Sales', 'HR', 'Finance'
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'page_permissions'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.category} - {self.name}"


class UserPageAccess(models.Model):
    """Defines which pages a user can access and with what permissions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='page_access')
    page = models.ForeignKey(PagePermission, on_delete=models.CASCADE)
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'user_page_access'
        unique_together = ['user', 'page', 'tenant']
    
    def __str__(self):
        return f"{self.user.email} - {self.page.name}"


class RoleTemplate(models.Model):
    """Pre-defined role templates for quick assignment"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g., 'Sales Representative', 'HR Manager'
    description = models.TextField()
    pages = models.ManyToManyField(PagePermission, through='RoleTemplatePages')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'role_templates'
    
    def __str__(self):
        return self.name


class RoleTemplatePages(models.Model):
    """Defines default permissions for role templates"""
    template = models.ForeignKey(RoleTemplate, on_delete=models.CASCADE)
    page = models.ForeignKey(PagePermission, on_delete=models.CASCADE)
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'role_template_pages'
        unique_together = ['template', 'page']


class UserInvitation(models.Model):
    """Track user invitations sent via Auth0"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.USER)
    invitation_token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    # Store intended page permissions
    page_permissions = models.JSONField(default=dict, blank=True)  # {page_id: {read: true, write: false, ...}}
    
    class Meta:
        db_table = 'user_invitations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation to {self.email} by {self.invited_by.email}"


class PasswordResetToken(models.Model):
    """Token for secure password reset flow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'custom_auth_password_reset_token'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]
    
    def is_valid(self):
        """Check if token is valid and not expired"""
        return not self.used and self.expires_at > timezone.now()
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"