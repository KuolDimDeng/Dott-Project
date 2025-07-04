"""
Serializers for the notification system
"""
from rest_framework import serializers
from .models import (
    AdminUser, Notification, NotificationRecipient,
    NotificationTemplate, AdminAuditLog, UserNotificationSettings
)


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for admin users
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'admin_role', 'department', 'is_active',
            'can_send_notifications', 'can_view_all_users',
            'can_view_feedback', 'can_moderate_content',
            'last_login', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notifications
    """
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'icon_type', 'category',
            'priority', 'target_type', 'target_criteria',
            'action_button_text', 'action_button_url',
            'status', 'total_recipients', 'delivered_count',
            'read_count', 'clicked_count', 'created_by_name',
            'created_at', 'sent_at', 'scheduled_for', 'expires_at'
        ]
        read_only_fields = [
            'id', 'delivered_count', 'read_count', 'clicked_count',
            'created_at', 'sent_at'
        ]
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class NotificationRecipientSerializer(serializers.ModelSerializer):
    """
    Serializer for notification recipients
    """
    notification = NotificationSerializer(read_only=True)
    
    class Meta:
        model = NotificationRecipient
        fields = [
            'id', 'notification', 'user_email', 'user_name',
            'delivery_status', 'is_read', 'is_clicked', 'is_dismissed',
            'delivered_at', 'read_at', 'clicked_at', 'dismissed_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for notification templates
    """
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'category', 'title_template',
            'message_template', 'icon_type', 'priority',
            'available_variables', 'is_active',
            'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by_name']
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class AdminAuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for admin audit logs
    """
    admin_user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminAuditLog
        fields = [
            'id', 'admin_user_name', 'action', 'resource_type',
            'resource_id', 'details', 'ip_address', 'user_agent',
            'success', 'error_message', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_admin_user_name(self, obj):
        return obj.admin_user.get_full_name() if obj.admin_user else 'System'


class UserNotificationSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for user notification settings
    """
    class Meta:
        model = UserNotificationSettings
        fields = [
            'user_email', 'email_notifications', 'push_notifications',
            'in_app_notifications', 'system_notifications',
            'product_updates', 'security_alerts', 'maintenance_notices',
            'billing_updates', 'tax_updates', 'quiet_hours_start',
            'quiet_hours_end', 'timezone', 'updated_at'
        ]
        read_only_fields = ['updated_at']


