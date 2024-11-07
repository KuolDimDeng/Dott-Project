#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import OnboardingProgress
from business.models import Business
from users.models import UserProfile
from django.contrib.auth import get_user_model
from users.utils import create_user_database, setup_user_database
from .tasks import setup_user_database_task

logger = logging.getLogger(__name__)
User = get_user_model()

class OnboardingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info("Connecting via websocket...")
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'onboarding_{self.user_id}'

        # Authenticate the user
        self.user = self.scope.get('user', None)
        if not self.user or self.user.is_anonymous:
            logger.error(f"Failed to authenticate user for WebSocket connection. User ID: {self.user_id}")
            await self.close()
            return

        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"WebSocket connected for user {self.user_id}")

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected for user {self.user_id} with code {close_code}")
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            logger.info(f"Received message type: {message_type}")

            if message_type == 'start_setup':
                await self.start_database_setup()
            elif message_type == 'check_status':
                task_id = text_data_json.get('task_id')
                if task_id:
                    await self.check_task_status(task_id)
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message")
            await self.send_error("Invalid message format")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    async def start_database_setup(self):
        try:
            logger.info(f"Starting database setup for user: {self.user.email}")
            
            # Get the business for this user
            business = await self.get_user_business()
            if not business:
                raise ValueError("Business not found")

            # Start the Celery task
            task = setup_user_database_task.delay(
                str(self.user.id),
                str(business.id)
            )
            
            # Send task ID back to client
            await self.send(text_data=json.dumps({
                'type': 'task_started',
                'task_id': task.id
            }))
            
            logger.info(f"Database setup task started with ID: {task.id}")
            
        except Exception as e:
            logger.error(f"Error starting database setup: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    @database_sync_to_async
    def get_user_business(self):
        return Business.objects.filter(owner=self.user).first()

    async def onboarding_progress(self, event):
        """Handle progress updates from Celery task"""
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'progress': event['progress'],
            'step': event['step'],
            'status': 'in_progress'
        }))

    async def onboarding_complete(self, event):
        """Handle completion notification from Celery task"""
        await self.send(text_data=json.dumps({
            'type': 'complete',
            'status': 'completed',
            'message': 'Setup completed successfully'
        }))

    async def error(self, event):
        """Handle error messages"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'status': 'failed',
            'message': event['message']
        }))

    async def send_error(self, message):
        """Helper method to send error messages"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'status': 'failed',
            'message': message
        }))