from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from celery.utils.log import get_task_logger
from celery.result import AsyncResult
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.utils import DatabaseError, OperationalError
from django.core.cache import cache
from django.db import transaction
from contextlib import contextmanager
from datetime import datetime
import traceback
import time

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
    """Distributed lock using Django's cache"""
    lock_acquired = cache.add(f"task_lock_{lock_id}", True, expire_in)
    try:
        yield lock_acquired
    finally:
        if lock_acquired:
            cache.delete(f"task_lock_{lock_id}")

def send_websocket_message(channel_layer, group_name, message_type, data, max_retries=3):
    """Helper function to send WebSocket messages with retries"""
    for attempt in range(max_retries):
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': message_type,
                    **data
                }
            )
            logger.debug(f"WebSocket message sent successfully: {message_type}")
            return
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to send WebSocket message after {max_retries} attempts: {str(e)}", exc_info=True)
                raise
            logger.warning(f"WebSocket send attempt {attempt + 1} failed: {str(e)}")
            time.sleep(0.5)

@shared_task(bind=True,
            name='onboarding.setup_user_database_task',
            max_retries=3,
            default_retry_delay=60,
            autoretry_for=(OperationalError, DatabaseError),
            retry_backoff=True)
def setup_user_database_task(self, user_id, business_id):
    """Task to set up user database with progress tracking and WebSocket updates"""
    lock_id = f"database_setup_{user_id}"
    channel_layer = get_channel_layer()
    group_name = f'onboarding_{user_id}'
    database_name = None

    def update_progress(progress, step):
        """Helper function to update task state and send WebSocket message"""
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
            
            send_websocket_message(
                channel_layer,
                group_name,
                'onboarding_progress',
                {
                    'progress': progress,
                    'step': step,
                    'status': 'in_progress'
                }
            )
        except Exception as e:
            logger.error(f"Error in update_progress: {str(e)}", exc_info=True)
    
    with task_lock(lock_id) as acquired:
        if not acquired:
            logger.warning(f"Task already running for user {user_id}")
            return {
                'status': 'IN_PROGRESS',
                'message': 'Database setup already in progress'
            }

        try:
            # Get user and profile with select_related to avoid multiple queries
            user = User.objects.get(id=user_id)
            profile = UserProfile.objects.select_related('business').get(user=user)

            if profile.database_name and profile.database_status == 'active':
                return {
                    'status': 'SUCCESS',
                    'database_name': profile.database_name,
                    'message': 'Database already exists'
                }

            business = Business.objects.get(id=business_id)
            if not business:
                raise ValueError(f"Business not found for ID: {business_id}")

            # Mark database as creating
            profile.database_status = 'creating'
            profile.save(update_fields=['database_status'])

            # Update progress and notify
            update_progress(25, 'Verifying Data')
            logger.info(f"Verifying data for user {user.email}")

            # Create database
            update_progress(40, 'Creating User Database')
            database_name = create_user_database(user_id, business_id)
            logger.info(f"Database created successfully: {database_name}")

            # Check database readiness
            update_progress(50, 'Checking Database Connection')
            check_database_readiness(database_name)
            logger.info(f"Database connection verified for {database_name}")

            # Setup database
            update_progress(60, 'Setting Up Database')
            setup_user_database(database_name, user, business)
            logger.info(f"Initial database setup completed for {database_name}")

            # Populate initial data
            update_progress(75, 'Setting Up Database Tables')
            populate_initial_data(database_name)
            logger.info(f"Initial data populated for {database_name}")

            # Final configuration
            update_progress(90, 'Finalizing Setup')
            
            # Update profile with database information
            profile.database_name = database_name
            profile.database_status = 'active'
            profile.save(update_fields=['database_name', 'database_status'])

            # Send completion message
            send_websocket_message(
                channel_layer,
                group_name,
                'onboarding_complete',
                {
                    'status': 'completed',
                    'database_name': database_name
                }
            )
            
            logger.info(f"Setup completed successfully for {user.email}")
            
            return {
                'status': 'SUCCESS',
                'database_name': database_name,
                'message': 'Database setup completed successfully',
                'user_email': user.email
            }

        except UserProfile.DoesNotExist:
            error_msg = f"UserProfile not found for user: {user_id}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        except User.DoesNotExist:
            error_msg = f"User not found: {user_id}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        except Exception as e:
            error_msg = f"Error in database setup: {str(e)}"
            logger.error(error_msg, exc_info=True)

            try:
                # Update profile status to error if exists
                if 'profile' in locals():
                    profile.database_status = 'error'
                    profile.save(update_fields=['database_status'])

                if database_name:
                    # Attempt cleanup
                    try:
                        cleanup_database(database_name)
                    except Exception as cleanup_error:
                        logger.error(f"Error cleaning up database {database_name}: {str(cleanup_error)}")

                # Send error message
                send_websocket_message(
                    channel_layer,
                    group_name,
                    'error',
                    {
                        'message': error_msg,
                        'status': 'failed',
                        'database_name': database_name
                    }
                )
            except Exception as ws_error:
                logger.error(f"Error sending WebSocket error message: {str(ws_error)}", exc_info=True)

            if isinstance(e, (ValueError, ObjectDoesNotExist)):
                raise
            else:
                raise self.retry(exc=e)

def get_task_info(task_id):
    """Helper function to get detailed task information"""
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
