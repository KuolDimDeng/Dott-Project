"""
Notification system models for admin-to-user communication
"""
import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from custom_auth.tenant_base_model import TenantAwareModel
from audit.mixins import AuditMixin


class AdminUser(models.Model):
    """
    Admin user model for Dott staff with notification permissions
    Separate from regular users to avoid conflicts
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic auth fields
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Staff identification
    employee_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    department = models.CharField(max_length=50, choices=[
        ('support', 'Customer Support'),
        ('product', 'Product Team'),
        ('engineering', 'Engineering'),
        ('sales', 'Sales'),
        ('management', 'Management'),
        ('finance', 'Finance'),
    ], default='support')
    
    # Admin permissions
    ADMIN_ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('support_agent', 'Support Agent'),
        ('read_only', 'Read Only'),
    ]
    admin_role = models.CharField(max_length=20, choices=ADMIN_ROLE_CHOICES, default='support_agent')
    
    # Security settings
    can_send_notifications = models.BooleanField(default=False)
    can_view_all_users = models.BooleanField(default=False)
    can_view_feedback = models.BooleanField(default=True)
    can_moderate_content = models.BooleanField(default=False)
    ip_whitelist = models.JSONField(default=list, blank=True, help_text="Allowed IP addresses")
    
    # Contact info
    phone_number = models.CharField(max_length=20, blank=True)
    slack_user_id = models.CharField(max_length=50, blank=True)
    
    # Session management
    last_login = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'
        db_table = 'admin_users'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.admin_role})"
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'
        return full_name.strip()
    
    def set_password(self, raw_password):
        """Set password using Django's password hashing"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check password against hash"""
        return check_password(raw_password, self.password)
    
    @property
    def is_locked(self):
        return self.account_locked_until and self.account_locked_until > timezone.now()
    
    def can_access_ip(self, ip_address):
        """Check if IP address is whitelisted"""
        if not self.ip_whitelist:
            return True  # No restrictions
        return ip_address in self.ip_whitelist


class NotificationTemplate(models.Model):
    """
    Reusable notification templates for common messages
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, choices=[
        ('system', 'System Announcements'),
        ('product', 'Product Updates'),
        ('security', 'Security Alerts'),
        ('maintenance', 'Maintenance Notices'),
        ('billing', 'Billing Updates'),
        ('feature', 'New Features'),
        ('tax', 'Tax Updates'),
    ])
    
    title_template = models.CharField(max_length=200)
    message_template = models.TextField()
    icon_type = models.CharField(max_length=20, choices=[
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('announcement', 'Announcement'),
    ], default='info')
    
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium')
    
    # Template variables (JSON)
    available_variables = models.JSONField(default=dict, blank=True,
        help_text="Available variables for template substitution")
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(AdminUser, on_delete=models.PROTECT, related_name='created_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_templates'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class Notification(AuditMixin, models.Model):
    """
    Individual notification messages sent to users
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Message content
    title = models.CharField(max_length=200)
    message = models.TextField()
    icon_type = models.CharField(max_length=20, choices=[
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('announcement', 'Announcement'),
        ('tax_update', 'Tax Update'),
    ], default='info')
    
    # Category
    category = models.CharField(max_length=50, blank=True, null=True, choices=[
        ('announcement', 'Announcement'),
        ('update', 'Update'),
        ('alert', 'Alert'),
        ('promotion', 'Promotion'),
        ('system', 'System'),
        ('tax', 'Tax Update'),
        ('payment', 'Payment'),
    ])
    
    # Targeting
    TARGET_TYPE_CHOICES = [
        ('all_users', 'All Users'),
        ('specific_users', 'Specific Users'),
        ('by_plan', 'By Subscription Plan'),
        ('by_role', 'By User Role'),
        ('by_country', 'By Country'),
        ('active_users', 'Active Users Only'),
    ]
    target_type = models.CharField(max_length=20, choices=TARGET_TYPE_CHOICES)
    target_criteria = models.JSONField(default=dict, blank=True,
        help_text="Targeting criteria based on target_type")
    
    # Delivery settings
    priority = models.CharField(max_length=10, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium')
    
    send_email = models.BooleanField(default=False, help_text="Also send as email")
    send_push = models.BooleanField(default=False, help_text="Send as push notification")
    auto_dismiss_after = models.IntegerField(null=True, blank=True, 
        help_text="Auto-dismiss after X hours")
    
    # Scheduling
    scheduled_for = models.DateTimeField(null=True, blank=True,
        help_text="Send at specific time (leave blank for immediate)")
    expires_at = models.DateTimeField(null=True, blank=True,
        help_text="Notification expires and won't be shown")
    
    # Status tracking
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    
    # Statistics
    total_recipients = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    read_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    
    # Admin tracking
    created_by = models.ForeignKey(AdminUser, on_delete=models.PROTECT, related_name='notifications')
    template_used = models.ForeignKey(NotificationTemplate, on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='notifications')
    
    # Action button (optional)
    action_button_text = models.CharField(max_length=50, blank=True)
    action_button_url = models.URLField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_for']),
            models.Index(fields=['target_type', 'created_at']),
            models.Index(fields=['priority', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.target_type})"


class NotificationRecipient(TenantAwareModel):
    """
    Tracks delivery and interaction for each user
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='recipients')
    user_email = models.EmailField()
    user_name = models.CharField(max_length=200, blank=True)
    
    # Delivery status
    DELIVERY_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]
    delivery_status = models.CharField(max_length=10, choices=DELIVERY_STATUS_CHOICES, default='pending')
    
    # User interaction
    is_read = models.BooleanField(default=False)
    is_clicked = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Timestamps
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_recipients'
        unique_together = ['notification', 'tenant_id', 'user_email']
        indexes = [
            models.Index(fields=['tenant_id', 'user_email', 'is_read']),
            models.Index(fields=['notification', 'delivery_status']),
        ]
    
    def __str__(self):
        return f"{self.notification.title} → {self.user_email}"


class AdminAuditLog(models.Model):
    """
    Audit trail for all admin actions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    admin_user = models.ForeignKey(AdminUser, on_delete=models.PROTECT, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=50, choices=[
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create_notification', 'Create Notification'),
        ('send_notification', 'Send Notification'),
        ('cancel_notification', 'Cancel Notification'),
        ('view_feedback', 'View Tax Feedback'),
        ('export_data', 'Export Data'),
        ('update_user', 'Update User'),
        ('delete_data', 'Delete Data'),
        ('change_permissions', 'Change Permissions'),
        ('cleanup_notifications', 'Cleanup Old Notifications'),
    ])
    
    # Context
    resource_type = models.CharField(max_length=50, blank=True)  # e.g., 'notification', 'user', 'feedback'
    resource_id = models.CharField(max_length=100, blank=True)  # ID of the resource
    details = models.JSONField(default=dict, blank=True)  # Additional context
    
    # Request info
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Result
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'admin_audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['admin_user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        username = self.admin_user.username if self.admin_user else 'System'
        return f"{username} - {self.action} at {self.timestamp}"


class UserNotificationSettings(TenantAwareModel):
    """
    User preferences for notifications
    """
    user_email = models.EmailField()
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    in_app_notifications = models.BooleanField(default=True)
    
    # Category preferences
    system_notifications = models.BooleanField(default=True)
    product_updates = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    maintenance_notices = models.BooleanField(default=True)
    billing_updates = models.BooleanField(default=True)
    tax_updates = models.BooleanField(default=True)
    
    # Do not disturb
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_notification_settings'
        unique_together = ['tenant_id', 'user_email']
    
    def __str__(self):
        return f"Settings for {self.user_email}"