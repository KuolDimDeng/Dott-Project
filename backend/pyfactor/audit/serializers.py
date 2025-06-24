from rest_framework import serializers
from .models import AuditLog, AuditLogRetention


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries."""
    
    user_display = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'timestamp',
            'user',
            'user_display',
            'tenant_id',
            'action',
            'action_display',
            'model_name',
            'object_id',
            'object_repr',
            'changes',
            'old_values',
            'new_values',
            'ip_address',
            'user_agent',
            'request_id',
            'session_key',
            'extra_data',
            'error_message',
            'is_successful',
        ]
        read_only_fields = fields
    
    def get_user_display(self, obj):
        """Get user display name."""
        if obj.user:
            return {
                'id': str(obj.user.id),
                'username': obj.user.username,
                'email': getattr(obj.user, 'email', None),
            }
        return None


class AuditLogRetentionSerializer(serializers.ModelSerializer):
    """Serializer for audit log retention policies."""
    
    class Meta:
        model = AuditLogRetention
        fields = [
            'id',
            'model_name',
            'retention_days',
            'is_active',
            'created_at',
            'updated_at',
        ]