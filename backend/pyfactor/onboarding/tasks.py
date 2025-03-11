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
    'not_started': ['pending'],
    'pending': ['in_progress', 'error'],
    'in_progress': ['complete', 'error', 'pending'],
    'error': ['pending', 'in_progress'],
    'failed': ['pending', 'in_progress'],  # Allow retrying from failed state
    'complete': [],  # No transitions from complete
    'business-info': ['subscription'],
    'subscription': ['complete', 'payment'],  # Allow direct transition to complete
    'payment': ['complete']  # Allow direct transition to complete
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
    # Validate input parameters
    try:
        # Ensure user_id is a valid UUID and convert to string
        user_id_str = str(user_id)  # Convert to string first in case it's already a UUID object
        try:
            # If user_id contains underscores, replace them with hyphens for UUID validation
            uuid_validation_str = user_id_str.replace('_', '-')
            
            # Validate as UUID
            uuid_obj = uuid.UUID(uuid_validation_str)
            
            # Keep the original format for consistency with the rest of the code
            user_id = str(uuid_obj)
        except ValueError as e:
            logger.error(f"Invalid user_id UUID format: {str(e)}")
            raise SchemaSetupError(f"Invalid user_id UUID format: {str(e)}")
        
        # Ensure business_id is a valid UUID and convert to string
        business_id_str = str(business_id)  # Convert to string first in case it's already a UUID object
        try:
            uuid_obj = uuid.UUID(business_id_str)
            business_id = str(uuid_obj)
        except ValueError:
            # If business_id is not a valid UUID, just use it as is
            logger.warning(f"Business ID is not a valid UUID: {business_id_str}, using as is")
            business_id = business_id_str
    except Exception as e:
        logger.error(f"Error validating input parameters: {str(e)}")
        raise SchemaSetupError(f"Error validating input parameters: {str(e)}")
    
    schema_name = None
    success = False
    tenant = None
    onboarding_progress = None
    
    def update_state(phase: str, progress: int, status: str = 'in_progress'):
        """Update task state"""
        try: 
            state_data = {
                'progress': progress,
                'step': phase,
                'task_id': self.request.id,
                'timestamp': timezone.now().isoformat(),
                'business_id': business_id
            }
            self.update_state(state=status, meta=state_data)
            logger.info(f"Setup progress for user {user_id}: {progress}% - {phase}")
        except Exception as e:
            logger.error(f"Failed to update state: {str(e)}")

    try:
        # Start with clean connections
        connections.close_all()

        # Phase 1: Initial Setup and Validation
        update_state('initial_setup', 0)
        
        with transaction.atomic():
            user = User.objects.select_related('owned_tenant').get(id=user_id)
            
            # Check if tenant already exists
            if hasattr(user, 'owned_tenant') and user.owned_tenant:
                tenant = user.owned_tenant
                if tenant.setup_status == 'complete' and tenant.schema_name:
                    return {
                        "status": "already_complete",
                        "schema_name": tenant.schema_name,
                        "business_id": business_id
                    }
            
            # Get or create onboarding progress
            onboarding_progress, created = OnboardingProgress.objects.select_for_update().get_or_create(
                user=user,
                defaults={
                    'onboarding_status': 'business-info',
                    'current_step': 'business-info',
                    'next_step': 'subscription'
                }
            )
            
            # Get tenant and schema name
            tenant = Tenant.objects.select_for_update().get(owner=user)
            if not tenant or not tenant.schema_name:
                raise SchemaSetupError("No tenant or schema name found")

            schema_name = tenant.schema_name
            logger.info(f"Using existing schema: {schema_name}")
            
            # Set storage quota based on subscription plan
            from business.models import Subscription
            subscription_plan = 'free'  # Default to free plan
            
            # Only try to get subscription if business_id is not None
            if business_id and business_id != 'None':
                try:
                    subscription = Subscription.objects.filter(business_id=business_id).first()
                    if subscription and subscription.selected_plan:
                        subscription_plan = subscription.selected_plan
                except Exception as e:
                    logger.warning(f"Error getting subscription for business_id {business_id}: {str(e)}")
                    # Continue with default free plan
            
            # Check if tenant has storage_quota_bytes field
            if hasattr(tenant, 'storage_quota_bytes'):
                # Set quota based on plan
                if subscription_plan == 'professional':
                    tenant.storage_quota_bytes = 30 * 1024 * 1024 * 1024  # 30GB for professional
                else:
                    tenant.storage_quota_bytes = 2 * 1024 * 1024 * 1024   # 2GB for free
                
                # Add quota field to update_fields
                update_fields = ['is_active', 'setup_status', 'last_setup_attempt', 'setup_task_id', 'storage_quota_bytes']
            else:
                # If field doesn't exist yet (migration might be pending)
                logger.warning(f"Tenant model does not have storage_quota_bytes field, skipping quota setup")
                update_fields = ['is_active', 'setup_status', 'last_setup_attempt', 'setup_task_id']
            
            # Update tenant status
            # Allow transition from 'pending' or 'in_progress' to 'in_progress' directly
            if tenant.setup_status in ['pending', 'in_progress', 'error', 'failed'] or validate_status_transition(tenant.setup_status, 'in_progress'):
                tenant.is_active = False
                tenant.setup_status = 'in_progress'
                tenant.last_setup_attempt = timezone.now()
                tenant.setup_task_id = self.request.id
                tenant.save(update_fields=update_fields)
            else:
                raise SchemaSetupError(f"Cannot transition from {tenant.setup_status} to in_progress")
            
            logger.info(f"Set storage quota for {schema_name}: {subscription_plan} plan, " + 
                       f"quota: {getattr(tenant, 'storage_quota_bytes', 0)/(1024*1024*1024):.1f}GB")

        # Phase 2: Schema Verification/Creation
        update_state('verifying_schema', 20)
        logger.info(f"Verifying schema: {schema_name}")

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                with timeout(SCHEMA_CREATE_TIMEOUT):
                    schema_exists = validate_schema_creation(cursor, schema_name)
                    if not schema_exists:
                        logger.info(f"Creating schema: {schema_name}")
                        create_tenant_schema(cursor, schema_name, user.id)
                        # Validate again after creation
                        if not validate_schema_creation(cursor, schema_name):
                            raise SchemaSetupError(f"Schema {schema_name} creation failed verification")

        # Phase 2.5: Apply Storage Quota
        update_state('applying_storage_quota', 30)
        try:
            # Add quota enforcement at database level if tenant model has quota field
            if hasattr(tenant, 'storage_quota_bytes'):
                # Use autocommit=True parameter instead of setting it after connection
                with get_db_connection(autocommit=True) as conn:
                    with conn.cursor() as cursor:
                        # Create a quota trigger for this schema
                        quota_bytes = getattr(tenant, 'storage_quota_bytes', 2 * 1024 * 1024 * 1024)
                        # Create a function to track space usage and enforce limit
                        # Ensure function name has no hyphens by replacing them with underscores
                        function_name = schema_name.replace('-', '_')
                        schema_name_sql = schema_name.replace('-', '_')
                        cursor.execute(f"""
                            CREATE OR REPLACE FUNCTION {function_name}_check_quota()
                            RETURNS TRIGGER AS $$
                            DECLARE
                                current_size BIGINT;
                                max_size BIGINT := {quota_bytes};
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
                        
                        # Create a trigger on each table in the schema
                        logger.info(f"Applied {quota_bytes/(1024*1024*1024):.1f}GB quota to schema {schema_name}")
        except Exception as e:
            logger.warning(f"Failed to apply storage quota to schema {schema_name}: {str(e)}")
            # Continue setup even if quota setup fails - we'll enforce through application layer

        # Phase 3: Run Migrations
        update_state('running_migrations', 60)
        try:
            logger.info(f"Starting database migration check for schema: {schema_name}")
            # Use connection with longer timeout for migrations
            with get_db_connection(for_migrations=True) as conn:
                with conn.cursor() as cursor:
                    with tenant_schema_context(cursor, schema_name):
                        # Use the MIGRATION_TIMEOUT constant for the timeout
                        with timeout(MIGRATION_TIMEOUT):
                            # The WARNING output is expected when migrations are up-to-date
                            call_command('migrate')
            logger.info(f"Migration check complete - database schema is up-to-date")
        except asyncio.TimeoutError as e:
            logger.error(f"Migration timed out after {MIGRATION_TIMEOUT} seconds")
            raise SchemaMigrationError(f"Migration timed out after {MIGRATION_TIMEOUT} seconds")
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise SchemaMigrationError(f"Failed to apply migrations: {str(e)}")

        # Phase 4: Verify Setup
        update_state('verifying_setup', 80)
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                with tenant_schema_context(cursor, schema_name):
                    cursor.execute("SELECT 1")  # Basic connectivity test
                    
                    # Test transaction support
                    with transaction.atomic():
                        cursor.execute("""
                            CREATE TEMPORARY TABLE health_check (
                                id serial PRIMARY KEY,
                                created_at timestamp DEFAULT CURRENT_TIMESTAMP
                            )
                        """)
                        cursor.execute("INSERT INTO health_check DEFAULT VALUES")

        # Phase 5: Complete Setup
        update_state('finalizing', 90)
        
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=user_id)
            tenant = Tenant.objects.select_for_update().get(owner=user)
            
            # Update user and tenant status
            user.is_onboarded = True
            user.save(update_fields=['is_onboarded'])
            
            tenant.is_active = True
            tenant.setup_status = 'complete'
            tenant.last_health_check = timezone.now()
            
            # Add storage_quota_bytes to update_fields if the field exists
            update_fields = ['is_active', 'setup_status', 'last_health_check']
            
            tenant.save(update_fields=update_fields)

            # Update onboarding progress
            onboarding_progress = OnboardingProgress.objects.get(user=user)
            # Follow proper state transition path
            if onboarding_progress.onboarding_status == 'business-info':
                onboarding_progress.onboarding_status = 'subscription'
                onboarding_progress.save()
                onboarding_progress.refresh_from_db()
            
            if onboarding_progress.onboarding_status == 'subscription':
                onboarding_progress.onboarding_status = 'complete'
                onboarding_progress.current_step = 'complete'
                onboarding_progress.next_step = 'dashboard'
                onboarding_progress.save()

            # Update Cognito attributes with retry logic
            from custom_auth.cognito import update_user_attributes_sync
            import boto3
            
            max_retries = 3
            retry_delay = 1
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    # First verify user exists in Cognito
                    client = boto3.client('cognito-idp')
                    try:
                        client.admin_get_user(
                            UserPoolId=settings.COGNITO_USER_POOL_ID,
                            Username=str(user.id)
                        )
                    except client.exceptions.UserNotFoundException:
                        logger.warning(f"User {user.id} not found in Cognito, skipping attribute update")
                        break
                        
                    # User exists, update attributes
                    update_user_attributes_sync(str(user.id), {
                        'custom:onboarding': 'COMPLETE',
                        'custom:subplan': subscription_plan,  # Add subscription plan to Cognito attributes
                    })
                    logger.info(f"Updated Cognito onboarding status for user {user.id}")
                    break
                    
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Cognito update failed (attempt {attempt + 1}): {str(e)}")
                        time.sleep(retry_delay * (2 ** attempt))
                        continue
                    else:
                        logger.error(f"Cognito update failed after {max_retries} attempts: {str(e)}")
                        # Continue with setup even if Cognito update fails
                    
        success = True
        update_state('complete', 100, 'success')

        return {
            "status": "success",
            "schema_name": schema_name,
            "user_id": user_id,
            "business_id": business_id,
            "task_id": self.request.id,
            "is_onboarded": True,
            "subscription_plan": subscription_plan,  # Include subscription plan in response
            "storage_quota_gb": getattr(tenant, 'storage_quota_bytes', 2 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)
        }

    except Exception as e:
        error_message = str(e)
        logger.error(f"Setup failed: {error_message}", exc_info=True)
        update_state('error', -1, 'failed')

        try:
            if tenant:
                tenant.setup_status = 'error'
                tenant.setup_error_message = error_message
                tenant.save(update_fields=['setup_status', 'setup_error_message'])
            if onboarding_progress:
                onboarding_progress.current_step = onboarding_progress.onboarding_status
                onboarding_progress.next_step = onboarding_progress.onboarding_status
                onboarding_progress.setup_error = error_message
                onboarding_progress.save(update_fields=[
                    'current_step',
                    'next_step',
                    'setup_error'
                ])
        except Exception as update_error:
            logger.error(f"Error status update failed: {str(update_error)}")

        if schema_name:
            cleanup_schema(schema_name)

        raise

    finally:
        try:
            connections.close_all()
        except Exception as e:
            logger.error(f"Connection cleanup failed: {str(e)}")