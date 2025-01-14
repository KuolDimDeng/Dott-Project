import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from business.models import Business, BUSINESS_TYPES
from business.choices import BUSINESS_TYPES, LEGAL_STRUCTURE_CHOICES
from django.core.validators import EmailValidator
from django.contrib.postgres.fields import ArrayField


User = get_user_model()

class OnboardingProgress(models.Model):
    ONBOARDING_STATUS_CHOICES = [
        ('step1', 'Step 1'),
        ('step2', 'Step 2'), 
        ('step3', 'Step 3'),
        ('step4', 'Step 4'),
        ('complete', 'Complete'),
    ]

    DATABASE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('creating', 'Creating'),
        ('active', 'Active'),
        ('error', 'Error'),
        ('deleted', 'Deleted')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.CASCADE,
            related_name='onboarding_progress'
        )    
    
    email = models.EmailField(unique=True)
        
    # Personal Information
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    
    # Business Information 
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=100, choices=BUSINESS_TYPES, blank=True)
    business = models.OneToOneField(
        'business.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding'
    )
    country = models.CharField(max_length=100, blank=True)
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        blank=True
    )
    date_founded = models.DateField(null=True, blank=True)
    
    # Subscription Information
    selectedPlan = models.CharField(  # Change from subscription_type
        max_length=50,
        choices=[('free', 'Free'), ('professional', 'Professional')],
        blank=True
    )
    billing_cycle = models.CharField(
        max_length=20, 
        choices=[('monthly', 'Monthly'), ('annual', 'Annual')],
        blank=True
    )
    payment_completed = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_verified = models.BooleanField(default=False)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    last_payment_attempt = models.DateTimeField(null=True)
    last_setup_attempt = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    task_status = models.CharField(max_length=50, null=True, blank=True)
    completed_steps = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )

    
    # Progress Tracking
    current_step = models.IntegerField(default=1)
    onboarding_status = models.CharField(
        max_length=20, 
        choices=ONBOARDING_STATUS_CHOICES, 
        default='step1'
    )

    # Database Setup Tracking
    database_setup_task_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Celery task ID for database setup"
    )
    database_status = models.CharField(
        max_length=50,
        choices=DATABASE_STATUS_CHOICES,
        default='pending'
    )
    database_name = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    setup_progress = models.IntegerField(default=0)  # Add this field

    setup_started_at = models.DateTimeField(
        null=True,
        blank=True
    )
    setup_completed_at = models.DateTimeField(
        null=True,
        blank=True
    )
    setup_error = models.TextField(
        null=True,
        blank=True
    )
    setup_retries = models.IntegerField(
        default=0
    )

    setup_status = models.CharField(max_length=50, default='pending')
    is_complete = models.BooleanField(default=False)


    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # NextAuth Session Management
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    access_token_expiration = models.DateTimeField(null=True, blank=True)
    refresh_token_expiration = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_onboarding_progress')
        ]
        indexes = [
            models.Index(fields=['database_setup_task_id']),
            models.Index(fields=['email']),
            models.Index(fields=['user']),
            models.Index(fields=['onboarding_status']),
            models.Index(fields=['database_status']),
            models.Index(fields=['created_at']),
        ]
        select_on_save = True
        db_table = 'onboarding_progress'


    def __str__(self):
        return f"Onboarding progress for {self.email}"

    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=24)

    def is_access_token_expired(self):
        return self.access_token_expiration and timezone.now() > self.access_token_expiration

    def is_refresh_token_expired(self):
        return self.refresh_token_expiration and timezone.now() > self.refresh_token_expiration

    def start_database_setup(self, task_id):
        """Mark database setup as started"""
        self.database_setup_task_id = task_id
        self.database_status = 'creating'
        self.setup_started_at = timezone.now()
        self.setup_retries += 1
        self.save(update_fields=[
            'database_setup_task_id',
            'database_status',
            'setup_started_at',
            'setup_retries'
        ])

    def complete_database_setup(self, database_name):
        """Mark database setup as completed"""
        self.database_status = 'active'
        self.database_name = database_name
        self.setup_completed_at = timezone.now()
        self.save(update_fields=[
            'database_status',
            'database_name',
            'setup_completed_at'
        ])

    def fail_database_setup(self, error):
        """Mark database setup as failed"""
        self.database_status = 'error'
        self.setup_error = str(error)
        self.save(update_fields=[
            'database_status',
            'setup_error'
        ])