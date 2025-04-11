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


class User(AbstractUser):
    """Custom user model using email as the unique identifier."""
    
    username = None
    email = models.EmailField('email address', unique=True)
    is_active = models.BooleanField(default=True)
    
    # Tenant relationship
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    
    # Additional fields
    cognito_sub = models.CharField(max_length=255, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()  # type: ignore
    
    class Meta:
        db_table = 'custom_auth_user'
    
    def __str__(self):
        return self.email