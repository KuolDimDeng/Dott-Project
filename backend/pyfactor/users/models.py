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
            related_name='user_profiles',  # Changed from 'employees'
            null=True,  
            blank=True  
        )   
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
    database_name = models.CharField(max_length=100, blank=True, null=True)
    database_status = models.CharField(
        max_length=50,
        default='not_created',  
        choices=[
            ('not_created', 'Not Created'),
            ('pending', 'Pending'),
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('error', 'Error')
        ]
    )
    setup_status = models.CharField(
        max_length=20,
        choices=[
            ('not_started', 'Not Started'),
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('complete', 'Complete'),
            ('error', 'Error'),
        ],
        default='not_started'
    )
    last_setup_attempt = models.DateTimeField(null=True, blank=True)
    setup_error_message = models.TextField(null=True, blank=True)
    database_setup_task_id = models.CharField(max_length=255, null=True, blank=True)
    last_health_check = models.DateTimeField(null=True, blank=True)



    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_profile'),
            models.UniqueConstraint(
                fields=['database_name'],
                name='unique_database_name',
                condition=models.Q(database_name__isnull=False)
            )
        ]
        indexes = [
            models.Index(fields=['database_name']),
            models.Index(fields=['setup_status']),
            models.Index(fields=['database_status']),
        ]

    def to_dict(self):
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': self.business.business_name if self.business_id is not None else None,
            'database_name': self.database_name,
            'database_status': self.database_status,
            'setup_status': self.setup_status,
            'is_business_owner': self.is_business_owner,
            'country': str(self.country),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_setup_attempt': self.last_setup_attempt.isoformat() if self.last_setup_attempt else None,
        }

    def save(self, *args, **kwargs):
        """Simple save with timestamp update"""
        self.modified_at = timezone.now()
        super().save(*args, **kwargs)

    def update_setup_status(self, status, error_message=None):
        """Update setup status with proper error handling"""
        try:
            self.setup_status = status
            self.last_setup_attempt = timezone.now()
            if error_message:
                self.setup_error_message = error_message
            self.save(update_fields=[
                'setup_status', 
                'last_setup_attempt',
                'setup_error_message'
            ])
        except Exception as e:
            logger.error(f"Error updating setup status: {str(e)}")
            raise

    def __str__(self):
        return f"Profile for {self.user.email} (ID: {self.id})"