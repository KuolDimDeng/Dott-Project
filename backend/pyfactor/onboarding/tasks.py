
#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/tasks.py
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async, async_to_sync
from datetime import datetime, date
from celery.utils.log import get_task_logger
from celery.result import AsyncResult
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.utils import DatabaseError, OperationalError
from django.core.cache import cache
from django.db import transaction
from contextlib import contextmanager
import traceback
import time
import asyncio
from django.db import connections
from pyfactor.logging_config import get_logger
from business.models import Business
from django.conf import settings
from users.models import UserProfile
from users.utils import (
    create_user_database,
    setup_user_database,
    check_database_readiness,
    populate_initial_data,
    cleanup_database
)

User = get_user_model()
logger = get_logger()

@contextmanager
def task_lock(lock_id, expire_in=60*60):
    """Distributed lock using Django's cache with improved stale lock handling"""
    lock_id = f"task_lock_{lock_id}"
    acquired = False  # Initialize acquired

    try:
        current_lock = cache.get(lock_id)
        if current_lock:
            logger.warning(f"Lock {lock_id} exists")
            yield False
            return

        acquired = cache.add(lock_id, time.time(), timeout=expire_in)
        yield acquired
        
    finally:
        if acquired:
            try:
                cache.delete(lock_id)
                logger.debug(f"Released lock: {lock_id}")
            except Exception as e:
                logger.error(f"Error releasing lock {lock_id}: {e}")

def cleanup_connections(database_name=None):
    """Clean up database connections"""
    try:
        if database_name and database_name in connections:
            connections[database_name].close()
        connections['default'].close()
    except Exception as e:
        logger.error(f"Error cleaning up connections: {str(e)}")

def send_websocket_message(channel_layer, group_name, message_type, data, max_retries=3):
    """Helper function to send WebSocket messages with retries"""
    logger.debug(f"Attempting to send WebSocket message to group {group_name}: {message_type}")
    for attempt in range(max_retries):
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': message_type,
                    **data
                }
            )
            logger.debug(f"WebSocket message sent successfully: {message_type} to {group_name}")
            return
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to send WebSocket message to {group_name} after {max_retries} attempts: {str(e)}", exc_info=True)
                raise
            logger.warning(f"WebSocket send attempt {attempt + 1} failed for {group_name}: {str(e)}")
            time.sleep(0.5)

def safe_convert_coroutine(value, field_name="unknown"):
    """Safely convert a potential coroutine to its value"""
    try:
        logger.debug(f"Converting value for {field_name}: {value}")
        if value is None:
            return None
            
        # Handle Django model property
        if hasattr(value, '_state'):  # Django model instance
            logger.debug(f"Getting Django model property for {field_name}")
            value = sync_get_model_property(value, field_name)
            
        # Handle coroutine objects
        if asyncio.iscoroutine(value):
            logger.debug(f"Converting coroutine for {field_name}")
            try:
                value = async_to_sync(lambda: value)()
                logger.debug(f"Converted coroutine value: {value}")
            except Exception as e:
                logger.error(f"Failed to convert coroutine: {str(e)}")
                raise
                
        # Convert final value to string
        result = str(value) if value is not None else None
        logger.debug(f"Final converted value for {field_name}: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error converting {field_name}: {str(e)}", exc_info=True)
        raise

async def get_model_property(instance, property_name):
    """Safely get a property value from a model instance"""
    try:
        value = getattr(instance, property_name)
        if asyncio.iscoroutine(value):
            value = await value
        return value
    except Exception as e:
        logger.error(f"Error getting {property_name} from {instance}: {str(e)}")
        raise

def sync_get_model_property(instance, property_name):
    """Synchronous wrapper for get_model_property"""
    try:
        value = getattr(instance, property_name)
        if asyncio.iscoroutine(value):
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(get_model_property(instance, property_name))
            finally:
                loop.close()
        return value
    except Exception as e:
        logger.error(f"Error getting property {property_name}: {str(e)}")
        raise


@shared_task(bind=True,
            name='onboarding.setup_user_database_task',
            max_retries=3,
            default_retry_delay=60,
            autoretry_for=(OperationalError, DatabaseError),
            retry_backoff=True)
def setup_user_database_task(self, user_id, business_id):
    logger.info(f"Starting database setup task for user {user_id}")
    logger.debug(f"Task ID: {self.request.id}")
    logger.debug(f"Task retries: {self.request.retries}")
    logger.debug(f"Business ID: {business_id}")

    lock_id = f"database_setup_{user_id}"
    channel_layer = get_channel_layer()
    group_name = f'onboarding_{user_id}'
    database_name = None

   

    # Send websocket message synchronously
    def send_progress_message(message_type, data):
        try:
            message_data = {
                'type': message_type,
                **{k: str(v) if isinstance(v, (datetime, date)) else v for k, v in data.items()}
            }
            async_to_sync(channel_layer.group_send)(
                group_name,
                message_data
            )
            logger.debug(f"WebSocket message sent: {message_type}")
        except Exception as e:
            logger.error(f"WebSocket message failed: {str(e)}")

    def update_progress(progress, step):
        try:
            # Update Celery task state
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'step': step,
                    'current_operation': step,
                    'timestamp': str(datetime.now())
                }
            )
            
            # Send WebSocket update
            send_progress_message('onboarding_progress', {
                'progress': progress,
                'step': step,
                'status': 'in_progress',
                'timestamp': str(datetime.now())
            })
        except Exception as e:
            logger.error(f"Progress update failed: {str(e)}")

    

    def validate_task_result(result):
        """Ensure task result contains valid database name"""
        logger.debug(f"Validating task result: {result}")
        if isinstance(result, dict) and 'database_name' in result:
            if result['database_name'] is not None:
                result['database_name'] = str(result['database_name'])
            logger.debug(f"Validated task result: {result}")
        return result

    def run_setup():
        nonlocal database_name
        try:
            logger.debug(f"Starting setup for user {user_id}")
            with transaction.atomic():
                user = User.objects.select_related('profile').get(id=user_id)
                profile = user.profile
                business = Business.objects.get(id=business_id)

                if profile.database_name and profile.database_status == 'active':
                    logger.info(f"Database already exists for user {user_id}")
                    try:
                        # Get database name directly
                        db_name = profile.database_name  # No need for async conversion if it's a regular field
                        logger.debug(f"Using existing database name: {db_name}")
                        
                        return {
                            'status': 'SUCCESS',
                            'database_name': str(db_name),
                            'message': 'Database already exists'
                        }
                    except Exception as e:
                        logger.error(f"Error handling existing database: {str(e)}", exc_info=True)
                        raise

                profile.database_status = 'creating'
                profile.save(update_fields=['database_status'])

                update_progress(25, 'Verifying Data')
                try:
                    logger.debug("Starting database creation")
                    db_name = create_user_database(user_id, business_id)
                    database_name = safe_convert_coroutine(db_name, "create_user_database result")
                    logger.debug(f"Created database name: {database_name}")
                except Exception as e:
                    logger.error(f"Error creating database: {str(e)}", exc_info=True)
                    raise

                update_progress(50, 'Creating Database')
                check_database_readiness(database_name)
                
                update_progress(75, 'Setting Up Schema')
                setup_user_database(database_name, user, business)
                populate_initial_data(database_name)
                
                logger.debug(f"Setting profile.database_name to: {database_name}")
                profile.database_name = safe_convert_coroutine(database_name, "profile.database_name")
                profile.database_status = 'active'
                profile.save(update_fields=['database_name', 'database_status'])
                logger.debug(f"Profile saved with database_name: {profile.database_name}")

                update_progress(100, 'Complete')
                
                return {
                    'status': 'SUCCESS',
                    'database_name': database_name,
                    'message': 'Setup completed successfully'
                }

        except Exception as e:
            logger.error(f"Setup failed: {str(e)}", exc_info=True)
            if 'profile' in locals():
                profile.database_status = 'error'
                profile.save(update_fields=['database_status'])
            
            if database_name:
                cleanup_database(database_name)
            raise

    try:
        with task_lock(lock_id) as acquired:
            if not acquired:
                try:
                    user = User.objects.select_related('profile').get(id=user_id)
                    logger.debug(f"Retrieved user: {user.email}")
                    
                    if user.profile.database_setup_task_id:
                        existing_task = AsyncResult(user.profile.database_setup_task_id)
                        if existing_task.state in ['PENDING', 'STARTED', 'PROGRESS']:
                            logger.info(f"Task already in progress: {existing_task.id}")
                            return {
                                'status': 'IN_PROGRESS',
                                'task_id': existing_task.id,
                                'message': 'Setup already in progress'
                            }
                except Exception as e:
                    logger.error(f"Error checking existing task: {str(e)}")

                retry_delay = 60 * (2 ** self.request.retries)
                raise self.retry(countdown=retry_delay)

            result = run_setup()
            return validate_task_result(result)

    except Exception as e:
        logger.error(f"Task failed: {str(e)}", exc_info=True)
        raise
    finally:
        cleanup_connections(database_name)


    
    
        

def get_task_info(task_id):
        """Helper function to get detailed task information"""
        if not task_id:
            return {
                'state': 'ERROR',
                'status': 'error',
                'error': 'No task ID provided'
            }
        try:
            task = AsyncResult(task_id)
            if not task:
                logger.error(f"No task found with ID: {task_id}")
                return {
                    'state': 'ERROR',
                    'status': 'error',
                    'error': 'Task not found'
                }

            if task.state == 'PENDING':
                response = {
                    'state': task.state,
                    'status': 'pending',
                    'progress': 0,
                    'step': 'Waiting to start'
                }
            elif task.state == 'SUCCESS':
                response = {
                    'state': task.state,
                    'status': 'completed',
                    'progress': 100,
                    'result': task.result
                }
            elif task.state == 'FAILURE':
                error_info = task.info or {}
                response = {
                    'state': task.state,
                    'status': 'failed',
                    'error': str(task.result),
                    'error_details': {
                        'type': error_info.get('exc_type'),
                        'message': error_info.get('exc_message'),
                        'traceback': error_info.get('traceback')
                    }
                }
            else:
                meta = task.info or {}
                response = {
                    'state': task.state,
                    'status': 'in_progress',
                    'progress': meta.get('progress', 0),
                    'step': meta.get('step', ''),
                    'current_operation': meta.get('current_operation', ''),
                    'timestamp': meta.get('timestamp')
                }
            
            logger.debug(f"Task info retrieved successfully for task {task_id}: {response['state']}")
            return response
            
        except Exception as e:
            logger.error(f"Error getting task info for task {task_id}: {str(e)}", exc_info=True)
            return {
                'state': 'ERROR',
                'status': 'error',
                'error': str(e),
                'traceback': traceback.format_exc()
            }

