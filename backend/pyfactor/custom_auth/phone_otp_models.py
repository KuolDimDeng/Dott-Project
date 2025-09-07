from django.db import models
import uuid
from django.utils import timezone
import secrets
import string
from datetime import timedelta

class PhoneOTP(models.Model):
    """
    Model for storing phone OTP verification codes.
    Supports both login and registration flows.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, db_index=True, help_text='Phone number in E.164 format (+1234567890)')
    otp_code = models.CharField(max_length=6, help_text='6-digit verification code')
    purpose = models.CharField(
        max_length=20,
        choices=[
            ('login', 'Login/Registration'),
            ('verification', 'Phone Verification'),
            ('password_reset', 'Password Reset')
        ],
        default='login',
        help_text='Purpose of the OTP'
    )
    
    # Expiration and security
    expires_at = models.DateTimeField(help_text='When the OTP expires')
    used = models.BooleanField(default=False, help_text='Whether OTP has been used')
    attempts = models.IntegerField(default=0, help_text='Number of verification attempts')
    max_attempts = models.IntegerField(default=3, help_text='Maximum allowed attempts')
    
    # Tracking
    created_at = models.DateTimeField(default=timezone.now)
    used_at = models.DateTimeField(null=True, blank=True)
    
    # SMS delivery tracking
    message_sid = models.CharField(max_length=100, null=True, blank=True, help_text='SMS service message ID')
    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed'),
            ('undelivered', 'Undelivered')
        ],
        default='pending',
        help_text='SMS delivery status'
    )
    
    # Rate limiting fields
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text='IP address of requester')
    user_agent = models.TextField(null=True, blank=True, help_text='User agent string')
    
    class Meta:
        db_table = 'custom_auth_phoneotp'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'created_at']),
            models.Index(fields=['otp_code', 'expires_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"OTP for {self.phone_number} (expires {self.expires_at})"
    
    def is_valid(self):
        """Check if OTP is still valid"""
        return (
            not self.used and 
            self.expires_at > timezone.now() and 
            self.attempts < self.max_attempts
        )
    
    def increment_attempts(self):
        """Increment attempt counter"""
        self.attempts += 1
        self.save(update_fields=['attempts'])
    
    def mark_as_used(self):
        """Mark OTP as used"""
        self.used = True
        self.used_at = timezone.now()
        self.save(update_fields=['used', 'used_at'])
    
    @classmethod
    def generate_otp_code(cls):
        """Generate a secure 6-digit OTP code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    @classmethod
    def create_otp(cls, phone_number, purpose='login', expires_in_minutes=10, ip_address=None, user_agent=None):
        """
        Create a new OTP for the given phone number.
        Invalidates any existing unused OTPs for the same phone/purpose.
        """
        
        # Invalidate existing unused OTPs for this phone and purpose
        cls.objects.filter(
            phone_number=phone_number,
            purpose=purpose,
            used=False,
            expires_at__gt=timezone.now()
        ).update(used=True, used_at=timezone.now())
        
        # Generate new OTP
        otp_code = cls.generate_otp_code()
        expires_at = timezone.now() + timedelta(minutes=expires_in_minutes)
        
        return cls.objects.create(
            phone_number=phone_number,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @classmethod
    def verify_otp(cls, phone_number, otp_code, purpose='login'):
        """
        Verify an OTP code for the given phone number.
        Returns (success, message, otp_instance)
        """
        try:
            otp = cls.objects.get(
                phone_number=phone_number,
                otp_code=otp_code,
                purpose=purpose,
                used=False
            )
        except cls.DoesNotExist:
            return False, "Invalid verification code", None
        
        # Check if expired
        if otp.expires_at <= timezone.now():
            return False, "Verification code has expired", otp
        
        # Check attempts
        if otp.attempts >= otp.max_attempts:
            return False, "Too many attempts. Please request a new code", otp
        
        # OTP is valid
        otp.mark_as_used()
        return True, "Verification successful", otp
    
    @classmethod
    def cleanup_expired(cls):
        """Clean up expired OTPs (for use in periodic tasks)"""
        expired_count = cls.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]
        return expired_count


class PhoneVerificationAttempt(models.Model):
    """
    Track phone verification attempts for rate limiting and abuse prevention.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    attempt_type = models.CharField(
        max_length=20,
        choices=[
            ('send_otp', 'Send OTP'),
            ('verify_otp', 'Verify OTP')
        ],
        help_text='Type of verification attempt'
    )
    
    success = models.BooleanField(default=False, help_text='Whether the attempt was successful')
    error_message = models.TextField(null=True, blank=True, help_text='Error message if failed')
    
    # Rate limiting fields
    created_at = models.DateTimeField(default=timezone.now)
    user_agent = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'custom_auth_phoneverificationattempt'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.attempt_type} for {self.phone_number} from {self.ip_address}"
    
    @classmethod
    def log_attempt(cls, phone_number, ip_address, attempt_type, success=False, error_message=None, user_agent=None):
        """Log a verification attempt"""
        return cls.objects.create(
            phone_number=phone_number,
            ip_address=ip_address,
            attempt_type=attempt_type,
            success=success,
            error_message=error_message,
            user_agent=user_agent
        )
    
    @classmethod
    def check_rate_limit(cls, phone_number=None, ip_address=None, attempt_type='send_otp', limit=5, window_minutes=60):
        """
        Check if rate limit is exceeded for phone number or IP address.
        Returns (is_limited, attempts_count, time_until_reset)
        """
        from django.utils import timezone
        
        window_start = timezone.now() - timedelta(minutes=window_minutes)
        
        # Build query
        query = models.Q(attempt_type=attempt_type, created_at__gte=window_start)
        
        if phone_number:
            query &= models.Q(phone_number=phone_number)
        if ip_address:
            query &= models.Q(ip_address=ip_address)
        
        attempts = cls.objects.filter(query).count()
        
        is_limited = attempts >= limit
        time_until_reset = None
        
        if is_limited and attempts > 0:
            # Find oldest attempt in window
            oldest_attempt = cls.objects.filter(query).order_by('created_at').first()
            if oldest_attempt:
                reset_time = oldest_attempt.created_at + timedelta(minutes=window_minutes)
                time_until_reset = max(0, (reset_time - timezone.now()).total_seconds() / 60)
        
        return is_limited, attempts, time_until_reset
    
    @classmethod
    def cleanup_old_attempts(cls, days=30):
        """Clean up old attempts (for periodic cleanup)"""
        cutoff = timezone.now() - timedelta(days=days)
        deleted_count = cls.objects.filter(created_at__lt=cutoff).delete()[0]
        return deleted_count