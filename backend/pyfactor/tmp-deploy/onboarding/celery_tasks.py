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
    check_schema_health
)
from .utils import generate_unique_schema_name

logger = get_logger()

def get_models():
    """
    Safely get Django models after the app registry is ready.
    This function should only be called from within task functions
    to prevent app registry issues during Django startup.
    """
    from django.contrib.auth import get_user_model
    from users.models import UserProfile

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
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
def setup_tenant_schema_task(self, user_id, business_id):
    """
    Sets up a new tenant schema with comprehensive error handling and progress tracking.
    
    This task manages the full schema setup lifecycle:
    - User profile initialization
    - Schema creation and configuration
    - Progress updates via WebSocket
    - Error handling and cleanup
    
    Args:
        user_id: UUID of the user
        business_id: UUID of the associated business
        
    Returns:
        dict: Status information including setup result
    """
    logger.info(f"Starting schema setup task {self.request.id} for user {user_id}")
    schema_name = None
    
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
            event_type="schema_setup_progress",
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

        send_progress(0, 'Starting setup', 'Initializing schema creation')
            
        # Phase 2: Schema Creation
        schema_name = generate_unique_schema_name(user)
        logger.info(f"Generated schema name: {schema_name}")
        
        with timeout(30):  # 30-second timeout for schema creation
            logger.info(f"Creating schema: {schema_name}")
            send_progress(20, 'Creating Schema')
            
            # Use proper connection management
            with get_db_connection() as conn:
                conn.autocommit = True
                with conn.cursor() as cursor:
                    # Save current search path
                    cursor.execute('SHOW search_path')
                    original_search_path = cursor.fetchone()[0]
                    
                    try:
                        # Create schema
                        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                        
                        # Set up permissions
                        cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
                        cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {settings.DATABASES["default"]["USER"]}')
                        cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {settings.DATABASES["default"]["USER"]}')

                        # Phase 3: Schema Configuration
                        send_progress(40, 'Configuring Schema')
                        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')

                        # Phase 4: Schema Migration
                        with timeout(180):  # 3-minute timeout for migrations
                            logger.info(f"Running migrations for schema {schema_name}")
                            send_progress(60, 'Running Migrations')
                            call_command('migrate', schema=schema_name, verbosity=2)
                            logger.info(f"Completed migrations for schema {schema_name}")
                            
                        # Phase 5: Health Verification
                        logger.info(f"Verifying schema health for {schema_name}")
                        send_progress(80, 'Verifying Setup')
                        cursor.execute('SELECT COUNT(*) FROM information_schema.tables')
                        if cursor.fetchone()[0] == 0:
                            raise Exception("Schema health check failed - no tables found")

                    finally:
                        # Restore original search path
                        if original_search_path:
                            cursor.execute(f'SET search_path TO {original_search_path}')
                            logger.debug(f"Restored search path to: {original_search_path}")
        
        # Phase 6: Completion
        logger.info(f"Finalizing schema setup for {schema_name}")
        send_progress(90, 'Finalizing Setup')
        with transaction.atomic():
            user_profile = UserProfile.objects.select_for_update().get(user=user)
            # Update tenant information
            tenant = user.tenant
            if not tenant:
                tenant = user.tenant.create(
                    schema_name=schema_name,
                    is_active=True
                )
            else:
                 tenant.id = schema_name
                tenant.is_active = True
                tenant.save()

            # Update profile status
            user_profile.setup_status = 'complete'
            user_profile.save()

        logger.info(f"Schema setup completed successfully for user {user_id}")
        return {
            "status": "SUCCESS",
            "user_id": user_id,
            "business_id": business_id,
            "schema_name": schema_name,
            "task_id": self.request.id,
            "progress": 100,
            "step": 'Complete'
        }

    except asyncio.TimeoutError as e:
        logger.error(f"Operation timed out: {str(e)}")
        send_progress(-1, 'Error', 'Operation timed out, retrying...')
        raise self.retry(exc=e, countdown=5)

    except Exception as e:
        logger.error(f"Schema setup failed: {str(e)}", exc_info=True)
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
        if schema_name:
            try:
                with get_db_connection() as conn:
                    conn.autocommit = True
                    with conn.cursor() as cursor:
                        # Save current search path
                        cursor.execute('SHOW search_path')
                        original_search_path = cursor.fetchone()[0]
                        
                        try:
                            # Drop schema and all objects within it
                            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                            logger.info(f"Successfully cleaned up schema: {schema_name}")
                        finally:
                            # Restore original search path
                            if original_search_path:
                                cursor.execute(f'SET search_path TO {original_search_path}')
                                logger.debug(f"Restored search path to: {original_search_path}")
            except Exception as cleanup_error:
                logger.error(f"Error during schema cleanup: {str(cleanup_error)}")
        raise

    finally:
        # No need for additional search path reset since we handle it in the connection context
        pass