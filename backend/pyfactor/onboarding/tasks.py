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
from django.db.migrations.exceptions import InconsistentMigrationHistory
from django.db.migrations import loader as migrations_loader
from onboarding.utils import create_table_from_model




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
def setup_user_schema_task(self, user_id: str, business_id: str, **kwargs) -> Dict[str, Any]:
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
        **kwargs: Additional parameters including:
            - force_setup: Force recreation of schema even if it exists
            - request_id: Unique ID for tracking this request
            - tenant_id: Optional direct reference to tenant ID
            - schema_name: Optional schema name if already known
        
    Returns:
        Dict containing setup status and schema information
        
    Raises:
        SchemaSetupError: If any part of the setup process fails
    """
    # Import Django migrations module
    from django.db import migrations
    import psycopg2
    from django.conf import settings
    import concurrent.futures
    from functools import partial

    # Extract kwargs
    force_setup = kwargs.get('force_setup', False)
    request_id = kwargs.get('request_id', str(uuid.uuid4()))
    tenant_id = kwargs.get('tenant_id')  # Get tenant_id from kwargs if provided
    provided_schema_name = kwargs.get('schema_name')  # Get schema_name if provided
    is_optimized = kwargs.get('optimized', True)  # Default to optimized mode
    
    # Validate input parameters with minimal processing
    try:
        user_id = str(user_id).strip()
        business_id = str(business_id).strip() if business_id else None
    except Exception as e:
        logger.error(f"Error validating input parameters: {str(e)}")
        raise SchemaSetupError(f"Error validating input parameters: {str(e)}")

    # Log inputs with improved context
    logger.info(f"Schema setup task started with force_setup={force_setup}", extra={
        'request_id': request_id,
        'user_id': user_id,
        'business_id': business_id,
        'force_setup': force_setup,
        'tenant_id': tenant_id,
        'provided_schema_name': provided_schema_name
    })
    
    schema_name = None
    success = False
    tenant = None
    onboarding_progress = None
    subscription_plan = 'free'  # Default to free plan
    
    # Create a direct database connection to avoid connection pool issues that cause segmentation faults
    db_settings = settings.DATABASES['default']
    direct_conn = None
    
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
        # Start with clean connections to prevent memory issues
        connections.close_all()
        
        # Create a direct connection to the database to avoid connection pooling issues
        try:
            direct_conn = psycopg2.connect(
                dbname=db_settings['NAME'],
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            direct_conn.set_session(autocommit=True)  # Use autocommit mode to avoid transaction issues
            logger.info("Created direct database connection")
        except Exception as conn_error:
            logger.error(f"Failed to create direct database connection: {str(conn_error)}")
            raise SchemaSetupError(f"Database connection error: {str(conn_error)}")

        # Phase 1: Initial Setup and Validation (10%)
        update_state('initial_setup', 0)
        
        # Check for an existing tenant first
        existing_tenant = None
        try:
            # Check if there's an existing tenant for this user/business
            if tenant_id:
                existing_tenant = Tenant.objects.filter(id=tenant_id).first()
                logger.info(f"Found existing tenant by ID: {tenant_id}")
            elif business_id:
                existing_tenant = Tenant.objects.filter(business_id=business_id).first()
                logger.info(f"Found existing tenant by business ID: {business_id}")
            else:
                existing_tenant = Tenant.objects.filter(owner_id=user_id).first()
                logger.info(f"Found existing tenant by owner ID: {user_id}")
                
            if existing_tenant:
                tenant = existing_tenant
                schema_name = provided_schema_name or getattr(tenant, 'schema_name', generate_unique_schema_name(tenant.id))
                logger.info(f"Using existing tenant with schema: {schema_name}")
                
                # If we're not forcing setup and schema exists and is healthy, return early with success
                if not force_setup:
                    # Perform a quick health check
                    is_healthy = check_schema_health(schema_name, direct_conn.cursor())
                    if is_healthy:
                        update_state('schema_verified', 100, 'complete')
                        logger.info(f"Existing schema {schema_name} is healthy, skipping setup")
                        return {
                            'status': 'success',
                            'tenant_id': str(tenant.id),
                            'schema_name': schema_name,
                            'message': 'Existing schema is healthy, setup skipped'
                        }
        except Exception as e:
            logger.warning(f"Error checking for existing tenant: {str(e)}")
            # Continue with creating a new tenant
        
        update_state('tenant_setup', 10)
        
        # Create tenant if it doesn't exist
        if not tenant:
            with transaction.atomic():
                tenant = Tenant.objects.create(
                    owner_id=user_id,
                    business_id=business_id or str(uuid.uuid4()),
                    plan=subscription_plan
                )
                logger.info(f"Created new tenant with ID: {tenant.id}")
        
        # Generate schema name if not provided
        if not schema_name:
            schema_name = provided_schema_name or generate_unique_schema_name(tenant.id)
            logger.info(f"Generated schema name: {schema_name}")
        
        # Phase 2: Schema Creation (30%)
        update_state('schema_creation', 20)
        
        # Create the schema using the direct connection
        try:
            with direct_conn.cursor() as cursor:
                # Check if schema exists
                cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s", (schema_name,))
                schema_exists = cursor.fetchone() is not None
                
                if schema_exists and force_setup:
                    logger.info(f"Schema {schema_name} exists but force_setup=True, recreating...")
                    cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
                    schema_exists = False
                
                if not schema_exists:
                    # Create schema and set up permissions
                    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
                    cursor.execute(f"GRANT ALL ON SCHEMA {schema_name} TO {db_settings['USER']}")
                    cursor.execute(f"ALTER SCHEMA {schema_name} OWNER TO {db_settings['USER']}")
                    logger.info(f"Created schema {schema_name}")
                else:
                    logger.info(f"Schema {schema_name} already exists")
        except Exception as e:
            logger.error(f"Error creating schema: {str(e)}")
            raise SchemaSetupError(f"Failed to create schema: {str(e)}")

        # Update progress
        update_state('schema_validation', 30)
        
        # Phase 3: Core Table Creation (50%)
        # Check progress tracking
        try:
            # Create core setup tracking tables that are required for everything else
            if is_optimized:
                # Optimized approach using parallel execution where possible
                with direct_conn.cursor() as cursor:
                    logger.info(f"Creating core tables for {schema_name}")
                    cursor.execute(f"SET search_path TO {schema_name}, public")
                    
                    # Run core table creation
                    create_core_tables(schema_name, cursor)
                    
                    # Create health check table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS schema_health (
                            id SERIAL PRIMARY KEY,
                            checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            status VARCHAR(50) NOT NULL,
                            message TEXT
                        )
                    """)
                    
                    # Insert health record
                    cursor.execute("""
                        INSERT INTO schema_health (status, message)
                        VALUES ('initializing', 'Schema setup in progress')
                    """)
            else:
                # Use the utility function for traditional setup
                create_tenant_schema(schema_name)
                logger.info(f"Created tenant schema using traditional approach: {schema_name}")
                
            update_state('core_tables_created', 50)
        except Exception as e:
            logger.error(f"Error creating core tables: {str(e)}")
            try:
                # Try to clean up on failure
                cleanup_schema(schema_name)
            except Exception as cleanup_error:
                logger.error(f"Error during schema cleanup: {str(cleanup_error)}")
            raise SchemaSetupError(f"Failed to create core tables: {str(e)}")
        
        # Phase 4: Health Check and Finalization (100%)
        update_state('finalizing', 90)
        
        try:
            with direct_conn.cursor() as cursor:
                # Mark schema as healthy
                cursor.execute(f"SET search_path TO {schema_name}, public")
                
                # Create application tenant link
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS app_tenant_link (
                        id SERIAL PRIMARY KEY,
                        tenant_id UUID NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        owner_id VARCHAR(255) NOT NULL,
                        business_id VARCHAR(255)
                    )
                """)
                
                # Link tenant to user
                cursor.execute("""
                    INSERT INTO app_tenant_link (tenant_id, owner_id, business_id)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (str(tenant.id), user_id, business_id or ''))
                
                # Update health record
                cursor.execute("""
                    INSERT INTO schema_health (status, message)
                    VALUES ('healthy', 'Schema setup completed successfully')
                """)
                
                logger.info(f"Schema {schema_name} is now marked as healthy")
        except Exception as e:
            logger.error(f"Error during health check: {str(e)}")
            # Continue anyway, as this is just a final check
            
        # Update onboarding progress
        try:
            OnboardingProgress.objects.update_or_create(
                user_id=user_id,
                defaults={
                    'current_step': 'complete',
                    'schema_name': schema_name,
                    'tenant_id': tenant.id,
                    'status': 'complete',
                    'completed_at': timezone.now()
                }
            )
            logger.info(f"Updated onboarding progress for user {user_id}")
        except Exception as e:
            logger.error(f"Error updating onboarding progress: {str(e)}")
            # Continue anyway, as this is just tracking
        
        update_state('setup_complete', 100, 'complete')
        success = True
        
        return {
            'status': 'success',
            'tenant_id': str(tenant.id),
            'schema_name': schema_name,
            'message': 'Tenant schema setup completed successfully'
        }
            
    except (SchemaSetupError, Exception) as e:
        error_message = f"Schema setup failed: {str(e)}"
        logger.error(error_message, exc_info=True)
        
        # Try to update onboarding progress with error status
        try:
            OnboardingProgress.objects.update_or_create(
                user_id=user_id,
                defaults={
                    'current_step': 'error',
                    'status': 'error',
                    'error_message': error_message[:500]  # Limit message length
                }
            )
        except Exception as progress_error:
            logger.error(f"Error updating onboarding progress with error: {str(progress_error)}")
        
        # Raise for retry or handling
        raise
    finally:
        # Always close the direct connection
        if direct_conn:
            try:
                direct_conn.close()
                logger.info("Closed direct database connection")
            except Exception as e:
                logger.error(f"Error closing direct connection: {str(e)}")
        
        # Always close Django DB connections
        connections.close_all()
        
        # Log final status
        logger.info(f"Schema setup task completed with success={success}")



@shared_task(
    name='create_minimal_schema_task',
    bind=True,
    max_retries=3,
    retry_backoff=True,
    acks_late=True,
    time_limit=300,  # 5 minutes timeout
    soft_time_limit=270  # Soft timeout 30 seconds before hard timeout
)
def create_minimal_schema_task(self, user_id: str, business_id: str, tenant_id: str = None) -> Dict[str, Any]:
    """
    Creates a minimal tenant schema with essential tables only.
    
    This task is lighter weight than the full setup_user_schema_task and creates
    just enough structure to store onboarding data directly in the tenant schema.
    
    Args:
        user_id: The ID of the user
        business_id: The ID of the associated business
        tenant_id: Optional tenant ID, will be generated if not provided
        
    Returns:
        Dict containing schema information
    """
    # Validate input parameters
    try:
        user_id = str(user_id).strip()
        business_id = str(business_id).strip()
        if tenant_id:
            tenant_id = str(tenant_id).strip()
    except Exception as e:
        logger.error(f"Error validating input parameters: {str(e)}")
        raise ValueError(f"Error validating input parameters: {str(e)}")
    
    # Generate tenant ID if not provided
    if not tenant_id:
        tenant_id = str(uuid.uuid4())
        
    # Generate schema name
    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
    
    try:
        # Close all connections before starting schema creation
        connections.close_all()
        logger.debug("Closed all connections before minimal schema creation")
        
        # Create schema with minimal tables
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cursor:
                # Check if schema already exists
                cursor.execute("""
                    SELECT schema_name FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
                
                if not schema_exists:
                    # Create schema
                    logger.info(f"Creating minimal schema for tenant: {schema_name}")
                    cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                    
                    # Set up permissions
                    db_user = settings.DATABASES['default']['USER']
                    cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                    cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                    cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                else:
                    logger.info(f"Schema {schema_name} already exists, using existing schema")
                
                # Create essential tables
                with tenant_schema_context(cursor, schema_name):
                    # Create django_migrations table first (needed for any Django migration tracking)
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS django_migrations (
                            id serial NOT NULL PRIMARY KEY,
                            app varchar(255) NOT NULL,
                            name varchar(255) NOT NULL,
                            applied timestamp with time zone NOT NULL
                        )
                    """)
                    
                    # Create users_business table (core business entity)
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS users_business (
                            id uuid NOT NULL PRIMARY KEY,
                            business_num varchar(6) UNIQUE NOT NULL,
                            name varchar(200) NOT NULL,
                            business_type varchar(50) NOT NULL,
                            business_subtype_selections jsonb NOT NULL DEFAULT '{}'::jsonb,
                            street varchar(200) NULL,
                            city varchar(200) NULL,
                            state varchar(200) NULL,
                            postcode varchar(20) NULL,
                            country varchar(2) NOT NULL DEFAULT 'US',
                            address text NULL,
                            email varchar(254) NULL,
                            phone_number varchar(20) NULL,
                            database_name varchar(255) NULL,
                            created_at timestamp with time zone NOT NULL DEFAULT now(),
                            updated_at timestamp with time zone NOT NULL DEFAULT now(),
                            legal_structure varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                            date_founded date NULL,
                            owner_id uuid NOT NULL
                        )
                    """)
                    
                    # Create index on business.owner_id
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS users_business_owner_id_idx
                        ON users_business (owner_id)
                    """)
                    
                    # Create users_business_details table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS users_business_details (
                            business_id uuid NOT NULL PRIMARY KEY REFERENCES users_business (id) DEFERRABLE INITIALLY DEFERRED,
                            business_type varchar(50) NOT NULL,
                            legal_structure varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                            country varchar(2) NOT NULL DEFAULT 'US',
                            date_founded date NULL,
                            created_at timestamp with time zone NOT NULL DEFAULT now(),
                            updated_at timestamp with time zone NOT NULL DEFAULT now()
                        )
                    """)
                    
                    # Create users_userprofile table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS users_userprofile (
                            id bigserial NOT NULL PRIMARY KEY,
                            occupation varchar(200) NULL,
                            street varchar(200) NULL,
                            city varchar(200) NULL,
                            state varchar(200) NULL,
                            postcode varchar(200) NULL,
                            country varchar(2) NOT NULL DEFAULT 'US',
                            phone_number varchar(200) NULL,
                            created_at timestamp with time zone NOT NULL DEFAULT now(),
                            modified_at timestamp with time zone NOT NULL DEFAULT now(),
                            updated_at timestamp with time zone NOT NULL DEFAULT now(),
                            is_business_owner boolean NOT NULL DEFAULT false,
                            shopify_access_token varchar(255) NULL,
                            schema_name varchar(63) NULL,
                            metadata jsonb NULL DEFAULT '{}'::jsonb,
                            business_id uuid NULL REFERENCES users_business (id) DEFERRABLE INITIALLY DEFERRED,
                            tenant_id uuid NULL,
                            user_id uuid NOT NULL,
                            CONSTRAINT users_userprofile_user_id_key UNIQUE (user_id)
                        )
                    """)
                    
                    # Create index on userprofile.tenant_id
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx
                        ON users_userprofile (tenant_id)
                    """)
                    
                    # Create users_subscription table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS users_subscription (
                            id uuid NOT NULL PRIMARY KEY,
                            subscription_id varchar(255) NULL,
                            stripe_subscription_id varchar(255) NULL,
                            stripe_customer_id varchar(255) NULL,
                            selected_plan varchar(50) NOT NULL,
                            subscription_interval varchar(50) NOT NULL,
                            is_active boolean NOT NULL,
                            start_date timestamp with time zone NULL,
                            end_date timestamp with time zone NULL,
                            created_at timestamp with time zone NOT NULL,
                            updated_at timestamp with time zone NOT NULL,
                            business_id uuid NOT NULL UNIQUE REFERENCES users_business (id) DEFERRABLE INITIALLY DEFERRED
                        )
                    """)
                    
                    # Create onboarding_onboardingprogress table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS onboarding_onboardingprogress (
                            id uuid NOT NULL PRIMARY KEY,
                            onboarding_status varchar(256) NOT NULL,
                            account_status varchar(9) NOT NULL,
                            user_role varchar(10) NOT NULL,
                            subscription_plan varchar(12) NOT NULL,
                            current_step varchar(256) NOT NULL,
                            next_step varchar(256) NULL,
                            completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
                            last_active_step varchar(256) NULL,
                            created_at timestamp with time zone NOT NULL DEFAULT now(),
                            updated_at timestamp with time zone NOT NULL DEFAULT now(),
                            last_login timestamp with time zone NULL,
                            access_token_expiration timestamp with time zone NULL,
                            completed_at timestamp with time zone NULL,
                            attribute_version varchar(10) NOT NULL DEFAULT '1.0',
                            preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
                            setup_error text NULL,
                            selected_plan varchar(12) NOT NULL DEFAULT 'free',
                            business_id uuid NULL REFERENCES users_business (id) DEFERRABLE INITIALLY DEFERRED,
                            user_id uuid NOT NULL UNIQUE
                        )
                    """)
                    
                    # Record that these are deferred migrations
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES ('onboarding', 'deferred_migrations', NOW())
                        ON CONFLICT DO NOTHING
                    """)
                    
                    # Record the migrations we've essentially performed
                    for app_name, migration_name in [
                        ('users', '0001_initial'),
                        ('onboarding', '0001_initial')
                    ]:
                        cursor.execute("""
                            INSERT INTO django_migrations (app, name, applied)
                            VALUES (%s, %s, NOW())
                            ON CONFLICT DO NOTHING
                        """, [app_name, migration_name])
        
        # Update tenant record or create it
        tenant = None
        try:
            # Use direct SQL for better performance
            with connection.cursor() as cursor:
                # Check if tenant exists
                cursor.execute("""
                    SELECT id FROM custom_auth_tenant
                    WHERE owner_id = %s
                """, [user_id])
                
                tenant_exists = cursor.fetchone() is not None
                
                if tenant_exists:
                    # Update existing tenant
                    cursor.execute("""
                        UPDATE custom_auth_tenant
                        SET schema_name = %s,
                            setup_status = 'minimal',
                            last_setup_attempt = NOW()
                        WHERE owner_id = %s
                    """, [schema_name, user_id])
                    
                    # Get tenant ID
                    cursor.execute("""
                        SELECT id FROM custom_auth_tenant
                        WHERE owner_id = %s
                    """, [user_id])
                    tenant_id = cursor.fetchone()[0]
                else:
                    # Create new tenant
                    cursor.execute("""
                        INSERT INTO custom_auth_tenant
                        (id, schema_name, name, owner_id, created_on, is_active, setup_status)
                        VALUES (%s, %s, %s, %s, NOW(), TRUE, 'minimal')
                        RETURNING id
                    """, [tenant_id, schema_name, f"Tenant for {user_id}", user_id])
                    tenant_id = cursor.fetchone()[0]
        except Exception as tenant_error:
            logger.error(f"Error updating tenant record: {str(tenant_error)}")
            # Continue even if tenant record update fails, we'll retry later
        
        # Return schema info
        logger.info(f"Successfully created minimal schema {schema_name} for user {user_id}")
        return {
            "status": "success",
            "schema_name": schema_name,
            "tenant_id": str(tenant_id),
            "user_id": user_id,
            "business_id": business_id,
            "minimal": True,
            "timestamp": timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Minimal schema creation failed: {str(e)}")
        # Try to clean up if schema creation failed
        try:
            if schema_name:
                cleanup_schema(schema_name)
                logger.info(f"Cleaned up failed schema: {schema_name}")
        except Exception as cleanup_error:
            logger.error(f"Failed to clean up schema: {str(cleanup_error)}")
        
        # Retry with exponential backoff
        self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
        
        return {
            "status": "error",
            "error": str(e),
            "schema_name": schema_name,
            "user_id": user_id,
            "business_id": business_id
        }
    finally:
        # Make sure to close all connections
        connections.close_all()


def verify_tenant_schema(schema_name, cursor, logger=None):
    """
    Verify and update tenant schema tables to match current model definitions.
    Add missing columns if needed.
    """
    if logger is None:
        import logging
        logger = logging.getLogger('Pyfactor')
    
    logger.info(f"Verifying schema {schema_name} matches model definitions")
    
    # Set search path to tenant schema
    cursor.execute(f"SET search_path TO {schema_name}")
    
    # Define table columns that should exist based on models
    model_tables = {
        'inventory_product': {
            # Item fields
            'name': 'VARCHAR(100) NOT NULL',
            'description': 'TEXT NULL',
            'price': 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
            'is_for_sale': 'BOOLEAN NOT NULL DEFAULT TRUE',
            'is_for_rent': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'salestax': 'DECIMAL(5, 2) NOT NULL DEFAULT 0',
            'created_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
            'updated_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
            'height': 'DECIMAL(10, 2) NULL',
            'width': 'DECIMAL(10, 2) NULL',
            'height_unit': 'VARCHAR(10) NOT NULL DEFAULT \'cm\'',
            'width_unit': 'VARCHAR(10) NOT NULL DEFAULT \'cm\'',
            'weight': 'DECIMAL(10, 2) NULL',
            'weight_unit': 'VARCHAR(10) NOT NULL DEFAULT \'kg\'',
            'charge_period': 'VARCHAR(10) NOT NULL DEFAULT \'day\'',
            'charge_amount': 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
            
            # Product specific fields
            'product_code': 'VARCHAR(50) NOT NULL UNIQUE',
            'department_id': 'INTEGER NULL',
            'stock_quantity': 'INTEGER NOT NULL DEFAULT 0',
            'reorder_level': 'INTEGER NOT NULL DEFAULT 0',
        },
        'inventory_service': {
            # Item fields
            'name': 'VARCHAR(100) NOT NULL',
            'description': 'TEXT NULL',
            'price': 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
            'is_for_sale': 'BOOLEAN NOT NULL DEFAULT TRUE',
            'is_for_rent': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'salestax': 'DECIMAL(5, 2) NOT NULL DEFAULT 0',
            'created_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
            'updated_at': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
            'height': 'DECIMAL(10, 2) NULL',
            'width': 'DECIMAL(10, 2) NULL',
            'height_unit': 'VARCHAR(10) NOT NULL DEFAULT \'cm\'',
            'width_unit': 'VARCHAR(10) NOT NULL DEFAULT \'cm\'',
            'weight': 'DECIMAL(10, 2) NULL',
            'weight_unit': 'VARCHAR(10) NOT NULL DEFAULT \'kg\'',
            'charge_period': 'VARCHAR(10) NOT NULL DEFAULT \'day\'',
            'charge_amount': 'DECIMAL(10, 2) NOT NULL DEFAULT 0',
            
            # Service specific fields
            'service_code': 'VARCHAR(50) NOT NULL UNIQUE',
            'duration': 'INTERVAL NULL',
            'is_recurring': 'BOOLEAN NOT NULL DEFAULT FALSE',
        },
        'custom_auth_user': {
            'id': 'UUID PRIMARY KEY',
            'password': 'VARCHAR(128) NOT NULL',
            'last_login': 'TIMESTAMP WITH TIME ZONE NULL',
            'is_superuser': 'BOOLEAN NOT NULL',
            'email': 'VARCHAR(254) NOT NULL UNIQUE',
            'first_name': 'VARCHAR(100) NOT NULL DEFAULT \'\'',
            'last_name': 'VARCHAR(100) NOT NULL DEFAULT \'\'',
            'is_active': 'BOOLEAN NOT NULL DEFAULT TRUE',
            'is_staff': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'date_joined': 'TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
            'email_confirmed': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'confirmation_token': 'UUID NOT NULL DEFAULT gen_random_uuid()',
            'is_onboarded': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'stripe_customer_id': 'VARCHAR(255) NULL',
            'role': 'VARCHAR(20) NOT NULL DEFAULT \'OWNER\'',
            'occupation': 'VARCHAR(50) NOT NULL DEFAULT \'OWNER\'',
            'tenant_id': 'UUID NULL',
            'cognito_sub': 'VARCHAR(36) NULL'
        }
    }
    
    for table_name, expected_columns in model_tables.items():
        # Check if table exists
        cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = %s
                AND table_name = %s
            )
        """, [schema_name, table_name])
        
        table_exists = cursor.fetchone()[0]
        if not table_exists:
            logger.warning(f"Table {table_name} does not exist in schema {schema_name}")
            continue
        
        # Get existing columns
        cursor.execute(f"""
            SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_schema = %s 
            AND table_name = %s
        """, [schema_name, table_name])
        
        existing_columns = {row[0].lower(): row for row in cursor.fetchall()}
        
        # Add missing columns
        for column_name, definition in expected_columns.items():
            if column_name.lower() not in existing_columns:
                try:
                    logger.info(f"Adding missing column {column_name} to {table_name}")
                    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
                except Exception as e:
                    logger.warning(f"Error adding column {column_name} to {table_name}: {str(e)}")
    
    logger.info(f"Schema verification completed for {schema_name}")


def create_core_tables(schema_name, cursor):
    """Create all core tables for the tenant schema using model definitions"""
    from django.apps import apps
    
    # Set search path to tenant schema
    cursor.execute(f"SET search_path TO {schema_name}")
    
    # Create django infrastructure tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS django_migrations (
        id SERIAL PRIMARY KEY,
        app VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied TIMESTAMP WITH TIME ZONE NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS django_content_type (
        id SERIAL PRIMARY KEY,
        app_label VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
    );
    
    CREATE TABLE IF NOT EXISTS django_session (
        session_key VARCHAR(40) PRIMARY KEY,
        session_data TEXT NOT NULL,
        expire_date TIMESTAMP WITH TIME ZONE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS django_session_expire_date_idx ON django_session (expire_date);
    """)
    
    # Get models from all installed apps
    for app_config in apps.get_app_configs():
        for model in app_config.get_models():
            # Skip abstract models and proxy models
            if model._meta.abstract or model._meta.proxy:
                continue
                
            # Skip non-tenant models
            if not getattr(model, 'is_tenant_model', True):
                continue
                
            try:
                create_table_from_model(cursor, schema_name, model)
            except Exception as e:
                logger.warning(f"Error creating table for model {model.__name__}: {str(e)}")
    
    # Create primary key and foreign key constraints
    for app_config in apps.get_app_configs():
        for model in app_config.get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
                
            if not getattr(model, 'is_tenant_model', True):
                continue
                
            table_name = model._meta.db_table
            
            # Add foreign key constraints
            for field in model._meta.fields:
                if isinstance(field, models.ForeignKey) or isinstance(field, models.OneToOneField):
                    rel_to = field.remote_field.model
                    rel_table = rel_to._meta.db_table
                    rel_field = rel_to._meta.pk.column
                    
                    constraint_name = f"fk_{table_name}_{field.column}_refs_{rel_table}"
                    
                    try:
                        cursor.execute(f"""
                        ALTER TABLE {table_name} 
                        ADD CONSTRAINT {constraint_name}
                        FOREIGN KEY ({field.column}) 
                        REFERENCES {rel_table}({rel_field}) 
                        DEFERRABLE INITIALLY DEFERRED;
                        """)
                    except Exception as e:
                        logger.warning(f"Error adding foreign key constraint {constraint_name}: {str(e)}")
    
    # Verify and fix any schema discrepancies
    verify_tenant_schema(schema_name, cursor)
    
    return True


@shared_task(
    name='verify_all_tenant_schemas',
    bind=True
)
def verify_all_tenant_schemas(self):
    """
    Verify and fix schema issues across all tenant schemas.
    This task should be scheduled to run periodically.
    """
    from custom_auth.models import Tenant
    from django.db import connection
    
    results = {}
    
    try:
        # Get all active tenants
        tenants = Tenant.objects.filter(is_active=True)
        logger.info(f"Verifying schemas for {tenants.count()} active tenants")
        
        for tenant in tenants:
            try:
                schema_name = tenant.schema_name
                logger.info(f"Verifying schema for tenant: {schema_name}")
                
                with connection.cursor() as cursor:
                    verify_tenant_schema(schema_name, cursor)
                    
                # Update tenant's last health check time
                tenant.last_health_check = timezone.now()
                tenant.save(update_fields=['last_health_check'])
                
                results[schema_name] = "verified"
            except Exception as e:
                logger.error(f"Error verifying schema for tenant {tenant.schema_name}: {str(e)}")
                results[tenant.schema_name] = f"error: {str(e)}"
        
        return {
            "status": "success",
            "verified_count": sum(1 for result in results.values() if result == "verified"),
            "error_count": sum(1 for result in results.values() if result.startswith("error")),
            "results": results
        }
    except Exception as e:
        logger.error(f"Error in verify_all_tenant_schemas task: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

@shared_task(
    name='setup_tenant_schema_task',
    bind=True,
    max_retries=5,
    retry_backoff=True,
    acks_late=True,
    time_limit=TASK_TIMEOUT,
    soft_time_limit=SOFT_TIMEOUT,
    autoretry_for=(DatabaseError, OperationalError),
    retry_kwargs={'max_retries': 5}
)
def setup_tenant_schema_task(self, user_id: str, business_id: str, **kwargs) -> Dict[str, Any]:
    """
    Sets up a tenant schema and tracks progress for polling.
    This is a wrapper around setup_user_schema_task that provides
    additional tracking for the polling API.
    
    Args:
        user_id: The ID of the user requesting schema setup
        business_id: The ID of the associated business
        **kwargs: Additional parameters
        
    Returns:
        Dict containing setup status and schema information
    """
    logger.info(f"Starting tenant schema setup for user {user_id} and business {business_id}")
    
    try:
        # Get or create UserProfile
        from .models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user_id=user_id)
        
        # Update profile with setup in progress
        profile.setup_status = 'in_progress'
        profile.setup_started_at = timezone.now()
        profile.save(update_fields=['setup_status', 'setup_started_at'])
        
        # Call the main setup task
        result = setup_user_schema_task(user_id, business_id, **kwargs)
        
        # Update profile with complete status
        profile.setup_status = 'complete'
        profile.schema_name = result.get('schema_name')
        profile.setup_completed_at = timezone.now()
        profile.save(update_fields=['setup_status', 'schema_name', 'setup_completed_at'])
        
        return result
    except Exception as e:
        logger.error(f"Error in setup_tenant_schema_task: {str(e)}")
        
        # Update profile with error status
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user_id=user_id)
        profile.setup_status = 'error'
        profile.setup_error = str(e)
        profile.save(update_fields=['setup_status', 'setup_error'])
        
        # Re-raise for Celery retry mechanism
        raise