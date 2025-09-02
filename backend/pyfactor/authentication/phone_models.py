"""
Phone Authentication Models for Dott
Supports WhatsApp and SMS OTP verification for African markets
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import RegexValidator
import random
import string
import uuid
from datetime import timedelta

User = get_user_model()

class PhoneOTP(models.Model):
    """
    Model to store OTP codes for phone verification
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+\d{10,15}$',
                message='Phone number must be in format: +254712345678'
            )
        ]
    )
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    sent_via = models.CharField(
        max_length=20,
        choices=[
            ('whatsapp', 'WhatsApp'),
            ('sms', 'SMS'),
            ('call', 'Voice Call')
        ],
        default='whatsapp'
    )
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'phone_otp'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', '-created_at']),
            models.Index(fields=['otp_code', 'phone_number']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.otp_code:
            self.otp_code = self.generate_otp()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    def is_valid(self):
        """Check if OTP is still valid"""
        return (
            not self.is_verified and 
            self.attempts < 3 and 
            timezone.now() < self.expires_at
        )
    
    def verify(self, otp_code):
        """Verify the OTP code"""
        self.attempts += 1
        self.save()
        
        if self.otp_code == otp_code and self.is_valid():
            self.is_verified = True
            self.verified_at = timezone.now()
            self.save()
            return True
        return False


class PhoneAuthSession(models.Model):
    """
    Session management for phone-authenticated users
    Stores biometric tokens and device information
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='phone_sessions')
    phone_number = models.CharField(max_length=20)
    device_id = models.CharField(max_length=255)  # Unique device identifier
    device_name = models.CharField(max_length=255, blank=True)  # e.g., "iPhone 15 Pro"
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('ios', 'iOS'),
            ('android', 'Android'),
            ('web', 'Web')
        ]
    )
    
    # Biometric authentication
    biometric_enabled = models.BooleanField(default=False)
    biometric_token = models.TextField(blank=True)  # Encrypted token for biometric auth
    
    # Session management
    refresh_token = models.TextField()
    access_token = models.TextField()
    is_active = models.BooleanField(default=True)
    
    # Security
    last_location = models.CharField(max_length=255, blank=True)
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'phone_auth_sessions'
        ordering = ['-last_used']
        indexes = [
            models.Index(fields=['user', '-last_used']),
            models.Index(fields=['device_id', 'is_active']),
            models.Index(fields=['phone_number', 'is_active']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if session is still valid"""
        return self.is_active and timezone.now() < self.expires_at
    
    def refresh(self):
        """Refresh the session"""
        self.last_used = timezone.now()
        self.expires_at = timezone.now() + timedelta(days=30)
        self.save()


class LinkedAccount(models.Model):
    """
    Links phone numbers to email accounts
    Allows users to use both authentication methods
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='linked_account')
    
    # Primary identifiers
    phone_number = models.CharField(
        max_length=20, 
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^\+\d{10,15}$',
                message='Phone number must be in format: +254712345678'
            )
        ]
    )
    email = models.EmailField(null=True, blank=True)
    
    # Verification status
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    
    # Preferences
    primary_auth_method = models.CharField(
        max_length=20,
        choices=[
            ('phone', 'Phone Number'),
            ('email', 'Email'),
            ('both', 'Both')
        ],
        default='phone'
    )
    
    # WhatsApp specific
    whatsapp_opted_in = models.BooleanField(default=True)
    whatsapp_business_account = models.BooleanField(default=False)
    
    # Metadata
    country_code = models.CharField(max_length=5, default='+254')  # Default to Kenya
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'linked_accounts'
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} - {self.email or 'No email'}"


class TrustedDevice(models.Model):
    """
    Manage trusted devices for skip OTP on known devices
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_trusted_devices')
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=20)
    trust_token = models.TextField()  # Encrypted token
    
    # Trust management
    is_trusted = models.BooleanField(default=True)
    trusted_until = models.DateTimeField()
    
    # Security
    added_from_ip = models.GenericIPAddressField()
    added_from_location = models.CharField(max_length=255, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_verified = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trusted_devices'
        unique_together = ['user', 'device_id']
        ordering = ['-last_verified']
    
    def save(self, *args, **kwargs):
        if not self.trusted_until:
            self.trusted_until = timezone.now() + timedelta(days=90)
        super().save(*args, **kwargs)
    
    def is_still_trusted(self):
        """Check if device is still trusted"""
        return self.is_trusted and timezone.now() < self.trusted_until