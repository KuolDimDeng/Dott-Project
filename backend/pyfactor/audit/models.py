from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class AuditLog(models.Model):
    """
    Comprehensive audit log model that tracks all CRUD operations on models.
    Designed for production use with minimal performance impact.
    """
    
    # Action types
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('viewed', 'Viewed'),
        ('exported', 'Exported'),
        ('imported', 'Imported'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('permission_changed', 'Permission Changed'),
        ('failed_attempt', 'Failed Attempt'),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # User and tenant information
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_logs'
    )
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    # Action information
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=255, null=True, blank=True)
    object_repr = models.TextField(null=True, blank=True)
    
    # Change tracking
    changes = models.JSONField(default=dict, blank=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    # Request information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    request_id = models.UUIDField(null=True, blank=True, db_index=True)
    session_key = models.CharField(max_length=40, null=True, blank=True)
    
    # Additional metadata
    extra_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(null=True, blank=True)
    is_successful = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'audit_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'user']),
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['tenant_id', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['request_id']),
        ]
        
    def __str__(self):
        return f"{self.action} {self.model_name} by {self.user} at {self.timestamp}"
    
    @classmethod
    def log_action(cls, **kwargs):
        """
        Convenience method to create audit log entries.
        
        Usage:
            AuditLog.log_action(
                user=request.user,
                action='updated',
                model_name='Product',
                object_id=product.id,
                object_repr=str(product),
                changes={'price': {'old': 10.00, 'new': 15.00}},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
            )
        """
        try:
            return cls.objects.create(**kwargs)
        except Exception as e:
            # Log the error but don't break the main operation
            import logging
            logger = logging.getLogger('audit')
            logger.error(f"Failed to create audit log: {str(e)}")
            return None


class AuditLogRetention(models.Model):
    """
    Configuration model for audit log retention policies.
    """
    model_name = models.CharField(max_length=100, unique=True)
    retention_days = models.PositiveIntegerField(default=365)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'audit_log_retention'
        
    def __str__(self):
        return f"{self.model_name}: {self.retention_days} days"