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
# Place business model definition before models that reference it
class Business(models.Model):
    """
    Business model - core model for storing business information.
    Business details are stored in a separate BusinessDetails model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner_id = models.UUIDField(verbose_name='Owner ID', null=True, blank=True)
    name = models.CharField(max_length=255)  # This matches the actual column in your DB
    # business_type field is now handled by the BusinessDetails model
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # This matches 'updated_at' in your DB
    business_num = models.CharField(max_length=6, unique=True, null=True, blank=True)

    # Virtual properties to maintain compatibility with existing code
    @property
    def business_name(self):
        return self.name
        
    @business_name.setter
    def business_name(self, value):
        self.name = value
        
    @property
    def owner(self):
        # Get the owner via UserProfile (since there's no direct owner_id)
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT user_id 
                FROM users_userprofile 
                WHERE business_id = %s 
                LIMIT 1
            """, [str(self.id)])
            row = cursor.fetchone()
            
        if row and row[0]:
            from custom_auth.models import User
            try:
                return User.objects.get(id=row[0])
            except User.DoesNotExist:
                return None
        return None

    @property
    def business_type(self):
        """
        Get business_type from the related BusinessDetails object
        """
        try:
            return self.businessdetails.business_type
        except BusinessDetails.DoesNotExist:
            return None

    @business_type.setter
    def business_type(self, value):
        """
        Store business_type value to be set on BusinessDetails 
        during save() to handle unsaved Business instances properly
        """
        # Store the value for use in save()
        self._business_type_value = value
        
        # If the instance is already saved, update BusinessDetails directly
        if self.pk:
            try:
                details, created = BusinessDetails.objects.get_or_create(
                    business=self,
                    defaults={'business_type': value}
                )
                
                if not created and details.business_type != value:
                    details.business_type = value
                    details.save(update_fields=['business_type'])
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error setting business_type: {str(e)}")
            
    @owner.setter
    def owner(self, value):
        if value:
            self._owner = value
            # Store the owner ID for later use in save method
            if hasattr(value, 'id'):
                self._owner_id = value.id


    def save(self, *args, **kwargs):
        # Generate a unique business number if not provided
        if not self.business_num:
            self.business_num = self.generate_business_number()
            
        # Handle the case where we're linked to an owner
        owner_id = getattr(self, '_owner_id', None)
        
        # Temporarily store business_type if set via property
        business_type_value = getattr(self, '_business_type_value', None)

        # Perform the actual save operation
        super().save(*args, **kwargs)
        
        # Create or update BusinessDetails with the stored business_type
        if business_type_value:
            from users.models import BusinessDetails
            try:
                details, created = BusinessDetails.objects.get_or_create(
                    business=self,
                    defaults={
                        'business_type': business_type_value,
                        'legal_structure': 'SOLE_PROPRIETORSHIP',
                        'country': 'US'
                    }
                )
                if not created and details.business_type != business_type_value:
                    details.business_type = business_type_value
                    details.save(update_fields=['business_type'])
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error setting business_type: {str(e)}")
        
        # If we have an owner_id, update the UserProfile safely
        if owner_id:
            try:
                from users.models import UserProfile
                # Check if profile exists using ORM
                try:
                    # Get existing profile
                    profile = UserProfile.objects.get(user_id=owner_id)
                    
                    # Update existing profile using ORM
                    now = timezone.now()
                    profile.business = self
                    profile.modified_at = now
                    profile.updated_at = now
                    profile.save(update_fields=['business', 'modified_at', 'updated_at'])
                    
                except UserProfile.DoesNotExist:
                    # Create new profile using ORM
                    now = timezone.now()
                    UserProfile.objects.create(
                        user_id=owner_id,
                        business=self,
                        created_at=now,
                        modified_at=now,
                        updated_at=now
                    )
                
                # Always ensure BusinessDetails exists for this business
                from users.models import BusinessDetails
                BusinessDetails.objects.get_or_create(
                    business=self,
                    defaults={
                        'business_type': 'default',
                        'legal_structure': 'SOLE_PROPRIETORSHIP',
                        'country': 'US'
                    }
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error updating UserProfile: {str(e)}")

    def generate_business_number(self):
        """Generate a unique 6-digit business number"""
        import random
        import string
        while True:
            number = ''.join(random.choices(string.digits, k=6))
            if not Business.objects.filter(business_num=number).exists():
                return number

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'users_business'  # Explicitly set the table name
        indexes = [
            models.Index(fields=['business_num']),
        ]

class BusinessDetails(models.Model):
    """
    BusinessDetails model - extends Business model with additional fields.
    This is a one-to-one extension that stores business type, legal structure,
    and other business-related details.
    
    Note: The business_type field here is the canonical source of the
    business_type value, accessed via a property on the Business model.
    """
    business = models.OneToOneField(Business, on_delete=models.CASCADE, primary_key=True)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES, blank=True, null=True)
    business_subtype_selections = models.JSONField(default=dict, blank=True)
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        default='SOLE_PROPRIETORSHIP'
    )
    date_founded = models.DateField(null=True, blank=True)
    country = CountryField(default='US')
    # Additional fields
    
    class Meta:
        db_table = 'users_business_details'

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
        ('EMPLOYEE', 'Employee')
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
    # Use direct ID field for business relationship to be explicit
    business_id = models.UUIDField(null=True, blank=True)
    # Add property for backward compatibility
    @property
    def business(self):
        if not self.business_id:
            return None
        try:
            return Business.objects.get(id=self.business_id)
        except Business.DoesNotExist:
            return None
    
    @business.setter
    def business(self, business_obj):
        if business_obj is None:
            self.business_id = None
        else:
            self.business_id = business_obj.id
            
    # Use direct ID field for tenant relationship
    tenant_id = models.UUIDField(null=True, blank=True)
    # Add property for backward compatibility
    @property
    def tenant(self):
        if not self.tenant_id:
            return None
        from django.apps import apps
        Tenant = apps.get_model('custom_auth', 'Tenant')
        try:
            return Tenant.objects.get(id=self.tenant_id)
        except Tenant.DoesNotExist:
            return None
    
    @tenant.setter
    def tenant(self, tenant_obj):
        if tenant_obj is None:
            self.tenant_id = None
        else:
            self.tenant_id = tenant_obj.id
    
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
    # Add updated_at field to match database schema
    updated_at = models.DateTimeField(auto_now=True)  # Ensure this field exists
    # Ensure we only have one auto-updating timestamp field to avoid confusion
    # modified_at will be used as the standard field for tracking updates

    is_business_owner = models.BooleanField(default=False)
    shopify_access_token = models.CharField(max_length=255, null=True, blank=True)
    schema_name = models.CharField(max_length=63, null=True, blank=True)
    
    # Add metadata field to store additional information like pending schema setup
    metadata = models.JSONField(default=dict, blank=True, null=True)
    
    # Schema setup tracking fields
    setup_task_id = models.CharField(max_length=255, null=True, blank=True)
    setup_status = models.CharField(max_length=20, default='not_started',
                                  choices=[
                                      ('not_started', 'Not Started'),
                                      ('pending', 'Pending'),
                                      ('in_progress', 'In Progress'),
                                      ('complete', 'Complete'),
                                      ('error', 'Error'),
                                  ])
    setup_started_at = models.DateTimeField(null=True, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True) 
    setup_error = models.TextField(null=True, blank=True)
    
    # Move these fields to the Tenant model as they're tenant-specific
    # Remove:
    # - database_name
    # - database_status
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
            models.Index(fields=['tenant_id']),  # Index for tenant ID queries
            models.Index(fields=['business_id']),  # Index for business ID queries
        ]

    def save(self, *args, **kwargs):
        # If this is a business owner profile, ensure tenant is created
        if self.is_business_owner and not self.tenant_id:
            from custom_auth.models import Tenant  # Import here to avoid circular import
            
            # Normalize user ID to ensure consistent schema naming
            user_id_str = str(self.user.id).replace('-', '_')
            
            # Generate a schema name that is guaranteed to be PostgreSQL compatible
            schema_name = f"tenant_{user_id_str}"
            
            # Ensure schema name length limit is respected (63 chars is PostgreSQL limit)
            if len(schema_name) > 63:
                # If too long, use a portion of the UUID and add a random suffix
                import random
                import string
                truncated_id = user_id_str[:50] # Leave room for prefix and random chars
                random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
                schema_name = f"tenant_{truncated_id}_{random_suffix}"
                schema_name = schema_name[:63]  # Ensure it's exactly at the limit
                
            try:
                # Try to get existing tenant first
                tenant = Tenant.objects.get(owner_id=self.user.id)
                if not tenant.schema_name:
                    tenant.schema_name = schema_name
                    tenant.save(update_fields=['schema_name'])
            except Tenant.DoesNotExist:
                # Create new tenant with properly formatted schema name
                business_name = self.business.name if self.business else f"Business-{self.user.id}"
                tenant = Tenant.objects.create(
                    name=business_name,
                    owner_id=self.user.id,
                    schema_name=schema_name,
                    setup_status='pending'
                )
    
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
                
                logger.info(f"Deferred schema setup for user {self.user.email} - schema: {schema_name}")
            
            # Use tenant_id directly instead of tenant to avoid circular references
            self.tenant_id = tenant.id
            self.schema_name = schema_name
        
        now = timezone.now()
        self.modified_at = now
        self.updated_at = now
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