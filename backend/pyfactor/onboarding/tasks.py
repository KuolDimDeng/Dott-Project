
#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/tasks.py
from django.utils import timezone
import uuid
import re
import psycopg2
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
from .utils import generate_unique_database_name, validate_database_creation
import traceback
import time
import asyncio
from django.db import connections
from django.core.management import call_command
from pyfactor.logging_config import get_logger
from business.models import Business
from django.conf import settings
from users.models import UserProfile
from pyfactor.db.utils import (
    get_connection, 
    return_connection,
    get_db_connection,  
    initialize_database_pool,
    DatabasePool  # Only import these available functions
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

# Add this line after your imports
database_exists_and_accessible = DatabasePool.database_exists_and_accessible

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
    logger.info("Cleaning up database connections")
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
    logger.info(f"Starting database setup task {self.request.id} for user {user_id}")
    database_name = None
    
    def update_progress(progress, step):
        self.update_state(state='PROGRESS', meta={
            'progress': progress,
            'step': step,
            'timestamp': timezone.now().isoformat()
        })
        logger.info(f"Task {self.request.id}: {progress}% - {step}")

    try:
        # Use the proper utility functions
        update_progress(10, 'Creating Database')
        database_name = async_to_sync(create_user_database)(user_id, business_id)
        
        update_progress(50, 'Setting Up Database')
        user = User.objects.get(id=user_id)
        business = Business.objects.get(id=business_id)
        async_to_sync(setup_user_database)(database_name, user, business)
        
        update_progress(80, 'Verifying Setup')
        async_to_sync(check_database_readiness)(database_name)
        
        update_progress(90, 'Populating Data')
        async_to_sync(populate_initial_data)(database_name)

        logger.info(f"Database setup completed for {database_name}")
        return {
            'status': 'SUCCESS',
            'database_name': database_name,
            'progress': 100,
            'step': 'Complete'
        }

    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}", exc_info=True)
        if database_name:
            async_to_sync(cleanup_database)(database_name)
        raise


def check_database_health(database_name, max_retries=3):
    """Verify database is accessible and healthy"""
    retry_delay = 0.5
    last_error = None
    
    for attempt in range(max_retries):
        try:
            with psycopg2.connect(
                dbname=database_name,
                user=settings.DATABASES['default']['USER'],
                password=settings.DATABASES['default']['PASSWORD'],
                host=settings.DATABASES['default']['HOST'], 
                port=settings.DATABASES['default']['PORT'],
                connect_timeout=5
            ) as test_conn:
                with test_conn.cursor() as cursor:
                    cursor.execute('SELECT 1')
                    cursor.fetchone()
                    cursor.execute('CREATE TABLE IF NOT EXISTS health_check (id serial PRIMARY KEY)')
                    cursor.execute('DROP TABLE health_check')
            return True
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))
                continue
            logger.error(f"Health check failed: {e}")
            return False

