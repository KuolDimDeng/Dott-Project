# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/consumers.py

import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import OnboardingProgress
from business.models import Business
from users.models import UserProfile
from django.contrib.auth import get_user_model
from users.utils import create_user_database, setup_user_database
from .tasks import setup_user_database_task
from pyfactor.logging_config import get_logger
from django.utils import timezone


logger = get_logger()
User = get_user_model()

class OnboardingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Get user ID from URL route
            self.user_id = self.scope['url_route']['kwargs']['user_id']
            self.group_name = f'onboarding_{self.user_id}'
            self.is_connected = False

            # Authenticate the user
            self.user = self.scope.get('user')
            if not self.user or self.user.is_anonymous:
                logger.error(f"Failed to authenticate user for WebSocket connection. User ID: {self.user_id}")
                await self.close(code=4003)
                return

            # Verify user is authorized for this connection
            if str(self.user.id) != self.user_id:
                logger.error(f"User {self.user.id} attempted to connect to feed for user {self.user_id}")
                await self.close(code=4004)
                return

            # Join the group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            # Mark connection as established
            self.is_connected = True
            await self.accept()
            
            # Send initial connection success message
            await self.send_json({
                'type': 'connection_established',
                'message': 'WebSocket connection established',
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
            
            logger.info(f"WebSocket connected for user {self.user.email}")

        except Exception as e:
            logger.error(f"Error in WebSocket connect: {str(e)}", exc_info=True)
            await self.close(code=4500)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            self.is_connected = False
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
            logger.info(f"WebSocket disconnected for user {self.user_id} with code {close_code}")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {str(e)}", exc_info=True)

       # Add this method to handle send_progress messages
  # Then update the send_progress method:
    async def send_progress(self, event):
        """
        Handle progress update messages
        """
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'progress': event.get('progress', 0),
            'step': event.get('step', ''),
            'status': event.get('status', 'in_progress'),
            'timestamp': timezone.now().isoformat()
        }))


    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        if not self.is_connected:
            logger.warning("Received message on disconnected socket")
            return

        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            logger.info(f"Received message type: {message_type}")

            handlers = {
                'start_setup': self.start_database_setup,
                'check_status': lambda: self.check_task_status(text_data_json.get('task_id')),
                'ping': self.handle_ping,
                'cancel_setup': self.cancel_setup
            }

            handler = handlers.get(message_type)
            if handler:
                await handler()
            else:
                logger.warning(f"Unknown message type received: {message_type}")
                await self.send_error("Unsupported message type")

        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message")
            await self.send_error("Invalid message format")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    async def start_database_setup(self):
        """Start database setup process"""
        try:
            logger.info(f"Starting database setup for user: {self.user.email}")
            
            # Get the business for this user
            business = await self.get_user_business()
            if not business:
                raise ValueError("Business not found")

            # Check if setup is already in progress
            if await self.is_setup_in_progress():
                raise ValueError("Database setup already in progress")

            # Start the Celery task
            task = setup_user_database_task.delay(
                str(self.user.id),
                str(business.id)
            )
            
            # Update onboarding progress
            await self.update_onboarding_progress(task.id)
            
            # Send task ID back to client
            await self.send_json({
                'type': 'task_started',
                'task_id': task.id,
                'status': 'started',
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
            
            logger.info(f"Database setup task started with ID: {task.id}")
            
        except Exception as e:
            logger.error(f"Error starting database setup: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    async def check_task_status(self, task_id):
        """Check status of a running task"""
        if not task_id:
            await self.send_error("Task ID is required")
            return

        try:
            status = await self.get_task_status(task_id)
            await self.send_json({
                'type': 'task_status',
                'task_id': task_id,
                'status': status,
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Error checking task status: {str(e)}", exc_info=True)
            await self.send_error(f"Error checking task status: {str(e)}")

    async def cancel_setup(self):
        """Cancel ongoing setup process"""
        try:
            progress = await self.get_onboarding_progress()
            if progress and progress.database_setup_task_id:
                # Cancel the Celery task
                setup_user_database_task.AsyncResult(progress.database_setup_task_id).revoke(terminate=True)
                
                # Update progress record
                await self.update_onboarding_progress(None)
                
                await self.send_json({
                    'type': 'setup_cancelled',
                    'message': 'Setup process cancelled successfully',
                    'timestamp': datetime.datetime.utcnow().isoformat()
                })
            else:
                await self.send_error("No active setup process found")
        except Exception as e:
            logger.error(f"Error cancelling setup: {str(e)}", exc_info=True)
            await self.send_error(str(e))

    async def handle_ping(self):
        """Handle ping messages"""
        await self.send_json({
            'type': 'pong',
            'timestamp': datetime.datetime.utcnow().isoformat()
        })

    @database_sync_to_async
    def get_user_business(self):
        """Get user's business from database"""
        try:
            return Business.objects.select_related('owner').get(owner=self.user)
        except Business.DoesNotExist:
            logger.error(f"No business found for user {self.user.id}")
            return None

    @database_sync_to_async
    def is_setup_in_progress(self):
        """Check if setup is already in progress"""
        return OnboardingProgress.objects.filter(
            user=self.user,
            database_setup_task_id__isnull=False,
            setup_completed=False
        ).exists()

    @database_sync_to_async
    def update_onboarding_progress(self, task_id):
        """Update onboarding progress with task ID"""
        try:
            progress, created = OnboardingProgress.objects.get_or_create(
                user=self.user,
                defaults={'database_setup_task_id': task_id}
            )
            if not created:
                progress.database_setup_task_id = task_id
                progress.save()
            return progress
        except Exception as e:
            logger.error(f"Error updating onboarding progress: {str(e)}", exc_info=True)
            raise

    @database_sync_to_async
    def get_onboarding_progress(self):
        """Get current onboarding progress"""
        return OnboardingProgress.objects.filter(user=self.user).first()

    @database_sync_to_async
    def get_task_status(self, task_id):
        """Get status of a Celery task"""
        try:
            result = setup_user_database_task.AsyncResult(task_id)
            return {
                'state': result.state,
                'info': result.info if result.state == 'PROGRESS' else None
            }
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}", exc_info=True)
            raise

    async def send_json(self, content):
        """Helper method to send JSON response"""
        if not self.is_connected:
            logger.warning("Attempted to send message on disconnected socket")
            return
        try:
            await self.send(text_data=json.dumps(content))
        except Exception as e:
            logger.error(f"Error sending JSON message: {str(e)}", exc_info=True)

    async def onboarding_progress(self, event):
        """Handle progress updates from Celery task"""
        try:
            await self.send_json({
                'type': 'progress',
                'progress': event['progress'],
                'step': event['step'],
                'status': 'in_progress',
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending progress update: {str(e)}", exc_info=True)

    async def onboarding_complete(self, event):
        """Handle completion notification from Celery task"""
        try:
            await self.send_json({
                'type': 'complete',
                'status': 'completed',
                'database_name': event.get('database_name'),
                'message': 'Setup completed successfully',
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending completion message: {str(e)}", exc_info=True)

    async def send_error(self, message):
        """Helper method to send error messages"""
        try:
            await self.send_json({
                'type': 'error',
                'status': 'failed',
                'message': message,
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending error message: {str(e)}", exc_info=True)