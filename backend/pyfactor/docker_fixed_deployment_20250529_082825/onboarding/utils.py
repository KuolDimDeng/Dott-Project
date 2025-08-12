import re
import time
import uuid
import asyncio
import psycopg2
import logging
from django.conf import settings
from django.db import connections, OperationalError
from django.apps import apps
from django.utils import timezone
from django.core.management import call_command
from django.db import transaction as db_transaction
from asgiref.sync import sync_to_async
from pyfactor.logging_config import get_logger
from pyfactor.db.utils import get_connection, return_connection
from django.contrib.auth import get_user_model
from contextlib import contextmanager
from django.db.migrations.loader import MigrationLoader

logger = logging.getLogger('Pyfactor')


# Fix for logging error with missing 'duration' field
class DurationSafeFormatter(logging.Formatter):
    def format(self, record):
        # Add duration field if it doesn't exist
        if not hasattr(record, 'duration'):
            record.duration = 0
        return super().format(record)

# Configure Django's logger to use our custom formatter
for handler in logging.getLogger('django').handlers:
    if isinstance(handler, logging.StreamHandler):
        if hasattr(handler, 'formatter') and handler.formatter is not None:
            handler.setFormatter(DurationSafeFormatter(handler.formatter._fmt))
        else:
            handler.setFormatter(DurationSafeFormatter('%(levelname)s - %(message)s'))

logger = get_logger()

def generate_unique_tenant_id(user):
    """Generate standardized tenant ID (UUID)"""
    if not user.email:
        logger.error(f"Cannot generate tenant ID - user has no email: {user.id}")
        return None

    try:
        # Generate a UUID
        tenant_id = str(uuid.uuid4())
        
        logger.debug(f"Generated tenant ID: {tenant_id} for user: {user.email}")
        
        # Validate format
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', tenant_id, re.IGNORECASE):
            logger.error(f"Generated invalid tenant ID format: {tenant_id}")
            return None
        
        logger.debug(f"Generated tenant ID: {tenant_id} for user: {user.email}")
        return tenant_id

    except Exception as e:
        logger.error(f"Error generating tenant ID for user {user.email}: {str(e)}")
        return None

def validate_tenant_isolation(tenant_id, schema_name=None):
    """Validate tenant isolation is properly configured
    
    Args:
        tenant_id: UUID of the tenant
        schema_name: Legacy schema name (for backward compatibility)
        
    Returns:
        bool: True if tenant isolation is properly configured
        
    Raises:
        Exception: If tenant isolation can't be established
    """
    from django.db import connection
    
    try:
        # Get a cursor for database operations
        cursor = connection.cursor()
        
        # Convert tenant_id to string if it's a UUID object
        tenant_id_str = str(tenant_id)
        
        # Verify the tenant_id format
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', tenant_id_str, re.IGNORECASE):
            raise ValueError(f"Invalid tenant ID format: {tenant_id_str}")
        
        # Set the current tenant for RLS
        try:
            # Try to establish the tenant context using RLS
            with tenant_context_manager(tenant_id_str):
                # Run a simple query to verify isolation
                cursor.execute('SELECT current_setting(\'app.current_tenant\')')
                result = cursor.fetchone()
                current_tenant = result[0] if result else None
                
                if current_tenant == tenant_id_str:
                    logger.info(f"Successfully validated tenant isolation for: {tenant_id_str}")
                    return True
                else:
                    logger.error(f"Tenant context verification failed. Expected: {tenant_id_str}, Got: {current_tenant}")
                    return False
        except Exception as e:
            logger.error(f"Error establishing tenant context: {str(e)}")
            return False

    except Exception as e:
        logger.error(f"Tenant isolation validation failed for {tenant_id}: {str(e)}")
        raise

def initialize_tenant_environment(tenant_id, legacy_schema_name=None):
    """Initialize tenant environment with proper permissions
    
    This function sets up all the necessary database structures for a tenant.
    The legacy_schema_name parameter is kept for backward compatibility.
    """
    try:
        logger.debug(f"Starting tenant environment initialization for {tenant_id}")
        # Memory optimization: Close all connections before starting
        from django.db import connections
        connections.close_all()
        logger.debug("Closed all connections before tenant initialization")
        
        # Create a new connection with autocommit=True to avoid transaction issues
        import psycopg2
        from django.conf import settings
        
        db_settings = settings.DATABASES['default']
        new_connection = psycopg2.connect(
            dbname=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            host=db_settings['HOST'],
            port=db_settings['PORT']
        )
        new_connection.autocommit = True
        cursor = new_connection.cursor()
        
        # Set a statement timeout to prevent long-running queries
        cursor.execute("SET statement_timeout = '30s'")
        
        # Set a lock timeout to prevent deadlocks
        cursor.execute("SET lock_timeout = '5s'")
        
        # Validate tenant_id is a valid UUID and ensure it's a string
        try:
            # Convert to string first in case it's already a UUID object
            tenant_id_str = str(tenant_id)
            
            # Validate as UUID
            uuid_obj = uuid.UUID(tenant_id_str)
            
            # Use the string representation
            tenant_id = tenant_id_str
            logger.debug(f"Validated and formatted tenant_id: {tenant_id}")
        except ValueError:
            logger.error(f"Invalid tenant_id format: {tenant_id}")
            raise ValueError(f"Invalid tenant_id format: {tenant_id}")
            
        # Save current search path
        cursor.execute('SHOW search_path')
        result = cursor.fetchone()
        original_search_path = result[0] if result else 'public'
        
        try:
            # Set current tenant ID for RLS
            cursor.execute(f"SET app.current_tenant = '{tenant_id}'")
            logger.debug(f"Set current tenant ID to {tenant_id} for RLS")
            
            # Run initialization SQL and create essential tables
            try:
                # Create essential tables directly with SQL instead of relying on migrations
                # This ensures we have the basic tables needed for the tenant
                essential_tables_sql = [
                    # First create business_business table (referenced by other tables)
                    """
                    CREATE TABLE IF NOT EXISTS "business_business" (
                        "id" uuid NOT NULL PRIMARY KEY,
                        "business_num" varchar(6) NOT NULL UNIQUE,
                        "business_name" varchar(200) NOT NULL,
                        "business_type" varchar(50) NOT NULL,
                        "business_subtype_selections" jsonb NOT NULL,
                        "street" varchar(200) NULL,
                        "city" varchar(200) NULL,
                        "state" varchar(200) NULL,
                        "postcode" varchar(20) NULL,
                        "country" varchar(2) NOT NULL,
                        "address" text NULL,
                        "email" varchar(254) NULL,
                        "phone_number" varchar(20) NULL,
                        "database_name" varchar(255) NULL UNIQUE,
                        "created_at" timestamp with time zone NOT NULL,
                        "modified_at" timestamp with time zone NOT NULL,
                        "legal_structure" varchar(50) NOT NULL,
                        "date_founded" date NULL,
                        "owner_id" uuid NOT NULL,
                        "tenant_id" uuid NOT NULL
                    )
                    """,
                    # Add indexes for business_business
                    """
                    CREATE INDEX IF NOT EXISTS "business_business_id_idx"
                    ON "business_business" ("id")
                    """,
                    """
                    CREATE INDEX IF NOT EXISTS "business_business_owner_id_idx"
                    ON "business_business" ("owner_id")
                    """,
                    """
                    CREATE INDEX IF NOT EXISTS "business_business_tenant_id_idx"
                    ON "business_business" ("tenant_id")
                    """,
                    
                    # Create users_userprofile table
                    """
                    CREATE TABLE IF NOT EXISTS "users_userprofile" (
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
                        "metadata" jsonb NULL,
                        "business_id" uuid NULL,
                        "tenant_id" uuid NOT NULL,
                        "user_id" uuid NOT NULL
                    )
                    """,
                    # Add constraints and indexes for users_userprofile
                    """
                    CREATE INDEX IF NOT EXISTS "users_userp_tenant__d11818_idx"
                    ON "users_userprofile" ("tenant_id")
                    """,
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'unique_user_profile'
                        ) THEN
                            ALTER TABLE "users_userprofile"
                            ADD CONSTRAINT "unique_user_profile" UNIQUE ("user_id", "tenant_id");
                        END IF;
                    EXCEPTION WHEN others THEN
                        -- Constraint might already exist
                    END;
                    $$;
                    """,
                    # Add foreign key from users_userprofile to business_business
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'users_userprofile_business_id_fk'
                        ) THEN
                            ALTER TABLE "users_userprofile"
                            ADD CONSTRAINT "users_userprofile_business_id_fk"
                            FOREIGN KEY ("business_id")
                            REFERENCES "business_business" ("id")
                            DEFERRABLE INITIALLY DEFERRED;
                        END IF;
                    EXCEPTION WHEN others THEN
                        -- Constraint might already exist
                    END;
                    $$;
                    """,
                    
                    # Create onboarding_onboardingprogress table
                    """
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
                        "tenant_id" uuid NOT NULL,
                        "user_id" uuid NOT NULL
                    )
                    """,
                    # Add index for tenant_id in onboarding_onboardingprogress
                    """
                    CREATE INDEX IF NOT EXISTS "onboarding_onboardingprogress_tenant_id_idx"
                    ON "onboarding_onboardingprogress" ("tenant_id")
                    """,
                    # Add foreign key from onboarding_onboardingprogress to business_business
                    """
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
                    """,
                    
                    # Original inventory tables
                    """
                    CREATE TABLE IF NOT EXISTS inventory_product (
                        id UUID PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        price DECIMAL(10, 2) NOT NULL,
                        is_for_sale BOOLEAN DEFAULT TRUE,
                        is_for_rent BOOLEAN DEFAULT FALSE,
                        salesTax DECIMAL(10, 2),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        height DECIMAL(10, 2),
                        width DECIMAL(10, 2),
                        height_unit VARCHAR(10) DEFAULT 'cm',
                        width_unit VARCHAR(10) DEFAULT 'cm',
                        weight DECIMAL(10, 2),
                        weight_unit VARCHAR(10) DEFAULT 'kg',
                        charge_period VARCHAR(50) DEFAULT 'day',
                        charge_amount DECIMAL(10, 2) DEFAULT 0.00,
                        product_code VARCHAR(255),
                        stock_quantity INTEGER DEFAULT 0,
                        reorder_level INTEGER DEFAULT 0,
                        department_id UUID,
                        tenant_id UUID NOT NULL
                    )
                    """,
                    # Add tenant_id index to inventory_product
                    """
                    CREATE INDEX IF NOT EXISTS "inventory_product_tenant_id_idx"
                    ON "inventory_product" ("tenant_id")
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS inventory_category (
                        id UUID PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        tenant_id UUID NOT NULL
                    )
                    """,
                    # Add tenant_id index to inventory_category
                    """
                    CREATE INDEX IF NOT EXISTS "inventory_category_tenant_id_idx"
                    ON "inventory_category" ("tenant_id")
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS inventory_product_category (
                        id UUID PRIMARY KEY,
                        product_id UUID REFERENCES inventory_product(id) ON DELETE CASCADE,
                        category_id UUID REFERENCES inventory_category(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        tenant_id UUID NOT NULL
                    )
                    """,
                    # Add tenant_id index to inventory_product_category
                    """
                    CREATE INDEX IF NOT EXISTS "inventory_product_category_tenant_id_idx"
                    ON "inventory_product_category" ("tenant_id")
                    """
                ]
                
                # Execute the SQL to create essential tables
                for sql in essential_tables_sql:
                    cursor.execute(sql)
                
                # Record migrations in django_migrations for the tables we created manually
                migration_records = [
                    ('business', '0001_initial'),
                    ('business', '0002_initial'),
                    ('users', '0001_initial'),
                    ('onboarding', '0001_initial')
                ]
                
                # Create django_migrations table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id serial NOT NULL PRIMARY KEY,
                        app varchar(255) NOT NULL,
                        name varchar(255) NOT NULL,
                        applied timestamp with time zone NOT NULL
                    )
                """)
                
                for app, name in migration_records:
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES (%s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, [app, name])
                    logger.debug(f"Recorded migration {app}.{name} in django_migrations")
                
                # Record that we've deferred migrations for later
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('onboarding', 'deferred_migrations', NOW())
                    ON CONFLICT DO NOTHING
                """)
                
                # Check if tables were created
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public' AND 
                          table_name IN ('business_business', 'users_userprofile', 'onboarding_onboardingprogress')
                """)
                tables = [row[0] for row in cursor.fetchall()]
                logger.info(f"Tables verified in environment for tenant {tenant_id}: {len(tables)} tables")
                
                if not tables:
                    raise Exception(f"No tables were created for tenant {tenant_id}")
                
                logger.info(f"Migrations successfully applied for tenant {tenant_id}")
            except Exception as migrate_error:
                logger.error(f"Error applying migrations for tenant {tenant_id}: {str(migrate_error)}")
                # Don't continue - raise the exception to fail initialization
                raise migrate_error
            
            # Verify tenant isolation is properly configured using context manager
            with tenant_context_manager(tenant_id):
                cursor.execute('SELECT current_setting(\'app.current_tenant\')')
                result = cursor.fetchone()
                current_tenant = result[0] if result else ''
                if current_tenant != tenant_id:
                    raise Exception(f"Tenant isolation is not properly configured for {tenant_id}")
            
            logger.info(f"Successfully initialized environment for tenant {tenant_id}")
            return True
            
        except Exception as e:
            # Close all connections to prevent connection leaks
            from django.db import connections
            connections.close_all()
            logger.debug(f"Closed all connections after error for tenant {tenant_id}")

            logger.error(f"Error initializing tenant environment {tenant_id}: {str(e)}")
            raise
            
        finally:
            # Restore original search path
            if original_search_path:
                cursor.execute(f'SET search_path TO {original_search_path}')
                logger.debug(f"Restored search path to: {original_search_path}")
            
    except Exception as e:
        logger.error(f"Error in initialize_tenant_environment: {str(e)}")
        # Try cleanup if initialization failed
        try:
            cleanup_tenant_resources(tenant_id)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up tenant resources: {str(cleanup_error)}")
        
        # Close all connections to prevent connection leaks
        from django.db import connections
        connections.close_all()
        
        raise

@contextmanager
def tenant_context_manager(tenant_id, legacy_schema_name=None, preserve_context=False):
    """Context manager for tenant isolation that ensures proper connection handling
    
    Args:
        tenant_id: The tenant ID
        legacy_schema_name: Legacy schema name (no longer used with RLS)
        preserve_context: If True, don't reset tenant context when exiting
    """
    from django.db import connections
    from pyfactor.db_routers import local
    import psycopg2
    from django.conf import settings
    
    start_time = time.time()
    
    logger.info(f"[TRANSACTION DEBUG] Entering tenant context for tenant: {tenant_id}")
    
    # Always create a completely new isolated connection
    # with autocommit mode to avoid nested transactions and abortion issues
    new_connection = None
    new_cursor = None
    
    logger.info(f"[TRANSACTION DEBUG] Creating isolated connection with ISOLATION_LEVEL_AUTOCOMMIT")
    try:
        # Get database settings
        db_settings = settings.DATABASES['default']
        
        # Create fresh connection, completely isolated from Django's connection pool
        new_connection = psycopg2.connect(
            dbname=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD'],
            host=db_settings['HOST'],
            port=db_settings['PORT']
        )
        
        # Set autocommit immediately to prevent transaction blocks
        # CRITICAL: This ensures we won't hit "transaction is aborted" errors
        new_connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        new_connection.autocommit = True  # Set both flags for extra safety
        
        # Create cursor from our fresh autocommit connection
        new_cursor = new_connection.cursor()
        logger.info(f"[TRANSACTION DEBUG] Successfully created isolated autocommit connection")
        
        # We'll use this new cursor
        cursor = new_cursor
    except Exception as conn_error:
        logger.error(f"[TRANSACTION DEBUG] Error creating isolated connection: {str(conn_error)}")
        # Clean up partial connections if needed
        if new_connection:
            try:
                new_connection.close()
            except:
                pass
        # Re-raise the exception
        raise
    
    try:
        # Set reasonable timeouts to prevent blocking operations
        cursor.execute("SET statement_timeout = '30s'")
        cursor.execute("SET lock_timeout = '5s'")

        # Verify our connection is really in autocommit mode
        try:
            cursor.execute("SHOW transaction_isolation")
            result = cursor.fetchone()
            isolation = result[0] if result else 'unknown'
            
            cursor.execute("SHOW default_transaction_isolation")
            result = cursor.fetchone()
            default_isolation = result[0] if result else 'unknown'
            
            cursor.execute("SELECT pg_is_in_recovery()")
            result = cursor.fetchone()
            in_recovery = result[0] if result else False
            
            logger.info(f"[TRANSACTION DEBUG] Connection state: isolation={isolation}, default={default_isolation}, in_recovery={in_recovery}")
            
            # Additional check to verify no transaction is in progress
            cursor.execute("SELECT pg_current_xact_id_if_assigned()")
            result = cursor.fetchone()
            current_txid = result[0] if result else None
            if current_txid:
                logger.warning(f"[TRANSACTION DEBUG] Transaction ID still assigned ({current_txid}) despite autocommit mode!")
            else:
                logger.info(f"[TRANSACTION DEBUG] No transaction ID assigned - autocommit confirmed")
                
        except Exception as check_error:
            logger.warning(f"[TRANSACTION DEBUG] Could not fully verify transaction status: {str(check_error)}")
        
        # Convert UUID to string if needed
        tenant_id_str = str(tenant_id)
        
        # Set tenant ID for RLS
        logger.info(f"[TRANSACTION DEBUG] Setting tenant context to {tenant_id_str}")
        set_current_tenant_id(tenant_id_str)
        cursor.execute('SET search_path TO public')
        
        # Verify tenant context was set correctly
        cursor.execute("SELECT current_setting('app.current_tenant')")
        result = cursor.fetchone()
        current_tenant = result[0] if result else ''
        logger.info(f"[TRANSACTION DEBUG] Current tenant context: {current_tenant}")
        
        if current_tenant != tenant_id_str:
            raise Exception(f"Failed to set tenant context to {tenant_id_str}")
        
        # Store tenant ID in thread local for routing
        setattr(local, 'tenant_id', tenant_id_str)
        
        # Hand control to caller code
        logger.info(f"[TRANSACTION DEBUG] Context ready, yielding to caller")
        yield cursor  # Important: yield the cursor so caller can use it
        logger.info(f"[TRANSACTION DEBUG] Control returned to tenant_context_manager")
        
    except Exception as e:
        logger.error(f"[TRANSACTION DEBUG] Error in tenant_context_manager: {str(e)}")
        
        # Log stack trace for better debugging
        import traceback
        logger.error(f"[TRANSACTION DEBUG] Stack trace: {traceback.format_exc()}")
        
        # Re-raise to caller
        raise
        
    finally:
        logger.info(f"[TRANSACTION DEBUG] Cleanup in tenant_context_manager finally block")
        
        # Always close our isolated connection to prevent leaks
        if new_connection:
            logger.info(f"[TRANSACTION DEBUG] Closing isolated connection")
            try:
                if new_cursor:
                    new_cursor.close()
                new_connection.close()
                logger.info(f"[TRANSACTION DEBUG] Successfully closed isolated connection")
            except Exception as conn_close_error:
                logger.error(f"[TRANSACTION DEBUG] Error closing connection: {str(conn_close_error)}")
        
        # Reset context if requested
        if not preserve_context:
            # Reset thread local context
            setattr(local, 'tenant_id', None)
            logger.info(f"[TRANSACTION DEBUG] Reset tenant context")
        else:
            logger.info(f"[TRANSACTION DEBUG] Preserved tenant context: {tenant_id}")
        
        logger.info(f"[TRANSACTION DEBUG] Tenant context completed in {time.time() - start_time:.4f}s")

def set_tenant_context(tenant_id):
    """Set the current tenant context for RLS"""
    from django.db import connection
    
    start_time = time.time()
    try:
        # Convert UUID to string if needed
        tenant_id_str = str(tenant_id)
        logger.debug(f"Setting tenant context to: {tenant_id_str}")
        
        # Verify the tenant_id format
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', tenant_id_str, re.IGNORECASE):
            raise ValueError(f"Invalid tenant ID format: {tenant_id_str}")
        
        # Get a cursor for database operations
        cursor = connection.cursor()
        
        # Set the tenant ID for RLS
        set_current_tenant_id(tenant_id_str)
        
        # Update thread local storage for routing
        from pyfactor.db_routers import local
        setattr(local, 'tenant_id', tenant_id_str)
        
        # Verify tenant context was set correctly
        cursor.execute("SELECT current_setting('app.current_tenant')")
        result = cursor.fetchone()
        current_tenant = result[0] if result else ''
        logger.debug(f"Current tenant context: {current_tenant} (set in {time.time() - start_time:.4f}s)")
        
        if current_tenant != tenant_id_str:
            raise Exception(f"Failed to set tenant context to {tenant_id_str}")
        
        return True
    except Exception as e:
        logger.error(f"Error setting tenant context {tenant_id}: {str(e)}")
        raise

def reset_tenant_context(cursor):
    """Reset tenant context to None"""
    try:
        # Clear the tenant ID
        cursor.execute("SET app.current_tenant = ''")
        
        # Update thread local storage
        from pyfactor.db_routers import local
        setattr(local, 'tenant_id', None)
        
        logger.debug("Reset tenant context to None")
        return True
    except Exception as e:
        logger.error(f"Error resetting tenant context: {str(e)}")
        return False

def cleanup_tenant_resources(tenant_id):
    """Clean up resources if tenant setup fails"""
    try:
        # Get a database connection
        conn = get_connection()
        if conn is not None:
            conn.autocommit = True
            with conn.cursor() as cursor:
                try:
                    # Delete tenant data with the tenant ID
                    cursor.execute("""
                        DELETE FROM business_business WHERE tenant_id = %s;
                        DELETE FROM users_userprofile WHERE tenant_id = %s;
                        DELETE FROM onboarding_onboardingprogress WHERE tenant_id = %s;
                        DELETE FROM inventory_product WHERE tenant_id = %s;
                        DELETE FROM inventory_category WHERE tenant_id = %s;
                        DELETE FROM inventory_product_category WHERE tenant_id = %s;
                    """, [tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id])
                    
                    logger.info(f"Successfully cleaned up resources for tenant: {tenant_id}")
                except Exception as e:
                    logger.error(f"Error cleaning up tenant resources: {str(e)}")
    except Exception as e:
        logger.error(f"Tenant cleanup failed: {str(e)}", exc_info=True)

def save_to_tenant_data(request, business_data):
    """Save business info to the tenant context
    
    Args:
        request: HTTP request
        business_data: Business data to save
        
    Returns:
        The created business object
    """
    # Import here to avoid circular imports
    from pyfactor.business.models import Business
    
    # Ensure tenant_id is in the business data
    if 'tenant_id' not in business_data and 'id' in business_data:
        business_data['tenant_id'] = business_data['id']
    
    # Save to database with proper tenant context
    business = Business.objects.create(**business_data)
    
    return business

def verify_migration_dependencies():
    """
    Verify that migration dependencies are correctly ordered,
    particularly that users depends on custom_auth.
    
    Returns:
        bool: True if dependencies are valid, False otherwise
    """
    # Load the migration graph
    loader = MigrationLoader(None, ignore_no_migrations=True)
    
    # Find the users and custom_auth initial migrations
    users_node = None
    custom_auth_node = None
    
    for node in loader.graph.nodes.values():
        if node.app_label == 'users' and node.name == '0001_initial':
            users_node = node
        elif node.app_label == 'custom_auth' and node.name == '0001_initial':
            custom_auth_node = node
    
    if not users_node or not custom_auth_node:
        logger.warning("Could not find users or custom_auth initial migrations in loader.")
        return False
    
    # Check if users depends on custom_auth
    custom_auth_key = ('custom_auth', '0001_initial')
    has_dependency = custom_auth_key in users_node.dependencies
    
    if not has_dependency:
        logger.error("Migration dependency issue: users.0001_initial does not depend on custom_auth.0001_initial")
        return False
    
    # Find the migration order in the graph
    for node, deps in loader.graph.dependencies.items():
        if node[0] == 'users' and node[1] == '0001_initial':
            if custom_auth_key not in deps:
                logger.error("Migration graph inconsistency: users.0001_initial does not depend on custom_auth.0001_initial")
                return False
    
    return True

def create_table_for_model(tenant_id, model_class):
    """
    Dynamically create a database table based on a Django model class with RLS
    
    Args:
        tenant_id (str): The tenant ID
        model_class (Model): The Django model class to create a table for
    """
    from django.db import models, connection
    import logging
    import uuid

    logger = logging.getLogger(__name__)
    
    # Generate a unique request ID for tracking in logs
    request_id = uuid.uuid4().hex[:8]
    
    table_name = model_class._meta.db_table
    logger.info(f"[DYNAMIC-CREATE-{request_id}] Creating table {table_name} for model {model_class.__name__}")
    
    field_definitions = []
    
    # Log the fields that will be created
    logger.debug(f"[DYNAMIC-CREATE-{request_id}] Model {model_class.__name__} has {len(model_class._meta.fields)} fields to process")
    
    # Get a cursor for database operations
    cursor = connection.cursor()
    
    # Set tenant context for RLS
    set_current_tenant_id(tenant_id)
    
    # Process all fields
    for field in model_class._meta.fields:
        field_name = field.column
        
        # Skip fields from parent models that will be created separately
        if isinstance(field, models.OneToOneField) and field.primary_key:
            logger.debug(f"[DYNAMIC-CREATE-{request_id}] Skipping parent model field: {field_name}")
            continue
            
        logger.debug(f"[DYNAMIC-CREATE-{request_id}] Processing field {field_name} of type {field.__class__.__name__}")
            
        # Generate SQL definition based on field type
        if isinstance(field, models.CharField):
            field_def = f"{field_name} VARCHAR({field.max_length})"
        elif isinstance(field, models.TextField):
            field_def = f"{field_name} TEXT"
        elif isinstance(field, models.BooleanField):
            field_def = f"{field_name} BOOLEAN"
        elif isinstance(field, models.DateField):
            field_def = f"{field_name} DATE"
        elif isinstance(field, models.DateTimeField):
            field_def = f"{field_name} TIMESTAMP WITH TIME ZONE"
        elif isinstance(field, models.DecimalField):
            field_def = f"{field_name} DECIMAL({field.max_digits}, {field.decimal_places})"
        elif isinstance(field, models.IntegerField):
            field_def = f"{field_name} INTEGER"
        elif isinstance(field, models.BigIntegerField):
            field_def = f"{field_name} BIGINT"
        elif isinstance(field, models.UUIDField):
            field_def = f"{field_name} UUID"
        elif isinstance(field, models.JSONField):
            field_def = f"{field_name} JSONB"
        elif isinstance(field, models.ForeignKey):
            field_def = f"{field_name} INTEGER"
        elif isinstance(field, models.OneToOneField):
            field_def = f"{field_name} INTEGER"
        else:
            field_def = f"{field_name} VARCHAR(255)"  # Default fallback
        
        # Add NULL/NOT NULL
        if field.null:
            field_def += " NULL"
        else:
            field_def += " NOT NULL"
            
        # Add default if specified
        if field.default is not None and field.default != models.fields.NOT_PROVIDED:
            if isinstance(field, models.BooleanField):
                field_def += f" DEFAULT {'TRUE' if field.default else 'FALSE'}"
            elif isinstance(field, models.CharField) or isinstance(field, models.TextField):
                field_def += f" DEFAULT '{field.default}'"
            else:
                field_def += f" DEFAULT {field.default}"
                
        # Add primary key
        if field.primary_key:
            field_def += " PRIMARY KEY"
            
        # Add unique constraint
        elif field.unique:
            field_def += " UNIQUE"
            
        field_definitions.append(field_def)
        logger.debug(f"[DYNAMIC-CREATE-{request_id}] Field definition for {field_name}: {field_def}")
    
    # Add tenant_id field if not already present
    if not any(field.name == 'tenant_id' for field in model_class._meta.fields):
        field_definitions.append("tenant_id UUID NOT NULL")
        
    # Create the table
    create_sql = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        {', '.join(field_definitions)}
    );
    """
    
    logger.debug(f"[DYNAMIC-CREATE-{request_id}] Executing SQL: {create_sql}")
    
    try:
        cursor.execute(create_sql)
        logger.info(f"[DYNAMIC-CREATE-{request_id}] Successfully created table {table_name}")
        
        # Add indexes including tenant_id index
        cursor.execute(f"""
        CREATE INDEX IF NOT EXISTS "idx_{table_name}_tenant_id" 
        ON {table_name} (tenant_id);
        """)
        
        # Add any model-defined indexes
        for index in model_class._meta.indexes:
            index_name = f"idx_{table_name}_{'_'.join(index.fields)}"
            index_fields = ', '.join(index.fields)
            index_sql = f"""
            CREATE INDEX IF NOT EXISTS {index_name} 
            ON {table_name} ({index_fields});
            """
            
            logger.debug(f"[DYNAMIC-CREATE-{request_id}] Creating index {index_name} on fields {index_fields}")
            cursor.execute(index_sql)
            
        # Add RLS policy for table if it doesn't exist
        cursor.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = '{table_name}' AND policyname = '{table_name}_tenant_isolation_policy'
            ) THEN
                EXECUTE 'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY';
                EXECUTE 'CREATE POLICY {table_name}_tenant_isolation_policy ON {table_name} 
                         USING (tenant_id::text = current_setting(''app.current_tenant'')::text)';
            END IF;
        END;
        $$;
        """)
        
        # Log success
        logger.info(f"[DYNAMIC-CREATE-{request_id}] Table {table_name} with RLS policies successfully created")
        
        # Close cursor to prevent connection leaks
        cursor.close()
        
        return True
    except Exception as e:
        logger.error(f"[DYNAMIC-CREATE-{request_id}] Error creating table {table_name}: {str(e)}")
        raise

def get_legacy_schema_name(tenant_id):
    """
    Generate a legacy schema name from a tenant ID consistently.
    This is only used for backward compatibility.
    
    Args:
        tenant_id (str or UUID): The tenant ID
        
    Returns:
        str: The legacy schema name in the format 'tenant_XYZ' with dashes replaced by underscores
    """
    if not tenant_id:
        return None
        
    # Convert UUID to string if needed and replace dashes with underscores
    return f"tenant_{str(tenant_id).replace('-', '_')}"

def process_tenant_subscription_plan(tenant, plan_name=None, billing_cycle=None):
    """
    Process a tenant's subscription plan.
    
    Args:
        tenant: The tenant object
        plan_name: Optional plan name (free, professional, enterprise)
        billing_cycle: Optional billing cycle (monthly, annual)
        
    Returns:
        dict: Information about the processed subscription
    """
    if not tenant:
        return {
            'success': False,
            'message': 'Tenant not found'
        }
        
    # Default to free plan if not specified
    plan = plan_name or 'free'
    cycle = billing_cycle or 'monthly'
    
    # Log information about the plan
    from pyfactor.logging_config import get_logger
    logger = get_logger()
    logger.info(f"Processing subscription plan for tenant {tenant.id}: {plan}/{cycle}")
    
    # Return subscription information
    return {
        'success': True,
        'plan': plan,
        'billing_cycle': cycle,
        'tenant_id': str(tenant.id)
    }

# Import RLS functions
from custom_auth.rls import set_current_tenant_id, tenant_context