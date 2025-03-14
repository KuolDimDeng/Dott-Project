#/Users/kuoldeng/projectx/backend/pyfactor/users/models.py
import re
import uuid
import logging
import random
import string
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, connections
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, MinValueValidator
from custom_auth.models import User

logger = logging.getLogger(__name__)

# Import choices from local choices module
from users.choices import (
    BUSINESS_TYPES,
    LEGAL_STRUCTURE_CHOICES,
    SUBSCRIPTION_TYPES,
    BILLING_CYCLES
)

# Business model moved from business app to users app
class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_businesses'
    )
    business_num = models.CharField(max_length=6, unique=True, editable=False)
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES)
    business_subtype_selections = models.JSONField(default=dict, blank=True)
    street = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=200, blank=True, null=True)
    state = models.CharField(max_length=200, blank=True, null=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    country = CountryField(default='US')
    address = models.TextField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    database_name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    members = models.ManyToManyField(User, through='BusinessMember', related_name='businesses')
    
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        default='SOLE_PROPRIETORSHIP'
    )
    
    date_founded = models.DateField(
        null=True,
        blank=True,
        validators=[MinValueValidator(limit_value=timezone.now().date())]
    )

    def save(self, *args, **kwargs):
        # Generate a unique business number if not provided
        if not self.business_num:
            self.business_num = self.generate_business_number()
            
        if not self.owner_id and hasattr(self, '_owner_id'):
            self.owner_id = self._owner_id
        super().save(*args, **kwargs)

    def generate_business_number(self):
        """Generate a unique 6-digit business number"""
        while True:
            number = ''.join(random.choices(string.digits, k=6))
            if not Business.objects.filter(business_num=number).exists():
                return number

    def __str__(self):
        return self.business_name if self.business_name else f"Business {self.pk if self.pk else 'unsaved'}"

    class Meta:
        indexes = [
            models.Index(fields=['business_num']),
            models.Index(fields=['business_name']),
            models.Index(fields=['database_name']),
            models.Index(fields=['owner']),
        ]

class Subscription(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    selected_plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('professional', 'Professional')
        ],
        default='free'
    )
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    end_date = models.DateField(null=True, blank=True)
    billing_cycle = models.CharField(
            max_length=20,
            choices=BILLING_CYCLES,
            default='monthly'
        )

    def __str__(self):
        return f"Subscription {self.pk if self.pk else 'unsaved'}"

class BusinessMember(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='business_memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_memberships')
    #employee = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='business_memberships')
    employee = None  # Will fix this after initial migration
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('business', 'user')

    def __str__(self):
        return f"{self.user.email} - {self.business.business_name} - {self.get_role_display()}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', unique=True)
    business = models.ForeignKey(
        Business,  # Reference the Business model in the same app
        on_delete=models.CASCADE,
        related_name='user_profiles',
        null=True,
        blank=True
    )
    # Add tenant relationship
    tenant = models.ForeignKey(
        'custom_auth.Tenant',
        on_delete=models.CASCADE,
        related_name='profiles',
        null=True,  # Initially null until tenant is created/assigned
        blank=True
    )
    
    # Keep existing fields
    occupation = models.CharField(max_length=200, null=True, blank=True)
    street = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=200, null=True, blank=True)
    state = models.CharField(max_length=200, null=True, blank=True)
    postcode = models.CharField(max_length=200, null=True, blank=True)
    country = CountryField(default='US')
    phone_number = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    is_business_owner = models.BooleanField(default=False)
    shopify_access_token = models.CharField(max_length=255, null=True, blank=True)
    schema_name = models.CharField(max_length=63, null=True, blank=True)
    
    # Add metadata field to store additional information like pending schema setup
    metadata = models.JSONField(default=dict, blank=True, null=True)

    
    # Move these fields to the Tenant model as they're tenant-specific
    # Remove:
    # - database_name
    # - database_status
    # - setup_status
    # - last_setup_attempt
    # - setup_error_message
    # - database_setup_task_id
    # - last_health_check

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_profile'),
            # Remove database_name constraint as it moves to Tenant model
        ]
        indexes = [
            models.Index(fields=['tenant']),  # Add index for tenant queries
        ]

    def save(self, *args, **kwargs):
        # If this is a business owner profile, ensure tenant is created
        if self.is_business_owner and not self.tenant:
            from custom_auth.models import Tenant  # Import here to avoid circular import
            # Generate a unique schema name using user ID
            schema_name = f"tenant_{self.user.id}"
            try:
                # Try to get existing tenant first
                tenant = Tenant.objects.get(owner=self.user)
                if not tenant.schema_name:
                    tenant.schema_name = schema_name
                    tenant.save(update_fields=['schema_name'])
            except Tenant.DoesNotExist:
                # Create new tenant with unique schema name
                # Create tenant first
                tenant = Tenant.objects.create(
                    name=self.business.business_name if self.business else f"Tenant-{self.user.id}",
                    owner=self.user,
                    schema_name=schema_name,
                    setup_status='pending'
                )
    
                # Instead of triggering the schema setup task immediately,
                # we'll store the information needed for later setup
                # This improves user experience by not blocking the UI during onboarding
                
                # Store setup information in user profile metadata
                if not hasattr(self, 'metadata') or not isinstance(self.metadata, dict):
                    self.metadata = {}
                
                self.metadata['pending_schema_setup'] = {
                    'user_id': str(self.user.id),
                    'business_id': str(self.business.id if self.business else None),
                    'timestamp': timezone.now().isoformat(),
                    'source': 'user_profile_save',
                    'deferred': True  # Flag to indicate this setup should be deferred
                }
                
                # Update tenant to indicate setup is deferred
                tenant.setup_status = 'deferred'
                tenant.save(update_fields=['setup_status'])
                
                logger.info(f"Deferred schema setup for user {self.user.email} - will be triggered when user reaches dashboard")
            self.tenant = tenant
        
        self.modified_at = timezone.now()
        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': self.business.business_name if self.business_id is not None else None,
            'tenant_name': self.tenant.name if self.tenant else None,
            'is_business_owner': self.is_business_owner,
            'country': str(self.country),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }