#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator, MaxLengthValidator
from users.models import Business

User = get_user_model()

import uuid

class OnboardingProgress(models.Model):
    """Track user onboarding progress and status"""

    # Primary key
    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)

    # Onboarding status choices matching Cognito custom:onboarding attribute
    ONBOARDING_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('business-info', 'Business Info'),
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
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('employee', 'Employee')    
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
    # Temporarily replace ForeignKey with UUIDField to break circular dependency
    # business = models.ForeignKey(
    #     Business,
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='onboarding_records'
    # )
    business_id = models.UUIDField(null=True, blank=True)  # Store the UUID of the business

    # Status fields matching Cognito attributes
    onboarding_status = models.CharField(
        max_length=256,  # Matches Cognito constraint
        choices=ONBOARDING_STATUS_CHOICES,
        default='notstarted'
    )
    account_status = models.CharField(
        max_length=9,  # Matches Cognito constraint
        choices=ACCOUNT_STATUS_CHOICES,
        default='pending',
        validators=[MinLengthValidator(6)]  # Matches Cognito constraint
    )
    user_role = models.CharField(
        max_length=10,  # Matches Cognito constraint
        choices=USER_ROLE_CHOICES,
        default='owner',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )
    subscription_plan = models.CharField(
        max_length=12,  # Matches Cognito constraint
        choices=PLAN_CHOICES,
        default='free',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )

    # Progress tracking
    current_step = models.CharField(
        max_length=256,
        choices=ONBOARDING_STATUS_CHOICES,
        default='notstarted'
    )
    next_step = models.CharField(
        max_length=256,
        choices=ONBOARDING_STATUS_CHOICES,
        null=True,
        blank=True
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


    # Version tracking
    attribute_version = models.CharField(
        max_length=10,
        default='1.0.0'
    )

    # Preferences (2-2048 chars in Cognito)
    preferences = models.JSONField(
        default=dict,
        help_text='User preferences stored as JSON'
    )

    # Error tracking
    setup_error = models.TextField(
        null=True,
        blank=True,
        help_text='Last setup error message'
    )

    # Plan selection
    selected_plan = models.CharField(
        max_length=12,  # Matches Cognito constraint
        choices=PLAN_CHOICES,
        default='free',
        validators=[MinLengthValidator(4)]  # Matches Cognito constraint
    )

    class Meta:
        verbose_name = 'Onboarding Progress'
        verbose_name_plural = 'Onboarding Progress Records'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.onboarding_status}"

    def save(self, force_insert=False, *args, **kwargs):
        # Ensure preferences JSON string meets Cognito constraints
        if self.preferences:
            prefs_str = str(self.preferences)
            if len(prefs_str) < 2 or len(prefs_str) > 2048:
                raise ValueError('Preferences must be between 2 and 2048 characters')

        # Validate state transitions only for updates, not for new records
        if not force_insert and self.pk:
            try:
                old_instance = OnboardingProgress.objects.get(pk=self.pk)
                valid_transitions = {
                    'not_started': ['business-info', 'setup'],
                    'business-info': ['subscription', 'setup', 'complete'],  # Allow direct transition to setup or complete
                    'subscription': ['payment', 'setup', 'complete'],  # Allow direct transition to setup or complete
                    'payment': ['setup', 'complete'],  # Allow direct transition to complete
                    'setup': ['complete', 'business-info', 'subscription'],  # Allow going back to previous steps
                    'complete': ['business-info', 'subscription', 'setup']  # Allow updating after completion or restarting setup
                }

                if (self.onboarding_status != old_instance.onboarding_status and
                    self.onboarding_status not in valid_transitions.get(old_instance.onboarding_status, [])):
                    raise ValueError(
                        f'Invalid state transition from {old_instance.onboarding_status} '
                        f'to {self.onboarding_status}'
                    )
            except OnboardingProgress.DoesNotExist:
                pass  # Skip validation for new records

        super().save(force_insert=force_insert, *args, **kwargs)

    def get_next_step(self):
        """Determine the next step based on current status"""
        step_sequence = {
            'notstarted': 'business-info',
            'business-info': 'subscription',
            'subscription': 'payment',  # Default path, but can go to complete for free plan
            'payment': 'setup',  # Default path, but can go to complete
            'setup': 'complete',
            'complete': None
        }
        
        # Special case for free plan - go directly to complete
        if self.onboarding_status == 'subscription' and self.selected_plan == 'free':
            return 'complete'
            
        return step_sequence.get(self.onboarding_status)

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
