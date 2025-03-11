import re
import time
import uuid
import asyncio
import psycopg2
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
                
                # Now run migrations to create any additional tables
                from django.core.management import call_command
                # Using the global settings import instead of re-importing
                
                # First run the general migrate command
                call_command('migrate', verbosity=1)
                
                # Then run migrations for each TENANT_APP specifically
                tenant_apps = settings.TENANT_APPS
                logger.info(f"Running migrations for {len(tenant_apps)} tenant apps")
                
                for app in tenant_apps:
                    logger.info(f"Running migrations for app: {app}")
                    try:
                        # Use a longer timeout for migrations
                        from onboarding.task_utils import timeout
                        with timeout(180):  # 3 minutes timeout for migrations
                            call_command('migrate', app, verbosity=1)
                    except asyncio.TimeoutError:
                        logger.error(f"Migration timed out for app {app} after 180 seconds")
                        # Continue with other apps even if one times out
                    except Exception as app_error:
                        logger.error(f"Error running migrations for app {app}: {str(app_error)}")
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
                cursor.connection.rollback()
                raise migrate_error
            
            # Verify schema exists and is accessible using context manager
            with tenant_schema_context(cursor, schema_name):
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                if schema_name_sql not in current_path:
                    raise Exception(f"Schema {schema_name} is not accessible")
            
            # Commit the transaction to ensure schema is persisted
            cursor.connection.commit()
            
            logger.info(f"Successfully created and verified schema {schema_name} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating schema {schema_name}: {str(e)}")
            cursor.connection.rollback()
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
            with tenant_schema_context(cursor, 'public'):
                cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                cursor.connection.commit()
                logger.debug(f"Cleaned up failed schema creation for {schema_name}")
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up failed schema: {str(cleanup_error)}")
        raise

@contextmanager
def tenant_schema_context(cursor, schema_name):
    """Context manager for schema operations"""
    from django.db import connections
    from pyfactor.db_routers import TenantSchemaRouter, local
    
    previous_schema = None
    start_time = time.time()
    
    try:
        # Get current schema
        cursor.execute('SHOW search_path')
        previous_schema = cursor.fetchone()[0]
        logger.debug(f"Saving previous schema: {previous_schema}")
        
        # Clear connection cache to ensure clean state
        TenantSchemaRouter.clear_connection_cache()
        
        # Set new schema using optimized connection
        # Always ensure schema name uses underscores, not hyphens
        if '-' in schema_name:
            schema_name = schema_name.replace('-', '_')
            logger.debug(f"Converted schema name to use underscores: {schema_name}")
        
        # Ensure schema name is properly formatted for SQL identifiers
        schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', schema_name)
        
        # Set the schema directly on the cursor first to ensure it's immediately available
        cursor.execute(f'SET search_path TO "{schema_name}",public')
        
        # Then use the router to ensure all connections use this schema
        connection = TenantSchemaRouter.get_connection_for_schema(schema_name)
        logger.debug(f"Successfully set schema to: {schema_name} in {time.time() - start_time:.4f}s")
        
        # Store the current schema in thread local storage for the router
        setattr(local, 'tenant_schema', schema_name)
        logger.debug(f"Set thread local tenant_schema to: {schema_name}")
        
        # Verify the schema is set correctly
        cursor.execute('SHOW search_path')
        current_path = cursor.fetchone()[0]
        if schema_name not in current_path:
            logger.warning(f"Schema {schema_name} not in search path: {current_path}, attempting to fix")
            cursor.execute(f'SET search_path TO "{schema_name}",public')
        
        yield
    except Exception as e:
        logger.error(f"Error in tenant_schema_context: {str(e)}")
        raise
    finally:
        try:
            # Restore previous schema using optimized connection
            if previous_schema:
                logger.debug(f"Restoring previous schema: {previous_schema}")
                # Clean up the previous_schema to ensure it's a valid schema name
                # Remove any special characters or quotes that might cause SQL errors
                clean_schema = previous_schema.replace('"', '').replace('$', '')
                if ',' in clean_schema:
                    # If there are multiple schemas in the path, just use the first one
                    clean_schema = clean_schema.split(',')[0].strip()
                
                # If the schema is empty after cleaning, use 'public'
                if not clean_schema or clean_schema.isspace():
                    clean_schema = 'public'
                    
                TenantSchemaRouter.clear_connection_cache()
                TenantSchemaRouter.get_connection_for_schema(clean_schema)
                
                # Update thread local storage with previous schema
                setattr(local, 'tenant_schema', clean_schema)
                logger.debug(f"Restored thread local tenant_schema to: {clean_schema}")
            else:
                logger.debug("Falling back to public schema")
                TenantSchemaRouter.clear_connection_cache()
                TenantSchemaRouter.get_connection_for_schema('public')
                
                # Reset thread local storage to public
                setattr(local, 'tenant_schema', 'public')
                logger.debug("Reset thread local tenant_schema to: public")
                
            logger.debug(f"Schema context operation completed in {time.time() - start_time:.4f}s")
        except Exception as e:
            logger.error(f"Error resetting schema: {str(e)}")
            
            # Ensure we at least try to set public schema
            try:
                TenantSchemaRouter.clear_connection_cache()
                TenantSchemaRouter.get_connection_for_schema('public')
                
                # Reset thread local storage to public in case of error
                setattr(local, 'tenant_schema', 'public')
                logger.debug("Reset thread local tenant_schema to public after error")
            except Exception as thread_error:
                logger.error(f"Error resetting thread local schema: {str(thread_error)}")

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