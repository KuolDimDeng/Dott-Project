# onboarding/tasks.py
import time
import signal
import logging
from typing import Dict, Any, Tuple
from contextlib import contextmanager
from functools import wraps

from celery import shared_task
from django.db import transaction, connections, DatabaseError
from django.conf import settings
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from psycopg2 import OperationalError
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from users.models import UserProfile
from .models import OnboardingProgress
from .locks import get_setup_lock, LockAcquisitionError
from .utils import generate_unique_database_name
from .task_utils import get_database_settings

logger = logging.getLogger('Pyfactor')
User = get_user_model()

# Task Configuration Constants
TASK_TIMEOUT = 3600  # 1 hour total timeout
SOFT_TIMEOUT = 3300  # Soft timeout 5 minutes before hard timeout
DB_CREATE_TIMEOUT = 30  # 30 seconds for database creation
MIGRATION_TIMEOUT = 180  # 3 minutes for migrations
MAX_RETRY_COUNTDOWN = 300  # 5 minutes between retries

# Status Transition Configuration
VALID_STATUS_TRANSITIONS = {
    'not_created': ['pending'],
    'pending': ['in_progress', 'error'],
    'in_progress': ['complete', 'error'],
    'error': ['pending', 'in_progress'],
    'complete': []  # No transitions from complete
}

class DatabaseSetupError(Exception):
    """Base class for database setup errors"""
    pass

class DatabaseMigrationError(DatabaseSetupError):
    """Raised when database migrations fail"""
    pass

class DatabaseHealthCheckError(DatabaseSetupError):
    """Raised when database health check fails"""
    pass

def validate_status_transition(current_status: str, new_status: str) -> bool:
    """Validate if a status transition is allowed"""
    return new_status in VALID_STATUS_TRANSITIONS.get(current_status, [])

@contextmanager
def timeout(seconds: int):
    """Context manager for operations timeout"""
    def handler(signum, frame):
        raise TimeoutError(f"Operation timed out after {seconds} seconds")
    
    previous_handler = signal.signal(signal.SIGALRM, handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_handler)

def setup_database_parameters(database_name: str, conn) -> None:
    """Configure PostgreSQL runtime parameters for the new database"""
    try:
        with conn.cursor() as cursor:
            quoted_name = f'"{database_name}"'
            statements = [
                f"ALTER DATABASE {quoted_name} SET maintenance_work_mem = '64MB'",
                f"ALTER DATABASE {quoted_name} SET work_mem = '4MB'",
                f"ALTER DATABASE {quoted_name} SET statement_timeout = '30s'",
                f"ALTER DATABASE {quoted_name} SET idle_in_transaction_session_timeout = '60s'"
            ]
            for statement in statements:
                cursor.execute(statement)
    except Exception as e:
        logger.error(f"Error setting database parameters: {str(e)}")
        raise DatabaseSetupError("Failed to configure database parameters")

def check_database_health(database_name: str) -> Tuple[bool, str]:
    """Perform comprehensive health check on the database"""
    try:
        with connections[database_name].cursor() as cursor:
            # Basic connectivity test
            cursor.execute("SELECT 1")
            
            # Test transaction support
            with transaction.atomic(using=database_name):
                cursor.execute("""
                    CREATE TEMPORARY TABLE health_check (
                        id serial PRIMARY KEY,
                        created_at timestamp DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("INSERT INTO health_check DEFAULT VALUES")
                
            return True, "Database is healthy"
    except Exception as e:
        return False, str(e)

@shared_task
def send_websocket_notification(user_id: str, event_type: str, data: dict):
    """Send asynchronous WebSocket notifications to the client"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "send_message",
                "event": event_type,
                "data": data
            }
        )
        logger.info(f"WebSocket notification sent to user {user_id}")
    except Exception as e:
        logger.error(f"Failed to send WebSocket notification: {str(e)}")

@shared_task(
    name='setup_user_database_task',
    bind=True,
    max_retries=5,
    retry_backoff=True,
    acks_late=True,
    time_limit=TASK_TIMEOUT,
    soft_time_limit=SOFT_TIMEOUT,
    autoretry_for=(DatabaseError, OperationalError),
    retry_kwargs={'max_retries': 5}
)
def setup_user_database_task(self, user_id: str, business_id: str) -> Dict[str, Any]:
    """
    Sets up a new user database with comprehensive configuration and progress tracking.
    
    This task handles the complete database setup process including:
    - Database creation and configuration
    - Schema migration
    - Health verification
    - Status updates and notifications
    
    Args:
        user_id: The ID of the user requesting database setup
        business_id: The ID of the associated business
        
    Returns:
        Dict containing setup status and database information
        
    Raises:
        DatabaseSetupError: If any part of the setup process fails
    """
    database_name = None
    success = False
    profile = None
    
    def update_state(phase: str, progress: int, status: str = 'in_progress'):
        """Update task state and send notification"""
        try: 
            state_data = {
                'progress': progress,
                'step': phase,
                'task_id': self.request.id,
                'timestamp': timezone.now().isoformat(),
                'business_id': business_id
            }
            self.update_state(state=status, meta=state_data)
            send_websocket_notification.delay(
                user_id=user_id,
                event_type="database_setup_progress",
                data=state_data
            )
            logger.info(f"Setup progress for user {user_id}: {progress}% - {phase}")
        except Exception as e:
            logger.error(f"Failed to update state: {str(e)}")

    try:
        # Start with clean connections
        connections.close_all()

        # Phase 1: Initial Setup and Validation
        update_state('initial_setup', 0)
        
        with transaction.atomic(using='default'):
            user = User.objects.select_related('userprofile').get(id=user_id)
            profile = UserProfile.objects.select_for_update().get(user=user)
            
            if profile.setup_status == 'complete' and profile.database_name:
                return {
                    "status": "already_complete",
                    "database_name": profile.database_name,
                    "business_id": business_id
                }
            
            # Generate database name within the transaction
            database_name = generate_unique_database_name(user)
            
            # Validate status transition
            if not validate_status_transition(profile.database_status, 'pending'):
                raise DatabaseSetupError(f"Invalid status transition from {profile.database_status} to pending")
            
            # Update profile with pending status and new database name
            profile.database_name = database_name
            profile.database_status = 'pending'
            profile.setup_status = 'in_progress'
            profile.last_setup_attempt = timezone.now()
            profile.save(update_fields=[
                'database_name',
                'database_status', 
                'setup_status',
                'last_setup_attempt'
            ])

        # Phase 2: Database Creation
        update_state('creating_database', 20)
        logger.info(f"Creating database: {database_name}")

        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    [database_name]
                )
                if cursor.fetchone():
                    raise DatabaseSetupError(f"Database {database_name} already exists")
                
                with timeout(DB_CREATE_TIMEOUT):
                    cursor.execute(f'CREATE DATABASE "{database_name}" TEMPLATE template0')
                    setup_database_parameters(database_name, conn)

        # Phase 3: Configure Database
        update_state('configuring_database', 40)
        db_settings = get_database_settings(database_name)
        
        # Register the new database
        connections.databases[database_name] = db_settings
        settings.DATABASES[database_name] = db_settings

        # Phase 4: Run Migrations
        update_state('running_migrations', 60)
        try:
            # Ensure clean connection state before migrations
            connections.close_all()
            call_command('migrate', database=database_name)
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise DatabaseMigrationError(f"Failed to apply migrations: {str(e)}")

        # Phase 5: Verify Setup
        update_state('verifying_setup', 80)
        is_healthy, health_message = check_database_health(database_name)
        if not is_healthy:
            raise DatabaseHealthCheckError(f"Health check failed: {health_message}")

        # Phase 6: Complete Setup
        update_state('finalizing', 90)
        
        # Use a fresh connection for final update
        connections.close_all()
        with transaction.atomic(using='default'):
            # Get fresh instances of both user and profile
            user = User.objects.select_for_update().get(id=user_id)
            profile = UserProfile.objects.select_for_update().get(user=user)
            
            # Update user onboarding status
            user.is_onboarded = True
            user.save(update_fields=['is_onboarded'])
            
            # Update profile
            profile.database_name = database_name
            profile.setup_status = 'complete'
            profile.save()

            # Update onboarding progress
            OnboardingProgress.objects.filter(user=user).update(
                onboarding_status='complete',
                current_step=0,
                completed_at=timezone.now()
            )

        success = True
        update_state('complete', 100, 'success')

        return {
            "status": "success",
            "database_name": database_name,
            "user_id": user_id,
            "task_id": self.request.id,
            "is_onboarded": True
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Setup failed: {error_message}", exc_info=True)
        update_state('error', -1, 'failed')
        
        if profile:
            try:
                connections.close_all()
                with transaction.atomic(using='default'):
                    profile = UserProfile.objects.select_for_update().get(user=user)
                    profile.database_status = 'error'
                    profile.setup_status = 'error'
                    profile.setup_error_message = error_message
                    profile.save(update_fields=[
                        'database_status',
                        'setup_status',
                        'setup_error_message'
                    ])
            except Exception as profile_error:
                logger.error(f"Profile update failed: {str(profile_error)}")

        if database_name:
            try:
                with get_db_connection(autocommit=True) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            SELECT pg_terminate_backend(pid) 
                            FROM pg_stat_activity 
                            WHERE datname = %s AND pid != pg_backend_pid()
                        """, [database_name])
                        cursor.execute(f'DROP DATABASE IF EXISTS "{database_name}"')
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {str(cleanup_error)}")
        raise

    finally:
        try:
            connections.close_all()
        except Exception as e:
            logger.error(f"Connection cleanup failed: {str(e)}")