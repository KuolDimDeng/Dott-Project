"""
Enhanced Security Models for Session Management
Implements device fingerprinting, risk scoring, and device trust
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from .models import UserSession

User = get_user_model()


class DeviceFingerprint(models.Model):
    """
    Stores device fingerprints for enhanced security and device tracking
    """
    
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text='Tenant isolation field')
    
    fingerprint_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='device_fingerprints'
    )
    
    # Fingerprint data
    fingerprint_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="SHA256 hash of device fingerprint components"
    )
    
    # Device information
    user_agent = models.TextField()
    screen_resolution = models.CharField(max_length=20, null=True, blank=True)
    timezone = models.CharField(max_length=50, null=True, blank=True)
    language = models.CharField(max_length=10, null=True, blank=True)
    platform = models.CharField(max_length=50, null=True, blank=True)
    
    # Browser capabilities
    webgl_vendor = models.CharField(max_length=100, null=True, blank=True)
    webgl_renderer = models.CharField(max_length=100, null=True, blank=True)
    canvas_fingerprint = models.CharField(max_length=64, null=True, blank=True)
    
    # Network information
    ip_address = models.GenericIPAddressField()
    ip_country = models.CharField(max_length=2, null=True, blank=True)
    ip_region = models.CharField(max_length=100, null=True, blank=True)
    
    # Trust status
    is_trusted = models.BooleanField(default=False)
    trust_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Risk assessment
    risk_score = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="0=low risk, 100=high risk"
    )
    risk_factors = models.JSONField(default=dict)
    
    # Activity tracking
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    login_count = models.IntegerField(default=0)
    failed_login_count = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(null=True, blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'device_fingerprints'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['fingerprint_hash']),
            models.Index(fields=['risk_score', 'is_active']),
        ]
        unique_together = [['user', 'fingerprint_hash']]
    
    def __str__(self):
        return f"Device {self.fingerprint_id} for {self.user.email}"
    
    def calculate_fingerprint_hash(self, components):
        """Calculate SHA256 hash from device components"""
        # Sort components for consistent hashing
        sorted_components = sorted(components.items())
        fingerprint_string = '|'.join([f"{k}:{v}" for k, v in sorted_components])
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    def update_trust_score(self):
        """Update device trust score based on usage patterns"""
        score = 50  # Base score
        
        # Positive factors
        if self.login_count > 10:
            score += 10
        if self.login_count > 50:
            score += 10
        
        days_since_first_seen = (timezone.now() - self.first_seen).days
        if days_since_first_seen > 30:
            score += 15
        if days_since_first_seen > 90:
            score += 15
        
        # Negative factors
        if self.failed_login_count > 5:
            score -= 20
        if self.risk_score > 70:
            score -= 20
        
        self.trust_score = max(0, min(100, score))
        self.save(update_fields=['trust_score'])
    
    def calculate_risk_score(self):
        """Calculate risk score based on various factors"""
        risk_factors = {}
        risk_score = 0
        
        # New device penalty
        if self.login_count == 0:
            risk_factors['new_device'] = 30
            risk_score += 30
        
        # Failed login attempts
        if self.failed_login_count > 3:
            risk_factors['failed_logins'] = 20
            risk_score += 20
        
        # Suspicious patterns
        recent_sessions = UserSession.objects.filter(
            user=self.user,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        
        if recent_sessions > 5:
            risk_factors['rapid_sessions'] = 15
            risk_score += 15
        
        # Geographic anomaly (would need GeoIP service)
        # if self.is_geographic_anomaly():
        #     risk_factors['geographic_anomaly'] = 25
        #     risk_score += 25
        
        self.risk_factors = risk_factors
        self.risk_score = min(100, risk_score)
        self.save(update_fields=['risk_factors', 'risk_score'])


class SessionSecurity(models.Model):
    """
    Enhanced security tracking for individual sessions
    """
    
    session = models.OneToOneField(
        UserSession,
        on_delete=models.CASCADE,
        related_name='security'
    )
    
    device_fingerprint = models.ForeignKey(
        DeviceFingerprint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Risk assessment at session creation
    initial_risk_score = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    current_risk_score = models.IntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    risk_factors = models.JSONField(default=dict)
    
    # Session verification
    is_verified = models.BooleanField(default=False)
    verification_method = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('password', 'Password'),
            ('mfa', 'Multi-factor Authentication'),
            ('email', 'Email Verification'),
            ('trusted_device', 'Trusted Device'),
        ]
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Anomaly detection
    anomaly_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    anomalies_detected = models.JSONField(default=list)
    
    # Heartbeat monitoring
    last_heartbeat = models.DateTimeField(default=timezone.now)
    heartbeat_interval = models.IntegerField(
        default=60,  # seconds
        help_text="Expected heartbeat interval in seconds"
    )
    missed_heartbeats = models.IntegerField(default=0)
    
    # Security events
    security_events = models.JSONField(default=list)
    
    class Meta:
        db_table = 'session_security'
        indexes = [
            models.Index(fields=['current_risk_score']),
            models.Index(fields=['last_heartbeat']),
        ]
    
    def __str__(self):
        return f"Security for session {self.session.session_id}"
    
    def update_risk_score(self):
        """Recalculate session risk score"""
        risk_score = self.initial_risk_score
        risk_factors = dict(self.risk_factors)
        
        # Check for anomalies
        if self.anomaly_score > 30:
            risk_factors['high_anomaly_score'] = 20
            risk_score += 20
        
        # Check heartbeat health
        if self.missed_heartbeats > 3:
            risk_factors['missed_heartbeats'] = 15
            risk_score += 15
        
        # Device trust factor
        if self.device_fingerprint and self.device_fingerprint.trust_score < 30:
            risk_factors['untrusted_device'] = 25
            risk_score += 25
        
        self.current_risk_score = min(100, risk_score)
        self.risk_factors = risk_factors
        self.save(update_fields=['current_risk_score', 'risk_factors'])
    
    def check_heartbeat(self):
        """Check if heartbeat is healthy"""
        time_since_heartbeat = (timezone.now() - self.last_heartbeat).total_seconds()
        
        if time_since_heartbeat > (self.heartbeat_interval * 2):
            self.missed_heartbeats += 1
            self.save(update_fields=['missed_heartbeats'])
            
            # Log security event
            self.log_security_event('missed_heartbeat', {
                'time_since_last': time_since_heartbeat,
                'expected_interval': self.heartbeat_interval
            })
            
            # Update risk score
            self.update_risk_score()
            
            return False
        
        return True
    
    def update_heartbeat(self):
        """Update heartbeat timestamp"""
        self.last_heartbeat = timezone.now()
        self.missed_heartbeats = 0
        self.save(update_fields=['last_heartbeat', 'missed_heartbeats'])
    
    def log_security_event(self, event_type, data=None):
        """Log a security event"""
        event = {
            'type': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': data or {}
        }
        
        # Keep last 100 events
        self.security_events = self.security_events[-99:] + [event]
        self.save(update_fields=['security_events'])
    
    def detect_anomalies(self, request_data):
        """Detect anomalies in session behavior"""
        anomalies = []
        anomaly_score = 0
        
        # Check for IP change
        if request_data.get('ip_address') != self.session.ip_address:
            anomalies.append({
                'type': 'ip_change',
                'old': self.session.ip_address,
                'new': request_data.get('ip_address')
            })
            anomaly_score += 30
        
        # Check for user agent change
        if request_data.get('user_agent') != self.session.user_agent:
            anomalies.append({
                'type': 'user_agent_change',
                'old': self.session.user_agent,
                'new': request_data.get('user_agent')
            })
            anomaly_score += 20
        
        # Check for rapid requests (potential automation)
        if hasattr(self, '_last_request_time'):
            time_since_last = (timezone.now() - self._last_request_time).total_seconds()
            if time_since_last < 0.5:  # Less than 500ms
                anomalies.append({
                    'type': 'rapid_requests',
                    'interval': time_since_last
                })
                anomaly_score += 15
        
        self._last_request_time = timezone.now()
        
        if anomalies:
            self.anomalies_detected = anomalies
            self.anomaly_score = min(100, anomaly_score)
            self.save(update_fields=['anomalies_detected', 'anomaly_score'])
            
            # Log security event
            self.log_security_event('anomalies_detected', {
                'anomalies': anomalies,
                'score': anomaly_score
            })
        
        return anomalies


class DeviceTrust(models.Model):
    """
    Manages trusted devices for users
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trusted_devices'
    )
    
    device_fingerprint = models.ForeignKey(
        DeviceFingerprint,
        on_delete=models.CASCADE
    )
    
    # Trust details
    trust_name = models.CharField(
        max_length=100,
        help_text="User-friendly name for the device"
    )
    trusted_at = models.DateTimeField(auto_now_add=True)
    trusted_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration for trust"
    )
    
    # Trust verification
    verification_code = models.CharField(
        max_length=6,
        null=True,
        blank=True,
        help_text="Code sent for device verification"
    )
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Usage tracking
    last_used = models.DateTimeField(auto_now=True)
    use_count = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'device_trust'
        unique_together = [['user', 'device_fingerprint']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.trust_name} - {self.user.email}"
    
    def is_valid(self):
        """Check if trust is still valid"""
        if not self.is_active:
            return False
        
        if not self.verified:
            return False
        
        if self.trusted_until and timezone.now() > self.trusted_until:
            return False
        
        return True
    
    def revoke(self, reason="User requested"):
        """Revoke device trust"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.revoked_reason = reason
        self.save(update_fields=['is_active', 'revoked_at', 'revoked_reason'])