import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from custom_auth.models import TenantAwareModel, TenantManager
from django.contrib.auth import get_user_model

User = get_user_model()


class Event(TenantAwareModel):
    """
    Calendar event model with tenant isolation.
    Uses Row-Level Security (RLS) for data isolation.
    """
    
    EVENT_TYPE_CHOICES = [
        ('meeting', 'Meeting'),
        ('appointment', 'Appointment'),
        ('job', 'Job/Project'),
        ('task', 'Task'),
        ('reminder', 'Reminder'),
        ('deadline', 'Deadline'),
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='other')
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    reminder_minutes = models.IntegerField(
        default=0, 
        validators=[MinValueValidator(0)],
        help_text="Number of minutes before the event to send a reminder (0 = no reminder)"
    )
    
    # Link to job if this is a job-related event
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='calendar_events',
        null=True,
        blank=True,
        help_text="Link to job if this is a job-scheduled event"
    )
    
    # User who created the event
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_events',
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use the TenantManager for automatic tenant filtering
    objects = TenantManager()
    
    class Meta:
        db_table = 'events_event'
        ordering = ['start_datetime']
        indexes = [
            models.Index(fields=['tenant_id', 'start_datetime']),
            models.Index(fields=['tenant_id', 'event_type']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.start_datetime.strftime('%Y-%m-%d %H:%M')})"
    
    def clean(self):
        """Validate that end_datetime is after start_datetime."""
        from django.core.exceptions import ValidationError
        
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                raise ValidationError({
                    'end_datetime': 'End date/time must be after start date/time.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to run full_clean."""
        self.full_clean()
        super().save(*args, **kwargs)