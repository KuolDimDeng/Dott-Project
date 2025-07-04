"""
Django admin configuration for notification system
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AdminUser, Notification, NotificationRecipient, 
    NotificationTemplate, AdminAuditLog, UserNotificationSettings
)


@admin.register(AdminUser)
class AdminUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'admin_role', 'department', 'is_active', 'last_login']
    list_filter = ['admin_role', 'department', 'is_active', 'can_send_notifications']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'employee_id']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Staff Information', {
            'fields': ('employee_id', 'department', 'admin_role', 'phone_number', 'slack_user_id')
        }),
        ('Admin Permissions', {
            'fields': ('can_send_notifications', 'can_view_all_users', 'can_view_feedback', 'can_moderate_content')
        }),
        ('Security', {
            'fields': ('ip_whitelist', 'failed_login_attempts', 'account_locked_until')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()


class NotificationRecipientInline(admin.TabularInline):
    model = NotificationRecipient
    extra = 0
    readonly_fields = ['delivered_at', 'read_at', 'clicked_at', 'dismissed_at']
    fields = ['user_email', 'delivery_status', 'is_read', 'is_clicked', 'is_dismissed', 'error_message']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'target_type', 'priority', 'status', 'created_by', 'total_recipients', 'read_count', 'created_at']
    list_filter = ['status', 'priority', 'target_type', 'icon_type', 'created_at']
    search_fields = ['title', 'message', 'created_by__username']
    readonly_fields = ['total_recipients', 'delivered_count', 'read_count', 'clicked_count', 'sent_at']
    
    fieldsets = [
        ('Message Content', {
            'fields': ['title', 'message', 'icon_type', 'template_used']
        }),
        ('Targeting', {
            'fields': ['target_type', 'target_criteria']
        }),
        ('Delivery Settings', {
            'fields': ['priority', 'send_email', 'send_push', 'auto_dismiss_after']
        }),
        ('Scheduling', {
            'fields': ['scheduled_for', 'expires_at']
        }),
        ('Status & Statistics', {
            'fields': ['status', 'total_recipients', 'delivered_count', 'read_count', 'clicked_count', 'sent_at']
        }),
        ('Action Button', {
            'fields': ['action_button_text', 'action_button_url'],
            'classes': ['collapse']
        }),
    ]
    
    inlines = [NotificationRecipientInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by', 'template_used')


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'priority', 'is_active', 'created_by', 'created_at']
    list_filter = ['category', 'priority', 'is_active', 'icon_type']
    search_fields = ['name', 'title_template', 'message_template']
    
    fieldsets = [
        ('Template Info', {
            'fields': ['name', 'category', 'is_active']
        }),
        ('Message Content', {
            'fields': ['title_template', 'message_template', 'icon_type', 'priority']
        }),
        ('Variables', {
            'fields': ['available_variables'],
            'description': 'JSON object defining available template variables'
        }),
    ]


@admin.register(NotificationRecipient)
class NotificationRecipientAdmin(admin.ModelAdmin):
    list_display = ['notification_title', 'user_email', 'delivery_status', 'is_read', 'delivered_at', 'read_at']
    list_filter = ['delivery_status', 'is_read', 'is_clicked', 'is_dismissed']
    search_fields = ['user_email', 'user_name', 'notification__title']
    readonly_fields = ['delivered_at', 'read_at', 'clicked_at', 'dismissed_at']
    
    def notification_title(self, obj):
        return obj.notification.title
    notification_title.short_description = 'Notification'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('notification')


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ['admin_user', 'action', 'resource_type', 'ip_address', 'success', 'timestamp']
    list_filter = ['action', 'success', 'timestamp', 'resource_type']
    search_fields = ['admin_user__username', 'admin_user__email', 'ip_address', 'resource_id']
    readonly_fields = ['admin_user', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'user_agent', 'success', 'error_message', 'timestamp']
    
    def has_add_permission(self, request):
        return False  # Audit logs should not be manually created
    
    def has_change_permission(self, request, obj=None):
        return False  # Audit logs should not be modified
    
    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs should not be deleted


@admin.register(UserNotificationSettings)
class UserNotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'email_notifications', 'push_notifications', 'in_app_notifications', 'updated_at']
    list_filter = ['email_notifications', 'push_notifications', 'in_app_notifications']
    search_fields = ['user_email']
    
    fieldsets = [
        ('User', {
            'fields': ['user_email']
        }),
        ('Delivery Preferences', {
            'fields': ['email_notifications', 'push_notifications', 'in_app_notifications']
        }),
        ('Category Preferences', {
            'fields': ['system_notifications', 'product_updates', 'security_alerts', 
                      'maintenance_notices', 'billing_updates', 'tax_updates']
        }),
        ('Quiet Hours', {
            'fields': ['quiet_hours_start', 'quiet_hours_end', 'timezone'],
            'classes': ['collapse']
        }),
    ]