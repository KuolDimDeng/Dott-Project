from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatConversation, ChatMessage, ChatTemplate

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for chat display"""
    business_name = serializers.CharField(source='userprofile.business_name', read_only=True)
    profile_image = serializers.CharField(source='userprofile.profile_image', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'business_name', 'profile_image']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages"""
    sender_info = UserBasicSerializer(source='sender', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'sender', 'sender_info', 'sender_type',
            'message_type', 'text_content', 'image_url', 'voice_url',
            'order_data', 'is_read', 'read_at', 'is_delivered', 'delivered_at',
            'created_at', 'time_ago', 'edited_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'created_at', 'delivered_at']
    
    def get_time_ago(self, obj):
        """Return human-readable time ago"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}m ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer for chat conversations"""
    consumer_info = UserBasicSerializer(source='consumer', read_only=True)
    business_info = UserBasicSerializer(source='business', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = [
            'id', 'consumer', 'consumer_info', 'business', 'business_info',
            'is_active', 'last_message_at', 'last_message', 'unread_count',
            'consumer_unread_count', 'business_unread_count',
            'related_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_message = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        if last_message:
            return {
                'text': last_message.text_content[:100],  # Preview only
                'sender_type': last_message.sender_type,
                'created_at': last_message.created_at,
                'message_type': last_message.message_type
            }
        return None
    
    def get_unread_count(self, obj):
        """Get unread count for current user"""
        request = self.context.get('request')
        if request and request.user:
            if request.user == obj.consumer:
                return obj.consumer_unread_count
            elif request.user == obj.business:
                return obj.business_unread_count
        return 0


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a new message"""
    conversation_id = serializers.UUIDField(required=True)
    text_content = serializers.CharField(required=False, allow_blank=True)
    message_type = serializers.ChoiceField(
        choices=['text', 'image', 'voice', 'order_request'],
        default='text'
    )
    image_url = serializers.URLField(required=False, allow_blank=True)
    voice_url = serializers.URLField(required=False, allow_blank=True)
    order_data = serializers.JSONField(required=False)
    
    def validate(self, data):
        """Ensure at least one content type is provided"""
        if not any([data.get('text_content'), data.get('image_url'), 
                   data.get('voice_url'), data.get('order_data')]):
            raise serializers.ValidationError(
                "At least one of text_content, image_url, voice_url, or order_data must be provided"
            )
        return data


class ChatTemplateSerializer(serializers.ModelSerializer):
    """Serializer for chat templates"""
    
    class Meta:
        model = ChatTemplate
        fields = [
            'id', 'business', 'title', 'content', 'category',
            'usage_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business', 'usage_count', 'created_at', 'updated_at']