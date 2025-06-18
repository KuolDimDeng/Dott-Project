"""
Session Models
Handles server-side session storage with Redis caching
"""

import uuid
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from custom_auth.models import Tenant

User = get_user_model()


class UserSession(models.Model):
    """
    Server-side session storage
    Replaces cookie-based session data with secure token-based sessions
    """
    
    # Primary identification
    session_id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4,
        editable=False,
        help_text="Unique session identifier"
    )
    
    # User and tenant relationship
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text="User who owns this session"
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Tenant context for this session"
    )
    
    # Authentication tokens (encrypted in database)
    access_token_hash = models.CharField(
        max_length=255,
        help_text="Hashed access token for security"
    )
    refresh_token_hash = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Hashed refresh token if available"
    )
    
    # Session state
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this session is currently active"
    )
    
    # User state flags
    needs_onboarding = models.BooleanField(
        default=True,
        help_text="Whether user needs to complete onboarding"
    )
    onboarding_completed = models.BooleanField(
        default=False,
        help_text="Whether user has completed onboarding"
    )
    onboarding_step = models.CharField(
        max_length=50,
        default='business_info',
        help_text="Current onboarding step"
    )
    
    # Subscription information
    subscription_plan = models.CharField(
        max_length=50,
        default='free',
        help_text="User's subscription plan"
    )
    subscription_status = models.CharField(
        max_length=50,
        default='active',
        help_text="Subscription status"
    )
    
    # Flexible session data storage
    session_data = models.JSONField(
        default=dict,
        help_text="Additional session data"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When session was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last session update"
    )
    last_activity = models.DateTimeField(
        default=timezone.now,
        help_text="Last user activity"
    )
    expires_at = models.DateTimeField(
        help_text="When session expires"
    )
    
    # Security metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of session creation"
    )
    user_agent = models.TextField(
        null=True,
        blank=True,
        help_text="User agent string"
    )
    
    # Session type
    session_type = models.CharField(
        max_length=20,
        default='web',
        choices=[
            ('web', 'Web Browser'),
            ('mobile', 'Mobile App'),
            ('api', 'API Client'),
        ],
        help_text="Type of session"
    )
    
    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_id', 'expires_at']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['last_activity']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Session {self.session_id} for {self.user.email}"
    
    def save(self, *args, **kwargs):
        """Override save to set expiration if not provided"""
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if session has expired"""
        return timezone.now() > self.expires_at
    
    def extend_session(self, hours=24):
        """Extend session expiration"""
        self.expires_at = timezone.now() + timedelta(hours=hours)
        self.last_activity = timezone.now()
        self.save(update_fields=['expires_at', 'last_activity'])
    
    def invalidate(self):
        """Invalidate this session"""
        self.is_active = False
        self.expires_at = timezone.now()
        self.save(update_fields=['is_active', 'expires_at'])
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
    
    def get_data(self, key, default=None):
        """Get value from session data"""
        return self.session_data.get(key, default)
    
    def set_data(self, key, value):
        """Set value in session data"""
        self.session_data[key] = value
        self.save(update_fields=['session_data', 'updated_at'])
    
    def update_data(self, data_dict):
        """Update multiple session data values"""
        self.session_data.update(data_dict)
        self.save(update_fields=['session_data', 'updated_at'])


class SessionEvent(models.Model):
    """
    Track session events for security and debugging
    """
    
    EVENT_TYPES = [
        ('created', 'Session Created'),
        ('extended', 'Session Extended'),
        ('invalidated', 'Session Invalidated'),
        ('expired', 'Session Expired'),
        ('updated', 'Session Updated'),
        ('suspicious', 'Suspicious Activity'),
    ]
    
    session = models.ForeignKey(
        UserSession,
        on_delete=models.CASCADE,
        related_name='events'
    )
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPES
    )
    event_data = models.JSONField(
        default=dict,
        help_text="Additional event data"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'session_events'
        indexes = [
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} - {self.session.session_id}"

# Import security models to ensure they are discovered by migrations
from .security_models import DeviceFingerprint, SessionSecurity, DeviceTrust
