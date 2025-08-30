from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, F, Count, Max
from django.utils import timezone
from .models import ChatConversation, ChatMessage, ChatTemplate
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