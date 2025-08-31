from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, F, Count, Max
from django.utils import timezone
from .models import ChatConversation, ChatMessage, ChatTemplate, CallSession
from .serializers import (
    ChatConversationSerializer, ChatMessageSerializer, 
    ChatTemplateSerializer, SendMessageSerializer
)
import json

class ChatConversationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for chat conversations
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChatConversationSerializer
    
    def get_queryset(self):
        """
        Return conversations for the current user (as consumer or business)
        """
        user = self.request.user
        
        # Check if user is in business mode or consumer mode
        mode = self.request.query_params.get('mode', 'consumer')
        
        if mode == 'business':
            queryset = ChatConversation.objects.filter(
                business=user,
                is_active=True
            )
        else:
            queryset = ChatConversation.objects.filter(
                consumer=user,
                is_active=True
            )
        
        # Add annotations for last message
        queryset = queryset.annotate(
            last_message_text=Max('messages__text_content'),
            unread_count=Count('messages', filter=Q(messages__is_read=False))
        )
        
        return queryset.order_by('-last_message_at')
    
    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        """
        Start a new conversation with a business
        """
        business_id = request.data.get('business_id')
        initial_message = request.data.get('message', '')
        
        if not business_id:
            return Response(
                {'error': 'Business ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            business = User.objects.get(id=business_id, is_business=True)
        except User.DoesNotExist:
            return Response(
                {'error': 'Business not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create conversation
        conversation, created = ChatConversation.objects.get_or_create(
            consumer=request.user,
            business=business,
            defaults={'last_message_at': timezone.now()}
        )
        
        # Send initial message if provided
        if initial_message:
            message = ChatMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                sender_type='consumer',
                text_content=initial_message,
                is_delivered=True,
                delivered_at=timezone.now()
            )
            
            # Update conversation
            conversation.last_message_at = timezone.now()
            conversation.business_unread_count = F('business_unread_count') + 1
            conversation.save()
            
            # Send WebSocket notification to business
            self.send_websocket_notification(business, message)
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Mark all messages in conversation as read
        """
        conversation = self.get_object()
        user = request.user
        
        # Determine which messages to mark as read
        if user == conversation.consumer:
            messages = conversation.messages.filter(
                sender_type='business',
                is_read=False
            )
            conversation.consumer_unread_count = 0
        else:
            messages = conversation.messages.filter(
                sender_type='consumer',
                is_read=False
            )
            conversation.business_unread_count = 0
        
        # Mark messages as read
        messages.update(is_read=True, read_at=timezone.now())
        conversation.save()
        
        return Response({'status': 'Messages marked as read'})
    
    @action(detail=True, methods=['post'])
    def initiate_call(self, request, pk=None):
        """
        Initiate a voice or video call
        """
        conversation = self.get_object()
        user = request.user
        call_type = request.data.get('call_type', 'voice')  # 'voice' or 'video'
        
        # Validate call type
        if call_type not in ['voice', 'video']:
            return Response(
                {'error': 'Invalid call type. Must be "voice" or "video"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine participants
        if user == conversation.consumer:
            caller = conversation.consumer
            callee = conversation.business
        else:
            caller = conversation.business
            callee = conversation.consumer
        
        # Generate unique session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Create call message in chat
        call_message = ChatMessage.objects.create(
            conversation=conversation,
            sender=caller,
            sender_type='consumer' if caller == conversation.consumer else 'business',
            message_type='voice_call' if call_type == 'voice' else 'video_call',
            text_content=f'{call_type.title()} call initiated',
            call_status='initiated',
            call_session_id=session_id,
            call_started_at=timezone.now(),
            is_delivered=True,
            delivered_at=timezone.now()
        )
        
        # Create call session
        call_session = CallSession.objects.create(
            session_id=session_id,
            conversation=conversation,
            call_message=call_message,
            caller=caller,
            callee=callee,
            call_type=call_type,
            status='initiating'
        )
        
        # Update conversation last message time
        conversation.last_message_at = timezone.now()
        conversation.save()
        
        # Send call notification to callee
        self.send_call_notification(callee, call_session)
        
        return Response({
            'success': True,
            'session_id': session_id,
            'call_type': call_type,
            'message': f'{call_type.title()} call initiated successfully'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def accept_call(self, request, pk=None):
        """
        Accept an incoming call
        """
        conversation = self.get_object()
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the call session
        try:
            call_session = CallSession.objects.get(
                session_id=session_id,
                conversation=conversation,
                callee=request.user,
                status__in=['initiating', 'ringing']
            )
        except CallSession.DoesNotExist:
            return Response(
                {'error': 'Call session not found or already handled'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update call session status
        call_session.status = 'connecting'
        call_session.started_at = timezone.now()
        call_session.save()
        
        # Update associated message
        if call_session.call_message:
            call_session.call_message.call_status = 'answered'
            call_session.call_message.save()
        
        return Response({
            'success': True,
            'session_id': session_id,
            'message': 'Call accepted successfully'
        })
    
    @action(detail=True, methods=['post'])
    def decline_call(self, request, pk=None):
        """
        Decline an incoming call
        """
        conversation = self.get_object()
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the call session
        try:
            call_session = CallSession.objects.get(
                session_id=session_id,
                conversation=conversation,
                callee=request.user,
                status__in=['initiating', 'ringing']
            )
        except CallSession.DoesNotExist:
            return Response(
                {'error': 'Call session not found or already handled'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update call session status
        call_session.status = 'ended'
        call_session.ended_at = timezone.now()
        call_session.save()
        
        # Update associated message
        if call_session.call_message:
            call_session.call_message.call_status = 'declined'
            call_session.call_message.call_ended_at = timezone.now()
            call_session.call_message.save()
        
        return Response({
            'success': True,
            'message': 'Call declined successfully'
        })
    
    @action(detail=True, methods=['post'])
    def end_call(self, request, pk=None):
        """
        End an active call
        """
        conversation = self.get_object()
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the call session
        try:
            call_session = CallSession.objects.get(
                session_id=session_id,
                conversation=conversation,
                status__in=['connecting', 'active']
            )
            
            # Verify user is part of this call
            if request.user not in [call_session.caller, call_session.callee]:
                return Response(
                    {'error': 'Not authorized to end this call'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except CallSession.DoesNotExist:
            return Response(
                {'error': 'Active call session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # End the call session
        call_session.end_session()
        
        return Response({
            'success': True,
            'duration': call_session.duration,
            'message': 'Call ended successfully'
        })
    
    @action(detail=True, methods=['post'])
    def update_webrtc_data(self, request, pk=None):
        """
        Update WebRTC offer/answer/ICE candidates for call session
        """
        conversation = self.get_object()
        session_id = request.data.get('session_id')
        data_type = request.data.get('type')  # 'offer', 'answer', 'ice_candidate'
        data = request.data.get('data')
        
        if not all([session_id, data_type, data]):
            return Response(
                {'error': 'session_id, type, and data are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the call session
        try:
            call_session = CallSession.objects.get(
                session_id=session_id,
                conversation=conversation,
                status__in=['initiating', 'ringing', 'connecting', 'active']
            )
            
            # Verify user is part of this call
            if request.user not in [call_session.caller, call_session.callee]:
                return Response(
                    {'error': 'Not authorized to update this call'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except CallSession.DoesNotExist:
            return Response(
                {'error': 'Call session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update WebRTC data based on type
        if data_type == 'offer':
            call_session.offer_sdp = data
        elif data_type == 'answer':
            call_session.answer_sdp = data
            call_session.status = 'active'  # Call becomes active when answer is set
        elif data_type == 'ice_candidate':
            candidates = call_session.ice_candidates or []
            candidates.append(data)
            call_session.ice_candidates = candidates
        
        call_session.save()
        
        # Notify the other participant about the WebRTC data update
        other_user = call_session.callee if request.user == call_session.caller else call_session.caller
        self.send_webrtc_update_notification(other_user, session_id, data_type, data)
        
        return Response({
            'success': True,
            'message': f'WebRTC {data_type} updated successfully'
        })
    
    @action(detail=False, methods=['get'])
    def call_history(self, request):
        """
        Get call history for the current user
        """
        user = request.user
        
        # Get all call messages for conversations involving this user
        call_messages = ChatMessage.objects.filter(
            Q(conversation__consumer=user) | Q(conversation__business=user),
            message_type__in=['voice_call', 'video_call'],
            call_status__in=['completed', 'missed', 'declined']
        ).select_related('conversation', 'sender').order_by('-created_at')
        
        call_history = []
        for message in call_messages:
            # Determine call direction
            direction = 'outgoing' if message.sender == user else 'incoming'
            
            # Get other participant
            other_participant = (
                message.conversation.business 
                if user == message.conversation.consumer 
                else message.conversation.consumer
            )
            
            call_history.append({
                'id': message.id,
                'call_type': message.message_type.replace('_call', ''),
                'direction': direction,
                'status': message.call_status,
                'duration': message.call_duration or 0,
                'contact': {
                    'name': getattr(other_participant, 'business_name', '') or 
                            f"{getattr(other_participant, 'first_name', '')} {getattr(other_participant, 'last_name', '')}".strip() or 
                            other_participant.email,
                    'email': other_participant.email
                },
                'timestamp': message.created_at.isoformat(),
                'formatted_duration': self.format_call_duration(message.call_duration or 0)
            })
        
        return Response({
            'success': True,
            'call_history': call_history
        })
    
    def format_call_duration(self, seconds):
        """Format call duration in MM:SS format"""
        if seconds == 0:
            return "00:00"
        minutes = seconds // 60
        seconds = seconds % 60
        return f"{minutes:02d}:{seconds:02d}"
    
    def send_call_notification(self, user, call_session):
        """
        Send call notification to user via WebSocket/Push
        """
        # TODO: Implement WebSocket/Push notification for incoming calls
        print(f"[Call] Sending call notification to {user.email} for session {call_session.session_id}")
        pass
    
    def send_webrtc_update_notification(self, user, session_id, data_type, data):
        """
        Send WebRTC data update notification
        """
        # TODO: Implement WebSocket notification for WebRTC signaling
        print(f"[WebRTC] Sending {data_type} update to {user.email} for session {session_id}")
        pass
    
    def send_websocket_notification(self, user, message):
        """
        Send real-time notification via WebSocket
        """
        # This will be implemented with Django Channels
        pass


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    API endpoints for chat messages
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChatMessageSerializer
    
    def get_queryset(self):
        """
        Return messages for a specific conversation
        """
        conversation_id = self.request.query_params.get('conversation_id')
        
        if not conversation_id:
            return ChatMessage.objects.none()
        
        # Verify user has access to this conversation
        user = self.request.user
        conversation = get_object_or_404(
            ChatConversation,
            Q(consumer=user) | Q(business=user),
            id=conversation_id
        )
        
        return ChatMessage.objects.filter(
            conversation=conversation,
            is_deleted=False
        ).order_by('created_at')
    
    def create(self, request):
        """
        Send a new message
        """
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        conversation_id = serializer.validated_data['conversation_id']
        text_content = serializer.validated_data.get('text_content', '')
        message_type = serializer.validated_data.get('message_type', 'text')
        order_data = serializer.validated_data.get('order_data', None)
        
        # Get conversation and verify access
        user = request.user
        conversation = get_object_or_404(
            ChatConversation,
            Q(consumer=user) | Q(business=user),
            id=conversation_id
        )
        
        # Determine sender type
        if user == conversation.consumer:
            sender_type = 'consumer'
            conversation.business_unread_count = F('business_unread_count') + 1
        else:
            sender_type = 'business'
            conversation.consumer_unread_count = F('consumer_unread_count') + 1
        
        # Create message
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            sender_type=sender_type,
            message_type=message_type,
            text_content=text_content,
            order_data=order_data,
            is_delivered=True,
            delivered_at=timezone.now()
        )
        
        # Update conversation
        conversation.last_message_at = timezone.now()
        conversation.save()
        
        # Send WebSocket notification
        recipient = conversation.business if sender_type == 'consumer' else conversation.consumer
        self.send_websocket_notification(recipient, message)
        
        response_serializer = ChatMessageSerializer(message)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def create_order_from_chat(self, request):
        """
        Convert chat messages into an order
        """
        conversation_id = request.data.get('conversation_id')
        selected_items = request.data.get('items', [])
        delivery_address = request.data.get('delivery_address', '')
        
        if not conversation_id or not selected_items:
            return Response(
                {'error': 'Conversation ID and items are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get conversation
        conversation = get_object_or_404(
            ChatConversation,
            Q(consumer=request.user) | Q(business=request.user),
            id=conversation_id
        )
        
        # Create order data
        order_data = {
            'items': selected_items,
            'delivery_address': delivery_address,
            'total_amount': sum(item.get('price', 0) * item.get('quantity', 1) for item in selected_items),
            'created_from_chat': True
        }
        
        # Create system message with order
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            sender_type='system',
            message_type='order_request',
            text_content='Order created from chat',
            order_data=order_data
        )
        
        # TODO: Create actual order in sales system
        # order = create_order_from_chat_data(conversation, order_data)
        
        return Response({
            'message': 'Order created successfully',
            'order_data': order_data
        }, status=status.HTTP_201_CREATED)
    
    def send_websocket_notification(self, user, message):
        """
        Send real-time notification via WebSocket
        """
        # This will be implemented with Django Channels
        pass


class ChatTemplateViewSet(viewsets.ModelViewSet):
    """
    Quick reply templates for businesses
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChatTemplateSerializer
    
    def get_queryset(self):
        """
        Return templates for the current business user
        """
        return ChatTemplate.objects.filter(
            business=self.request.user,
            is_active=True
        ).order_by('-usage_count')
    
    def perform_create(self, serializer):
        """
        Set the business as the current user
        """
        serializer.save(business=self.request.user)
    
    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """
        Track template usage
        """
        template = self.get_object()
        template.usage_count = F('usage_count') + 1
        template.save()
        
        return Response({'content': template.content})