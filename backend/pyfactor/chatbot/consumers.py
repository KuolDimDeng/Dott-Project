import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger

logger = get_logger()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        self.room_name = f"chat_{self.username}"
        self.room_group_name = f"chat_{self.username}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        logger.debug(f"WebSocket connected for user {self.username}")
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.debug(f"WebSocket disconnected for user {self.username}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        
        # Save the message to the database
        chat_message = await self.save_message(self.scope['user'].id, message)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': self.username,
                'message_id': chat_message.id
            }
        )

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        message_id = event['message_id']

        await self.send(text_data=json.dumps({
            'message': message,
            'username': username,
            'message_id': message_id
        }))

    async def staff_response(self, event):
        message = event['message']
        user_id = event['user_id']
        message_id = event['message_id']

        await self.send(text_data=json.dumps({
            'message': message,
            'user_id': user_id,
            'message_id': message_id,
            'is_staff_response': True
        }))

    @database_sync_to_async
    def save_message(self, user_id, message):
        from .models import ChatMessage
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
            chat_message = ChatMessage.objects.create(user=user, message=message, is_from_user=True)
            logger.debug(f"Message saved: {chat_message.id}")
            return chat_message
        except ObjectDoesNotExist:
            logger.error(f"User with id {user_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            return None