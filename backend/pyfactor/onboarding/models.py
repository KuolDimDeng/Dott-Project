import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from business.models import Business, BUSINESS_TYPES

User = get_user_model()

class OnboardingProgress(models.Model):
    ONBOARDING_STATUS_CHOICES = [
        ('step1', 'Step 1'),
        ('step2', 'Step 2'), 
        ('step3', 'Step 3'),
        ('step4', 'Step 4'),
        ('complete', 'Complete'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    email = models.EmailField(unique=True)
    
    # Personal Information
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    
    # Business Information 
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=100, choices=BUSINESS_TYPES, blank=True)
    country = models.CharField(max_length=100, blank=True)
    legal_structure = models.CharField(
        max_length=50,
        choices=[
            ('SOLE_PROPRIETORSHIP', 'Sole Proprietorship'),
            ('GENERAL_PARTNERSHIP', 'General Partnership (GP)'),
            ('LIMITED_PARTNERSHIP', 'Limited Partnership (LP)'),
            ('LLC', 'Limited Liability Company (LLC)'),
            ('CORPORATION', 'Corporation (Inc., Corp.)'),
            ('NON_PROFIT', 'Non-Profit Organization (NPO)'),
            ('JOINT_VENTURE', 'Joint Venture (JV)'),
            ('HOLDING_COMPANY', 'Holding Company'),
            ('BRANCH_OFFICE', 'Branch Office'),
            ('REPRESENTATIVE_OFFICE', 'Representative Office'),
        ],
        blank=True
    )
    date_founded = models.DateField(null=True, blank=True)
    
    # Subscription Information
    subscription_type = models.CharField(max_length=50, blank=True)
    billing_cycle = models.CharField(
        max_length=20, 
        choices=[('monthly', 'Monthly'), ('annual', 'Annual')],
        blank=True
    )
    payment_completed = models.BooleanField(default=False)
    
    # Progress Tracking
    current_step = models.IntegerField(default=1)
    onboarding_status = models.CharField(
        max_length=20, 
        choices=ONBOARDING_STATUS_CHOICES, 
        default='step1'
    )
    
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

    def __str__(self):
        return f"Onboarding progress for {self.email}"

    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=24)

    def is_access_token_expired(self):
        return self.access_token_expiration and timezone.now() > self.access_token_expiration

    def is_refresh_token_expired(self):
        return self.refresh_token_expiration and timezone.now() > self.refresh_token_expiration