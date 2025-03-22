
#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/utils.py
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
from django.db import transaction
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
        handler.setFormatter(DurationSafeFormatter(handler.formatter._fmt))

logger = get_logger()

def generate_unique_schema_name(user):
    """Generate standardized schema name with tenant_ prefix"""
    if not user.email:
        logger.error(f"Cannot generate schema name - user has no email: {user.id}")
        return None

    try:
        # Generate tenant ID and convert hyphens to underscores
        # Ensure we're working with a string representation of the UUID
        tenant_id = str(uuid.uuid4()).replace('-', '_')
        
        # Combine with tenant_ prefix
        schema_name = f"tenant_{tenant_id}"
        
        logger.debug(f"Generated schema name: {schema_name} for user: {user.email}")
        
        # Validate format - ONLY allow underscores, not hyphens
        if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
            logger.warning(f"Generated invalid schema name format: {schema_name}")
            # Try to fix it by replacing any remaining special characters
            schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
            logger.debug(f"Fixed schema name to: {schema_name}")
            
            # Check again after fixing
            if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
                logger.error(f"Could not fix schema name format: {schema_name}")
                return None
        
        logger.debug(f"Generated schema name: {schema_name} for user: {user.email}")
        return schema_name

    except Exception as e:
        logger.error(f"Error generating schema name for user {user.email}: {str(e)}")
        return None

def validate_schema_creation(cursor, schema_name):
    """Validate schema exists and is accessible
    
    Args:
        cursor: Active database cursor
        schema_name: Name of schema to validate
        
    Returns:
        bool: True if schema exists and is accessible
        
    Raises:
        Exception: If schema can't be accessed
    """
    try:
        # Always convert hyphens to underscores in schema names
        if '-' in schema_name:
            fixed_schema_name = schema_name.replace('-', '_')
            logger.debug(f"Fixed schema name from {schema_name} to {fixed_schema_name}")
            schema_name = fixed_schema_name
        
        # Validate schema name format - ONLY allow underscores, not hyphens
        if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
            # Try to fix it by replacing any remaining special characters
            fixed_schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
            logger.debug(f"Fixed schema name to: {fixed_schema_name}")
            schema_name = fixed_schema_name
            
            # Check again after fixing
            if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
                raise ValueError(f"Invalid schema name format: {schema_name}")

        # Check schema existence
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata
            WHERE schema_name = %s
        """, [schema_name])
        
        exists = cursor.fetchone()
        if exists:
            # Try to access the schema using context manager
            with tenant_schema_context(cursor, schema_name):
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                # Check if schema_name is in the current path
                # Sometimes the schema might exist but not be in the search path
                # In that case, we'll try to add it to the search path
                if schema_name in current_path:
                    logger.info(f"Successfully validated schema: {schema_name}")
                    return True
                else:
                    logger.warning(f"Schema {schema_name} exists but is not in search path, attempting to add it")
                    try:
                        # Try to add the schema to the search path
                        cursor.execute(f'SET search_path TO "{schema_name}",public')
                        cursor.execute('SHOW search_path')
                        updated_path = cursor.fetchone()[0]
                        
                        if schema_name in updated_path:
                            logger.info(f"Successfully added schema {schema_name} to search path")
                            return True
                        else:
                            logger.error(f"Failed to add schema {schema_name} to search path")
                            # Instead of raising an exception, return False to trigger schema recreation
                            return False
                    except Exception as e:
                        logger.error(f"Error adding schema {schema_name} to search path: {str(e)}")
                        # Return False to trigger schema recreation
                        return False
        
        # Schema doesn't exist, create it
        logger.info(f"Schema {schema_name} does not exist, will be created")
        return False

    except Exception as e:
        logger.error(f"Schema validation failed for {schema_name}: {str(e)}")
        raise

def create_tenant_schema(cursor, schema_name, user_id):
    """Create new schema for tenant with proper permissions"""
    try:
        logger.debug(f"Starting schema creation for {schema_name}")
        # Memory optimization: Close all connections before starting schema creation
        from django.db import connections
        connections.close_all()
        logger.debug("Closed all connections before schema creation")
        
        # Set a statement timeout to prevent long-running queries
        cursor.execute("SET statement_timeout = '30s'")

        # Memory optimization: Close all connections before starting schema creation
        from django.db import connections
        connections.close_all()
        logger.debug("Closed all connections before schema creation")
        
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
        new_cursor = new_connection.cursor()
        
        # Use the new cursor instead of the original one
        cursor = new_cursor
        
        # Set a statement timeout to prevent long-running queries
        cursor.execute("SET statement_timeout = '30s'")
        
        # Set a lock timeout to prevent deadlocks
        cursor.execute("SET lock_timeout = '5s'")

        
        # Always convert hyphens to underscores in schema names
        if '-' in schema_name:
            fixed_schema_name = schema_name.replace('-', '_')
            logger.debug(f"Fixed schema name from {schema_name} to {fixed_schema_name}")
            schema_name = fixed_schema_name
        
        # Validate schema name format - ONLY allow underscores, not hyphens
        if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
            # Try to fix it by replacing any remaining special characters
            fixed_schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
            logger.debug(f"Fixed schema name to: {fixed_schema_name}")
            schema_name = fixed_schema_name
            
            # Check again after fixing
            if not re.match(r'^tenant_[a-zA-Z0-9_]+$', schema_name):
                raise ValueError(f"Invalid schema name format: {schema_name}")
        
        # Validate user_id is a valid UUID and ensure it's a string
        try:
            # Convert to string first in case it's already a UUID object
            user_id_str = str(user_id)
            
            # If user_id contains underscores, replace them with hyphens for UUID validation
            uuid_validation_str = user_id_str.replace('_', '-')
            
            # Validate as UUID
            uuid_obj = uuid.UUID(uuid_validation_str)
            
            # Use the original user_id_str which may contain underscores
            user_id = user_id_str
            logger.debug(f"Validated and formatted user_id: {user_id}")
        except ValueError:
            logger.error(f"Invalid user_id format: {user_id}")
            raise ValueError(f"Invalid user_id format: {user_id}")
            
        # Save current search path
        cursor.execute('SHOW search_path')
        original_search_path = cursor.fetchone()[0]
        
        try:
            # Check if schema already exists
            cursor.execute("""
                SELECT 1 FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            
            if cursor.fetchone():
                logger.debug(f"Schema {schema_name} already exists")
                return True
                
            # Create schema - ensure schema name is properly quoted
            schema_name_sql = schema_name
            cursor.execute(f'CREATE SCHEMA "{schema_name_sql}"')
            logger.debug(f"Created schema {schema_name}")
            
            # Set up permissions with detailed logging
            db_user = settings.DATABASES["default"]["USER"]
            logger.debug(f"Setting up permissions for user {db_user}")
            
            permission_commands = [
                f'GRANT USAGE ON SCHEMA "{schema_name_sql}" TO {db_user}',
                f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name_sql}" TO {db_user}',
                f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name_sql}" GRANT ALL ON TABLES TO {db_user}'
            ]
            
            for cmd in permission_commands:
                cursor.execute(cmd)
                logger.debug(f"Executed permission command: {cmd}")
            
            # Set search path to new schema for migrations
            cursor.execute(f'SET search_path TO "{schema_name_sql}",public')
            
            # Run migrations directly and FAIL if they don't succeed
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
                        "owner_id" uuid NOT NULL
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
                        "schema_name" varchar(63) NULL,
                        "metadata" jsonb NULL,
                        "business_id" uuid NULL,
                        "tenant_id" uuid NULL,
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
                            ADD CONSTRAINT "unique_user_profile" UNIQUE ("user_id");
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
                        "user_id" uuid NOT NULL UNIQUE
                    )
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
                        department_id UUID
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS inventory_category (
                        id UUID PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS inventory_product_category (
                        id UUID PRIMARY KEY,
                        product_id UUID REFERENCES inventory_product(id) ON DELETE CASCADE,
                        category_id UUID REFERENCES inventory_category(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
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
                
                for app, name in migration_records:
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied)
                        VALUES (%s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, [app, name])
                    logger.debug(f"Recorded migration {app}.{name} in django_migrations")
                
                # Now run migrations to create any additional tables
                from django.core.management import call_command
                # Using the global settings import instead of re-importing
                
                # Create django_migrations table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id serial NOT NULL PRIMARY KEY,
                        app varchar(255) NOT NULL,
                        name varchar(255) NOT NULL,
                        applied timestamp with time zone NOT NULL
                    )
                """)
                
                # Make sure we're using the correct schema before running migrations
                cursor.execute(f'SET search_path TO "{schema_name_sql}",public')
                
                # Check which tables already exist to avoid migration conflicts
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = %s
                """, [schema_name_sql])
                existing_tables = set(row[0] for row in cursor.fetchall())
                logger.debug(f"Existing tables in schema {schema_name_sql}: {existing_tables}")
                
                # Create a list of apps to skip migrations for
                skip_migrations_for = []
                # Only skip if the table actually exists and has the correct structure
                if 'business_business' in existing_tables:
                    # Verify the table structure is correct
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = %s AND table_name = 'business_business'
                    """, [schema_name_sql])
                    columns = [row[0] for row in cursor.fetchall()]
                    required_columns = ['id', 'business_name', 'business_type', 'owner_id']
                    if all(col in columns for col in required_columns):
                        skip_migrations_for.append('business')
                    else:
                        logger.warning(f"business_business table exists but has incorrect structure. Will run migrations.")
                
                if 'users_userprofile' in existing_tables:
                    skip_migrations_for.append('users')
                if 'onboarding_onboardingprogress' in existing_tables:
                    skip_migrations_for.append('onboarding')
                
                logger.debug(f"Skipping migrations for apps: {skip_migrations_for}")
                
                # IMPORTANT: We're only creating essential tables here with direct SQL
                # All migrations will be deferred until the dashboard setup
                # We're not running any Django migrations here to avoid transaction issues
                logger.info(f"Only creating essential tables in schema {schema_name_sql}. Full migrations will be run at dashboard.")
                
                # Create django_migrations table to record our essential migrations
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id serial NOT NULL PRIMARY KEY,
                        app varchar(255) NOT NULL,
                        name varchar(255) NOT NULL,
                        applied timestamp with time zone NOT NULL
                    )
                """)
                
                # Record that we've deferred migrations for later
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('onboarding', 'deferred_migrations', NOW())
                    ON CONFLICT DO NOTHING
                """)
                
                # We're intentionally NOT running migrations for other apps here
                # They will be run when the user reaches the dashboard
                        # Continue with other apps even if one fails
                
                logger.info(f"Migrations successfully applied to schema {schema_name}")
                
                # Check if tables were created
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = %s
                """, [schema_name])
                tables = [row[0] for row in cursor.fetchall()]
                logger.info(f"Tables created in schema {schema_name}: {len(tables)} tables")
                
                if not tables:
                    raise Exception(f"No tables were created in schema {schema_name} after migrations")
            except Exception as migrate_error:
                logger.error(f"Error applying migrations to schema {schema_name}: {str(migrate_error)}")
                # Don't continue - raise the exception to fail schema creation
                # We're not using a transaction, so no need to rollback
                raise migrate_error
            
            # Verify schema exists and is accessible using context manager
            with tenant_schema_context(cursor, schema_name):
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                if schema_name_sql not in current_path:
                    raise Exception(f"Schema {schema_name} is not accessible")
            
            # No need to commit as we're not using a transaction
            
            logger.info(f"Successfully created and verified schema {schema_name} for user {user_id}")
            return True
            
        except Exception as e:
            # Close all connections to prevent connection leaks
            from django.db import connections
            connections.close_all()
            logger.debug(f"Closed all connections after error for schema {schema_name}")

            logger.error(f"Error creating schema {schema_name}: {str(e)}")
            raise
            
        finally:
            # Restore original search path
            if original_search_path:
                cursor.execute(f'SET search_path TO {original_search_path}')
                logger.debug(f"Restored search path to: {original_search_path}")
            
    except Exception as e:
        logger.error(f"Error in create_tenant_schema: {str(e)}")
        # Try to clean up if schema creation failed
        try:
            # Create a fresh connection for cleanup to avoid transaction issues
            import psycopg2
            from django.conf import settings
            
            db_settings = settings.DATABASES['default']
            cleanup_connection = psycopg2.connect(
                dbname=db_settings['NAME'],
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            cleanup_connection.autocommit = True
            
            with cleanup_connection.cursor() as cleanup_cursor:
                cleanup_cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                logger.debug(f"Cleaned up failed schema creation for {schema_name}")
            
            cleanup_connection.close()
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up failed schema: {str(cleanup_error)}")
        
        # Close all connections to prevent connection leaks
        from django.db import connections
        connections.close_all()
        
        raise

@contextmanager
def tenant_schema_context(cursor, schema_name, preserve_context=False):
    """Context manager for schema operations that ensures proper connection handling
    
    Args:
        cursor: Database cursor (will be replaced with a new cursor)
        schema_name: Schema to use in context
        preserve_context: If True, don't reset schema to public when exiting
    """
    from django.db import connections
    from pyfactor.db_routers import TenantSchemaRouter, local
    import psycopg2
    from django.conf import settings
    
    previous_schema = None
    start_time = time.time()
    
    logger.info(f"[TRANSACTION DEBUG] Entering tenant_schema_context for schema: {schema_name}")
    
    # CRITICAL IMPROVEMENT: Always create a completely new isolated connection
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
        
        # Replace the provided cursor with our new one
        cursor = new_cursor
    except Exception as conn_error:
        logger.error(f"[TRANSACTION DEBUG] Error creating isolated connection: {str(conn_error)}")
        # Clean up partial connections if needed
        if new_connection:
            try:
                new_connection.close()
            except:
                pass
        # Re-raise the exception - don't proceed with original potentially broken cursor
        raise
    
    try:
        # Set reasonable timeouts to prevent blocking operations
        cursor.execute("SET statement_timeout = '30s'")
        cursor.execute("SET lock_timeout = '5s'")

        # Verify our connection is really in autocommit mode
        try:
            cursor.execute("SHOW transaction_isolation")
            isolation = cursor.fetchone()[0]
            cursor.execute("SHOW default_transaction_isolation")
            default_isolation = cursor.fetchone()[0]
            cursor.execute("SELECT pg_is_in_recovery()")
            in_recovery = cursor.fetchone()[0]
            
            logger.info(f"[TRANSACTION DEBUG] Connection state: isolation={isolation}, default={default_isolation}, in_recovery={in_recovery}")
            
            # Additional check to verify no transaction is in progress
            cursor.execute("SELECT pg_current_xact_id_if_assigned()")
            current_txid = cursor.fetchone()[0]
            if current_txid:
                logger.warning(f"[TRANSACTION DEBUG] Transaction ID still assigned ({current_txid}) despite autocommit mode!")
            else:
                logger.info(f"[TRANSACTION DEBUG] No transaction ID assigned - autocommit confirmed")
                
        except Exception as check_error:
            logger.warning(f"[TRANSACTION DEBUG] Could not fully verify transaction status: {str(check_error)}")
        
        # Normalize schema name (replace hyphens with underscores)
        if '-' in schema_name:
            schema_name = schema_name.replace('-', '_')
            logger.info(f"[TRANSACTION DEBUG] Normalized schema name: {schema_name}")
        
        # Ensure schema name is properly formatted for SQL identifiers
        schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
        logger.info(f"[TRANSACTION DEBUG] Using sanitized schema name: {schema_name}")
        
        # Set search path to our schema
        logger.info(f"[TRANSACTION DEBUG] Setting search_path to {schema_name}")
        cursor.execute(f'SET search_path TO "{schema_name}",public')
        
        # Verify search path was set correctly
        cursor.execute('SHOW search_path')
        current_path = cursor.fetchone()[0]
        logger.info(f"[TRANSACTION DEBUG] Current search_path: {current_path}")
        
        if schema_name not in current_path:
            # Retry setting the search path if needed
            logger.warning(f"[TRANSACTION DEBUG] Schema {schema_name} not in search path: {current_path}, retrying")
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            cursor.execute('SHOW search_path')
            fixed_path = cursor.fetchone()[0]
            logger.info(f"[TRANSACTION DEBUG] Updated search_path: {fixed_path}")
            
            if schema_name not in fixed_path:
                raise Exception(f"Failed to set search path to {schema_name}")
        
        # Store schema in thread local for routing
        setattr(local, 'tenant_schema', schema_name)
        
        # Hand control to caller code
        logger.info(f"[TRANSACTION DEBUG] Context ready, yielding to caller")
        yield cursor  # Important: yield the cursor so caller can use it
        logger.info(f"[TRANSACTION DEBUG] Control returned to tenant_schema_context")
        
    except Exception as e:
        logger.error(f"[TRANSACTION DEBUG] Error in tenant_schema_context: {str(e)}")
        
        # Log stack trace for better debugging
        import traceback
        logger.error(f"[TRANSACTION DEBUG] Stack trace: {traceback.format_exc()}")
        
        # Re-raise to caller
        raise
        
    finally:
        logger.info(f"[TRANSACTION DEBUG] Cleanup in tenant_schema_context finally block")
        
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
            # Reset thread local to public schema
            setattr(local, 'tenant_schema', 'public')
            logger.info(f"[TRANSACTION DEBUG] Reset tenant_schema to public")
        else:
            logger.info(f"[TRANSACTION DEBUG] Preserved tenant schema context: {schema_name}")
        
        logger.info(f"[TRANSACTION DEBUG] Schema context completed in {time.time() - start_time:.4f}s")

def set_tenant_schema(cursor, schema_name):
    """Set search_path to tenant schema"""
    from django.db import connections
    from pyfactor.db_routers import TenantSchemaRouter
    
    start_time = time.time()
    try:
        logger.debug(f"Setting schema to: {schema_name}")
        
        # Always convert hyphens to underscores in schema names
        if schema_name != 'public' and '-' in schema_name:
            fixed_schema_name = schema_name.replace('-', '_')
            logger.debug(f"Fixed schema name from {schema_name} to {fixed_schema_name}")
            schema_name = fixed_schema_name
        
        # Ensure schema name is properly formatted for SQL identifiers
        if schema_name != 'public':
            schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
        
        if schema_name == 'public':
            # Set the schema directly on the cursor first
            cursor.execute('SET search_path TO public')
            
            # Use optimized connection for public schema
            TenantSchemaRouter.get_connection_for_schema('public')
        else:
            # First verify schema exists
            with connections['default'].cursor() as default_cursor:
                default_cursor.execute("""
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                if not default_cursor.fetchone():
                    logger.error(f"Schema {schema_name} does not exist")
                    raise Exception(f"Schema {schema_name} does not exist")
            
            # Set the schema directly on the cursor first
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Then use the router to ensure all connections use this schema
            TenantSchemaRouter.get_connection_for_schema(schema_name)
            
            # Verify search path was set
            cursor.execute('SHOW search_path')
            current_path = cursor.fetchone()[0]
            logger.debug(f"Current search_path: {current_path} (set in {time.time() - start_time:.4f}s)")
            
            if schema_name not in current_path:
                logger.warning(f"Schema {schema_name} not in search path: {current_path}, attempting to fix")
                cursor.execute(f'SET search_path TO "{schema_name}",public')
                
                # Check again
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                if schema_name not in current_path:
                    raise Exception(f"Failed to set search_path to {schema_name}")
                
        # Update thread local storage
        from pyfactor.db_routers import local
        setattr(local, 'tenant_schema', schema_name)
    except Exception as e:
        logger.error(f"Error setting schema {schema_name}: {str(e)}")
        raise

def reset_schema(cursor):
    """Reset search_path to public"""
    try:
        cursor.execute('SET search_path TO public')
    except Exception as e:
        logger.error(f"Error resetting schema: {str(e)}")
        # Ensure we at least try to set public schema
        cursor.execute('SET search_path TO public')

def cleanup_schema(schema_name):
    """Clean up schema if setup fails"""
    try:
        # Always convert hyphens to underscores in schema names
        if '-' in schema_name:
            fixed_schema_name = schema_name.replace('-', '_')
            logger.debug(f"Fixed schema name from {schema_name} to {fixed_schema_name}")
            schema_name = fixed_schema_name
        
        # Ensure schema name is properly formatted for SQL identifiers
        schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
        
        with get_connection() as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                # Save current search path
                cursor.execute('SHOW search_path')
                original_search_path = cursor.fetchone()[0]
                
                try:
                    # Switch to public schema for cleanup
                    with tenant_schema_context(cursor, 'public'):
                        cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                        logger.info(f"Successfully dropped schema: {schema_name}")
                finally:
                    # Restore original search path
                    if original_search_path:
                        cursor.execute(f'SET search_path TO {original_search_path}')
                        logger.debug(f"Restored search path to: {original_search_path}")
    except Exception as e:
        logger.error(f"Schema cleanup failed: {str(e)}", exc_info=True)


def save_to_schemas(request, business_data, tenant_schema=None):
    """Save business info to both public and tenant schemas if available"""
    # Save to public schema first
    business = Business.objects.create(**business_data)
    
    # If tenant schema exists, save there too
    if tenant_schema:
        try:
            with connection.cursor() as cursor:
                with tenant_schema_context(cursor, tenant_schema):
                    # Check if business already exists in tenant schema
                    cursor.execute("""
                        SELECT COUNT(*) FROM users_business
                        WHERE id = %s
                    """, [str(business.id)])
                    
                    if cursor.fetchone()[0] == 0:
                        # Insert business data directly to tenant schema
                        fields = ', '.join([f'"{k}"' for k in business_data.keys()])
                        placeholders = ', '.join(['%s' for _ in business_data.keys()])
                        values = [business_data[k] for k in business_data.keys()]
                        
                        cursor.execute(f"""
                            INSERT INTO users_business ({fields})
                            VALUES ({placeholders})
                        """, values)
        except Exception as e:
            logger.warning(f"Failed to save business to tenant schema: {str(e)}")
    
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

def create_table_from_model(cursor, schema_name, model_class):
    """
    Dynamically create a database table based on a Django model class
    """
    from django.db import models
    
    table_name = model_class._meta.db_table
    field_definitions = []
    
    # Process all fields
    for field in model_class._meta.fields:
        field_name = field.column
        
        # Skip fields from parent models that will be created separately
        if isinstance(field, models.OneToOneField) and field.primary_key:
            continue
            
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
    
    # Create the table
    create_sql = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        {', '.join(field_definitions)}
    );
    """
    
    cursor.execute(create_sql)
    
    # Add indexes
    for index in model_class._meta.indexes:
        index_name = f"idx_{table_name}_{'_'.join(index.fields)}"
        index_fields = ', '.join(index.fields)
        cursor.execute(f"""
        CREATE INDEX IF NOT EXISTS {index_name} 
        ON {table_name} ({index_fields});
        """)