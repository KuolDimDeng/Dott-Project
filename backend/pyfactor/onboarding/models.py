#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator, MaxLengthValidator
from users.models import Business
from django.conf import settings
from django.utils import timezone
import uuid

User = get_user_model()

class OnboardingProgress(models.Model):
    """Track user onboarding progress and status"""

    # Primary key
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)

    # Tenant relationship for RLS
    tenant_id = models.UUIDField(null=False, blank=False, db_index=True)

    # Session tracking
    session_id = models.UUIDField(null=True, blank=True)
    last_session_activity = models.DateTimeField(null=True, blank=True)

    # Onboarding status choices matching Cognito custom:onboarding attribute
    ONBOARDING_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('business_info', 'Business Info'),
        ('subscription', 'Subscription'),
        ('payment', 'Payment'),
        ('setup', 'Setup'),
        ('complete', 'Complete')
    ]

    # Account status choices matching Cognito custom:acctstatus attribute (6-9 chars)
    ACCOUNT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active')
    ]

    # User role choices matching Cognito custom:userrole attribute (4-6 chars)
    USER_ROLE_CHOICES = [
        ('owner', 'owner'),
        ('admin', 'Admin'),
        ('employee', 'employee')    
    ]

    # Plan choices matching Cognito custom:subplan attribute (4-12 chars)
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('professional', 'Professional')
    ]

    # Core relationships
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='onboarding_progress'
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding_progresses'
    )

    # Status fields matching Cognito attributes
    onboarding_status = models.CharField(
        max_length=50,
        choices=ONBOARDING_STATUS_CHOICES,
        default='business_info'
    )
    account_status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='pending',
        validators=[MinLengthValidator(6)]  # Matches Cognito constraint
    )
    user_role = models.CharField(
        max_length=20,
        choices=USER_ROLE_CHOICES,
        default='owner',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )
    subscription_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default='free',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )

    # Progress tracking
    current_step = models.CharField(
        max_length=50,
        choices=ONBOARDING_STATUS_CHOICES,
        default='business_info'
    )
    next_step = models.CharField(
        max_length=50,
        choices=ONBOARDING_STATUS_CHOICES,
        default='subscription'
    )
    completed_steps = models.JSONField(default=list)
    last_active_step = models.CharField(
        max_length=256,
        null=True,
        blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    access_token_expiration = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    database_setup_task_id = models.CharField(max_length=255, null=True, blank=True)

    # Subscription and plan data
    selected_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        default='free',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )
    subscription_status = models.CharField(max_length=20, null=True, blank=True)
    billing_cycle = models.CharField(max_length=20, null=True, blank=True, default='monthly')

    # Payment tracking
    payment_completed = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    payment_id = models.CharField(max_length=100, null=True, blank=True)
    payment_timestamp = models.DateTimeField(null=True, blank=True)

    # RLS setup tracking
    rls_setup_completed = models.BooleanField(default=False)
    rls_setup_timestamp = models.DateTimeField(null=True, blank=True)

    # Setup status tracking  
    setup_completed = models.BooleanField(default=False)
    setup_timestamp = models.DateTimeField(null=True, blank=True)
    setup_error = models.TextField(null=True, blank=True)

    # Schema information (for existing schemas during migration to RLS)
    schema_name = models.CharField(max_length=63, null=True, blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, null=True, blank=True)

    # Version tracking
    attribute_version = models.CharField(
        max_length=10,
        default='1.0.0'
    )

    # Preferences (2-2048 chars in Cognito)
    preferences = models.JSONField(
        default=dict,
        help_text='User preferences stored as JSON',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Onboarding Progress'
        verbose_name_plural = 'Onboarding Progress Records'
        ordering = ['-updated_at']
        # Add RLS indices for better performance
        indexes = [
            models.Index(fields=['tenant_id'], name='onboard_tenant_idx'),
            models.Index(fields=['session_id'], name='onboard_session_idx'),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.onboarding_status}"
        
    def save(self, *args, **kwargs):
        """
        Override save to ensure tenant_id is set and update session activity
        """
        # FIXED: Set tenant_id from the user's tenant, not user.id directly
        # tenant_id should be UUID, but user.id is integer (BigAutoField)
        if not self.tenant_id and hasattr(self.user, 'id'):
            # Try to get the tenant for this user
            from custom_auth.models import Tenant
            try:
                # First try to find tenant where user is owner
                tenant = Tenant.objects.filter(owner_id=self.user.id).first()
                if tenant:
                    self.tenant_id = tenant.id
                else:
                    # If no tenant found, we'll let the calling code handle tenant creation
                    # Don't set tenant_id to user.id as this causes type mismatch
                    pass
            except Exception as e:
                # If tenant lookup fails, don't set tenant_id incorrectly
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not determine tenant_id for user {self.user.id}: {str(e)}")
            
        # Update session activity timestamp if session_id is set
        if self.session_id:
            self.last_session_activity = timezone.now()
            
        super().save(*args, **kwargs)
        
    def mark_step_complete(self, step):
        """
        Mark a step as complete and update progress
        """
        completed = self.completed_steps or []
        if step not in completed:
            completed.append(step)
            self.completed_steps = completed
            self.last_active_step = step
            
            # Update onboarding status and current step
            self.onboarding_status = step
            self.current_step = step
            
            # Determine next step
            step_transitions = {
                'business_info': 'subscription',
                'business-info': 'subscription',  # Keep for backward compatibility
                'subscription': 'payment',
                'payment': 'setup',
                'setup': 'complete',
                'complete': 'complete'
            }
            self.next_step = step_transitions.get(step, 'business-info')
            
            # For 'complete' step, set completed timestamp
            if step == 'complete':
                self.completed_at = timezone.now()
                
            self.save()
            
    def record_session_activity(self, session_id):
        """
        Record session activity and update timestamp
        """
        self.session_id = session_id
        self.last_session_activity = timezone.now()
        self.save(update_fields=['session_id', 'last_session_activity'])
            
    @property
    def progress_percentage(self):
        """
        Calculate progress percentage based on completed steps
        """
        step_values = {
            'business-info': 25,
            'subscription': 50, 
            'payment': 75,
            'setup': 90,
            'complete': 100
        }
        
        return step_values.get(self.onboarding_status, 0)

    def validate_attribute_lengths(self):
        """Validate attribute lengths match Cognito constraints"""
        if len(str(self.account_status)) < 6 or len(str(self.account_status)) > 9:
            raise ValueError('Account status must be between 6 and 9 characters')
        
        if len(str(self.user_role)) < 4 or len(str(self.user_role)) > 6:
            raise ValueError('User role must be between 4 and 6 characters')
        
        if len(str(self.subscription_plan)) < 4 or len(str(self.subscription_plan)) > 12:
            raise ValueError('Subscription plan must be between 4 and 12 characters')

        if len(str(self.onboarding_status)) > 256:
            raise ValueError('Onboarding status cannot exceed 256 characters')

        prefs_str = str(self.preferences)
        if len(prefs_str) < 2 or len(prefs_str) > 2048:
            raise ValueError('Preferences must be between 2 and 2048 characters')

    def clean(self):
        """Validate model data"""
        super().clean()
        self.validate_attribute_lengths()
        

class UserProfile(models.Model):
    """User profile for onboarding and setup tracking"""
    user_id = models.UUIDField(primary_key=True)
    setup_status = models.CharField(max_length=20, default='not_started')
    setup_error = models.TextField(null=True, blank=True)
    setup_started_at = models.DateTimeField(null=True, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True)
    schema_name = models.CharField(max_length=63, null=True, blank=True)
    
    class Meta:
        db_table = 'onboarding_userprofile'
