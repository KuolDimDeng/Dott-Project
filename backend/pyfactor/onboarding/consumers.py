# /onboarding/consumers.py

import json
import asyncio
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async  # Changed this line
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from pyfactor.logging_config import get_logger
from .models import OnboardingProgress
from business.models import Business
from .tasks import setup_user_database_task
from contextlib import asynccontextmanager
from django.core.exceptions import ValidationError
from typing import Optional, Dict, Any
from .state import OnboardingStateManager

logger = get_logger()
User = get_user_model()

class WebSocketState:
    """Track WebSocket connection states"""
    INITIALIZING = 'initializing'
    CONNECTING = 'connecting'
    CONNECTED = 'connected'
    AUTHENTICATING = 'authenticating'
    READY = 'ready'
    ERROR = 'error'
    DISCONNECTING = 'disconnecting'
    DISCONNECTED = 'disconnected'

class ConnectionPool:
    """Manage WebSocket connections with improved error handling"""
    def __init__(self, max_size=100):
        self._pool: Dict[str, 'OnboardingConsumer'] = {}
        self._lock = asyncio.Lock()
        self.max_size = max_size

    async def acquire(self, consumer: 'OnboardingConsumer') -> bool:
        """Add consumer to pool with validation"""
        async with self._lock:
            try:
                if len(self._pool) >= self.max_size:
                    logger.warning("Connection pool full")
                    return False
                
                user_id = consumer.user_id
                if user_id in self._pool:
                    existing = self._pool[user_id]
                    if existing.state != WebSocketState.DISCONNECTED:
                        logger.warning(f"Active connection exists for user {user_id}")
                        return False
                    
                self._pool[user_id] = consumer
                logger.info(f"Connection acquired for user {user_id}")
                return True
                
            except Exception as e:
                logger.error(f"Error acquiring connection: {str(e)}")
                return False

    async def release(self, consumer: 'OnboardingConsumer') -> None:
        """Remove consumer from pool safely"""
        async with self._lock:
            try:
                user_id = consumer.user_id
                if user_id in self._pool and self._pool[user_id] == consumer:
                    del self._pool[user_id]
                    logger.info(f"Connection released for user {user_id}")
            except Exception as e:
                logger.error(f"Error releasing connection: {str(e)}")

class OnboardingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for handling onboarding process with improved error handling
    and state management
    """
    
    # Configuration constants
    RECONNECT_DELAY = 2000  # milliseconds
    MAX_RETRIES = 3
    PING_INTERVAL = 30  # seconds
    HEARTBEAT_INTERVAL = 30  # seconds
    CONNECT_TIMEOUT = 10  # seconds
    MESSAGE_TIMEOUT = 5  # seconds
    
    # Shared connection pool
    _pool = ConnectionPool()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state = WebSocketState.INITIALIZING
        self.user = None
        self.user_id = None
        self.group_name = None
        self._state_manager = None
        self._connection_lock = asyncio.Lock()
        self._heartbeat_task = None
        self._cleanup_tasks = set()
        self._message_queue = asyncio.Queue()  # This was missing in the original init

        
    async def _initialize_state_manager(self):
        """Initialize state manager with proper error handling"""
        try:
            if not self._state_manager:
                self._state_manager = OnboardingStateManager(self.user)
                await self._state_manager.initialize()
            return True
        except Exception as e:
            logger.error(f"State manager initialization failed: {str(e)}")
            return False

    async def setup_started(self, event):
        """Handle setup_started event"""
        await self.send_json({
            'type': 'setup_started',
            'data': event.get('data', {}),
            'timestamp': timezone.now().isoformat()
        })

    @asynccontextmanager
    async def connection_state(self, new_state: str):
        """Manage WebSocket state transitions"""
        old_state = self.state
        try:
            self.state = new_state
            logger.info(f"State transition: {old_state} -> {new_state} for user {self.user_id}")
            yield
        except Exception as e:
            logger.error(f"Error in state {new_state}: {str(e)}")
            self.state = WebSocketState.ERROR
            raise
        finally:
            if self.state == new_state:
                self.state = old_state
    async def connect(self):
            """Handle WebSocket connection with comprehensive initialization"""
            if not await self._pool.acquire(self):
                logger.warning("Failed to acquire connection slot")
                await self.close(code=1013)
                return

            try:
                async with self._connection_lock:
                    await self._perform_connection_setup()
                    await self._start_background_tasks()
                    
            except Exception as e:
                logger.error(f"Connection error: {str(e)}")
                await self._handle_connection_error(e)

    async def _start_background_tasks(self):
        """Initialize and start background tasks"""
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self._cleanup_tasks.add(self._heartbeat_task)
        
        message_processor = asyncio.create_task(self._process_message_queue())
        self._cleanup_tasks.add(message_processor)
        
        self.state = WebSocketState.CONNECTED
        await self.send_json({
            'type': 'connection_established',
            'message': 'WebSocket connection established',
            'timestamp': timezone.now().isoformat()
        })

    async def _handle_connection_error(self, error: Exception):
        """Centralized error handling for connection issues"""
        error_code = 4000  # Default error code
        
        if isinstance(error, ValidationError):
            error_code = 4001
        elif isinstance(error, asyncio.TimeoutError):
            error_code = 4008
        
        try:
            await self.send_error(str(error))
        except Exception:
            pass  # Ignore send errors during connection failure
            
        if self.state != WebSocketState.DISCONNECTED:
            await self.close(code=error_code)

    async def _perform_connection_setup(self):
        """Consolidated connection setup logic"""
        # Validate user ID from URL
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'onboarding_{self.user_id}'
        
        # Authenticate user
        self.user = self.scope.get('user')
        if not self.user or self.user.is_anonymous:
            raise ValidationError("Unauthorized connection attempt")

        # Validate user ID match
        if str(self.user.id) != str(self.user_id):
            raise ValidationError("User ID mismatch")

        # Initialize state manager
        if not await self._initialize_state_manager():
            raise ValidationError("State manager initialization failed")

        # Add to group and accept connection
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def _update_progress(self, progress_data: Dict[str, Any]):
        """Update progress with improved error handling and validation"""
        if not isinstance(progress_data, dict):
            logger.error("Invalid progress data format")
            return

        try:
            progress = await self.get_onboarding_progress()
            if not progress:
                return

            with transaction.atomic():
                progress.last_updated = timezone.now()
                
                if 'status' in progress_data:
                    if progress_data['status'] == 'completed':
                        progress.database_setup_task_id = None
                        progress.setup_completed = True
                        progress.completed_at = timezone.now()
                    elif progress_data['status'] == 'error':
                        progress.last_error = progress_data.get('error')
                        progress.last_error_at = timezone.now()
                
                await self._save_progress(progress)

            await self.send_json({
                'type': 'progress_update',
                **progress_data,
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(f"Progress update error: {str(e)}")
            await self.send_error("Failed to update progress", code='progress_error')
    

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection with cleanup"""
        await self._pool.release(self)

        try:
            async with self.connection_state(WebSocketState.DISCONNECTING):
                # Cancel heartbeat
                if self._heartbeat_task and not self._heartbeat_task.done():
                    self._heartbeat_task.cancel()
                
                # Clean up group
                if self.group_name:
                    await self.channel_layer.group_discard(
                        self.group_name,
                        self.channel_name
                    )
                
                # Cancel pending tasks
                for task in self._cleanup_tasks:
                    if not task.done():
                        task.cancel()
                
                # Clean up ongoing operations if unexpected disconnect
                if close_code not in [1000, 1001]:
                    await self._cleanup_ongoing_operations()
                
                logger.info(f"Disconnected user {self.user_id} with code {close_code}")
                
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
        finally:
            self.state = WebSocketState.DISCONNECTED

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        if self.state != WebSocketState.CONNECTED:
            logger.warning(f"Message received in invalid state: {self.state}")
            return

        try:
            # Parse message
            data = json.loads(text_data)
            message_type = data.get('type')

            # Add to processing queue
            await self._message_queue.put((message_type, data))
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {str(e)}")
            await self.send_error("Invalid message format")
        except Exception as e:
            logger.error(f"Message handling error: {str(e)}")
            await self.send_error("Internal server error")

    async def _process_message_queue(self):
        """Process message queue with timeout protection"""
        while True:
            try:
                message_type, data = await self._message_queue.get()
                
                async with asyncio.timeout(self.MESSAGE_TIMEOUT):
                    await self._handle_message(message_type, data)
                    
            except asyncio.TimeoutError:
                logger.error("Message processing timeout")
                await self.send_error("Processing timeout")
            except Exception as e:
                logger.error(f"Message processing error: {str(e)}")
            finally:
                self._message_queue.task_done()

    async def _handle_message(self, message_type: str, data: Dict[str, Any]):
        """Handle different message types"""
        handlers = {
            'start_setup': self._handle_setup_start,
            'check_status': self._handle_status_check,
            'cancel_setup': self._handle_setup_cancel,
            'error': self._handle_client_error
        }

        handler = handlers.get(message_type)
        if handler:
            await handler(data)
        else:
            await self.send_error(f"Unsupported message type: {message_type}")

    async def _heartbeat_loop(self):
        """Maintain connection heartbeat"""
        while self.state == WebSocketState.CONNECTED:
            try:
                await self.send_json({
                    'type': 'heartbeat',
                    'timestamp': timezone.now().isoformat()
                })
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
            except Exception as e:
                logger.error(f"Heartbeat error: {str(e)}")
                break

    async def _cleanup_ongoing_operations(self):
        """Clean up any ongoing operations"""
        try:
            progress = await self.get_onboarding_progress()
            if progress and progress.database_setup_task_id:
                task = setup_user_database_task.AsyncResult(
                    progress.database_setup_task_id
                )
                if task.state in ['PENDING', 'STARTED']:
                    task.revoke(terminate=True)
                    await self.update_onboarding_progress(None)
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")

    async def send_json(self, content: Dict[str, Any]):
        """Send JSON message with error handling"""
        try:
            if self.state == WebSocketState.DISCONNECTED:
                return
                
            content['timestamp'] = timezone.now().isoformat()
            await self.send(text_data=json.dumps(content))
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            raise

    async def send_error(self, message: str, code: str = 'error'):
        """Send formatted error message"""
        try:
            await self.send_json({
                'type': 'error',
                'message': message,
                'code': code,
                'timestamp': timezone.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Error sending error message: {str(e)}")

    @sync_to_async
    def get_onboarding_progress(self):
        """Get onboarding progress with transaction safety"""
        with transaction.atomic():
            return OnboardingProgress.objects.select_for_update(
                nowait=True
            ).filter(user=self.user).first()

    async def _handle_setup_start(self, data: Dict[str, Any]):
        """
        Handle setup initialization request
        """
        logger.info(f"Setup start requested for user {self.user_id}")
        
        try:
            # Validate current state
            current_state = await self._state_manager.get_current_state()
            if current_state != 'step4':
                raise ValidationError(f"Invalid state for setup: {current_state}")

            # Get business info
            business = await self._get_user_business()
            if not business:
                raise ValidationError("Business not found")

            # Check for existing setup
            progress = await self.get_onboarding_progress()
            if progress.database_setup_task_id:
                task = setup_user_database_task.AsyncResult(progress.database_setup_task_id)
                if task.state in ['PENDING', 'STARTED', 'PROGRESS']:
                    await self.send_json({
                        'type': 'setup_status',
                        'status': 'in_progress',
                        'task_id': progress.database_setup_task_id,
                        'message': 'Setup already in progress'
                    })
                    return

            # Start new setup task
            task = setup_user_database_task.delay(
                str(self.user.id),
                str(business.id)
            )

            # Update progress
            progress.database_setup_task_id = task.id
            progress.last_setup_attempt = timezone.now()
            await self._save_progress(progress)

            # Send confirmation
            await self.send_json({
                'type': 'setup_started',
                'task_id': task.id,
                'status': 'started',
                'message': 'Setup initiated successfully',
                'timestamp': timezone.now().isoformat()
            })

            logger.info(f"Setup task {task.id} started for user {self.user_id}")

        except ValidationError as e:
            logger.warning(f"Setup validation error: {str(e)}")
            await self.send_error(str(e), code='validation_error')
        except Exception as e:
            logger.error(f"Setup error: {str(e)}")
            await self.send_error("Failed to start setup", code='setup_error')

    async def _handle_status_check(self, data: Dict[str, Any]):
        """
        Handle status check request
        """
        try:
            task_id = data.get('task_id')
            if not task_id:
                raise ValidationError("Task ID is required")

            task = setup_user_database_task.AsyncResult(task_id)
            
            # Prepare status response based on task state
            status_info = {
                'type': 'setup_status',
                'task_id': task_id,
                'status': task.state,
                'timestamp': timezone.now().isoformat()
            }

            if task.state == 'PROGRESS':
                # Add progress information
                if isinstance(task.info, dict):
                    status_info.update({
                        'progress': task.info.get('progress', 0),
                        'step': task.info.get('step', 'Processing'),
                        'details': task.info.get('details', {})
                    })
            elif task.state == 'SUCCESS':
                # Add success information
                status_info.update({
                    'progress': 100,
                    'result': task.result,
                    'message': 'Setup completed successfully'
                })
            elif task.state == 'FAILURE':
                # Add error information
                status_info.update({
                    'error': str(task.result),
                    'message': 'Setup failed'
                })

            await self.send_json(status_info)

        except ValidationError as e:
            await self.send_error(str(e), code='validation_error')
        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            await self.send_error("Failed to check status", code='status_error')

    async def _handle_setup_cancel(self, data: Dict[str, Any]):
        """
        Handle setup cancellation request
        """
        try:
            progress = await self.get_onboarding_progress()
            if not progress or not progress.database_setup_task_id:
                raise ValidationError("No active setup to cancel")

            # Revoke the task
            task = setup_user_database_task.AsyncResult(progress.database_setup_task_id)
            task.revoke(terminate=True)

            # Clear task ID and update progress
            progress.database_setup_task_id = None
            progress.last_updated = timezone.now()
            await self._save_progress(progress)

            # Send cancellation confirmation
            await self.send_json({
                'type': 'setup_cancelled',
                'status': 'cancelled',
                'message': 'Setup cancelled successfully',
                'timestamp': timezone.now().isoformat()
            })

            logger.info(f"Setup cancelled for user {self.user_id}")

        except ValidationError as e:
            await self.send_error(str(e), code='validation_error')
        except Exception as e:
            logger.error(f"Cancellation error: {str(e)}")
            await self.send_error("Failed to cancel setup", code='cancel_error')

    async def _handle_client_error(self, data: Dict[str, Any]):
        """
        Handle error reports from the client
        """
        try:
            error_info = {
                'message': data.get('message', 'Unknown client error'),
                'code': data.get('code', 'client_error'),
                'details': data.get('details', {}),
                'timestamp': timezone.now().isoformat()
            }

            logger.error(
                f"Client error reported for user {self.user_id}",
                extra={
                    'error_info': error_info,
                    'user_id': self.user_id
                }
            )

            # Acknowledge receipt of error report
            await self.send_json({
                'type': 'error_acknowledged',
                'error_code': error_info['code'],
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(f"Error handling client error: {str(e)}")

    async def _handle_progress_update(self, event: Dict[str, Any]):
        """
        Handle progress updates from celery task
        """
        try:
            await self.send_json({
                'type': 'setup_progress',
                'progress': event.get('progress', 0),
                'step': event.get('step', 'Processing'),
                'details': event.get('details', {}),
                'timestamp': timezone.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Progress update error: {str(e)}")

    # Helper methods for the handlers
    @sync_to_async
    def _get_user_business(self):
        """Get user's business information"""
        try:
            return Business.objects.select_related('owner').get(owner=self.user)
        except Business.DoesNotExist:
            logger.error(f"Business not found for user {self.user_id}")
            return None
        except Exception as e:
            logger.error(f"Error getting business: {str(e)}")
            raise

    @sync_to_async
    def _save_progress(self, progress):
        """Save progress with transaction handling"""
        try:
            with transaction.atomic():
                progress.save()
        except Exception as e:
            logger.error(f"Error saving progress: {str(e)}")
            raise

    async def _update_task_status(self, status_data: Dict[str, Any]):
        """Update task status and notify client"""
        try:
            progress = await self.get_onboarding_progress()
            if not progress:
                return

            # Update status in database
            progress.last_updated = timezone.now()
            if status_data.get('status') == 'completed':
                progress.database_setup_task_id = None
            await self._save_progress(progress)

            # Notify client
            await self.send_json({
                'type': 'status_update',
                **status_data,
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(f"Status update error: {str(e)}")
            await self.send_error("Failed to update status", code='update_error')

    async def setup_complete(self, event):
        """
        Handle setup completion notification
        """
        try:
            await self.send_json({
                'type': 'setup_complete',
                'status': 'completed',
                'database_name': event.get('database_name'),
                'message': 'Setup completed successfully',
                'details': event.get('details', {}),
                'timestamp': timezone.now().isoformat()
            })

            # Update progress
            progress = await self.get_onboarding_progress()
            if progress:
                progress.database_setup_task_id = None
                progress.setup_completed = True
                progress.completed_at = timezone.now()
                await self._save_progress(progress)

        except Exception as e:
            logger.error(f"Setup completion notification error: {str(e)}")
            await self.send_error(
                "Failed to process completion notification",
                code='completion_error'
            )

    async def setup_error(self, event):
        """
        Handle setup error notification
        """
        try:
            error_info = {
                'type': 'setup_error',
                'status': 'error',
                'error': event.get('error'),
                'message': 'Setup failed',
                'details': event.get('details', {}),
                'timestamp': timezone.now().isoformat()
            }

            await self.send_json(error_info)

            # Update progress
            progress = await self.get_onboarding_progress()
            if progress:
                progress.database_setup_task_id = None
                progress.last_error = event.get('error')
                progress.last_error_at = timezone.now()
                await self._save_progress(progress)

        except Exception as e:
            logger.error(f"Error notification error: {str(e)}")