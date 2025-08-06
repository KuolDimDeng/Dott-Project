"""
Error Log Model for tracking application errors
"""

from django.db import models
from django.utils import timezone


class ErrorLog(models.Model):
    """Model for tracking application errors"""
    
    LEVEL_CHOICES = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    error_type = models.CharField(max_length=255)
    message = models.TextField()
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='ERROR')
    stack_trace = models.TextField(blank=True, null=True)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )
    tenant = models.ForeignKey(
        'custom_auth.Tenant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )
    url = models.URLField(max_length=500, blank=True, null=True)
    method = models.CharField(max_length=10, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'error_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['error_type']),
            models.Index(fields=['level']),
        ]
    
    def __str__(self):
        return f"{self.error_type} - {self.created_at}"