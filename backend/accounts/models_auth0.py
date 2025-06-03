# Auth0 User and Tenant Models
from django.db import models
import uuid
from django.utils import timezone

class Auth0User(models.Model):
    """User model for Auth0 authenticated users"""
    auth0_id = models.CharField(max_length=255, unique=True, db_index=True)  # Auth0 'sub'
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True)
    picture = models.URLField(blank=True)
    
    # Tenant relationship
    current_tenant = models.ForeignKey('Tenant', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'auth0_users'
        
    def __str__(self):
        return self.email

class Tenant(models.Model):
    """Tenant model for multi-tenancy"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)  # Business name
    
    # Business Information
    business_type = models.CharField(max_length=100)
    business_subtypes = models.JSONField(default=dict, blank=True)  # Store dynamic subtypes
    country = models.CharField(max_length=2)  # ISO country code
    business_state = models.CharField(max_length=100, blank=True)
    legal_structure = models.CharField(max_length=100)
    date_founded = models.DateField()
    
    # Additional Business Info
    industry = models.CharField(max_length=100, blank=True)  # Mapped from business_type
    address = models.TextField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    
    # Owner Information (from first user)
    owner_first_name = models.CharField(max_length=50)
    owner_last_name = models.CharField(max_length=50)
    
    # Subscription
    subscription_plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    billing_interval = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Monthly'),
            ('annual', 'Annual'),
        ],
        default='monthly'
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('trialing', 'Trialing'),
            ('past_due', 'Past Due'),
            ('canceled', 'Canceled'),
            ('pending', 'Pending'),
        ],
        default='pending'
    )
    subscription_date = models.DateTimeField(null=True, blank=True)
    
    # Onboarding
    onboarding_completed = models.BooleanField(default=False)
    onboarding_step = models.CharField(max_length=50, default='business_info')
    setup_done = models.BooleanField(default=False)  # Legacy field for compatibility
    
    # Configuration flags
    setup_freeplan = models.BooleanField(default=False)
    setup_rlsused = models.BooleanField(default=False)
    setup_skipdatabase = models.BooleanField(default=False)
    
    # Schema name for database isolation
    schema_name = models.CharField(max_length=100, unique=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants'
        
    def save(self, *args, **kwargs):
        if not self.schema_name:
            self.schema_name = f"tenant_{str(self.id).replace('-', '_')}"
        super().save(*args, **kwargs)
        
    def __str__(self):
        return self.name

class UserTenantRole(models.Model):
    """Many-to-many relationship between users and tenants with roles"""
    user = models.ForeignKey(Auth0User, on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=20,
        choices=[
            ('owner', 'Owner'),
            ('admin', 'Admin'),
            ('manager', 'Manager'),
            ('user', 'User'),
        ],
        default='user'
    )
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_tenant_roles'
        unique_together = ['user', 'tenant']
        
    def __str__(self):
        return f"{self.user.email} - {self.tenant.name} ({self.role})"

class OnboardingProgress(models.Model):
    """Track onboarding progress for users"""
    user = models.ForeignKey(Auth0User, on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    
    # Steps completed
    business_info_completed = models.BooleanField(default=False)
    subscription_selected = models.BooleanField(default=False)
    payment_completed = models.BooleanField(default=False)
    setup_completed = models.BooleanField(default=False)
    
    # Additional data
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'onboarding_progress'
        unique_together = ['user', 'tenant']