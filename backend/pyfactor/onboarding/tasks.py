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

    # Extract kwargs
    force_setup = kwargs.get('force_setup', False)
    request_id = kwargs.get('request_id', str(uuid.uuid4()))
    tenant_id = kwargs.get('tenant_id')  # Get tenant_id from kwargs if provided
    provided_schema_name = kwargs.get('schema_name')  # Get schema_name if provided
    
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

        # Phase 1: Initial Setup and Validation
        update_state('initial_setup', 0)
        
        # Use direct SQL for tenant check to reduce ORM overhead
        tenant_data = None
        schema_name = None
        with direct_conn.cursor() as cursor:
            # Modify the tenant lookup to use tenant_id if provided
            if tenant_id:
                # Look up by tenant ID if provided
                cursor.execute("""
                    SELECT t.id, t.schema_name, t.setup_status
                    FROM custom_auth_tenant t
                    WHERE t.id = %s
                """, [tenant_id])
            else:
                # Fall back to looking up by owner ID
                cursor.execute("""
                    SELECT t.id, t.schema_name, t.setup_status
                    FROM custom_auth_tenant t
                    WHERE t.owner_id = %s
                """, [user_id])
            
            tenant_data = cursor.fetchone()
            
            if tenant_data:
                tenant_id, schema_name, setup_status = tenant_data
                # Use provided schema name if it doesn't match the stored one
                if provided_schema_name and provided_schema_name != schema_name:
                    logger.warning(f"Provided schema name '{provided_schema_name}' differs from stored '{schema_name}'")
                    # Stick with the stored schema_name
                
                # Check if already complete
                if setup_status == 'complete' and schema_name and not force_setup:
                    return {
                        "status": "already_complete",
                        "schema_name": schema_name,
                        "business_id": business_id
                    }
                
                # Update tenant status with direct SQL
                cursor.execute("""
                    UPDATE custom_auth_tenant
                    SET is_active = FALSE,
                        setup_status = 'in_progress',
                        last_setup_attempt = NOW(),
                        setup_task_id = %s
                    WHERE id = %s
                """, [self.request.id, tenant_id])
            else:
                # No tenant found, check if we need to create one
                if force_setup:
                    # Logic to auto-create tenant if forced and not found
                    logger.info("Tenant not found but force_setup is True - creating new tenant")
                    new_schema_name = provided_schema_name or f"tenant_{str(uuid.uuid4()).replace('-', '_')}"
                    tenant_name = "Auto-created Tenant"
                    
                    new_tenant_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO custom_auth_tenant (
                            id, schema_name, name, created_on, is_active, 
                            setup_status, setup_task_id, owner_id
                        ) VALUES (
                            %s, %s, %s, NOW(), TRUE, 
                            'in_progress', %s, %s
                        ) RETURNING id, schema_name
                    """, [
                        new_tenant_id, new_schema_name, tenant_name, 
                        self.request.id, user_id
                    ])
                    tenant_data = cursor.fetchone()
                    if tenant_data:
                        tenant_id, schema_name = tenant_data
                        logger.info(f"Created new tenant with id {tenant_id} and schema {schema_name}")
                    else:
                        raise SchemaSetupError("Failed to auto-create tenant")
                else:
                    raise SchemaSetupError("No tenant found for user")
        
        if not schema_name:
            raise SchemaSetupError("No schema name found")
            
        logger.info(f"Using schema: {schema_name}")
        
        # Get subscription plan with minimal query
        if business_id and business_id != 'None':
            with direct_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT selected_plan FROM users_subscription
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
            with direct_conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE custom_auth_tenant
                    SET storage_quota_bytes = %s
                    WHERE id = %s
                """, [storage_quota_bytes, tenant_id])
        except Exception as e:
            # Continue even if quota update fails
            logger.warning(f"Failed to update storage quota: {str(e)}")

        # Check if schema already exists - if it does, this is a completion operation
        schema_exists = False
        is_minimal_setup = False
        
        with direct_conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            schema_exists = cursor.fetchone() is not None
            
            if schema_exists:
                # Check if it's a minimal setup
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = %s AND table_name = 'django_migrations'
                    )
                """, [schema_name])
                
                migrations_table_exists = cursor.fetchone()[0]
                
                if migrations_table_exists:
                    cursor.execute(f"""
                        SELECT COUNT(*) FROM {schema_name}.django_migrations
                        WHERE app = 'onboarding' AND name = 'deferred_migrations'
                    """)
                    is_minimal_setup = cursor.fetchone()[0] > 0
        
        # Phase 2: Schema Verification/Creation
        if schema_exists and is_minimal_setup:
            # Completing an existing minimal schema
            update_state('completing_schema', 30)
            logger.info(f"Completing minimal schema setup for {schema_name}")
            # Schema exists but needs full migrations
        else:
            # Full schema creation from scratch
            update_state('creating_schema', 20)
            logger.info(f"Creating new schema {schema_name}")
            
            with direct_conn.cursor() as cursor:
                # Check if schema already exists
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                if cursor.fetchone()[0] == 0:
                    # Create the schema
                    cursor.execute(f"CREATE SCHEMA {schema_name}")
                    logger.info(f"Created schema: {schema_name}")
                else:
                    logger.info(f"Schema {schema_name} already exists")

        # Phase 2.5: Apply Storage Quota
        update_state('applying_storage_quota', 30)
        try:
            # Apply quota with direct SQL for efficiency
            with direct_conn.cursor() as cursor:
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
            
            # Connect with a longer lock timeout for DDL operations
            with direct_conn.cursor() as cursor:
                # Set schema context
                cursor.execute(f"SET search_path TO {schema_name}")
                
                # First drop and recreate the django_migrations table to start fresh
                logger.info("Setting up core tables and applying migrations")
                
                try:
                    # Increase statement timeout for DDL operations
                    cursor.execute("SET statement_timeout = '300s';")
                    # Increase lock timeout
                    cursor.execute("SET lock_timeout = '60s';")
                    
                    # Drop and recreate django_migrations
                    cursor.execute("""
                        DROP TABLE IF EXISTS django_migrations CASCADE;
                        CREATE TABLE django_migrations (
                            id SERIAL PRIMARY KEY, 
                            app VARCHAR(255) NOT NULL, 
                            name VARCHAR(255) NOT NULL, 
                            applied TIMESTAMP WITH TIME ZONE NOT NULL
                        );
                    """)
                    
                    # Create essential tables with all dependencies correctly ordered
                    # First contenttype and auth tables
                    cursor.execute("""
                        -- ContentTypes
                        CREATE TABLE IF NOT EXISTS django_content_type (
                            id SERIAL PRIMARY KEY,
                            app_label VARCHAR(100) NOT NULL,
                            model VARCHAR(100) NOT NULL,
                            CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
                        );
                        
                        -- Auth Group
                        CREATE TABLE IF NOT EXISTS auth_group (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(150) NOT NULL UNIQUE
                        );
                        
                        -- Auth Permissions
                        CREATE TABLE IF NOT EXISTS auth_permission (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            content_type_id INTEGER NOT NULL REFERENCES django_content_type(id),
                            codename VARCHAR(100) NOT NULL,
                            CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename)
                        );
                        
                        -- Auth Group Permissions
                        CREATE TABLE IF NOT EXISTS auth_group_permissions (
                            id SERIAL PRIMARY KEY,
                            group_id INTEGER NOT NULL REFERENCES auth_group(id),
                            permission_id INTEGER NOT NULL REFERENCES auth_permission(id),
                            CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id)
                        );
                    """)
                    
                    # Now custom_auth tables (must come before users)
                    cursor.execute("""
                        -- Custom Auth User
                        CREATE TABLE IF NOT EXISTS custom_auth_user (
                            id UUID PRIMARY KEY,
                            password VARCHAR(128) NOT NULL,
                            last_login TIMESTAMP WITH TIME ZONE NULL,
                            is_superuser BOOLEAN NOT NULL,
                            email VARCHAR(254) NOT NULL UNIQUE,
                            first_name VARCHAR(100) NOT NULL DEFAULT '',
                            last_name VARCHAR(100) NOT NULL DEFAULT '',
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            is_staff BOOLEAN NOT NULL DEFAULT FALSE,
                            date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                            email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                            confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
                            is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
                            stripe_customer_id VARCHAR(255) NULL,
                            role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
                            occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
                            tenant_id UUID NULL,
                            cognito_sub VARCHAR(36) NULL
                        );
                        
                        CREATE INDEX IF NOT EXISTS custom_auth_user_email_key ON custom_auth_user (email);
                        CREATE INDEX IF NOT EXISTS idx_user_tenant ON custom_auth_user (tenant_id);
                        
                        -- Auth User Permissions
                        CREATE TABLE IF NOT EXISTS custom_auth_user_user_permissions (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                            permission_id INTEGER NOT NULL REFERENCES auth_permission(id),
                            CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
                        );
                        
                        -- Auth User Groups
                        CREATE TABLE IF NOT EXISTS custom_auth_user_groups (
                            id SERIAL PRIMARY KEY,
                            user_id UUID NOT NULL REFERENCES custom_auth_user(id),
                            group_id INTEGER NOT NULL REFERENCES auth_group(id),
                            CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
                        );
                        
                        -- Custom Auth Tenant
                        CREATE TABLE IF NOT EXISTS custom_auth_tenant (
                            id UUID PRIMARY KEY,
                            schema_name VARCHAR(63) NOT NULL UNIQUE,
                            name VARCHAR(100) NOT NULL,
                            created_on TIMESTAMP WITH TIME ZONE NOT NULL,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            setup_status VARCHAR(20) NOT NULL,
                            setup_task_id VARCHAR(255) NULL,
                            last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
                            setup_error_message TEXT NULL,
                            last_health_check TIMESTAMP WITH TIME ZONE NULL,
                            storage_quota_bytes BIGINT NOT NULL DEFAULT 2147483648,
                            owner_id UUID NOT NULL REFERENCES custom_auth_user(id)
                        );
                    """)
                    
                    # Then users tables (depends on custom_auth)
                    cursor.execute("""
                        -- Users Business
                        CREATE TABLE IF NOT EXISTS users_business (
                            id UUID PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            business_type VARCHAR(255) NOT NULL,
                            legal_structure VARCHAR(100) NOT NULL,
                            date_founded DATE NULL,
                            country VARCHAR(2) NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                        );
                        
                        -- Users UserProfile
                        CREATE TABLE IF NOT EXISTS users_userprofile (
                            id UUID PRIMARY KEY,
                            bio TEXT NULL,
                            phone VARCHAR(20) NULL,
                            avatar VARCHAR(255) NULL,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id),
                            tenant_id UUID NULL REFERENCES custom_auth_tenant(id)
                        );
                        
                        -- Users Business Details
                        CREATE TABLE IF NOT EXISTS users_business_details (
                            id UUID PRIMARY KEY,
                            address_line1 VARCHAR(255) NULL,
                            address_line2 VARCHAR(255) NULL,
                            city VARCHAR(100) NULL,
                            state VARCHAR(100) NULL,
                            postal_code VARCHAR(20) NULL,
                            industry VARCHAR(100) NULL,
                            website VARCHAR(255) NULL,
                            phone VARCHAR(20) NULL,
                            tax_id VARCHAR(50) NULL,
                            company_size VARCHAR(20) NULL,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            business_id UUID NOT NULL UNIQUE REFERENCES users_business(id)
                        );
                        
                        -- Users Subscription
                        CREATE TABLE IF NOT EXISTS users_subscription (
                            id UUID PRIMARY KEY,
                            subscription_id VARCHAR(255) NULL,
                            stripe_subscription_id VARCHAR(255) NULL,
                            stripe_customer_id VARCHAR(255) NULL,
                            selected_plan VARCHAR(50) NOT NULL,
                            subscription_interval VARCHAR(50) NOT NULL,
                            is_active BOOLEAN NOT NULL,
                            start_date TIMESTAMP WITH TIME ZONE NULL,
                            end_date TIMESTAMP WITH TIME ZONE NULL,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            business_id UUID NOT NULL UNIQUE REFERENCES users_business(id)
                        );
                    """)
                    
                    # Onboarding and other essential tables
                    cursor.execute("""                        
                        -- Onboarding Progress
                        CREATE TABLE IF NOT EXISTS onboarding_onboardingprogress (
                            id UUID PRIMARY KEY,
                            onboarding_status VARCHAR(20) NOT NULL,
                            current_step VARCHAR(50) NOT NULL,
                            next_step VARCHAR(50) NOT NULL,
                            completed_steps JSONB NOT NULL,
                            last_active TIMESTAMP WITH TIME ZONE NULL,
                            setup_error TEXT NULL,
                            progress_data JSONB NULL,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                            user_id UUID NOT NULL UNIQUE REFERENCES custom_auth_user(id)
                        );
                        
                        -- Sessions
                        CREATE TABLE IF NOT EXISTS django_session (
                            session_key VARCHAR(40) PRIMARY KEY, 
                            session_data TEXT NOT NULL, 
                            expire_date TIMESTAMP WITH TIME ZONE NOT NULL
                        );
                        CREATE INDEX IF NOT EXISTS django_session_expire_date_idx ON django_session (expire_date);
                    """)
                    
                    # Create essential indexes for better performance
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS custom_auth_user_email_idx ON custom_auth_user (email);
                        CREATE INDEX IF NOT EXISTS users_business_name_idx ON users_business (name);
                    """)
                    
                    # CRITICAL: Mark the migrations in the correct order with timestamps
                    # This ensures custom_auth.0001_initial is applied before users.0001_initial
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied) 
                        VALUES 
                            ('contenttypes', '0001_initial', NOW() - INTERVAL '15 minutes'),
                            ('contenttypes', '0002_remove_content_type_name', NOW() - INTERVAL '14 minutes'),
                            ('auth', '0001_initial', NOW() - INTERVAL '13 minutes'),
                            ('auth', '0002_alter_permission_name_max_length', NOW() - INTERVAL '12 minutes'),
                            ('auth', '0003_alter_user_email_max_length', NOW() - INTERVAL '11 minutes'),
                            ('auth', '0004_alter_user_username_opts', NOW() - INTERVAL '10 minutes'),
                            ('auth', '0005_alter_user_last_login_null', NOW() - INTERVAL '9 minutes'),
                            ('auth', '0006_require_contenttypes_0002', NOW() - INTERVAL '8 minutes'),
                            ('auth', '0007_alter_validators_add_error_messages', NOW() - INTERVAL '7 minutes'),
                            ('auth', '0008_alter_user_username_max_length', NOW() - INTERVAL '6 minutes'),
                            ('auth', '0009_alter_user_last_name_max_length', NOW() - INTERVAL '5 minutes'),
                            ('auth', '0010_alter_group_name_max_length', NOW() - INTERVAL '4 minutes'),
                            ('auth', '0011_update_proxy_permissions', NOW() - INTERVAL '3 minutes 30 seconds'),
                            ('auth', '0012_alter_user_first_name_max_length', NOW() - INTERVAL '3 minutes'),
                            ('auth', '0013_initial_structure', NOW() - INTERVAL '2 minutes 45 seconds'),
                            ('custom_auth', '0001_initial', NOW() - INTERVAL '2 minutes'),
                            ('users', '0001_initial', NOW() - INTERVAL '1 minute'),
                            ('onboarding', '0001_initial', NOW() - INTERVAL '30 seconds')
                    """)
                    
                    # Get the list of tables created
                    cursor.execute("""
                        SELECT table_name FROM information_schema.tables
                        WHERE table_schema = %s
                    """, [schema_name])
                    created_tables = [row[0] for row in cursor.fetchall()]
                    logger.info(f"Core tables created: {created_tables}")
                    
                except Exception as e:
                    logger.error(f"Error creating tables: {str(e)}")
                    raise
                
                # Skip running any other migrations - we've created all the necessary tables
                # and marked migrations as already applied
                logger.info(f"Schema setup complete for: {schema_name}")
        
            logger.info(f"Migration process complete")
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            raise SchemaSetupError(f"Failed to apply migrations: {str(e)}")

        # Phase 4: Verify Setup - simplified health check
        update_state('verifying_setup', 80)
        with direct_conn.cursor() as cursor:
            # Set schema context
            cursor.execute(f"SET search_path TO {schema_name}")
            cursor.execute("SELECT 1")  # Basic connectivity test

        # Phase 5: Complete Setup - use direct SQL for efficiency
        update_state('finalizing', 90)
        
        # Update user and tenant status with direct SQL
        with direct_conn.cursor() as cursor:
            try:
                # Update user status in the public schema - note the use of "custom_auth_user" instead of "auth_user"
                cursor.execute("SET search_path TO public")
                cursor.execute("""
                    UPDATE custom_auth_user
                    SET is_onboarded = TRUE
                    WHERE id = %s
                """, [user_id])
                
                # Update tenant status
                cursor.execute("""
                    UPDATE custom_auth_tenant
                    SET is_active = TRUE,
                        setup_status = 'complete',
                        last_health_check = NOW()
                    WHERE id = %s
                """, [tenant_id])
                
                # Update onboarding progress
                cursor.execute("""
                    UPDATE onboarding_onboardingprogress
                    SET onboarding_status = 'complete',
                        current_step = 'complete',
                        next_step = 'dashboard'
                    WHERE user_id = %s
                """, [user_id])
            except Exception as e:
                logger.warning(f"Error updating status: {str(e)}")
                # Continue even if status update fails
                    
            # Copy essential data from public schema to tenant schema - use isolated transactions for each copy
            logger.info(f"Starting to copy essential data to tenant schema: {schema_name}")
            
            # Copy user data
            try:
                logger.info(f"Copying user data to tenant schema: {schema_name}")
                cursor.execute(f"SET search_path TO {schema_name}")
                
                # Check if user already exists
                cursor.execute("""
                    SELECT COUNT(*) FROM custom_auth_user
                    WHERE id = %s
                """, [user_id])
                
                if cursor.fetchone()[0] == 0:
                    # Get columns from public schema
                    cursor.execute("SET search_path TO public")
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'custom_auth_user'
                        ORDER BY ordinal_position
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    columns_str = ', '.join(columns)
                    
                    # Get data
                    cursor.execute(f"""
                        SELECT {columns_str} FROM public.custom_auth_user
                        WHERE id = %s
                    """, [user_id])
                    user_data = cursor.fetchone()
                    
                    if user_data:
                        # Build parameterized query
                        placeholders = ', '.join(['%s' for _ in columns])
                        
                        # Insert with explicit column names
                        cursor.execute(f"SET search_path TO {schema_name}")
                        cursor.execute(f"""
                            INSERT INTO custom_auth_user ({columns_str})
                            VALUES ({placeholders})
                            ON CONFLICT (id) DO NOTHING
                        """, user_data)
                        logger.info(f"Copied user data for user_id: {user_id}")
                    else:
                        logger.warning(f"No user found in public schema with id: {user_id}")
            except Exception as user_error:
                logger.error(f"Error copying user data: {str(user_error)}")
                # Continue with other copies even if this one fails
            
            # Copy business data
            if business_id and business_id != 'None':
                try:
                    logger.info(f"Copying business data to tenant schema: {schema_name}")
                    cursor.execute(f"SET search_path TO {schema_name}")
                    
                    # Check if business data already exists
                    cursor.execute("""
                        SELECT COUNT(*) FROM users_business
                        WHERE id = %s
                    """, [business_id])
                    
                    if cursor.fetchone()[0] == 0:
                        # Get columns from public schema
                        cursor.execute("SET search_path TO public")
                        cursor.execute("""
                            SELECT column_name FROM information_schema.columns
                            WHERE table_schema = 'public' AND table_name = 'users_business'
                            ORDER BY ordinal_position
                        """)
                        columns = [row[0] for row in cursor.fetchall()]
                        columns_str = ', '.join(columns)
                        
                        # Get data
                        cursor.execute(f"""
                            SELECT {columns_str} FROM public.users_business
                            WHERE id = %s
                        """, [business_id])
                        business_data = cursor.fetchone()
                        
                        if business_data:
                            # Build parameterized query
                            placeholders = ', '.join(['%s' for _ in columns])
                            
                            # Insert with explicit column names
                            cursor.execute(f"SET search_path TO {schema_name}")
                            cursor.execute(f"""
                                INSERT INTO users_business ({columns_str})
                                VALUES ({placeholders})
                                ON CONFLICT (id) DO NOTHING
                            """, business_data)
                            logger.info(f"Copied business data for business_id: {business_id}")
                        else:
                            logger.warning(f"No business found in public schema with id: {business_id}")
                except Exception as business_error:
                    logger.error(f"Error copying business data: {str(business_error)}")
                    # Continue with other copies even if this one fails
            
            # Update Cognito attributes with minimal retry logic
            try:
                from custom_auth.cognito import update_user_attributes_sync
                update_user_attributes_sync(user_id, {
                    'custom:onboarding': 'COMPLETE',
                    'custom:subplan': subscription_plan,
                    'custom:setupdone': 'TRUE'  # Set setupdone to TRUE when setup is complete
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
            if direct_conn and not direct_conn.closed:
                with direct_conn.cursor() as cursor:
                    cursor.execute("SET search_path TO public")
                    # Update tenant status
                    cursor.execute("""
                        UPDATE custom_auth_tenant
                        SET setup_status = 'error',
                            setup_error_message = %s
                        WHERE id = %s
                    """, [error_message[:255], tenant_id])
                    
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
                if direct_conn and not direct_conn.closed:
                    with direct_conn.cursor() as cursor:
                        cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
                        logger.info(f"Cleaned up schema {schema_name} after error")
            except Exception as cleanup_error:
                logger.error(f"Schema cleanup failed: {str(cleanup_error)}")

        raise

    finally:
        # Clean up all connections to prevent memory leaks and segmentation faults
        if direct_conn:
            try:
                if not direct_conn.closed:
                    direct_conn.close()
                    logger.info("Closed direct database connection")
            except Exception as close_error:
                logger.error(f"Error closing direct connection: {str(close_error)}")
                
        # Close all Django connections
        try:
            connections.close_all()
            logger.info("Closed all Django database connections")
        except Exception as close_error:
            logger.error(f"Error closing Django connections: {str(close_error)}")



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