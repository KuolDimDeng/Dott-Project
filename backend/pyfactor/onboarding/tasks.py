# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/tasks.py
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.utils import create_user_database, sync_setup_user_database
from celery.utils.log import get_task_logger
from celery.result import AsyncResult
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from business.models import Business

User = get_user_model()
logger = get_task_logger(__name__)

@shared_task(bind=True, 
            name='onboarding.setup_user_database_task',
            max_retries=3,
            default_retry_delay=60)
def setup_user_database_task(self, user_id, business_id):
    """
    Task to set up user database with progress tracking and WebSocket updates
    """
    channel_layer = get_channel_layer()
    group_name = f'onboarding_{user_id}'

    def update_progress(progress, step):
        """Helper function to update task state and send WebSocket message"""
        try:
            # Update Celery task state
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress, 
                    'step': step,
                    'current_operation': step
                }
            )
            
            # Send WebSocket update
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'onboarding_progress',
                    'progress': progress,
                    'step': step,
                    'status': 'in_progress'
                }
            )
        except Exception as e:
            logger.error(f"Error in update_progress: {str(e)}", exc_info=True)

    try:
        # Validate input parameters
        try:
            user = User.objects.get(id=user_id)
            business = Business.objects.get(id=business_id)
        except ObjectDoesNotExist as e:
            error_msg = f"Invalid user_id or business_id: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info(f"Starting database setup for user {user.email} (ID: {user_id})")
        
        # Step 1: Verify Data
        update_progress(25, 'Verifying Data')
        logger.info(f"Verifying data for user {user.email}")

        # Step 2: Create Database
        update_progress(40, 'Creating User Database')
        try:
            database_name = create_user_database(user_id, business_id)
            logger.info(f"Database created: {database_name}")
        except Exception as e:
            logger.error(f"Database creation failed: {str(e)}", exc_info=True)
            raise
        
        # Step 3: Initial Setup
        update_progress(60, 'Setting Up Database')
        try:
            sync_setup_user_database(database_name, user, business)
            logger.info(f"Initial database setup completed for {database_name}")
        except Exception as e:
            logger.error(f"Database setup failed: {str(e)}", exc_info=True)
            raise
        
        # Step 4: Configure Tables
        update_progress(75, 'Setting Up Database Tables')
        logger.info(f"Table setup completed for {database_name}")

        # Step 5: Final Configuration
        update_progress(90, 'Finalizing Setup')
        logger.info(f"Final configuration completed for {database_name}")

        # Send completion message
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'onboarding_complete',
                    'status': 'completed',
                    'database_name': database_name
                }
            )
            logger.info(f"Setup completed successfully for {user.email}")
        except Exception as e:
            logger.error(f"Error sending completion message: {str(e)}", exc_info=True)

        return {
            'status': 'SUCCESS',
            'database_name': database_name,
            'message': 'Database setup completed successfully',
            'user_email': user.email
        }

    except Exception as e:
        error_message = f"Error in database setup: {str(e)}"
        logger.error(error_message, exc_info=True)
        
        try:
            # Send error message through WebSocket
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'error',
                    'message': error_message,
                    'status': 'failed'
                }
            )
        except Exception as ws_error:
            logger.error(f"Error sending WebSocket error message: {str(ws_error)}", exc_info=True)
        
        # Update task state to failure with detailed error info
        self.update_state(
            state='FAILURE',
            meta={
                'exc_type': type(e).__name__,
                'exc_message': str(e),
                'error': error_message,
                'traceback': self.request.chain
            }
        )
        
        # Retry the task if appropriate
        if not isinstance(e, (ValueError, ObjectDoesNotExist)):
            try:
                raise self.retry(exc=e)
            except self.MaxRetriesExceededError:
                logger.error("Max retries exceeded for database setup task")
        
        raise

def get_task_info(task_id):
    """
    Helper function to get detailed task information
    """
    try:
        task = AsyncResult(task_id)
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
        else:  # STARTED, PROGRESS, etc.
            meta = task.info or {}
            response = {
                'state': task.state,
                'status': 'in_progress',
                'progress': meta.get('progress', 0),
                'step': meta.get('step', ''),
                'current_operation': meta.get('current_operation', '')
            }
        return response
    except Exception as e:
        logger.error(f"Error getting task info for task {task_id}: {str(e)}", exc_info=True)
        return {
            'state': 'ERROR',
            'status': 'error',
            'error': str(e)
        }