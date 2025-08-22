"""
Enhanced Permission System Models
Provides templates, departments, time-based permissions, and audit logging
"""
import uuid
from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
import json


class PermissionTemplate(models.Model):
    """Pre-defined permission templates for common roles"""
    
    TEMPLATE_TYPES = [
        ('SYSTEM', 'System Template'),
        ('CUSTOM', 'Custom Template'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, help_text="Unique identifier like 'sales_manager'")
    description = models.TextField()
    permissions = models.JSONField(default=dict, help_text="Dictionary of page permissions")
    template_type = models.CharField(max_length=10, choices=TEMPLATE_TYPES, default='CUSTOM')
    is_active = models.BooleanField(default=True)
    
    # Multi-tenant support
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE, null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, related_name='created_templates')
    
    class Meta:
        db_table = 'permission_templates'
        ordering = ['template_type', 'name']
        unique_together = [['code', 'tenant']]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def apply_to_user(self, user):
        """Apply this template's permissions to a user"""
        from custom_auth.services import PermissionService
        service = PermissionService()
        return service.apply_template(user, self)


class Department(models.Model):
    """Organizational departments with default permissions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, help_text="Department code like 'SALES', 'HR'")
    description = models.TextField(blank=True)
    
    # Default permissions for new members
    default_template = models.ForeignKey(PermissionTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    default_permissions = models.JSONField(default=dict, blank=True)
    
    # Hierarchy
    parent_department = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    
    # Management
    manager = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_departments')
    
    # Multi-tenant support
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'departments'
        ordering = ['name']
        unique_together = [['code', 'tenant']]
    
    def __str__(self):
        return self.name


class UserDepartment(models.Model):
    """Links users to departments with specific roles"""
    
    DEPARTMENT_ROLES = [
        ('MEMBER', 'Member'),
        ('LEAD', 'Team Lead'),
        ('MANAGER', 'Manager'),
        ('HEAD', 'Department Head'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='department_memberships')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=20, choices=DEPARTMENT_ROLES, default='MEMBER')
    
    # Dates
    joined_date = models.DateField(default=timezone.now)
    left_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_departments'
        unique_together = [['user', 'department']]
        ordering = ['-is_active', 'department__name']
    
    def __str__(self):
        return f"{self.user.email} - {self.department.name} ({self.role})"


class TemporaryPermission(models.Model):
    """Time-bounded permissions for temporary access"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='temporary_permissions')
    
    # Permission details
    permissions = models.JSONField(help_text="Temporary permissions to grant")
    reason = models.TextField(help_text="Reason for temporary access")
    
    # Time bounds
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField()
    
    # Approval
    approved_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, related_name='approved_temp_permissions')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    revoked = models.BooleanField(default=False)
    revoked_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='revoked_temp_permissions')
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)
    
    # Multi-tenant
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, related_name='created_temp_permissions')
    
    class Meta:
        db_table = 'temporary_permissions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Temp permissions for {self.user.email} ({self.valid_from} to {self.valid_until})"
    
    def is_valid(self):
        """Check if the permission is currently valid"""
        now = timezone.now()
        return (
            self.is_active and 
            not self.revoked and 
            self.valid_from <= now <= self.valid_until
        )


class PermissionDelegation(models.Model):
    """Allow users to delegate their permissions to others temporarily"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delegator = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='delegated_permissions')
    delegate = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='received_delegations')
    
    # What to delegate
    permissions_to_delegate = models.JSONField(help_text="Specific permissions to delegate, or 'ALL' for all")
    reason = models.TextField(help_text="Reason for delegation (e.g., vacation, sick leave)")
    
    # Time bounds
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Status
    is_active = models.BooleanField(default=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    # Revocation
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.TextField(blank=True)
    
    # Multi-tenant
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'permission_delegations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.delegator.email} -> {self.delegate.email} ({self.start_date} to {self.end_date})"
    
    def is_valid(self):
        """Check if delegation is currently active"""
        now = timezone.now()
        return (
            self.is_active and 
            self.accepted and 
            not self.revoked and 
            self.start_date <= now <= self.end_date
        )


class PermissionAuditLog(models.Model):
    """Comprehensive audit trail for all permission changes"""
    
    ACTION_TYPES = [
        ('GRANT', 'Permission Granted'),
        ('REVOKE', 'Permission Revoked'),
        ('MODIFY', 'Permission Modified'),
        ('TEMPLATE_APPLY', 'Template Applied'),
        ('BULK_UPDATE', 'Bulk Update'),
        ('DELEGATION', 'Permission Delegated'),
        ('TEMP_GRANT', 'Temporary Grant'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who and what
    user = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='permission_audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    
    # Permission changes
    old_permissions = models.JSONField(null=True, blank=True)
    new_permissions = models.JSONField(null=True, blank=True)
    changes_summary = models.TextField(help_text="Human-readable summary of changes")
    
    # Who made the change
    changed_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, related_name='permission_changes_made')
    change_reason = models.TextField(blank=True)
    
    # Additional context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Multi-tenant
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'permission_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['changed_by', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} for {self.user.email} by {self.changed_by.email if self.changed_by else 'System'} at {self.created_at}"


class PermissionRequest(models.Model):
    """Allow users to request additional permissions"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('DENIED', 'Denied'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, related_name='permission_requests')
    
    # What is being requested
    requested_permissions = models.JSONField()
    justification = models.TextField(help_text="Business justification for the request")
    
    # Duration
    is_permanent = models.BooleanField(default=False)
    requested_duration_days = models.IntegerField(null=True, blank=True, help_text="Duration in days if not permanent")
    
    # Status
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Review
    reviewed_by = models.ForeignKey('custom_auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_permission_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # If approved
    approved_permissions = models.JSONField(null=True, blank=True, help_text="Actually granted permissions (may differ from requested)")
    valid_until = models.DateTimeField(null=True, blank=True)
    
    # Multi-tenant
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'permission_requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Request by {self.requester.email} - {self.status}"