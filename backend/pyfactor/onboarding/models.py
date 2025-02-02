import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from business.models import Business, BUSINESS_TYPES
from business.choices import BUSINESS_TYPES, LEGAL_STRUCTURE_CHOICES
from django.core.validators import EmailValidator, MinValueValidator
from django.contrib.postgres.fields import ArrayField


User = get_user_model()

class OnboardingProgress(models.Model):
    ONBOARDING_STATUS_CHOICES = [
        ('business-info', 'Business Information'),
        ('subscription', 'Subscription Selection'),
        ('payment', 'Payment'),
        ('setup', 'Database Setup'),
        ('complete', 'Complete'),
    ]

    SUBSCRIPTION_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('complete', 'Complete')
    ]

    DATABASE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('creating', 'Creating'),
        ('active', 'Active'),
        ('error', 'Error'),
        ('deleted', 'Deleted')
    ]
        
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('professional', 'Professional')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User Information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='onboarding_user',
        help_text="The user associated with this onboarding process"
    )

    business = models.OneToOneField(
        'business.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding_business',
        help_text="Reference to the user's business information"
    )

    subscription = models.OneToOneField(
        'business.Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding_subscription',
        help_text="Reference to the subscription during onboarding"
    )

    selected_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,  # Change this from ONBOARDING_STATUS_CHOICES to PLAN_CHOICES
        default='free',
        help_text="Selected subscription plan"
    )

    # Progress Tracking
    current_step = models.CharField(
        max_length=20,
        choices=ONBOARDING_STATUS_CHOICES,
        default='business-info'
    )
    next_step = models.CharField(
        max_length=20, 
        choices=ONBOARDING_STATUS_CHOICES,
        default='subscription',
        null=True,
        blank=True
    )
    onboarding_status = models.CharField(
        max_length=20,
        choices=ONBOARDING_STATUS_CHOICES,
        default='business-info',
        help_text="Indicates the current stage of the onboarding process."
    )

    subscription_status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='not_started',
        help_text="Status of the user's subscription process"
    )


    # Database-specific status
    database_provisioning_status = models.CharField(
        max_length=50,
        choices=DATABASE_STATUS_CHOICES,
        default='not_started',
        help_text="Status of the physical database provisioning process"
    )

    technical_setup_status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('configuring', 'Configuring'),
            ('data_setup', 'Initial Data Setup'),
            ('completed', 'Completed'),
            ('failed', 'Failed')
        ],
        default='pending',
        help_text="Status of the overall technical setup including configuration and initial data"
    )

    # Payment Information
    payment_completed = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_verified = models.BooleanField(default=False)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    last_payment_attempt = models.DateTimeField(null=True, blank=True)

    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=50, null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Database Setup Tracking
    database_setup_task_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Celery task ID for database setup"
    )
    database_name = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    setup_progress = models.IntegerField(default=0)
    setup_started_at = models.DateTimeField(null=True, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True)
    setup_error = models.TextField(null=True, blank=True)
    setup_retries = models.IntegerField(default=0)

    # Session Management
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    access_token_expiration = models.DateTimeField(null=True, blank=True)
    refresh_token_expiration = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def full_name(self):
        """Returns the user's full name."""
        return f"{self.user.first_name} {self.user.last_name}".strip()

    @property
    def is_complete(self):
        return self.onboarding_status == 'complete'

    def is_database_ready(self):
        return self.database_provisioning_status == 'active'

    def is_setup_complete(self):
        return self.technical_setup_status == 'completed'

    @property
    def needs_payment(self):
        return (
            self.subscription and
            hasattr(self.subscription, 'selected_plan') and
            self.subscription.selected_plan == 'professional' and
            not self.payment_completed
        )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                name='unique_user_onboarding_progress'
            )
        ]
        indexes = [
            models.Index(fields=['onboarding_status']),
            models.Index(fields=['database_provisioning_status']),
            models.Index(fields=['technical_setup_status']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]
        db_table = 'onboarding_progress'

    def __str__(self):
        return f"Onboarding progress for {self.user.email} - {self.onboarding_status}"
