from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

class ChatConversation(models.Model):
    """
    Represents a conversation between a consumer and a business
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consumer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consumer_chats')
    business = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_chats')
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    # Unread counts
    consumer_unread_count = models.IntegerField(default=0)
    business_unread_count = models.IntegerField(default=0)
    
    # Order linkage (optional - when chat converts to order)
    related_order = models.ForeignKey('marketplace.ConsumerOrder', null=True, blank=True, 
                                     on_delete=models.SET_NULL, related_name='chat_conversations')
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_conversations'
        ordering = ['-last_message_at']
        unique_together = ['consumer', 'business']
        indexes = [
            models.Index(fields=['consumer', 'is_active']),
            models.Index(fields=['business', 'is_active']),
            models.Index(fields=['-last_message_at']),
        ]
    
    def __str__(self):
        return f"Chat: {self.consumer.email} <-> {self.business.business_name}"


class ChatMessage(models.Model):
    """
    Individual messages within a conversation
    """
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('image', 'Image'),
        ('voice', 'Voice Note'),
        ('voice_call', 'Voice Call'),
        ('video_call', 'Video Call'),
        ('order_request', 'Order Request'),
        ('order_confirmation', 'Order Confirmation'),
        ('system', 'System Message'),
    ]
    
    SENDER_TYPES = [
        ('consumer', 'Consumer'),
        ('business', 'Business'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, 
                                   related_name='messages')
    
    # Sender info
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    sender_type = models.CharField(max_length=20, choices=SENDER_TYPES)
    
    # Message content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    text_content = models.TextField(blank=True)
    
    # Media attachments
    image_url = models.URLField(blank=True, null=True)
    voice_url = models.URLField(blank=True, null=True)
    
    # Order creation from chat
    order_data = models.JSONField(null=True, blank=True)  # Stores parsed order info
    
    # Call-related fields
    call_duration = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Call duration in seconds"
    )
    call_status = models.CharField(
        max_length=15,
        choices=[
            ('initiated', 'Call Initiated'),
            ('ringing', 'Ringing'),
            ('answered', 'Answered'),
            ('completed', 'Completed'),
            ('missed', 'Missed'),
            ('declined', 'Declined'),
            ('failed', 'Failed'),
            ('busy', 'Busy'),
        ],
        null=True,
        blank=True,
        help_text="Status of the call"
    )
    call_session_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="WebRTC session identifier"
    )
    call_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the call was started"
    )
    call_ended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the call ended"
    )
    
    # Read receipts
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Delivery status
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['is_read', 'sender_type']),
        ]
    
    def __str__(self):
        return f"{self.sender.email}: {self.text_content[:50]}"
    
    def mark_as_read(self):
        """Mark message as read and update conversation unread count"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
            
            # Update unread count in conversation
            if self.sender_type == 'consumer':
                self.conversation.business_unread_count = max(0, self.conversation.business_unread_count - 1)
            else:
                self.conversation.consumer_unread_count = max(0, self.conversation.consumer_unread_count - 1)
            self.conversation.save()


class ChatTemplate(models.Model):
    """
    Quick reply templates for businesses
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_templates')
    
    title = models.CharField(max_length=100)
    content = models.TextField()
    category = models.CharField(max_length=50, blank=True)  # greeting, faq, order_status, etc.
    
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_templates'
        ordering = ['-usage_count', 'title']
    
    def __str__(self):
        return f"{self.business.business_name}: {self.title}"


class ChatNotificationSettings(models.Model):
    """
    User preferences for chat notifications
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='chat_settings')
    
    # Notification preferences
    push_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    sms_enabled = models.BooleanField(default=False)
    
    # Quiet hours (stored as hour integers, e.g., 22 for 10 PM)
    quiet_hours_start = models.IntegerField(null=True, blank=True)  # e.g., 22 (10 PM)
    quiet_hours_end = models.IntegerField(null=True, blank=True)    # e.g., 7 (7 AM)
    
    # Auto-reply for businesses
    auto_reply_enabled = models.BooleanField(default=False)
    auto_reply_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_notification_settings'
    
    def __str__(self):
        return f"Chat settings for {self.user.email}"


class CallSession(models.Model):
    """
    Active WebRTC call sessions for mobile voice/video calls
    """
    SESSION_STATUS_CHOICES = [
        ('initiating', 'Initiating'),
        ('ringing', 'Ringing'),
        ('connecting', 'Connecting'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique WebRTC session identifier"
    )
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='call_sessions',
        help_text="Associated chat conversation"
    )
    call_message = models.OneToOneField(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name='call_session',
        null=True,
        blank=True,
        help_text="Associated call message in chat"
    )
    
    # Call participants
    caller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='initiated_calls',
        help_text="User who initiated the call"
    )
    callee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_calls',
        help_text="User receiving the call"
    )
    
    # Call details
    call_type = models.CharField(
        max_length=10,
        choices=[('voice', 'Voice Call'), ('video', 'Video Call')],
        help_text="Type of call"
    )
    status = models.CharField(
        max_length=15,
        choices=SESSION_STATUS_CHOICES,
        default='initiating',
        help_text="Current session status"
    )
    
    # WebRTC data
    ice_servers = models.JSONField(
        default=list,
        help_text="ICE servers configuration for WebRTC"
    )
    offer_sdp = models.TextField(
        null=True,
        blank=True,
        help_text="WebRTC offer SDP from caller"
    )
    answer_sdp = models.TextField(
        null=True,
        blank=True,
        help_text="WebRTC answer SDP from callee"
    )
    ice_candidates = models.JSONField(
        default=list,
        help_text="ICE candidates exchange"
    )
    
    # Timing
    created_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'call_sessions'
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['caller', 'created_at']),
            models.Index(fields=['callee', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['conversation']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.call_type.title()} call: {self.caller.email} -> {self.callee.email} ({self.status})"
    
    @property
    def duration(self):
        """Calculate call duration in seconds"""
        if self.started_at and self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds())
        return 0
    
    def end_session(self):
        """End the call session and update related message"""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save()
        
        # Update associated call message
        if self.call_message:
            self.call_message.call_status = 'completed'
            self.call_message.call_duration = self.duration
            self.call_message.call_ended_at = self.ended_at
            self.call_message.save()