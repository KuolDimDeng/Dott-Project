import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatConversation, ChatMessage
from .serializers import ChatMessageSerializer
from django.utils import timezone

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat
    """
    
    async def connect(self):
        """
        Accept WebSocket connection
        """
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        # Create a unique channel name for this user
        self.user_channel = f"user_{self.user.id}"

        # Join user's personal channel
        await self.channel_layer.group_add(
            self.user_channel,
            self.channel_name
        )

        # Join role-specific channels for order notifications
        if hasattr(self.user, 'is_business') and self.user.is_business:
            # Business owner channel
            self.business_channel = f"business_{self.user.id}"
            await self.channel_layer.group_add(
                self.business_channel,
                self.channel_name
            )

        if hasattr(self.user, 'is_consumer'):
            # Consumer channel
            self.consumer_channel = f"consumer_{self.user.id}"
            await self.channel_layer.group_add(
                self.consumer_channel,
                self.channel_name
            )

        # Check if user is a courier
        courier_profile = await self.get_courier_profile()
        if courier_profile:
            self.courier_channel = f"courier_{self.user.id}"
            await self.channel_layer.group_add(
                self.courier_channel,
                self.channel_name
            )

        # Join marketplace updates channel for all users (to receive business status updates)
        self.marketplace_channel = "marketplace_updates"
        await self.channel_layer.group_add(
            self.marketplace_channel,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to chat server'
        }))
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnect
        """
        if hasattr(self, 'user_channel'):
            # Leave user's personal channel
            await self.channel_layer.group_discard(
                self.user_channel,
                self.channel_name
            )

        if hasattr(self, 'marketplace_channel'):
            # Leave marketplace updates channel
            await self.channel_layer.group_discard(
                self.marketplace_channel,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'send_message':
                await self.handle_send_message(data)
            elif message_type == 'typing':
                await self.handle_typing_indicator(data)
            elif message_type == 'read_receipt':
                await self.handle_read_receipt(data)
            elif message_type == 'join_conversation':
                await self.handle_join_conversation(data)
            elif message_type == 'leave_conversation':
                await self.handle_leave_conversation(data)
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def handle_send_message(self, data):
        """
        Handle sending a new message
        """
        conversation_id = data.get('conversation_id')
        text_content = data.get('text_content', '')
        message_type = data.get('message_type', 'text')
        order_data = data.get('order_data', None)
        
        if not conversation_id:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'conversation_id is required'
            }))
            return
        
        # Save message to database
        message = await self.save_message(
            conversation_id, text_content, message_type, order_data
        )
        
        if not message:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to send message'
            }))
            return
        
        # Get recipient user
        recipient = await self.get_recipient(conversation_id)
        
        if recipient:
            # Send message to recipient
            await self.channel_layer.group_send(
                f"user_{recipient.id}",
                {
                    'type': 'chat_message',
                    'message': await self.serialize_message(message)
                }
            )
        
        # Send confirmation back to sender
        await self.send(text_data=json.dumps({
            'type': 'message_sent',
            'message': await self.serialize_message(message)
        }))
    
    async def handle_typing_indicator(self, data):
        """
        Handle typing indicator
        """
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', False)
        
        if not conversation_id:
            return
        
        recipient = await self.get_recipient(conversation_id)
        
        if recipient:
            await self.channel_layer.group_send(
                f"user_{recipient.id}",
                {
                    'type': 'typing_indicator',
                    'conversation_id': conversation_id,
                    'user_id': str(self.user.id),
                    'is_typing': is_typing
                }
            )
    
    async def handle_read_receipt(self, data):
        """
        Handle read receipt
        """
        message_ids = data.get('message_ids', [])
        
        if not message_ids:
            return
        
        # Mark messages as read
        await self.mark_messages_as_read(message_ids)
        
        # Notify sender about read receipt
        for message_id in message_ids:
            sender_id = await self.get_message_sender(message_id)
            if sender_id:
                await self.channel_layer.group_send(
                    f"user_{sender_id}",
                    {
                        'type': 'read_receipt',
                        'message_id': message_id,
                        'read_by': str(self.user.id),
                        'read_at': timezone.now().isoformat()
                    }
                )
    
    async def handle_join_conversation(self, data):
        """
        Join a conversation room for real-time updates
        """
        conversation_id = data.get('conversation_id')
        
        if not conversation_id:
            return
        
        # Verify user has access to this conversation
        has_access = await self.verify_conversation_access(conversation_id)
        
        if has_access:
            self.conversation_channel = f"conversation_{conversation_id}"
            await self.channel_layer.group_add(
                self.conversation_channel,
                self.channel_name
            )
            
            await self.send(text_data=json.dumps({
                'type': 'joined_conversation',
                'conversation_id': conversation_id
            }))
    
    async def handle_leave_conversation(self, data):
        """
        Leave a conversation room
        """
        if hasattr(self, 'conversation_channel'):
            await self.channel_layer.group_discard(
                self.conversation_channel,
                self.channel_name
            )
            del self.conversation_channel
    
    # WebSocket event handlers
    async def chat_message(self, event):
        """
        Send chat message to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    async def typing_indicator(self, event):
        """
        Send typing indicator to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'conversation_id': event['conversation_id'],
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))
    
    async def business_status_update(self, event):
        """
        Send business status update to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'business_status_update',
            'data': event['data']
        }))

    async def read_receipt(self, event):
        """
        Send read receipt to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'read_by': event['read_by'],
            'read_at': event['read_at']
        }))

    # Order notification handlers
    async def order_notification(self, event):
        """
        Send order notification to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': 'order_notification',
            'data': event['data']
        }))

    async def delivery_notification(self, event):
        """
        Send delivery notification to courier
        """
        await self.send(text_data=json.dumps({
            'type': 'delivery_notification',
            'data': event['data']
        }))

    async def order_update(self, event):
        """
        Send order update to all parties
        """
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'data': event['data']
        }))
    
    # Database operations
    @database_sync_to_async
    def get_courier_profile(self):
        """
        Check if user is a courier
        """
        try:
            from couriers.models import CourierProfile
            return CourierProfile.objects.filter(user=self.user).first()
        except:
            return None

    @database_sync_to_async
    def save_message(self, conversation_id, text_content, message_type, order_data):
        """
        Save message to database
        """
        try:
            conversation = ChatConversation.objects.get(
                id=conversation_id,
                is_active=True
            )
            
            # Verify user has access
            if self.user not in [conversation.consumer, conversation.business]:
                return None
            
            # Determine sender type
            if self.user == conversation.consumer:
                sender_type = 'consumer'
                conversation.business_unread_count += 1
            else:
                sender_type = 'business'
                conversation.consumer_unread_count += 1
            
            # Create message
            message = ChatMessage.objects.create(
                conversation=conversation,
                sender=self.user,
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
            
            return message
        
        except ChatConversation.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error saving message: {e}")
            return None
    
    @database_sync_to_async
    def get_recipient(self, conversation_id):
        """
        Get the recipient user for a conversation
        """
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
            
            if self.user == conversation.consumer:
                return conversation.business
            elif self.user == conversation.business:
                return conversation.consumer
            
            return None
        except ChatConversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def mark_messages_as_read(self, message_ids):
        """
        Mark messages as read
        """
        try:
            messages = ChatMessage.objects.filter(
                id__in=message_ids,
                is_read=False
            )
            
            for message in messages:
                # Verify user is the recipient
                if message.sender != self.user:
                    message.mark_as_read()
        except Exception as e:
            print(f"Error marking messages as read: {e}")
    
    @database_sync_to_async
    def get_message_sender(self, message_id):
        """
        Get the sender of a message
        """
        try:
            message = ChatMessage.objects.get(id=message_id)
            return message.sender.id
        except ChatMessage.DoesNotExist:
            return None
    
    @database_sync_to_async
    def verify_conversation_access(self, conversation_id):
        """
        Verify user has access to conversation
        """
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
            return self.user in [conversation.consumer, conversation.business]
        except ChatConversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def serialize_message(self, message):
        """
        Serialize message for WebSocket transmission
        """
        return {
            'id': str(message.id),
            'conversation_id': str(message.conversation.id),
            'sender_id': str(message.sender.id),
            'sender_name': message.sender.get_full_name() or message.sender.email,
            'sender_type': message.sender_type,
            'message_type': message.message_type,
            'text_content': message.text_content,
            'order_data': message.order_data,
            'created_at': message.created_at.isoformat(),
            'is_read': message.is_read,
            'is_delivered': message.is_delivered
        }