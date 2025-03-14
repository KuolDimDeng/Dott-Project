import logging
import time
import psycopg2
import threading
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.db import connection
from django.http import JsonResponse
from onboarding.utils import create_tenant_schema
from custom_auth.models import Tenant
from custom_auth.connection_utils import get_connection_for_schema, set_current_schema, get_current_schema

logger = logging.getLogger(__name__)

# Global lock for schema creation to prevent race conditions
schema_creation_lock = threading.RLock()

def verify_essential_tables(cursor, schema_name):
    """
    Verify that all essential tables exist in the schema.
    Returns a tuple of (all_tables_exist, missing_tables)
    """
    essential_tables = ['business_business', 'users_userprofile', 'onboarding_onboardingprogress', 'django_migrations']
    
    # Check which tables exist
    cursor.execute(f"""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = %s AND table_name IN %s
    """, [schema_name, tuple(essential_tables)])
    
    existing_tables = [row[0] for row in cursor.fetchall()]
    missing_tables = set(essential_tables) - set(existing_tables)
    
    return len(missing_tables) == 0, missing_tables

class EnhancedTenantMiddleware:
    """
    Enhanced middleware to handle tenant schema switching with improved error handling
    and performance optimizations.
    
    This middleware:
    1. Extracts tenant information from request headers
    2. Creates schemas on demand if they don't exist
    3. Sets the appropriate PostgreSQL search path for the request
    4. Handles schema switching with connection pooling optimizations
    5. Provides detailed logging for debugging
    6. Ensures essential tables exist before use
    7. Uses explicit schema prefixes for critical queries
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # URLs that don't need tenant context
        self.public_paths = [
            '/api/auth/',
            '/api/session/',
            '/api/token/',
            '/health/',
            '/admin/',
            '/static/',
            '/media/',
            '/onboarding/',
            '/api/token/refresh/',
            '/api/token/verify/',
        ]
        # Paths that don't require tenant context
        self.no_tenant_paths = [
            '/api/onboarding/setup/init/',
            '/api/onboarding/subscription/',
            '/api/onboarding/payment/',
            '/api/onboarding/setup/'
            # Removed '/api/onboarding/business-info/' from no_tenant_paths to ensure it uses tenant schema
        ]
    def set_schema_with_transaction_handling(self, schema_name):
        """Set the schema with proper transaction handling"""
        from django.db import connection
        
        # If we're in a transaction, we need to commit it before changing schemas
        if connection.in_atomic_block:
            # Log that we're in a transaction
            logger.warning(f"Attempting to change schema while in transaction. Committing first.")
            connection.commit()
        
        # Now set the schema
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}"')

    def __call__(self, request):
        # Skip for public paths and onboarding paths
        if any(request.path.startswith(path) for path in self.public_paths) or \
           any(request.path.startswith(path) for path in self.no_tenant_paths):
            return self.get_response(request)

        # Start timing for performance monitoring
        start_time = time.time()
        request_id = getattr(request, 'request_id', 'unknown')
        
        try:
            # Log request details for debugging
            logger.debug(
                "Processing request in EnhancedTenantMiddleware",
                extra={
                    'request_id': request_id,
                    'path': request.path,
                    'method': request.method,
                    'user': getattr(request.user, 'username', None)
                }
            )

            # Extract tenant information from headers
            tenant_id = request.headers.get('X-Tenant-ID')
            schema_name = request.headers.get('X-Schema-Name')
            
            # Use schema name from header if provided, otherwise construct from tenant ID
            if schema_name:
                logger.debug(f"Using schema name from header: {schema_name}")
            elif tenant_id:
                # Convert tenant ID to schema name format
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                logger.debug(f"Constructed schema name from tenant ID: {schema_name}")
            
            # If we have a schema name, try to use it
            if schema_name:
                # Check if schema exists in database and if business_business table exists
                schema_exists = False
                business_table_exists = False
                
                with connection.cursor() as cursor:
                    # Check if schema exists
                    cursor.execute("""
                        SELECT schema_name
                        FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, [schema_name])
                    schema_exists = cursor.fetchone() is not None
                    
                    # If schema exists, check if business_business table exists
                    if schema_exists:
                        cursor.execute("""
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = %s AND table_name = 'business_business'
                        """, [schema_name])
                        business_table_exists = cursor.fetchone() is not None
                        logger.debug(f"Schema {schema_name} exists. business_business table exists: {business_table_exists}")
                
                # If schema doesn't exist or business_business table doesn't exist
                if not schema_exists or not business_table_exists:
                    # Check if we should defer schema creation
                    # First check session for pending_schema_setup with deferred flag
                    should_defer = False
                    
                    # Check if this is a dashboard request (indicating user has completed onboarding)
                    is_dashboard_request = '/dashboard' in request.path or '/api/dashboard' in request.path
                    
                    # Log the request path and whether it's a dashboard request
                    logger.debug(f"Request path: {request.path}, is_dashboard_request: {is_dashboard_request}")
                    
                    # By default, we should defer schema creation unless explicitly triggered
                    should_defer = True
                    
                    # Check if user is authenticated to access session data
                    if hasattr(request, 'user') and request.user.is_authenticated:
                        # Check session for deferred setup flag
                        pending_setup = request.session.get('pending_schema_setup', {})
                        
                        # If we're on the dashboard, we should NOT defer (we should create the schema)
                        if is_dashboard_request:
                            should_defer = False
                            logger.info(f"Dashboard request detected, will create schema for {schema_name}")
                        # Otherwise, check if deferred flag is set
                        elif pending_setup.get('deferred', True) is True:
                            should_defer = True
                            logger.info(f"Deferred flag is set in session, deferring schema creation for {schema_name}")
                        
                        # Also check user profile metadata as a backup
                        try:
                            from users.models import UserProfile
                            profile = UserProfile.objects.filter(user=request.user).first()
                            if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                                profile_pending = profile.metadata.get('pending_schema_setup', {})
                                
                                # If we're on the dashboard, we should NOT defer
                                if is_dashboard_request:
                                    should_defer = False
                                # Otherwise, check if deferred flag is set in profile
                                elif profile_pending.get('deferred', True) is True:
                                    should_defer = True
                                    logger.info(f"Deferred flag is set in profile metadata, deferring schema creation for {schema_name}")
                        except Exception as e:
                            logger.warning(f"Error checking profile metadata for deferred setup: {str(e)}")
                    
                    if should_defer:
                        logger.info(f"[PyFactor] Deferring schema creation for {schema_name} until dashboard access")
                        # Create a minimal schema with all tables needed for onboarding
                        # Use a lock to prevent race conditions during schema creation
                        with schema_creation_lock:
                            try:
                                with connection.cursor() as cursor:
                                    # Set autocommit for schema operations
                                    connection.connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                                    
                                    # Create the schema
                                    logger.debug(f"[PyFactor] Creating minimal schema for {schema_name}")
                                    cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                                    
                                    # Verify schema was created
                                    cursor.execute("""
                                        SELECT schema_name FROM information_schema.schemata
                                        WHERE schema_name = %s
                                    """, [schema_name])
                                    if not cursor.fetchone():
                                        logger.error(f"[PyFactor] Failed to create schema {schema_name}")
                                        raise Exception(f"Failed to create schema {schema_name}")
                                    
                                    logger.info(f"[PyFactor] Schema {schema_name} created successfully")
                                    
                                    # Set up basic permissions
                                    db_user = connection.settings_dict['USER']
                                    cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                                    cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                                    cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                                    
                                    # Set search path to the new schema - EXPLICITLY SET FOR THIS CONNECTION
                                    cursor.execute(f'SET search_path TO "{schema_name}",public')
                                    
                                    # Set autocommit to True for table creation
                                    # Using ISOLATION_LEVEL_AUTOCOMMIT is more reliable than set_autocommit
                                    connection.connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                                    
                                    # Create django_migrations table to track migrations
                                    cursor.execute(f"""
                                        CREATE TABLE IF NOT EXISTS "{schema_name}"."django_migrations" (
                                            "id" serial NOT NULL PRIMARY KEY,
                                            "app" varchar(255) NOT NULL,
                                            "name" varchar(255) NOT NULL,
                                            "applied" timestamp with time zone NOT NULL
                                        )
                                    """)
                                    
                                    # Verify django_migrations table was created
                                    cursor.execute(f"""
                                        SELECT 1 FROM information_schema.tables
                                        WHERE table_schema = %s AND table_name = 'django_migrations'
                                    """, [schema_name])
                                    if not cursor.fetchone():
                                        logger.error(f"Failed to create django_migrations table in {schema_name}")
                                        raise Exception(f"Failed to create django_migrations table in {schema_name}")
                                    
                                    # Step 1: Create business_business table first (since it's referenced by other tables)
                                    logger.debug(f"[PyFactor] Creating business_business table in {schema_name}")
                                    
                                    # First check if the table already exists
                                    cursor.execute("""
                                        SELECT 1 FROM information_schema.tables
                                        WHERE table_schema = %s AND table_name = 'business_business'
                                    """, [schema_name])
                                    
                                    if not cursor.fetchone():
                                        # Table doesn't exist, create it
                                        try:
                                            cursor.execute(f"""
                                                CREATE TABLE IF NOT EXISTS "{schema_name}"."business_business" (
                                                    "id" uuid NOT NULL PRIMARY KEY,
                                                    "business_num" varchar(6) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
                                                    "business_name" varchar(200) NOT NULL,
                                                    "business_type" varchar(50) NOT NULL,
                                                    "business_subtype_selections" jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                                                    "street" varchar(200) NULL,
                                                    "city" varchar(200) NULL,
                                                    "state" varchar(200) NULL,
                                                    "postcode" varchar(20) NULL,
                                                    "country" varchar(2) NOT NULL DEFAULT 'US',
                                                    "address" text NULL,
                                                    "email" varchar(254) NULL,
                                                    "phone_number" varchar(20) NULL,
                                                    "database_name" varchar(255) NULL,
                                                    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                    "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                    "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                                    "date_founded" date NULL,
                                                    "owner_id" uuid NOT NULL
                                                )
                                            """)
                                            logger.info(f"[PyFactor] Successfully created business_business table in {schema_name}")
                                        except Exception as e:
                                            logger.error(f"[PyFactor] Error creating business_business table: {str(e)}")
                                            raise Exception(f"Failed to create business_business table: {str(e)}")
                                    else:
                                        logger.info(f"[PyFactor] business_business table already exists in {schema_name}")
                                    
                                    # Verify business_business table was created - using parameterized query
                                    cursor.execute("""
                                        SELECT 1 FROM information_schema.tables
                                        WHERE table_schema = %s AND table_name = 'business_business'
                                    """, [schema_name])
                                    if not cursor.fetchone():
                                        logger.error(f"[PyFactor] Failed to create business_business table in {schema_name}")
                                        raise Exception(f"Failed to create business_business table in {schema_name}")
                                    
                                    # Add indexes for business_business
                                    cursor.execute(f"""
                                        CREATE INDEX IF NOT EXISTS "business_business_owner_id_idx"
                                        ON "{schema_name}"."business_business" ("owner_id")
                                    """)
                            except Exception as e:
                                logger.error(f"[PyFactor] Error during schema creation: {str(e)}", exc_info=True)
                                # Attempt to clean up if schema creation fails
                                try:
                                    with connection.cursor() as cursor:
                                        cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                                except Exception as cleanup_error:
                                    logger.error(f"[PyFactor] Failed to clean up schema after error: {str(cleanup_error)}")
                                raise
                            
                            # Step 2: Create users_userprofile table - using a new cursor to avoid "cursor already closed" errors
                            logger.debug(f"[PyFactor] Creating users_userprofile table in {schema_name}")
                            # Create a new cursor for this operation
                            with connection.cursor() as cursor:
                                # Set search path for this cursor
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS "{schema_name}"."users_userprofile" (
                                        "id" bigserial NOT NULL PRIMARY KEY,
                                        "occupation" varchar(200) NULL,
                                        "street" varchar(200) NULL,
                                        "city" varchar(200) NULL,
                                        "state" varchar(200) NULL,
                                        "postcode" varchar(200) NULL,
                                        "country" varchar(2) NOT NULL DEFAULT 'US',
                                        "phone_number" varchar(200) NULL,
                                        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
                                        "is_business_owner" boolean NOT NULL DEFAULT false,
                                        "shopify_access_token" varchar(255) NULL,
                                        "schema_name" varchar(63) NULL,
                                        "metadata" jsonb NULL,
                                        "business_id" bigint NULL,
                                        "tenant_id" uuid NULL,
                                        "user_id" uuid NOT NULL
                                    )
                                """)
                                
                                # Verify users_userprofile table was created - using parameterized query
                                cursor.execute("""
                                    SELECT 1 FROM information_schema.tables
                                    WHERE table_schema = %s AND table_name = 'users_userprofile'
                                """, [schema_name])
                                if not cursor.fetchone():
                                    logger.error(f"Failed to create users_userprofile table in {schema_name}")
                                    raise Exception(f"Failed to create users_userprofile table in {schema_name}")
                                
                                # Add constraints and indexes for users_userprofile
                                cursor.execute(f"""
                                    CREATE INDEX IF NOT EXISTS "users_userp_tenant__d11818_idx"
                                    ON "{schema_name}"."users_userprofile" ("tenant_id")
                                """)
                                
                                cursor.execute(f"""
                                    DO $$
                                    BEGIN
                                        IF NOT EXISTS (
                                            SELECT 1 FROM pg_constraint
                                            WHERE conname = 'unique_user_profile'
                                        ) THEN
                                            ALTER TABLE "{schema_name}"."users_userprofile"
                                            ADD CONSTRAINT "unique_user_profile" UNIQUE ("user_id");
                                        END IF;
                                    EXCEPTION WHEN others THEN
                                        -- Constraint might already exist
                                    END;
                                    $$;
                                """)
                                
                                # Add foreign key from users_userprofile to business_business
                                cursor.execute(f"""
                                    DO $$
                                    BEGIN
                                        IF NOT EXISTS (
                                            SELECT 1 FROM pg_constraint
                                            WHERE conname = 'users_userprofile_business_id_fk'
                                        ) THEN
                                            ALTER TABLE "{schema_name}"."users_userprofile"
                                            ADD CONSTRAINT "users_userprofile_business_id_fk"
                                            FOREIGN KEY ("business_id")
                                            REFERENCES "{schema_name}"."business_business" ("id")
                                            DEFERRABLE INITIALLY DEFERRED;
                                        END IF;
                                    EXCEPTION WHEN others THEN
                                        -- Constraint might already exist
                                    END;
                                    $$;
                                """)
                            
                            # Step 3: Create onboarding_onboardingprogress table - using a new cursor
                            logger.debug(f"[PyFactor] Creating onboarding_onboardingprogress table in {schema_name}")
                            # Create a new cursor for this operation
                            with connection.cursor() as cursor:
                                # Set search path for this cursor
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                cursor.execute(f"""
                                    CREATE TABLE IF NOT EXISTS "{schema_name}"."onboarding_onboardingprogress" (
                                        "id" uuid NOT NULL PRIMARY KEY,
                                        "onboarding_status" varchar(256) NOT NULL,
                                        "account_status" varchar(9) NOT NULL,
                                        "user_role" varchar(10) NOT NULL,
                                        "subscription_plan" varchar(12) NOT NULL,
                                        "current_step" varchar(256) NOT NULL,
                                        "next_step" varchar(256) NULL,
                                        "completed_steps" jsonb NOT NULL,
                                        "last_active_step" varchar(256) NULL,
                                        "created_at" timestamp with time zone NOT NULL,
                                        "updated_at" timestamp with time zone NOT NULL,
                                        "last_login" timestamp with time zone NULL,
                                        "access_token_expiration" timestamp with time zone NULL,
                                        "completed_at" timestamp with time zone NULL,
                                        "attribute_version" varchar(10) NOT NULL,
                                        "preferences" jsonb NOT NULL,
                                        "setup_error" text NULL,
                                        "selected_plan" varchar(12) NOT NULL,
                                        "business_id" uuid NULL,
                                        "user_id" uuid NOT NULL UNIQUE
                                    )
                                """)
                            
                                # Verify onboarding_onboardingprogress table was created - using parameterized query
                                cursor.execute("""
                                    SELECT 1 FROM information_schema.tables
                                    WHERE table_schema = %s AND table_name = 'onboarding_onboardingprogress'
                                """, [schema_name])
                                if not cursor.fetchone():
                                    logger.error(f"Failed to create onboarding_onboardingprogress table in {schema_name}")
                                    raise Exception(f"Failed to create onboarding_onboardingprogress table in {schema_name}")
                            
                            # Add foreign key from onboarding_onboardingprogress to business_business - using a new cursor
                            with connection.cursor() as cursor:
                                # Set search path for this cursor
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                cursor.execute(f"""
                                    DO $$
                                    BEGIN
                                        IF NOT EXISTS (
                                            SELECT 1 FROM pg_constraint
                                            WHERE conname = 'onboarding_onboardingprogress_business_id_fk'
                                        ) THEN
                                            ALTER TABLE "{schema_name}"."onboarding_onboardingprogress"
                                            ADD CONSTRAINT "onboarding_onboardingprogress_business_id_fk"
                                            FOREIGN KEY ("business_id")
                                            REFERENCES "{schema_name}"."business_business" ("id")
                                            DEFERRABLE INITIALLY DEFERRED;
                                        END IF;
                                    EXCEPTION WHEN others THEN
                                        -- Constraint might already exist
                                    END;
                                    $$;
                                """)
                            
                            # Record migrations in django_migrations - using a new cursor
                            with connection.cursor() as cursor:
                                # Set search path for this cursor
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                cursor.execute(f"""
                                    INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                    VALUES ('business', '0001_initial', NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                                
                                cursor.execute(f"""
                                    INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                    VALUES ('business', '0002_initial', NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                                
                                cursor.execute(f"""
                                    INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                    VALUES ('users', '0001_initial', NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                                
                                cursor.execute(f"""
                                    INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                    VALUES ('onboarding', '0001_initial', NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                                
                                # Add the deferred migrations marker
                                cursor.execute(f"""
                                    INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                    VALUES ('onboarding', 'deferred_migrations', NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                            
                            # Verify all tables were created successfully using our helper function - with a new cursor
                            with connection.cursor() as cursor:
                                # Set search path for this cursor
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                all_tables_exist, missing_tables = verify_essential_tables(cursor, schema_name)
                                
                                if not all_tables_exist:
                                    logger.error(f"[PyFactor] Not all essential tables were created. Missing: {missing_tables}")
                                    raise Exception(f"Failed to create all essential tables. Missing: {missing_tables}")
                            
                            logger.info(f"[PyFactor] Successfully created essential tables for onboarding in schema {schema_name}")
                            
                            # Reset isolation level to default (READ COMMITTED)
                            connection.connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
                            
                            # Update tenant status if it exists
                            try:
                                tenant = None
                                if hasattr(request, 'user') and request.user.is_authenticated:
                                    tenant = Tenant.objects.filter(owner_id=request.user.id).first()
                                
                                if tenant:
                                    # Mark tenant as deferred setup
                                    tenant.setup_status = 'deferred'
                                    tenant.save(update_fields=['setup_status'])
                                    logger.info(f"[PyFactor] Marked tenant {tenant.id} setup as deferred for user {request.user.id}")
                            except Exception as e:
                                logger.warning(f"[PyFactor] Failed to update tenant status: {str(e)}")
                    else:
                        logger.info(f"[PyFactor] Schema {schema_name} does not exist, creating it")
                        try:
                            # Log thread information
                            import threading
                            current_thread = threading.current_thread()
                            logger.debug(f"[PyFactor] Schema creation running in thread: {current_thread.name} (ID: {current_thread.ident}, Main: {current_thread is threading.main_thread()})")
                            
                            # Create schema if it doesn't exist
                            with connection.cursor() as cursor:
                                # Set autocommit for schema operations
                                connection.connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                                
                                # Create schema
                                logger.debug(f"[PyFactor] Executing CREATE SCHEMA IF NOT EXISTS for {schema_name}")
                                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                                
                                # Verify schema was created
                                cursor.execute("""
                                    SELECT schema_name FROM information_schema.schemata
                                    WHERE schema_name = %s
                                """, [schema_name])
                                if not cursor.fetchone():
                                    logger.error(f"[PyFactor] Failed to create schema {schema_name}")
                                    raise Exception(f"Failed to create schema {schema_name}")
                                
                                # Set up permissions
                                db_user = connection.settings_dict['USER']
                                logger.debug(f"[PyFactor] Setting up permissions for user {db_user}")
                                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                                
                                # Reset isolation level to default
                                connection.connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
                                
                                # Run migrations if needed
                                # Set search path before running migrations
                                logger.debug(f"[PyFactor] Setting search path to {schema_name},public")
                                cursor.execute(f'SET search_path TO "{schema_name}",public')
                                
                                # Run migrations for all tenant apps
                                from django.core.management import call_command
                                from django.conf import settings
                                import asyncio
                                import sys
                                import traceback
                                
                                # Import timeout context manager
                                from onboarding.task_utils import timeout
                                
                                # Check which tables already exist
                                cursor.execute("""
                                    SELECT table_name FROM information_schema.tables
                                    WHERE table_schema = %s
                                """, [schema_name])
                                existing_tables = [row[0] for row in cursor.fetchall()]
                                logger.info(f"[PyFactor] Found {len(existing_tables)} existing tables in schema {schema_name}")
                                
                                # Check if essential tables for onboarding already exist
                                users_table_exists = 'users_userprofile' in existing_tables
                                business_table_exists = 'business_business' in existing_tables
                                onboarding_table_exists = 'onboarding_onboardingprogress' in existing_tables
                                
                                logger.info(f"[PyFactor] Essential tables status - users_userprofile: {users_table_exists}, business_business: {business_table_exists}, onboarding_onboardingprogress: {onboarding_table_exists}")
                                
                                # First run the general migrate command with longer timeout
                                logger.info(f"[PyFactor] Running general migrations for schema {schema_name}")
                                try:
                                    with timeout(180):  # 3 minutes timeout for migrations
                                        call_command('migrate', verbosity=1)
                                    logger.info(f"[PyFactor] General migrations completed successfully for schema {schema_name}")
                                except Exception as migrate_error:
                                    exc_type, exc_value, exc_traceback = sys.exc_info()
                                    stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                                    logger.error(f"[PyFactor] Error running general migrations: {str(migrate_error)}")
                                    logger.error(f"[PyFactor] Migration stack trace: {''.join(stack_trace)}")
                                    # Continue with app-specific migrations even if general migrations fail
                                
                                # Run migrations for the users app if the table doesn't exist
                                if not users_table_exists:
                                    logger.info(f"[PyFactor] Running migrations for users app in schema {schema_name}")
                                    try:
                                        # Use a longer timeout for users app migrations
                                        with timeout(180):  # 3 minutes timeout for migrations
                                            call_command('migrate', 'users', verbosity=1)
                                        logger.info(f"[PyFactor] Successfully migrated users app")
                                    except asyncio.TimeoutError:
                                        logger.error(f"[PyFactor] Migration timed out for users app after 180 seconds")
                                    except Exception as users_error:
                                        exc_type, exc_value, exc_traceback = sys.exc_info()
                                        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                                        logger.error(f"[PyFactor] Error running migrations for users app: {str(users_error)}")
                                        logger.error(f"[PyFactor] Users app migration stack trace: {''.join(stack_trace)}")
                                else:
                                    logger.info(f"[PyFactor] Users table already exists in schema {schema_name}, skipping users migrations")
                                
                                # Then run migrations for each TENANT_APP specifically
                                tenant_apps = settings.TENANT_APPS
                                logger.info(f"[PyFactor] Running migrations for {len(tenant_apps)} tenant apps in schema {schema_name}")
                                
                                for app in tenant_apps:
                                    # Skip users app as we already handled it
                                    if app == 'users':
                                        continue
                                        
                                    # Skip business app if the table already exists
                                    if app == 'business' and business_table_exists:
                                        logger.info(f"[PyFactor] Business table already exists in schema {schema_name}, skipping business migrations")
                                        continue
                                    
                                    # Skip onboarding app if the table already exists
                                    if app == 'onboarding' and onboarding_table_exists:
                                        logger.info(f"[PyFactor] Onboarding table already exists in schema {schema_name}, skipping onboarding migrations")
                                        continue
                                        
                                    logger.info(f"[PyFactor] Running migrations for app: {app}")
                                    try:
                                        # Use a longer timeout for each app's migrations
                                        with timeout(180):  # 3 minutes timeout for migrations
                                            call_command('migrate', app, verbosity=1)
                                        logger.info(f"[PyFactor] Successfully migrated app {app}")
                                    except asyncio.TimeoutError:
                                        logger.error(f"[PyFactor] Migration timed out for app {app} after 180 seconds")
                                        # Continue with other apps even if one times out
                                    except Exception as app_error:
                                        exc_type, exc_value, exc_traceback = sys.exc_info()
                                        stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                                        logger.error(f"[PyFactor] Error running migrations for app {app}: {str(app_error)}")
                                        logger.error(f"[PyFactor] App migration stack trace: {''.join(stack_trace)}")
                                        # Continue with other apps even if one fails
                                
                                # Verify schema was created successfully
                                cursor.execute("""
                                    SELECT schema_name FROM information_schema.schemata
                                    WHERE schema_name = %s
                                """, [schema_name])
                                if cursor.fetchone():
                                    logger.info(f"[PyFactor] Successfully created and configured schema: {schema_name}")
                                    
                                    # Check if essential tables exist
                                    cursor.execute("""
                                        SELECT table_name FROM information_schema.tables
                                        WHERE table_schema = %s
                                        AND table_name IN ('users_userprofile', 'business_business')
                                    """, [schema_name])
                                    existing_tables = [row[0] for row in cursor.fetchall()]
                                    
                                    userprofile_table_exists = 'users_userprofile' in existing_tables
                                    business_table_exists = 'business_business' in existing_tables
                                    
                                    logger.info(f"[PyFactor] Final check - Essential tables status - users_userprofile: {userprofile_table_exists}, business_business: {business_table_exists}")
                                    
                                    # If users_userprofile table doesn't exist, create it manually
                                    if not userprofile_table_exists:
                                        logger.warning(f"[PyFactor] users_userprofile table does not exist in schema {schema_name}, creating it manually")
                                        try:
                                            # Import the fix_tenant_userprofile script
                                            from scripts.fix_tenant_userprofile import create_userprofile_table
                                            
                                            # Create the users_userprofile table
                                            create_userprofile_table(schema_name)
                                            
                                            logger.info(f"[PyFactor] Successfully created users_userprofile table in schema {schema_name}")
                                        except Exception as e:
                                            logger.error(f"[PyFactor] Error creating users_userprofile table: {str(e)}")
                                    
                                    # If business_business table doesn't exist, create it manually
                                    if not business_table_exists:
                                        logger.warning(f"[PyFactor] business_business table does not exist in schema {schema_name}, creating it manually")
                                        try:
                                            # Create the business_business table with business_num field
                                            cursor.execute("""
                                                CREATE TABLE IF NOT EXISTS "business_business" (
                                                    "id" uuid NOT NULL PRIMARY KEY,
                                                    "business_num" varchar(6) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
                                                    "business_name" varchar(200) NOT NULL,
                                                    "business_type" varchar(50) NOT NULL,
                                                    "business_subtype_selections" jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                                                    "street" varchar(200) NULL,
                                                    "city" varchar(200) NULL,
                                                    "state" varchar(200) NULL,
                                                    "postcode" varchar(20) NULL,
                                                    "country" varchar(2) NOT NULL DEFAULT 'US',
                                                    "address" text NULL,
                                                    "email" varchar(254) NULL,
                                                    "phone_number" varchar(20) NULL,
                                                    "database_name" varchar(255) NULL,
                                                    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                    "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                    "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                                    "date_founded" date NULL,
                                                    "owner_id" uuid NOT NULL
                                                )
                                            """)
                                            
                                            # Add indexes
                                            cursor.execute("""
                                                CREATE INDEX IF NOT EXISTS "business_business_owner_id_idx"
                                                ON "business_business" ("owner_id")
                                            """)
                                            
                                            # Record migrations
                                            cursor.execute("""
                                                INSERT INTO django_migrations (app, name, applied)
                                                VALUES ('business', '0001_initial', NOW())
                                                ON CONFLICT DO NOTHING
                                            """)
                                            
                                            cursor.execute("""
                                                INSERT INTO django_migrations (app, name, applied)
                                                VALUES ('business', '0002_initial', NOW())
                                                ON CONFLICT DO NOTHING
                                            """)
                                            
                                            logger.info(f"[PyFactor] Successfully created business_business table in schema {schema_name}")
                                        except Exception as e:
                                            logger.error(f"[PyFactor] Error creating business_business table: {str(e)}")
                                    
                                    # Check if onboarding_onboardingprogress table exists
                                    cursor.execute("""
                                        SELECT EXISTS (
                                            SELECT 1
                                            FROM information_schema.tables
                                            WHERE table_schema = %s
                                            AND table_name = 'onboarding_onboardingprogress'
                                        )
                                    """, [schema_name])
                                    onboarding_table_exists = cursor.fetchone()[0]
                                    
                                    # If onboarding_onboardingprogress table doesn't exist, create it manually
                                    if not onboarding_table_exists:
                                        logger.warning(f"[PyFactor] onboarding_onboardingprogress table does not exist in schema {schema_name}, creating it manually")
                                        try:
                                            # Create the onboarding_onboardingprogress table
                                            cursor.execute("""
                                                CREATE TABLE IF NOT EXISTS "onboarding_onboardingprogress" (
                                                    "id" uuid NOT NULL PRIMARY KEY,
                                                    "onboarding_status" varchar(256) NOT NULL,
                                                    "account_status" varchar(9) NOT NULL,
                                                    "user_role" varchar(10) NOT NULL,
                                                    "subscription_plan" varchar(12) NOT NULL,
                                                    "current_step" varchar(256) NOT NULL,
                                                    "next_step" varchar(256) NULL,
                                                    "completed_steps" jsonb NOT NULL,
                                                    "last_active_step" varchar(256) NULL,
                                                    "created_at" timestamp with time zone NOT NULL,
                                                    "updated_at" timestamp with time zone NOT NULL,
                                                    "last_login" timestamp with time zone NULL,
                                                    "access_token_expiration" timestamp with time zone NULL,
                                                    "completed_at" timestamp with time zone NULL,
                                                    "attribute_version" varchar(10) NOT NULL,
                                                    "preferences" jsonb NOT NULL,
                                                    "setup_error" text NULL,
                                                    "selected_plan" varchar(12) NOT NULL,
                                                    "business_id" uuid NULL,
                                                    "user_id" uuid NOT NULL UNIQUE
                                                )
                                            """)
                                            
                                            # Add foreign key from onboarding_onboardingprogress to business_business
                                            if business_table_exists:
                                                cursor.execute("""
                                                    DO $$
                                                    BEGIN
                                                        IF NOT EXISTS (
                                                            SELECT 1 FROM pg_constraint
                                                            WHERE conname = 'onboarding_onboardingprogress_business_id_fk'
                                                        ) THEN
                                                            ALTER TABLE "onboarding_onboardingprogress"
                                                            ADD CONSTRAINT "onboarding_onboardingprogress_business_id_fk"
                                                            FOREIGN KEY ("business_id")
                                                            REFERENCES "business_business" ("id")
                                                            DEFERRABLE INITIALLY DEFERRED;
                                                        END IF;
                                                    EXCEPTION WHEN others THEN
                                                        -- Constraint might already exist
                                                    END;
                                                    $$;
                                                """)
                                            
                                            # Record migrations
                                            cursor.execute("""
                                                INSERT INTO django_migrations (app, name, applied)
                                                VALUES ('onboarding', '0001_initial', NOW())
                                                ON CONFLICT DO NOTHING
                                            """)
                                            
                                            logger.info(f"[PyFactor] Successfully created onboarding_onboardingprogress table in schema {schema_name}")
                                        except Exception as e:
                                            logger.error(f"[PyFactor] Error creating onboarding_onboardingprogress table: {str(e)}")
                                else:
                                    logger.error(f"[PyFactor] Schema {schema_name} was not created successfully")
                                    raise Exception(f"Schema {schema_name} was not created successfully")
                        except Exception as e:
                            import sys
                            import traceback
                            exc_type, exc_value, exc_traceback = sys.exc_info()
                            stack_trace = traceback.format_exception(exc_type, exc_value, exc_traceback)
                            
                            logger.error(f"[PyFactor] Failed to create schema {schema_name}: {str(e)}")
                            logger.error(f"[PyFactor] Schema creation stack trace: {''.join(stack_trace)}")
                            
                            # Check if the error is related to the barcode app
                            if "barcode" in str(e).lower() and "migrations" in str(e).lower():
                                logger.error("[PyFactor] Error related to barcode app migrations. This is likely because 'barcode' is a Python package, not a Django app.")
                                # Continue without returning an error response, as we'll try to use the schema anyway
                            else:
                                return JsonResponse({
                                    'error': 'Schema creation failed',
                                    'details': str(e)
                                }, status=500)
                
                # Set search path for this request
                try:
                    # Verify essential tables exist before using the schema
                    with connection.cursor() as cursor:
                        all_tables_exist, missing_tables = verify_essential_tables(cursor, schema_name)
                        if not all_tables_exist:
                            logger.warning(f"Schema {schema_name} is missing essential tables: {missing_tables}. Attempting to create them.")
                            
                            # Try to create missing tables
                            for table_name in missing_tables:
                                if table_name == 'business_business':
                                    logger.info(f"Creating missing business_business table in {schema_name}")
                                    try:
                                        # Set isolation level for schema operations
                                        connection.connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                                        
                                        # Create the business_business table
                                        cursor.execute(f"""
                                            CREATE TABLE IF NOT EXISTS "{schema_name}"."business_business" (
                                                "id" uuid NOT NULL PRIMARY KEY,
                                                "business_num" varchar(6) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
                                                "business_name" varchar(200) NOT NULL,
                                                "business_type" varchar(50) NOT NULL,
                                                "business_subtype_selections" jsonb NOT NULL DEFAULT '{{}}'::jsonb,
                                                "street" varchar(200) NULL,
                                                "city" varchar(200) NULL,
                                                "state" varchar(200) NULL,
                                                "postcode" varchar(20) NULL,
                                                "country" varchar(2) NOT NULL DEFAULT 'US',
                                                "address" text NULL,
                                                "email" varchar(254) NULL,
                                                "phone_number" varchar(20) NULL,
                                                "database_name" varchar(255) NULL,
                                                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                "modified_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                                "date_founded" date NULL,
                                                "owner_id" uuid NOT NULL
                                            )
                                        """)
                                        
                                        # Add indexes for business_business
                                        cursor.execute(f"""
                                            CREATE INDEX IF NOT EXISTS "business_business_owner_id_idx"
                                            ON "{schema_name}"."business_business" ("owner_id")
                                        """)
                                        
                                        # Record migrations
                                        cursor.execute(f"""
                                            INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                            VALUES ('business', '0001_initial', NOW())
                                            ON CONFLICT DO NOTHING
                                        """)
                                        
                                        cursor.execute(f"""
                                            INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                            VALUES ('business', '0002_initial', NOW())
                                            ON CONFLICT DO NOTHING
                                        """)
                                        
                                        logger.info(f"Successfully created missing business_business table in {schema_name}")
                                    except Exception as e:
                                        logger.error(f"Failed to create missing business_business table: {str(e)}")
                            
                            # Check again if all tables exist now
                            all_tables_exist, still_missing = verify_essential_tables(cursor, schema_name)
                            if not all_tables_exist:
                                logger.warning(f"Schema {schema_name} still missing essential tables: {still_missing}. Using explicit schema prefixes.")
                                # Store missing tables in request for views to handle
                                request.missing_tables = still_missing
                            else:
                                logger.info(f"Successfully created all missing essential tables in {schema_name}")
                    
                    # Use optimized connection management with explicit schema setting
                    self.set_schema_with_transaction_handling(schema_name)
                    conn = get_connection_for_schema(schema_name)
                    
                    # Double-check search path is set correctly
                    with conn.cursor() as cursor:
                        cursor.execute("SHOW search_path")
                        current_path = cursor.fetchone()[0]
                        if schema_name not in current_path:
                            logger.warning(f"Search path does not include schema: {current_path}. Resetting to {schema_name},public")
                            cursor.execute(f'SET search_path TO "{schema_name}",public')
                    
                    # Store schema info in request for views to use
                    request.schema_name = schema_name
                    
                    # Process the request with tenant schema
                    response = self.get_response(request)
                    
                    # Reset to public schema after request
                    set_current_schema('public')
                    
                    # Log performance metrics
                    elapsed_time = time.time() - start_time
                    logger.debug(
                        f"Request with schema {schema_name} completed",
                        extra={
                            'request_id': request_id,
                            'elapsed_time': f"{elapsed_time:.4f}s",
                            'schema': schema_name
                        }
                    )
                    
                    return response
                except Exception as e:
                    logger.error(f"Error using schema {schema_name}: {str(e)}")
                    # Fall back to public schema
                    with connection.cursor() as cursor:
                        cursor.execute('SET search_path TO public')
            
            # Fallback to user's tenant if header-based lookup failed
            if hasattr(request, 'user') and request.user.is_authenticated:
                tenant = getattr(request.user, 'tenant', None)
                
                if tenant and tenant.is_active and tenant.schema_name:
                    # Store tenant in request for views
                    request.tenant = tenant
                    request.schema_name = tenant.schema_name
                    
                    # Set search path for this request using optimized connection management
                    set_current_schema(tenant.schema_name)
                    get_connection_for_schema(tenant.schema_name)
                    
                    # Process the request with tenant schema
                    response = self.get_response(request)
                    
                    # Reset to public schema after request
                    set_current_schema('public')
                    
                    # Log performance metrics
                    elapsed_time = time.time() - start_time
                    logger.debug(
                        f"Request with user tenant schema completed",
                        extra={
                            'request_id': request_id,
                            'elapsed_time': f"{elapsed_time:.4f}s",
                            'schema': tenant.schema_name
                        }
                    )
                    
                    return response
            
            # Default to public schema if no tenant found
            set_current_schema('public')
            get_connection_for_schema('public')
            
            logger.debug("Using public schema (no tenant found)")
            return self.get_response(request)
            
        except Exception as e:
            logger.error(
                f"Error in EnhancedTenantMiddleware: {str(e)}",
                exc_info=True,
                extra={
                    'request_id': request_id,
                    'path': request.path,
                    'user_id': getattr(request.user, 'id', None)
                }
            )
            # Ensure we fall back to public schema
            set_current_schema('public')
            get_connection_for_schema('public')
            return self.get_response(request)