
#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/tasks.py
from django.utils import timezone
import uuid
import re
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
from pyfactor.db.utils import (
    get_connection, 
    return_connection, 
    database_exists_and_accessible, 
    initialize_database_pool
)
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
    """Creates and sets up a user's dynamic database during onboarding Step 4"""
    logger.info(f"Starting database setup for user {user_id}")
    database_name = None
    
    # Initialize channel layer for progress updates
    channel_layer = get_channel_layer()
    group_name = f'onboarding_{user_id}'

    def update_progress(progress, step):
        """Updates both Celery task state and sends WebSocket progress"""
        try:
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'step': step,
                    'current_operation': step,
                    'timestamp': str(datetime.now())
                }
            )
            
            # Send websocket update
            message_data = {
                'type': 'onboarding_progress',
                'progress': progress,
                'step': step,
                'status': 'in_progress',
                'timestamp': str(datetime.now())
            }
            async_to_sync(channel_layer.group_send)(group_name, message_data)
            
        except Exception as e:
            logger.error(f"Progress update failed: {str(e)}")

    try:
        # Get user and business objects
        user = User.objects.select_related('profile').get(id=user_id)
        business = Business.objects.get(id=business_id)
        profile = user.profile

        # Check existing database first
        update_progress(10, 'Checking Existing Database')
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                if profile.database_name:
                    exists, message = database_exists_and_accessible(
                        cursor, 
                        profile.database_name
                    )
                    if exists:
                        return {
                            'status': 'SUCCESS',
                            'database_name': str(profile.database_name),
                            'message': 'Database verified successfully'
                        }
                    # Clear invalid reference
                    profile.database_name = None
                    profile.database_status = 'pending'
                    profile.save(update_fields=['database_name', 'database_status'])
        finally:
            return_connection(conn)

        # Generate unique database name
        update_progress(20, 'Generating Database Name')
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        email_prefix = user.email.split('@')[0][:10].lower()
        database_name = f"{unique_id}_{email_prefix}_{timestamp}"
        database_name = re.sub(r'[^a-zA-Z0-9_]', '', database_name)

        # Create the database
        update_progress(30, 'Creating Database')
        conn = get_connection()
        conn.autocommit = True
        try:
            with conn.cursor() as cursor:
                cursor.execute(f'CREATE DATABASE "{database_name}"')
                
                # Verify creation
                cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", [database_name])
                if not cursor.fetchone():
                    raise Exception(f"Database {database_name} creation failed verification")
        finally:
            return_connection(conn)

        # Configure Django connection
        update_progress(50, 'Configuring Database')
        database_config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': database_name,
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'ATOMIC_REQUESTS': True,
            'CONN_MAX_AGE': 0,
            'OPTIONS': {
                'connect_timeout': 10,
                'client_encoding': 'UTF8'
            }
        }
        settings.DATABASES[database_name] = database_config
        connections.databases[database_name] = database_config

        # Run migrations
        update_progress(70, 'Running Migrations')
        call_command('migrate', database=database_name)

        # Initialize data
        update_progress(90, 'Initializing Data')
        populate_initial_data(database_name)

        # Update profile
        update_progress(95, 'Finalizing Setup')
        profile.database_name = database_name
        profile.database_status = 'active'
        profile.save(update_fields=['database_name', 'database_status'])

        update_progress(100, 'Complete')
        return {
            'status': 'SUCCESS',
            'database_name': database_name,
            'message': 'Database created and configured successfully'
        }

    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}", exc_info=True)
        try:
            if database_name:
                cleanup_database(database_name)
            if 'profile' in locals():
                profile.database_status = 'error'
                profile.save(update_fields=['database_status'])
        except Exception as cleanup_error:
            logger.error(f"Cleanup failed: {str(cleanup_error)}")
        raise

    finally:
        cleanup_connections(database_name)

    # Send websocket message synchronously
    def send_progress_message(message_type, data):
        """Sends WebSocket progress updates to the client"""
        try:
            message_data = {
                'type': message_type,
                **{k: str(v) if isinstance(v, (datetime, date)) else v for k, v in data.items()}
            }
            async_to_sync(channel_layer.group_send)(group_name, message_data)
            logger.debug(f"WebSocket message sent: {message_type}")
        except Exception as e:
            logger.error(f"WebSocket message failed: {str(e)}")

    def update_progress(progress, step):
        """Updates both Celery task state and sends WebSocket progress"""
        try:
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'step': step,
                    'current_operation': step,
                    'timestamp': str(datetime.now())
                }
            )
            
            send_progress_message('onboarding_progress', {
                'progress': progress,
                'step': step,
                'status': 'in_progress',
                'timestamp': str(datetime.now())
            })
        except Exception as e:
            logger.error(f"Progress update failed: {str(e)}")

    

    def validate_task_result(result):
        """Validates and standardizes task result format"""
        logger.debug(f"Validating task result: {result}")
        if isinstance(result, dict) and 'database_name' in result:
            if result['database_name'] is not None:
                result['database_name'] = str(result['database_name'])
            logger.debug(f"Validated task result: {result}")
        return result

    def run_setup():
        """Core database setup logic with proper verification"""
        nonlocal database_name
        try:
            # Get user and profile info
            user = User.objects.select_related('profile').get(id=user_id)
            profile = user.profile
            business = Business.objects.get(id=business_id)

            # Verify any existing database
            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    if profile.database_name:
                        exists, message = database_exists_and_accessible(
                            cursor, 
                            profile.database_name
                        )
                        
                        if exists:
                            logger.info(f"Verified existing database: {profile.database_name}")
                            return {
                                'status': 'SUCCESS',
                                'database_name': str(profile.database_name),
                                'message': 'Database verified successfully'
                            }
                        else:
                            logger.warning(
                                f"Invalid database reference found: {profile.database_name}"
                                f" Reason: {message}"
                            )
                            # Clear invalid reference
                            profile.database_name = None
                            profile.database_status = 'pending'
                            profile.save(update_fields=['database_name', 'database_status'])
            finally:
                return_connection(conn)

            # Start new database creation
            update_progress(25, 'Creating New Database')
            
            # Generate unique database name
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            email_prefix = user.email.split('@')[0][:10].lower()
            database_name = f"{unique_id}_{email_prefix}_{timestamp}"
            database_name = re.sub(r'[^a-zA-Z0-9_]', '', database_name)

            # Create the database
            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    # Double check it doesn't exist
                    cursor.execute(
                        "SELECT 1 FROM pg_database WHERE datname = %s", 
                        (database_name,)
                    )
                    if cursor.fetchone():
                        raise ValueError(f"Database {database_name} already exists")

                    # Create new database
                    cursor.execute('COMMIT')  # End current transaction
                    cursor.execute(f'CREATE DATABASE "{database_name}"')
                    logger.info(f"Created database: {database_name}")
            finally:
                return_connection(conn)

            # Verify the new database
            update_progress(50, 'Verifying Database')
            conn = get_connection()
            try:
                with conn.cursor() as cursor:
                    exists, message = database_exists_and_accessible(
                        cursor, 
                        database_name
                    )
                    if not exists:
                        raise ValueError(f"Database verification failed: {message}")
            finally:
                return_connection(conn)

            # Set up schema and initial data
            update_progress(75, 'Setting Up Schema')
            setup_user_database(database_name, user, business)
            populate_initial_data(database_name)

            # Update profile
            profile.database_name = database_name
            profile.database_status = 'active'
            profile.save(update_fields=['database_name', 'database_status'])

            update_progress(100, 'Complete')
            
            return {
                'status': 'SUCCESS',
                'database_name': database_name,
                'message': 'Database created and set up successfully'
            }

        except Exception as e:
            logger.error(f"Setup failed: {str(e)}", exc_info=True)
            if 'profile' in locals():
                profile.database_status = 'error'
                profile.save(update_fields=['database_status'])
            
            if database_name:
                cleanup_database(database_name)
            raise

    # Main task execution
    try:
        with task_lock(lock_id) as acquired:
            if not acquired:
                retry_delay = 60 * (2 ** self.request.retries)
                raise self.retry(countdown=retry_delay)

            result = run_setup()
            return result

    except Exception as e:
        logger.error(f"Task failed: {str(e)}", exc_info=True)
        raise
    finally:
        cleanup_connections(database_name)