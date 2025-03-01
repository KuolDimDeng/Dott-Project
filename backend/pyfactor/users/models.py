#/Users/kuoldeng/projectx/backend/pyfactor/users/models.py
import re
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, connections
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError
from business.models import Business
from custom_auth.models import User
import uuid
import logging

logger = logging.getLogger(__name__)


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', unique=True)
    business = models.ForeignKey(
        'business.Business',
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
    
                # Trigger schema setup task
                from onboarding.tasks import setup_user_schema_task
                task = setup_user_schema_task.delay(
                    str(self.user.id),
                    str(self.business.id if self.business else None)
                )
    
                # Update tenant with task ID
                tenant.database_setup_task_id = task.id
                tenant.save(update_fields=['database_setup_task_id'])
    
                logger.info(f"Triggered schema setup task {task.id} for user {self.user.email}")
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