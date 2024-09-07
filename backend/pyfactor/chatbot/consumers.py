import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger
from users.models import UserProfile
from .models import ChatMessage

logger = get_logger()
User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.debug(f"Attempting to connect. Scope: {self.scope}")
        self.user = self.scope["user"]
        logger.info(f"User connecting: {self.user}")
        
        if self.user.is_authenticated:
            self.username = self.user.email
            sanitized_username = self.username.replace('@', '_').replace('.', '_')  # Sanitize the email
            self.room_name = f"chat_{sanitized_username}"
            self.room_group_name = f"chat_{sanitized_username}"
            self.database_name = await self.get_user_database(self.user)
            
            logger.info(f"Authenticated user connecting: {self.username}")
            logger.debug(f"Database name: {self.database_name}")
            
            if not self.database_name:
                logger.warning("No database name found. Closing connection.")
                await self.close()
                return

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"Added {self.username} to group {self.room_group_name}")
            await self.accept()
            logger.info(f"WebSocket connection accepted for {self.username}")
        else:
            logger.warning("Unauthenticated user attempted to connect. Closing connection.")
            await self.close()

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected for user {self.username} with code {close_code}")
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)


    async def receive(self, text_data):
        logger.debug(f"Received message: {text_data}")
        if not self.user.is_authenticated:
            logger.warning(f"Unauthenticated user tried to send a message. User: {self.user}")
            await self.send(text_data=json.dumps({
                'error': 'You must be logged in to send messages'
            }))
            return

        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        # Save the message to the database
        chat_message = await self.save_message(self.user.id, message)
        
        if chat_message:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': self.username,
                    'message_id': str(chat_message.id)
                }
            )
        else:
            logger.error("Failed to save chat message")
            await self.send(text_data=json.dumps({
                'error': 'Failed to save your message. Please try again.'
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, user_id, message):
        try:
            if not self.database_name:
                logger.error(f"No database name found for user {user_id}")
                return None

            user = User.objects.get(id=user_id)
            chat_message = ChatMessage.objects.using(self.database_name).create(
                user=user,
                message=message,
                is_from_user=True
            )
            logger.debug(f"Message saved: {chat_message.id} in database {self.database_name}")
            return chat_message
        except ObjectDoesNotExist:
            logger.error(f"User with id {user_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            return None

    @database_sync_to_async
    def get_user_database(self, user):
        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
            return user_profile.database_name
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile does not exist for user: {user}")
            return None

    @database_sync_to_async
    def ensure_database_exists(self, database_name):
        from pyfactor.userDatabaseRouter import UserDatabaseRouter
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

class StaffChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("staff_chat", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("staff_chat", self.channel_name)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        await self.channel_layer.group_send(
            "staff_chat",
            {
                'type': 'chat_message',
                'message': message
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))