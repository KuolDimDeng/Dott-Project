from django.db import connections, connection
# onboarding/tasks.py
import time
import signal
import logging
import uuid
import asyncio
from typing import Dict, Any, Tuple
from contextlib import contextmanager
from functools import wraps

from celery import shared_task
from django.db import transaction, connections, DatabaseError
from django.conf import settings
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth import get_user_model
from psycopg2 import OperationalError
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from onboarding.locks import get_setup_lock, LockAcquisitionError
from onboarding.utils import (
    generate_unique_schema_name,
    create_tenant_schema,
    validate_schema_creation,
    tenant_schema_context,
    cleanup_schema
)
from onboarding.task_utils import (
    get_db_connection,
    check_schema_health,
    timeout
)

logger = logging.getLogger('Pyfactor')
User = get_user_model()

# Task Configuration Constants
TASK_TIMEOUT = 3600  # 1 hour total timeout
SOFT_TIMEOUT = 3300  # Soft timeout 5 minutes before hard timeout
SCHEMA_CREATE_TIMEOUT = 30  # 30 seconds for schema creation
MIGRATION_TIMEOUT = 180  # 3 minutes for migrations
MAX_RETRY_COUNTDOWN = 300  # 5 minutes between retries

# Status Transition Configuration
VALID_STATUS_TRANSITIONS = {
    'not_started': ['pending', 'business-info'],
    'pending': ['in_progress', 'error', 'business-info'],
    'in_progress': ['complete', 'error', 'pending', 'business-info'],
    'error': ['pending', 'in_progress', 'business-info'],
    'failed': ['pending', 'in_progress', 'business-info'],  # Allow retrying from failed state
    'complete': ['business-info'],  # Allow restarting onboarding
    'business-info': ['subscription', 'not_started'],
    'subscription': ['complete', 'payment', 'business-info'],  # Allow direct transition to complete or back to business-info
    'payment': ['complete', 'business-info']  # Allow direct transition to complete or back to business-info
}

class SchemaSetupError(Exception):
    """Base class for schema setup errors"""
    pass

class SchemaMigrationError(SchemaSetupError):
    """Raised when schema migrations fail"""
    pass

class SchemaHealthCheckError(SchemaSetupError):
    """Raised when schema health check fails"""
    pass

def validate_status_transition(current_status: str, new_status: str) -> bool:
    """Validate if a status transition is allowed"""
    allowed_transitions = VALID_STATUS_TRANSITIONS
    
    # If current_status is not in the dictionary, allow any transition
    # This is to handle onboarding-specific statuses that might not be in the dictionary
    if current_status not in allowed_transitions:
        logger.warning(f"Unknown status transition from {current_status} to {new_status}, allowing it")
        return True
        
    return new_status in allowed_transitions.get(current_status, [])

@shared_task(
    name='setup_user_schema_task',
    bind=True,
    max_retries=5,
    retry_backoff=True,
    acks_late=True,
    time_limit=TASK_TIMEOUT,
    soft_time_limit=SOFT_TIMEOUT,
    autoretry_for=(DatabaseError, OperationalError),
    retry_kwargs={'max_retries': 5}
)
def setup_user_schema_task(self, user_id: str, business_id: str) -> Dict[str, Any]:
    """
    Sets up a new tenant schema with comprehensive configuration and progress tracking.
    
    This task handles the complete schema setup process including:
    - Schema creation and configuration
    - Schema migration
    - Health verification
    - Status updates and notifications
    - Storage quota setup based on subscription plan
    
    Args:
        user_id: The ID of the user requesting schema setup
        business_id: The ID of the associated business
        
    Returns:
        Dict containing setup status and schema information
        
    Raises:
        SchemaSetupError: If any part of the setup process fails
    """
    # Validate input parameters with minimal processing
    try:
        user_id = str(user_id).strip()
        business_id = str(business_id).strip()
    except Exception as e:
        logger.error(f"Error validating input parameters: {str(e)}")
        raise SchemaSetupError(f"Error validating input parameters: {str(e)}")
    
    schema_name = None
    success = False
    tenant = None
    onboarding_progress = None
    subscription_plan = 'free'  # Default to free plan
    
    def update_state(phase: str, progress: int, status: str = 'in_progress'):
        """Update task state with minimal data"""
        try:
            state_data = {
                'progress': progress,
                'step': phase,
                'task_id': self.request.id
            }
            self.update_state(state=status, meta=state_data)
            logger.info(f"Setup progress: {progress}% - {phase}")
        except Exception as e:
            logger.error(f"Failed to update state: {str(e)}")

    try:
        # Start with clean connections
        connections.close_all()

        # Phase 1: Initial Setup and Validation
        update_state('initial_setup', 0)
        
        # Use direct SQL for tenant check to reduce ORM overhead
        tenant_data = None
        schema_name = None
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT t.id, t.schema_name, t.setup_status
                FROM auth_tenant t
                WHERE t.owner_id = %s
            """, [user_id])
            tenant_data = cursor.fetchone()
            
            if tenant_data:
                tenant_id, schema_name, setup_status = tenant_data
                # Check if already complete
                if setup_status == 'complete' and schema_name:
                    return {
                        "status": "already_complete",
                        "schema_name": schema_name,
                        "business_id": business_id
                    }
                
                # Update tenant status with direct SQL
                cursor.execute("""
                    UPDATE auth_tenant
                    SET is_active = FALSE,
                        setup_status = 'in_progress',
                        last_setup_attempt = NOW(),
                        setup_task_id = %s
                    WHERE id = %s
                """, [self.request.id, tenant_id])
            else:
                raise SchemaSetupError("No tenant found for user")
        
        if not schema_name:
            raise SchemaSetupError("No schema name found")
            
        logger.info(f"Using schema: {schema_name}")
        
        # Get subscription plan with minimal query
        if business_id and business_id != 'None':
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT selected_plan FROM business_subscription
                    WHERE business_id = %s LIMIT 1
                """, [business_id])
                result = cursor.fetchone()
                if result and result[0]:
                    subscription_plan = result[0]
        
        # Set storage quota based on plan with direct SQL
        storage_quota_bytes = 2 * 1024 * 1024 * 1024  # Default 2GB for free
        if subscription_plan == 'professional':
            storage_quota_bytes = 30 * 1024 * 1024 * 1024  # 30GB for professional
            
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE auth_tenant
                    SET storage_quota_bytes = %s
                    WHERE owner_id = %s
                """, [storage_quota_bytes, user_id])
        except Exception as e:
            # Continue even if quota update fails
            logger.warning(f"Failed to update storage quota: {str(e)}")

        # Phase 2: Schema Verification/Creation
        update_state('verifying_schema', 20)
        logger.info(f"Verifying schema: {schema_name}")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                with timeout(SCHEMA_CREATE_TIMEOUT):
                    schema_exists = validate_schema_creation(cursor, schema_name)
                    if not schema_exists:
                        logger.info(f"Creating schema: {schema_name}")
                        create_tenant_schema(cursor, schema_name, user_id)
                        # Validate again after creation
                        if not validate_schema_creation(cursor, schema_name):
                            raise SchemaSetupError(f"Schema {schema_name} creation failed verification")

        # Phase 2.5: Apply Storage Quota
        update_state('applying_storage_quota', 30)
        try:
            # Apply quota with direct SQL for efficiency
            with get_db_connection(autocommit=True) as conn:
                with conn.cursor() as cursor:
                    # Create a quota trigger for this schema
                    function_name = schema_name.replace('-', '_')
                    schema_name_sql = schema_name.replace('-', '_')
                    cursor.execute(f"""
                        CREATE OR REPLACE FUNCTION {function_name}_check_quota()
                        RETURNS TRIGGER AS $$
                        DECLARE
                            current_size BIGINT;
                            max_size BIGINT := {storage_quota_bytes};
                            size_pretty TEXT;
                            quota_pretty TEXT;
                        BEGIN
                            -- Calculate current schema size
                            SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))), 0)
                            INTO current_size
                            FROM information_schema.tables
                            WHERE table_schema = '{schema_name_sql}';
                            
                            -- Check if over quota
                            IF current_size > max_size THEN
                                size_pretty := pg_size_pretty(current_size);
                                quota_pretty := pg_size_pretty(max_size);
                                RAISE EXCEPTION 'Storage quota exceeded. Current usage: %, Quota: %',
                                    size_pretty, quota_pretty;
                            END IF;
                            
                            RETURN NEW;
                        END;
                        $$ LANGUAGE plpgsql;
                    """)
                    
                    logger.info(f"Applied {storage_quota_bytes/(1024*1024*1024):.1f}GB quota to schema {schema_name}")
        except Exception as e:
            logger.warning(f"Failed to apply storage quota to schema {schema_name}: {str(e)}")
            # Continue setup even if quota setup fails

        # Phase 3: Run Migrations
        update_state('running_migrations', 60)
        try:
            logger.info(f"Starting full database migrations for schema: {schema_name}")
            # Use connection with longer timeout for migrations
            with get_db_connection(for_migrations=True) as conn:
                with conn.cursor() as cursor:
                    # Check if migrations were deferred during schema creation
                    with tenant_schema_context(cursor, schema_name):
                        cursor.execute("""
                            SELECT 1 FROM django_migrations
                            WHERE app = 'onboarding' AND name = 'deferred_migrations'
                            LIMIT 1
                        """)
                        migrations_deferred = cursor.fetchone() is not None
                        
                        if migrations_deferred:
                            logger.info(f"Found deferred migrations marker. Running full migrations for schema: {schema_name}")
                            
                            # Run migrations for all installed apps
                            with timeout(MIGRATION_TIMEOUT * 2):  # Double timeout for full migrations
                                logger.info("Running migrations for all installed apps")
                                call_command('migrate')
                                
                            # Then run migrations for each tenant app specifically
                            tenant_apps = settings.TENANT_APPS
                            logger.info(f"Running migrations for tenant apps")
                            
                            for app in tenant_apps:
                                try:
                                    logger.info(f"Running migrations for tenant app: {app}")
                                    with timeout(MIGRATION_TIMEOUT):
                                        call_command('migrate', app, verbosity=1)
                                except asyncio.TimeoutError:
                                    logger.error(f"Migration timed out for app {app} after {MIGRATION_TIMEOUT} seconds")
                                    # Continue with other apps even if one times out
                                except Exception as app_error:
                                    logger.error(f"Error running migrations for app {app}: {str(app_error)}")
                                    # Continue with other apps even if one fails
                            
                            # Remove the deferred migrations marker
                            cursor.execute("""
                                DELETE FROM django_migrations
                                WHERE app = 'onboarding' AND name = 'deferred_migrations'
                            """)
                            
                            logger.info(f"Completed full migrations for schema: {schema_name}")
                        else:
                            # Just run a migration check if migrations weren't deferred
                            logger.info(f"No deferred migrations marker found. Running migration check for schema: {schema_name}")
                            with timeout(MIGRATION_TIMEOUT):
                                call_command('migrate', '--check')
                            
            logger.info(f"Migration process complete")
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise SchemaMigrationError(f"Failed to apply migrations: {str(e)}")

        # Phase 4: Verify Setup - simplified health check
        update_state('verifying_setup', 80)
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                with tenant_schema_context(cursor, schema_name):
                    cursor.execute("SELECT 1")  # Basic connectivity test

        # Phase 5: Complete Setup - use direct SQL for efficiency
        update_state('finalizing', 90)
        
        # Update user and tenant status with direct SQL
        with connection.cursor() as cursor:
            # Update user
            cursor.execute("""
                UPDATE auth_user
                SET is_onboarded = TRUE
                WHERE id = %s
            """, [user_id])
            
            # Update tenant
            cursor.execute("""
                UPDATE auth_tenant
                SET is_active = TRUE,
                    setup_status = 'complete',
                    last_health_check = NOW()
                WHERE owner_id = %s
            """, [user_id])
            
            # Update onboarding progress
            cursor.execute("""
                UPDATE onboarding_onboardingprogress
                SET onboarding_status = 'complete',
                    current_step = 'complete',
                    next_step = 'dashboard'
                WHERE user_id = %s
            """, [user_id])

        # Update Cognito attributes with minimal retry logic
        try:
            from custom_auth.cognito import update_user_attributes_sync
            update_user_attributes_sync(user_id, {
                'custom:onboarding': 'COMPLETE',
                'custom:subplan': subscription_plan
            })
        except Exception as e:
            # Log but continue - not critical
            logger.warning(f"Cognito update failed: {str(e)}")
                    
        success = True
        update_state('complete', 100, 'success')

        return {
            "status": "success",
            "schema_name": schema_name,
            "user_id": user_id,
            "business_id": business_id,
            "task_id": self.request.id,
            "is_onboarded": True,
            "subscription_plan": subscription_plan,
            "storage_quota_gb": storage_quota_bytes / (1024 * 1024 * 1024)
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Setup failed: {error_message}")
        update_state('error', -1, 'failed')

        try:
            # Update error status with direct SQL
            with connection.cursor() as cursor:
                # Update tenant status
                cursor.execute("""
                    UPDATE auth_tenant
                    SET setup_status = 'error',
                        setup_error_message = %s
                    WHERE owner_id = %s
                """, [error_message[:255], user_id])
                
                # Update onboarding progress
                cursor.execute("""
                    UPDATE onboarding_onboardingprogress
                    SET setup_error = %s
                    WHERE user_id = %s
                """, [error_message[:255], user_id])
        except Exception as update_error:
            logger.error(f"Error status update failed: {str(update_error)}")

        if schema_name:
            try:
                cleanup_schema(schema_name)
            except Exception as cleanup_error:
                logger.error(f"Schema cleanup failed: {str(cleanup_error)}")

        raise

    finally:
        connections.close_all()