from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Q
import json
from .models import AuditLog, AuditLogRetention


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for viewing audit logs."""
    
    list_display = [
        'timestamp_display', 
        'user_display', 
        'action_display',
        'model_name',
        'object_display',
        'tenant_display',
        'ip_address',
        'is_successful'
    ]
    
    list_filter = [
        'action',
        'model_name',
        'is_successful',
        'timestamp',
        ('user', admin.RelatedOnlyFieldListFilter),
    ]
    
    search_fields = [
        'user__username',
        'user__email',
        'model_name',
        'object_id',
        'object_repr',
        'ip_address',
        'request_id',
    ]
    
    date_hierarchy = 'timestamp'
    
    readonly_fields = [
        'id',
        'timestamp',
        'user',
        'tenant_id',
        'action',
        'model_name',
        'object_id',
        'object_repr',
        'changes_display',
        'old_values_display',
        'new_values_display',
        'ip_address',
        'user_agent',
        'request_id',
        'session_key',
        'extra_data_display',
        'error_message',
        'is_successful',
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id',
                'timestamp',
                'user',
                'tenant_id',
                'is_successful',
            )
        }),
        ('Action Details', {
            'fields': (
                'action',
                'model_name',
                'object_id',
                'object_repr',
                'error_message',
            )
        }),
        ('Change Information', {
            'fields': (
                'changes_display',
                'old_values_display',
                'new_values_display',
            ),
            'classes': ('collapse',)
        }),
        ('Request Information', {
            'fields': (
                'ip_address',
                'user_agent',
                'request_id',
                'session_key',
            ),
            'classes': ('collapse',)
        }),
        ('Additional Data', {
            'fields': (
                'extra_data_display',
            ),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """Audit logs should not be manually created."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs should not be edited."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete audit logs."""
        return request.user.is_superuser
    
    def timestamp_display(self, obj):
        """Format timestamp display."""
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    timestamp_display.short_description = 'Timestamp'
    timestamp_display.admin_order_field = 'timestamp'
    
    def user_display(self, obj):
        """Display user information."""
        if obj.user:
            return f"{obj.user.username} ({obj.user.email})"
        return "Anonymous"
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user__username'
    
    def action_display(self, obj):
        """Display action with color coding."""
        colors = {
            'created': 'green',
            'updated': 'blue',
            'deleted': 'red',
            'viewed': 'gray',
            'login': 'green',
            'logout': 'gray',
            'failed_attempt': 'red',
        }
        color = colors.get(obj.action, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_action_display()
        )
    action_display.short_description = 'Action'
    action_display.admin_order_field = 'action'
    
    def object_display(self, obj):
        """Display object information."""
        if obj.object_id:
            return f"{obj.object_repr} (ID: {obj.object_id})"
        return obj.object_repr or "N/A"
    object_display.short_description = 'Object'
    
    def tenant_display(self, obj):
        """Display tenant ID."""
        if obj.tenant_id:
            return str(obj.tenant_id)[:8] + "..."
        return "N/A"
    tenant_display.short_description = 'Tenant'
    
    def changes_display(self, obj):
        """Display changes in a formatted way."""
        if not obj.changes:
            return "No changes"
        return format_html('<pre>{}</pre>', json.dumps(obj.changes, indent=2))
    changes_display.short_description = 'Changes'
    
    def old_values_display(self, obj):
        """Display old values in a formatted way."""
        if not obj.old_values:
            return "No old values"
        return format_html('<pre>{}</pre>', json.dumps(obj.old_values, indent=2))
    old_values_display.short_description = 'Old Values'
    
    def new_values_display(self, obj):
        """Display new values in a formatted way."""
        if not obj.new_values:
            return "No new values"
        return format_html('<pre>{}</pre>', json.dumps(obj.new_values, indent=2))
    new_values_display.short_description = 'New Values'
    
    def extra_data_display(self, obj):
        """Display extra data in a formatted way."""
        if not obj.extra_data:
            return "No extra data"
        return format_html('<pre>{}</pre>', json.dumps(obj.extra_data, indent=2))
    extra_data_display.short_description = 'Extra Data'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('user')


@admin.register(AuditLogRetention)
class AuditLogRetentionAdmin(admin.ModelAdmin):
    """Admin interface for audit log retention policies."""
    
    list_display = ['model_name', 'retention_days', 'is_active', 'updated_at']
    list_filter = ['is_active']
    search_fields = ['model_name']
    
    fieldsets = (
        (None, {
            'fields': ('model_name', 'retention_days', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']