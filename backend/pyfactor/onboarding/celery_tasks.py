# onboarding/celery_tasks.py
from celery import shared_task
from django.utils import timezone
from django.db import transaction, connections
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from pyfactor.logging_config import get_logger
from django.conf import settings
import asyncio
from django.core.management import call_command
from .task_utils import (
    timeout,
    get_db_connection,
    cleanup_connections,
    check_database_health
)
from .utils import generate_unique_database_name

logger = get_logger()

def get_models():
    """
    Safely get Django models after the app registry is ready.
    This function should only be called from within task functions
    to prevent app registry issues during Django startup.
    """
    from django.contrib.auth import get_user_model
    from users.models import UserProfile
    return get_user_model(), UserProfile

@shared_task(
    name='onboarding.notification.send',
    max_retries=3,
    default_retry_delay=5,
    retry_backoff=True,
    time_limit=30
)
def send_websocket_notification(user_id, event_type, data):
    """
    Sends WebSocket notifications with comprehensive error handling and retries.
    
    This task manages the entire notification process, including channel layer
    validation, message formatting, delivery confirmation, and error logging.
    
    Args:
        user_id: The ID of the user to notify
        event_type: The type of message being sent
        data: The message payload
        
    Returns:
        bool: True if notification was sent successfully, False otherwise
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.error("Channel layer not available - check CHANNEL_LAYERS setting")
            return False

        group_name = f"user_{user_id}"
        
        # Add timestamp and metadata for message ordering and tracking
        message_data = {
            **data,
            'timestamp': timezone.now().isoformat(),
            'message_id': f"{event_type}_{timezone.now().timestamp()}"
        }
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": event_type,
                "data": message_data
            }
        )
        logger.debug(f"Successfully sent {event_type} notification to {group_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}", exc_info=True)
        return False

@shared_task(
    name='onboarding.database.setup',
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    acks_late=True,
    time_limit=3600,
    soft_time_limit=3300
)
def setup_user_database_task(self, user_id, business_id):
    """
    Sets up a new user database with comprehensive error handling and progress tracking.
    
    This task manages the full database setup lifecycle:
    - User profile initialization
    - Database creation and configuration
    - Progress updates via WebSocket
    - Error handling and cleanup
    
    Args:
        user_id: UUID of the user
        business_id: UUID of the associated business
        
    Returns:
        dict: Status information including setup result
    """
    logger.info(f"Starting database setup task {self.request.id} for user {user_id}")
    database_name = None
    
    # Get models only when needed to prevent app registry issues
    User, UserProfile = get_models()
    
    def send_progress(progress, step, error=None):
        """Helper function to send consistent progress updates"""
        data = {
            'progress': progress,
            'step': step,
            'task_id': self.request.id
        }
        if error:
            data['error'] = str(error)
            
        send_websocket_notification.delay(
            user_id=user_id,
            event_type="database_setup_progress",
            data=data
        )
        
        logger.info(f"Setup progress for user {user_id}: {progress}% - {step}")

    try:
        # Phase 1: Initial Setup
        with transaction.atomic():
            user = User.objects.get(id=user_id)
            user_profile = UserProfile.objects.select_for_update().get(user=user)
            user_profile.setup_status = 'in_progress'
            user_profile.save()

        send_progress(0, 'Starting setup', 'Initializing database creation')
            
        # Phase 2: Database Creation
        database_name = generate_unique_database_name(user)
        logger.info(f"Generated database name: {database_name}")
        
        with timeout(30):  # 30-second timeout for database creation
            logger.info(f"Creating database: {database_name}")
            send_progress(20, 'Creating Database')
            
            # We use a separate connection for database creation
            with get_db_connection() as conn:
                conn.autocommit = True  # Required for database creation
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT 1 FROM pg_database WHERE datname = %s",
                        [database_name]
                    )
                    if not cursor.fetchone():
                        cursor.execute(f'CREATE DATABASE "{database_name}" TEMPLATE template0')

        # Phase 3: Database Configuration
        send_progress(40, 'Configuring Database')
        connections.databases[database_name] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': database_name,
            'USER': settings.DATABASES['default']['USER'],
            'PASSWORD': settings.DATABASES['default']['PASSWORD'],
            'HOST': settings.DATABASES['default']['HOST'],
            'PORT': settings.DATABASES['default']['PORT'],
            'TIME_ZONE': settings.TIME_ZONE,
            'ATOMIC_REQUESTS': True,
            'CONN_MAX_AGE': 0,
            'AUTOCOMMIT': True,
            'CONN_HEALTH_CHECKS': False,
            'OPTIONS': {
                'connect_timeout': 10,
                'client_encoding': 'UTF8'
            }
        }

        # Phase 4: Schema Migration
        with timeout(180):  # 3-minute timeout for migrations
            logger.info(f"Running migrations for {database_name}")
            send_progress(60, 'Running Migrations')
            call_command('migrate', database=database_name, verbosity=2)
            logger.info(f"Completed migrations for database {database_name}")
            
        # Phase 5: Health Verification
        logger.info(f"Verifying database health for {database_name}")
        send_progress(80, 'Verifying Setup')
        if not check_database_health(database_name):
            raise Exception("Database health check failed")
        
        # Phase 6: Completion
        logger.info(f"Finalizing database setup for {database_name}")
        send_progress(90, 'Finalizing Setup')
        with transaction.atomic():
            user_profile = UserProfile.objects.select_for_update().get(user=user)
            user_profile.database_name = database_name
            user_profile.database_status = 'active'
            user_profile.setup_status = 'complete'
            user_profile.save()

        logger.info(f"Database setup completed successfully for user {user_id}")
        return {
            "status": "SUCCESS",
            "user_id": user_id,
            "business_id": business_id,
            "database_name": database_name,
            "task_id": self.request.id,
            "progress": 100,
            "step": 'Complete'
        }

    except asyncio.TimeoutError as e:
        logger.error(f"Operation timed out: {str(e)}")
        send_progress(-1, 'Error', 'Operation timed out, retrying...')
        raise self.retry(exc=e, countdown=5)

    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}", exc_info=True)
        send_progress(-1, 'Error', str(e))
        
        try:
            # Update user profile status
            with transaction.atomic():
                user_profile = UserProfile.objects.select_for_update().get(user_id=user_id)
                user_profile.setup_status = 'error'
                user_profile.save()
        except Exception as profile_error:
            logger.error(f"Failed to update profile status: {str(profile_error)}")

        # Cleanup on failure
        if database_name:
            try:
                from users.utils import sync_cleanup_database
                sync_cleanup_database(database_name)
            except Exception as cleanup_error:
                logger.error(f"Error during cleanup: {str(cleanup_error)}")
        raise

    finally:
        cleanup_connections(database_name)