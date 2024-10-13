# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/models.py

import uuid

from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone



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
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    business_name = models.CharField(max_length=255, blank=True)
    business_type = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    legal_structure = models.CharField(max_length=100, blank=True)
    date_founded = models.DateField(null=True, blank=True)
    subscription_type = models.CharField(max_length=50, blank=True)
    current_step = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    onboarding_status = models.CharField(max_length=20, choices=ONBOARDING_STATUS_CHOICES, default='step1')

    
   # New fields for NextAuth session management
    #NEXTAUTH configuration fields
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



   