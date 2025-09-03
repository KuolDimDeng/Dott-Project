"""
Phone Authentication Models
Handles OTP generation and verification for phone-based authentication
"""

from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
import random
import string
from datetime import timedelta


class PhoneOTP(models.Model):
    """
    Model to store OTP codes for phone number verification.
    OTPs expire after 10 minutes and are single-use.
    """
    phone_number = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+[1-9]\d{1,14}$',
                message='Phone number must be in format: "+999999999". Up to 15 digits allowed.'
            )
        ],
        db_index=True
    )
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)
    
    # Track device information for security
    device_id = models.CharField(max_length=255, null=True, blank=True)
    device_name = models.CharField(max_length=255, null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Track SMS delivery status
    sent_via = models.CharField(
        max_length=20,
        choices=[
            ('sms', 'SMS'),
            ('whatsapp', 'WhatsApp'),
            ('voice', 'Voice Call')
        ],
        default='sms'
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed')
        ],
        default='pending'
    )
    sms_provider = models.CharField(
        max_length=20,
        choices=[
            ('twilio', 'Twilio'),
            ('aws_sns', 'AWS SNS'),
            ('africastalking', 'Africa\'s Talking')
        ],
        null=True,
        blank=True
    )
    provider_message_id = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'phone_otp'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'created_at']),
            models.Index(fields=['phone_number', 'verified', 'expires_at']),
        ]
        verbose_name = 'Phone OTP'
        verbose_name_plural = 'Phone OTPs'
    
    def __str__(self):
        return f"OTP for {self.phone_number} - {'Verified' if self.verified else 'Pending'}"
    
    def save(self, *args, **kwargs):
        if not self.otp_code:
            self.otp_code = self.generate_otp()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_otp(length=6):
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=length))
    
    @property
    def is_expired(self):
        """Check if OTP has expired"""
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Check if OTP is valid (not expired, not verified, and attempts < 3)"""
        return not self.is_expired and not self.verified and self.attempts < 3
    
    def verify(self, otp_code):
        """Verify the OTP code"""
        self.attempts += 1
        self.save()
        
        if not self.is_valid:
            return False, "OTP is invalid or expired"
        
        if self.otp_code != otp_code:
            if self.attempts >= 3:
                return False, "Too many failed attempts. Please request a new OTP."
            return False, f"Invalid OTP. {3 - self.attempts} attempts remaining."
        
        self.verified = True
        self.verified_at = timezone.now()
        self.save()
        return True, "OTP verified successfully"
    
    @classmethod
    def cleanup_expired(cls):
        """Delete expired and unverified OTPs older than 1 hour"""
        cutoff_time = timezone.now() - timedelta(hours=1)
        cls.objects.filter(
            created_at__lt=cutoff_time,
            verified=False
        ).delete()
    
    @classmethod
    def get_latest_valid_otp(cls, phone_number):
        """Get the latest valid OTP for a phone number"""
        return cls.objects.filter(
            phone_number=phone_number,
            verified=False,
            expires_at__gt=timezone.now(),
            attempts__lt=3
        ).order_by('-created_at').first()