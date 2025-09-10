"""
Compliance and Data Retention Models
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
import hashlib

User = get_user_model()

class ComplianceLog(models.Model):
    """
    Audit log for all compliance-related actions
    """
    ACTION_TYPES = [
        ('AUTO_DELETE', 'Automatic Deletion'),
        ('USER_DELETE', 'User Requested Deletion'),
        ('GDPR_REQUEST', 'GDPR Data Request'),
        ('CCPA_REQUEST', 'CCPA Data Request'),
        ('DATA_EXPORT', 'Data Export'),
        ('CONSENT_GIVEN', 'Consent Given'),
        ('CONSENT_WITHDRAWN', 'Consent Withdrawn'),
        ('ANONYMIZATION', 'Data Anonymized'),
        ('RETENTION_EXTENDED', 'Retention Extended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    model_name = models.CharField(max_length=100)
    record_id = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Data integrity
    data_hash = models.CharField(max_length=64, help_text='SHA256 hash of deleted data')
    
    # Compliance metadata
    reason = models.TextField()
    legal_basis = models.CharField(max_length=100, blank=True)
    retention_period_days = models.IntegerField(null=True)
    
    # Request tracking
    request_id = models.CharField(max_length=100, blank=True)
    requester_ip = models.GenericIPAddressField(null=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'compliance_logs'
        indexes = [
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['request_id']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.model_name}:{self.record_id}"


class GDPRRequest(models.Model):
    """
    Track GDPR data requests (access, deletion, portability)
    """
    REQUEST_TYPES = [
        ('ACCESS', 'Data Access Request'),
        ('DELETE', 'Deletion Request'),
        ('PORTABILITY', 'Data Portability'),
        ('RECTIFICATION', 'Data Correction'),
        ('RESTRICTION', 'Processing Restriction'),
        ('OBJECTION', 'Processing Objection'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gdpr_requests')
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Request details
    details = models.TextField(help_text='Specific data categories requested')
    verification_token = models.CharField(max_length=100, unique=True)
    verified = models.BooleanField(default=False)
    
    # Processing metadata
    processor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                 related_name='processed_gdpr_requests')
    processing_notes = models.TextField(blank=True)
    
    # File exports
    export_file_url = models.URLField(blank=True)
    export_expires_at = models.DateTimeField(null=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    
    # Legal deadline (30 days for GDPR)
    deadline_at = models.DateTimeField()
    
    class Meta:
        db_table = 'gdpr_requests'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.deadline_at:
            from datetime import timedelta
            self.deadline_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)


class ConsentRecord(models.Model):
    """
    Track user consent for data processing
    """
    CONSENT_TYPES = [
        ('RECORDING', 'Call Recording'),
        ('MARKETING', 'Marketing Communications'),
        ('ANALYTICS', 'Analytics and Tracking'),
        ('BIOMETRIC', 'Biometric Data'),
        ('LOCATION', 'Location Data'),
        ('THIRD_PARTY', 'Third Party Sharing'),
        ('AI_PROCESSING', 'AI/ML Processing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consent_records')
    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPES)
    
    # Consent details
    granted = models.BooleanField(default=False)
    version = models.CharField(max_length=20, help_text='Version of terms consented to')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Scope and limitations
    scope = models.JSONField(default=dict, help_text='Specific scope of consent')
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Related to specific actions
    related_session_id = models.CharField(max_length=100, blank=True)
    related_conversation_id = models.UUIDField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consent_records'
        unique_together = ['user', 'consent_type', 'related_session_id']
        indexes = [
            models.Index(fields=['user', 'consent_type', '-created_at']),
            models.Index(fields=['granted', 'expires_at']),
        ]
    
    def revoke(self):
        """Revoke consent"""
        self.granted = False
        self.revoked_at = timezone.now()
        self.save()
        
        # Log the revocation
        ComplianceLog.objects.create(
            action='CONSENT_WITHDRAWN',
            model_name='ConsentRecord',
            record_id=str(self.id),
            user=self.user,
            reason=f'User revoked {self.consent_type} consent',
            data_hash=hashlib.sha256(str(self.id).encode()).hexdigest()
        )


class DataRetentionOverride(models.Model):
    """
    Override default retention periods for specific users or data types
    """
    OVERRIDE_REASONS = [
        ('LEGAL_HOLD', 'Legal Hold'),
        ('INVESTIGATION', 'Under Investigation'),
        ('USER_REQUEST', 'User Requested Extended Retention'),
        ('BUSINESS_REQUIREMENT', 'Business Requirement'),
        ('REGULATORY', 'Regulatory Requirement'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    
    # What to override
    data_type = models.CharField(max_length=50)  # e.g., 'messages', 'call_records'
    category = models.CharField(max_length=50)  # e.g., 'default', 'recordings'
    
    # Override details
    retention_days = models.IntegerField(help_text='Override retention period in days')
    reason = models.CharField(max_length=30, choices=OVERRIDE_REASONS)
    notes = models.TextField()
    
    # Authorization
    authorized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                     related_name='authorized_overrides')
    
    # Validity
    effective_from = models.DateTimeField(default=timezone.now)
    effective_until = models.DateTimeField()
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'data_retention_overrides'
        indexes = [
            models.Index(fields=['user', 'data_type']),
            models.Index(fields=['effective_until']),
        ]