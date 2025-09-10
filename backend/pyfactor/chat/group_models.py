"""
P2P Group Chat Models
Supports end-to-end encrypted group messaging with mesh networking
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import json
from cryptography.fernet import Fernet

User = get_user_model()

class GroupChat(models.Model):
    """
    Group chat with P2P mesh networking support
    """
    GROUP_TYPES = [
        ('private', 'Private Group'),
        ('business', 'Business Group'),
        ('broadcast', 'Broadcast Channel'),
        ('community', 'Community Group'),
    ]
    
    ENCRYPTION_TYPES = [
        ('none', 'No Encryption'),
        ('e2e', 'End-to-End Encrypted'),
        ('server', 'Server-Side Encrypted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    
    # Group configuration
    group_type = models.CharField(max_length=20, choices=GROUP_TYPES, default='private')
    encryption_type = models.CharField(max_length=20, choices=ENCRYPTION_TYPES, default='e2e')
    
    # E2E Encryption keys
    group_key = models.BinaryField(max_length=256, null=True, blank=True,
                                  help_text='Encrypted group key for E2E encryption')
    key_rotation_counter = models.IntegerField(default=0,
                                              help_text='Counter for key rotation')
    last_key_rotation = models.DateTimeField(null=True, blank=True)
    
    # P2P Configuration
    enable_p2p = models.BooleanField(default=True,
                                    help_text='Enable P2P mesh networking for this group')
    mesh_topology = models.CharField(max_length=20, choices=[
        ('full', 'Full Mesh - Everyone connects to everyone'),
        ('star', 'Star - Central node relays'),
        ('hybrid', 'Hybrid - Mix of P2P and server relay'),
    ], default='hybrid')
    
    # Group settings
    max_members = models.IntegerField(
        default=256,
        validators=[MinValueValidator(2), MaxValueValidator(1000)]
    )
    allow_voice_notes = models.BooleanField(default=True)
    allow_video_calls = models.BooleanField(default=True)
    allow_file_sharing = models.BooleanField(default=True)
    allow_member_invites = models.BooleanField(default=False)
    
    # Message settings
    message_retention_days = models.IntegerField(
        default=90,
        help_text='Days to retain messages (0 = forever)'
    )
    enable_disappearing_messages = models.BooleanField(default=False)
    disappearing_message_seconds = models.IntegerField(
        default=86400,  # 24 hours
        help_text='Seconds before messages disappear'
    )
    
    # Permissions
    only_admins_can_post = models.BooleanField(default=False)
    require_approval = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)
    
    # Creator and timestamps
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, 
                                  null=True, related_name='created_groups')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Statistics
    total_messages = models.IntegerField(default=0)
    total_media_shared = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'group_chats'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['group_type', 'is_public']),
            models.Index(fields=['-updated_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_group_type_display()})"
    
    def generate_group_key(self):
        """Generate a new group encryption key"""
        key = Fernet.generate_key()
        self.group_key = key
        self.key_rotation_counter += 1
        self.last_key_rotation = timezone.now()
        self.save()
        return key
    
    @property
    def member_count(self):
        return self.members.filter(is_active=True).count()
    
    @property
    def is_full(self):
        return self.member_count >= self.max_members


class GroupMember(models.Model):
    """
    Group membership with encryption keys
    """
    MEMBER_ROLES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    ]
    
    CONNECTION_STATUS = [
        ('connected', 'Connected via P2P'),
        ('relay', 'Connected via Server'),
        ('offline', 'Offline'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    
    # Role and permissions
    role = models.CharField(max_length=20, choices=MEMBER_ROLES, default='member')
    can_post = models.BooleanField(default=True)
    can_invite = models.BooleanField(default=False)
    can_moderate = models.BooleanField(default=False)
    
    # E2E Encryption
    encrypted_group_key = models.BinaryField(
        max_length=512,
        help_text='Group key encrypted with member\'s public key'
    )
    public_key = models.TextField(help_text='Member\'s public key for E2E encryption')
    key_fingerprint = models.CharField(max_length=64, help_text='SHA256 of public key')
    
    # P2P Networking
    peer_id = models.CharField(max_length=100, unique=True, 
                              help_text='Unique peer ID for P2P connections')
    connection_status = models.CharField(max_length=20, choices=CONNECTION_STATUS, 
                                        default='offline')
    last_seen_ip = models.GenericIPAddressField(null=True, blank=True)
    nat_type = models.CharField(max_length=20, blank=True,
                               help_text='NAT type for P2P connectivity')
    
    # P2P mesh connections
    connected_peers = models.JSONField(default=list,
                                      help_text='List of peer IDs this member is connected to')
    connection_quality = models.JSONField(default=dict,
                                        help_text='Connection quality metrics to other peers')
    
    # Status
    is_active = models.BooleanField(default=True)
    is_muted = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    
    # Timestamps
    joined_at = models.DateTimeField(default=timezone.now)
    last_read_at = models.DateTimeField(null=True, blank=True)
    last_active_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Message counts
    messages_sent = models.IntegerField(default=0)
    unread_count = models.IntegerField(default=0)
    
    # Invitation tracking
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, 
                                  null=True, blank=True, related_name='group_invitations')
    invitation_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'group_members'
        unique_together = ['group', 'user']
        ordering = ['role', 'joined_at']
        indexes = [
            models.Index(fields=['group', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['peer_id']),
            models.Index(fields=['connection_status']),
        ]
    
    def __str__(self):
        return f"{self.user.email} in {self.group.name} ({self.role})"
    
    def update_connection_status(self, status, peers=None):
        """Update P2P connection status"""
        self.connection_status = status
        self.last_active_at = timezone.now()
        if peers:
            self.connected_peers = peers
        self.save()


class GroupMessage(models.Model):
    """
    Messages in group chat with E2E encryption support
    """
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('voice', 'Voice Note'),
        ('file', 'File'),
        ('location', 'Location'),
        ('system', 'System Message'),
        ('key_update', 'Key Update'),
    ]
    
    DELIVERY_STATUS = [
        ('sending', 'Sending'),
        ('sent', 'Sent to Server'),
        ('delivered', 'Delivered to Peers'),
        ('read', 'Read by Some'),
        ('read_all', 'Read by All'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(GroupMember, on_delete=models.SET_NULL, 
                              null=True, related_name='sent_messages')
    
    # Message content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    
    # Encrypted content (for E2E groups)
    encrypted_content = models.BinaryField(null=True, blank=True,
                                          help_text='E2E encrypted message content')
    encryption_iv = models.CharField(max_length=32, blank=True,
                                    help_text='Initialization vector for encryption')
    
    # Plaintext content (for non-E2E groups or system messages)
    text_content = models.TextField(blank=True)
    
    # Media attachments
    media_url = models.URLField(blank=True)
    media_thumbnail_url = models.URLField(blank=True)
    media_size = models.IntegerField(null=True, blank=True)
    media_duration = models.IntegerField(null=True, blank=True, help_text='Duration in seconds')
    
    # Reply threading
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, 
                                null=True, blank=True, related_name='replies')
    
    # Delivery tracking
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS, default='sending')
    delivered_to = models.JSONField(default=list,
                                   help_text='List of member IDs who received the message')
    read_by = models.JSONField(default=list,
                               help_text='List of member IDs who read the message')
    
    # P2P routing
    relay_path = models.JSONField(default=list,
                                 help_text='P2P routing path for message delivery')
    delivery_method = models.CharField(max_length=20, choices=[
        ('p2p', 'Direct P2P'),
        ('mesh', 'P2P Mesh'),
        ('server', 'Server Relay'),
        ('hybrid', 'Hybrid Delivery'),
    ], default='hybrid')
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    edited_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True,
                                     help_text='For disappearing messages')
    
    # Flags
    is_pinned = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    
    # Reactions
    reactions = models.JSONField(default=dict,
                                help_text='Emoji reactions by member IDs')
    
    class Meta:
        db_table = 'group_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['group', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['delivery_status']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Message in {self.group.name} by {self.sender.user.email if self.sender else 'System'}"
    
    def mark_delivered(self, member_id):
        """Mark message as delivered to a member"""
        if member_id not in self.delivered_to:
            self.delivered_to.append(member_id)
            self.save()
    
    def mark_read(self, member_id):
        """Mark message as read by a member"""
        if member_id not in self.read_by:
            self.read_by.append(member_id)
            self.mark_delivered(member_id)
            self.save()


class P2PConnection(models.Model):
    """
    Track P2P connections between group members
    """
    CONNECTION_TYPES = [
        ('webrtc', 'WebRTC Data Channel'),
        ('websocket', 'WebSocket Relay'),
        ('turn', 'TURN Relay'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='p2p_connections')
    
    # Connection endpoints
    peer_a = models.ForeignKey(GroupMember, on_delete=models.CASCADE, related_name='connections_as_a')
    peer_b = models.ForeignKey(GroupMember, on_delete=models.CASCADE, related_name='connections_as_b')
    
    # Connection details
    connection_type = models.CharField(max_length=20, choices=CONNECTION_TYPES)
    connection_id = models.CharField(max_length=100, unique=True)
    
    # WebRTC specifics
    offer_sdp = models.TextField(blank=True)
    answer_sdp = models.TextField(blank=True)
    ice_candidates = models.JSONField(default=list)
    
    # Connection quality
    latency_ms = models.IntegerField(null=True, blank=True)
    packet_loss_percent = models.FloatField(null=True, blank=True)
    bandwidth_kbps = models.IntegerField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    established_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(auto_now=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    messages_exchanged = models.IntegerField(default=0)
    bytes_transferred = models.BigIntegerField(default=0)
    
    class Meta:
        db_table = 'p2p_connections'
        unique_together = ['group', 'peer_a', 'peer_b']
        indexes = [
            models.Index(fields=['group', 'is_active']),
            models.Index(fields=['connection_id']),
        ]
    
    def __str__(self):
        return f"P2P: {self.peer_a.user.email} <-> {self.peer_b.user.email}"


class GroupCallSession(models.Model):
    """
    Group video/voice calls with P2P mesh support
    """
    CALL_TYPES = [
        ('voice', 'Voice Call'),
        ('video', 'Video Call'),
        ('screen', 'Screen Share'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='call_sessions')
    
    # Call details
    call_type = models.CharField(max_length=20, choices=CALL_TYPES)
    initiated_by = models.ForeignKey(GroupMember, on_delete=models.SET_NULL, 
                                    null=True, related_name='initiated_calls')
    
    # SFU/MCU configuration (if not pure P2P)
    use_sfu = models.BooleanField(default=False, help_text='Use Selective Forwarding Unit')
    sfu_url = models.URLField(blank=True)
    
    # Participants
    max_participants = models.IntegerField(default=10)
    
    # Recording
    is_recording = models.BooleanField(default=False)
    recording_url = models.URLField(blank=True)
    recording_consent = models.JSONField(default=dict,
                                        help_text='Consent status by member ID')
    
    # Timestamps
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'group_call_sessions'
        ordering = ['-started_at']
    
    @property
    def duration(self):
        if self.ended_at:
            return (self.ended_at - self.started_at).total_seconds()
        return 0


class GroupCallParticipant(models.Model):
    """
    Participants in group calls
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    call_session = models.ForeignKey(GroupCallSession, on_delete=models.CASCADE, 
                                    related_name='participants')
    member = models.ForeignKey(GroupMember, on_delete=models.CASCADE)
    
    # Media states
    audio_enabled = models.BooleanField(default=True)
    video_enabled = models.BooleanField(default=False)
    screen_sharing = models.BooleanField(default=False)
    
    # Connection quality
    connection_quality = models.CharField(max_length=20, choices=[
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    ], default='good')
    
    # Timestamps
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'group_call_participants'
        unique_together = ['call_session', 'member']