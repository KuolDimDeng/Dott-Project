from django.db import models
from django.contrib.auth import get_user_model
import json
from django.core.serializers.json import DjangoJSONEncoder

User = get_user_model()


class Lead(models.Model):
    """
    Model to store potential customer leads from various sources
    """
    
    SOURCE_CHOICES = [
        ('contact_form', 'Contact Form'),
        ('invite_business_owner', 'Invite a Business Owner'),
        ('crisp_chat', 'Crisp Chat'),
        ('signup_attempt', 'Sign-up Attempt'),
        ('newsletter', 'Newsletter Subscription'),
        ('demo_request', 'Demo Request'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('converted', 'Converted'),
        ('not_interested', 'Not Interested'),
    ]
    
    # Basic Information
    email = models.EmailField()
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Lead Details
    source = models.CharField(max_length=25, choices=SOURCE_CHOICES)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='new')
    
    # Location Information
    country = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    
    # Additional Data (JSON field for flexible storage)
    additional_data = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Staff Notes and Assignment
    notes = models.TextField(blank=True, null=True, help_text="Internal notes for staff")
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_leads',
        help_text="Staff member assigned to this lead"
    )
    contacted_at = models.DateTimeField(null=True, blank=True, help_text="When this lead was first contacted")
    
    class Meta:
        db_table = 'leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['source']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        name = f"{self.first_name} {self.last_name}".strip()
        if name:
            return f"{name} ({self.email}) - {self.get_source_display()}"
        return f"{self.email} - {self.get_source_display()}"
    
    @property
    def full_name(self):
        """Get the full name of the lead"""
        parts = [self.first_name, self.last_name]
        return ' '.join(filter(None, parts))
    
    def add_note(self, note_text, user=None):
        """Add a note to the lead's history"""
        current_notes = self.notes or ""
        timestamp = models.timezone.now().strftime("%Y-%m-%d %H:%M:%S")
        user_name = user.get_full_name() if user else "System"
        new_note = f"[{timestamp}] {user_name}: {note_text}"
        
        if current_notes:
            self.notes = f"{current_notes}\n\n{new_note}"
        else:
            self.notes = new_note
        
        self.save(update_fields=['notes', 'updated_at'])
    
    def get_contact_info(self):
        """Get formatted contact information"""
        info = []
        if self.email:
            info.append(f"Email: {self.email}")
        if self.phone_number:
            info.append(f"Phone: {self.phone_number}")
        return ", ".join(info) if info else "No contact info"
    
    def to_dict(self):
        """Convert lead to dictionary for API responses"""
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'company_name': self.company_name,
            'phone_number': self.phone_number,
            'source': self.source,
            'source_display': self.get_source_display(),
            'message': self.message,
            'status': self.status,
            'status_display': self.get_status_display(),
            'country': self.country,
            'additional_data': self.additional_data,
            'notes': self.notes,
            'assigned_to': {
                'id': self.assigned_to.id,
                'name': self.assigned_to.get_full_name(),
                'email': self.assigned_to.email,
            } if self.assigned_to else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'contacted_at': self.contacted_at.isoformat() if self.contacted_at else None,
        }


class LeadActivity(models.Model):
    """
    Model to track activities related to leads
    """
    
    ACTIVITY_TYPES = [
        ('created', 'Lead Created'),
        ('contacted', 'Contacted'),
        ('email_sent', 'Email Sent'),
        ('status_changed', 'Status Changed'),
        ('note_added', 'Note Added'),
        ('assigned', 'Assigned to Staff'),
    ]
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'lead_activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.lead.email} - {self.get_activity_type_display()}"