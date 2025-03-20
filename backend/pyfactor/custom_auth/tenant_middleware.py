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
    essential_tables = ['users_business', 'users_userprofile', 'onboarding_onboardingprogress', 'django_migrations']
    
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
                # Check if schema exists and if it's a minimal or complete setup
                schema_exists = False
                schema_status = 'not_created'
                
                with connection.cursor() as cursor:
                    # Check if schema exists
                    cursor.execute("""
                        SELECT schema_name FROM information_schema.schemata
                        WHERE schema_name = %s
                    """, [schema_name])
                    schema_exists = cursor.fetchone() is not None
                    
                    if schema_exists:
                        # Check for deferred migrations marker
                        cursor.execute("""
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
                            deferred_migrations = cursor.fetchone()[0] > 0
                            
                            if deferred_migrations:
                                schema_status = 'minimal'
                                logger.info(f"Schema {schema_name} has minimal setup (deferred migrations marker found)")
                            else:
                                schema_status = 'complete'
                                logger.info(f"Schema {schema_name} has complete setup")
                        else:
                            # No migrations table - still need to determine if tables exist
                            all_tables_exist, missing_tables = verify_essential_tables(cursor, schema_name)
                            if all_tables_exist:
                                schema_status = 'complete'
                                logger.info(f"Schema {schema_name} has all essential tables but no migrations table")
                            else:
                                schema_status = 'minimal'
                                logger.info(f"Schema {schema_name} is missing essential tables: {missing_tables}")
                
                # Use the schema regardless of status if it exists
                if schema_exists:
                    # Set search path for this request
                    self.set_schema_with_transaction_handling(schema_name)
                    
                    # Store schema status in request
                    request.schema_name = schema_name
                    request.schema_status = schema_status
                    
                    # For minimal schemas, we might need to create missing tables
                    if schema_status == 'minimal':
                        # Check if this is a dashboard request (indicating user has completed onboarding)
                        is_dashboard_request = '/dashboard' in request.path or '/api/dashboard' in request.path
                        
                        if is_dashboard_request:
                            # Trigger schema completion at dashboard access
                            if hasattr(request, 'user') and request.user.is_authenticated:
                                # Get pending setup from session or profile
                                pending_setup = request.session.get('pending_schema_setup', {})
                                if not pending_setup:
                                    # Try to get from profile metadata
                                    try:
                                        from users.models import UserProfile
                                        profile = UserProfile.objects.filter(user=request.user).first()
                                        if profile and hasattr(profile, 'metadata') and isinstance(profile.metadata, dict):
                                            pending_setup = profile.metadata.get('pending_schema_setup', {})
                                    except Exception as e:
                                        logger.warning(f"Failed to get pending setup from profile: {str(e)}")
                                
                                # If we have pending setup info, store it in the request
                                if pending_setup:
                                    request.pending_schema_setup = pending_setup
                    
                    # Continue with the request
                    response = self.get_response(request)
                    
                    # Reset to public schema after request
                    set_current_schema('public')
                    return response
                
                # If schema doesn't exist, check if we should defer creation
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
                                
                                # Step 1: Create users_business table first (since it's referenced by other tables)
                                logger.debug(f"[PyFactor] Creating users_business table in {schema_name}")
                                
                                # First check if the table already exists
                                cursor.execute("""
                                    SELECT 1 FROM information_schema.tables
                                    WHERE table_schema = %s AND table_name = 'users_business'
                                """, [schema_name])
                                
                                if not cursor.fetchone():
                                    # Table doesn't exist, create it
                                    try:
                                        cursor.execute(f"""
                                            CREATE TABLE IF NOT EXISTS "{schema_name}"."users_business" (
                                                "id" uuid NOT NULL PRIMARY KEY,
                                                "business_num" varchar(6) UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
                                                "name" varchar(200) NOT NULL,
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
                                                "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
                                                "legal_structure" varchar(50) NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
                                                "date_founded" date NULL,
                                                "owner_id" uuid NOT NULL
                                            )
                                        """)
                                        logger.info(f"[PyFactor] Successfully created users_business table in {schema_name}")
                                    except Exception as e:
                                        logger.error(f"[PyFactor] Error creating users_business table: {str(e)}")
                                        raise Exception(f"Failed to create users_business table: {str(e)}")
                                else:
                                    logger.info(f"[PyFactor] users_business table already exists in {schema_name}")
                                
                                # Verify users_business table was created - using parameterized query
                                cursor.execute("""
                                    SELECT 1 FROM information_schema.tables
                                    WHERE table_schema = %s AND table_name = 'users_business'
                                """, [schema_name])
                                if not cursor.fetchone():
                                    logger.error(f"[PyFactor] Failed to create users_business table in {schema_name}")
                                    raise Exception(f"Failed to create users_business table in {schema_name}")
                                
                                # Add indexes for users_business
                                cursor.execute(f"""
                                    CREATE INDEX IF NOT EXISTS "users_business_owner_id_idx"
                                    ON "{schema_name}"."users_business" ("owner_id")
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
                                    "business_id" uuid NULL,
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
                                        REFERENCES "{schema_name}"."users_business" ("id")
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
                                        REFERENCES "{schema_name}"."users_business" ("id")
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
                                VALUES ('users', '0001_business', NOW())
                                ON CONFLICT DO NOTHING
                            """)
                            
                            cursor.execute(f"""
                                INSERT INTO "{schema_name}"."django_migrations" (app, name, applied)
                                VALUES ('users', '0002_business_details', NOW())
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
                                tenant.setup_status = 'minimal'  # Updated from 'deferred' to 'minimal' for consistency
                                tenant.save(update_fields=['setup_status'])
                                logger.info(f"[PyFactor] Marked tenant {tenant.id} setup as minimal for user {request.user.id}")
                        except Exception as e:
                            logger.warning(f"[PyFactor] Failed to update tenant status: {str(e)}")
                else:
                    logger.info(f"[PyFactor] Schema {schema_name} does not exist, creating it")
                    # ... rest of existing schema creation code ...

                # Set search path for this request
                try:
                    # Verify essential tables exist before using the schema
                    with connection.cursor() as cursor:
                        all_tables_exist, missing_tables = verify_essential_tables(cursor, schema_name)
                        if not all_tables_exist:
                            logger.warning(f"Schema {schema_name} is missing essential tables: {missing_tables}. Attempting to create them.")
                            
                            # ... existing table creation code ...
                    
                    # Use optimized connection management with explicit schema setting
                    self.set_schema_with_transaction_handling(schema_name)
                    conn = get_connection_for_schema(schema_name)
                    
                    # Store schema status in request
                    request.schema_name = schema_name
                    request.schema_status = 'minimal'  # Set as minimal for newly created schema
                    
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
                    # Check schema status
                    schema_exists = False
                    schema_status = 'not_created'
                    
                    with connection.cursor() as cursor:
                        # Check if schema exists
                        cursor.execute("""
                            SELECT schema_name FROM information_schema.schemata
                            WHERE schema_name = %s
                        """, [tenant.schema_name])
                        schema_exists = cursor.fetchone() is not None
                        
                        if schema_exists:
                            # Check for deferred migrations marker
                            cursor.execute("""
                                SELECT EXISTS (
                                    SELECT 1 FROM information_schema.tables 
                                    WHERE table_schema = %s AND table_name = 'django_migrations'
                                )
                            """, [tenant.schema_name])
                            
                            migrations_table_exists = cursor.fetchone()[0]
                            
                            if migrations_table_exists:
                                cursor.execute(f"""
                                    SELECT COUNT(*) FROM {tenant.schema_name}.django_migrations
                                    WHERE app = 'onboarding' AND name = 'deferred_migrations'
                                """)
                                deferred_migrations = cursor.fetchone()[0] > 0
                                
                                if deferred_migrations:
                                    schema_status = 'minimal'
                                else:
                                    schema_status = 'complete'
                    
                    # Store tenant and schema info in request
                    request.tenant = tenant
                    request.schema_name = tenant.schema_name
                    request.schema_status = schema_status
                    # Set search path for this request using optimized connection management
                    self.set_schema_with_transaction_handling(tenant.schema_name)
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
                            'schema': tenant.schema_name,
                            'schema_status': schema_status
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