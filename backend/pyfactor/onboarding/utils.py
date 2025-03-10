import re
import time
import uuid
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
        tenant_id = str(uuid.uuid4()).replace('-', '_').lower()
        
        # Combine with tenant_ prefix
        schema_name = f"tenant_{tenant_id}"
        
        # Validate format
        if not re.match(r'^tenant_[a-z0-9_]+$', schema_name):
            logger.warning(f"Generated invalid schema name format: {schema_name}")
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
        # Validate schema name format first
        if not re.match(r'^tenant_[a-z0-9_]+$', schema_name):
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
                if schema_name in current_path:
                    logger.info(f"Successfully validated schema: {schema_name}")
                    return True
                else:
                    logger.error(f"Schema {schema_name} exists but is not in search path")
                    raise Exception(f"Schema {schema_name} exists but is not accessible")
        
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
        
        # Validate schema name
        if not re.match(r'^tenant_[a-z0-9_]+$', schema_name):
            raise ValueError(f"Invalid schema name format: {schema_name}")
        
        # Validate user_id is a valid UUID
        try:
            uuid_obj = uuid.UUID(user_id)
            user_id = str(uuid_obj)
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
                
            # Create schema
            cursor.execute(f'CREATE SCHEMA "{schema_name}"')
            logger.debug(f"Created schema {schema_name}")
            
            # Set up permissions with detailed logging
            db_user = settings.DATABASES["default"]["USER"]
            logger.debug(f"Setting up permissions for user {db_user}")
            
            permission_commands = [
                f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}',
                f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}',
                f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}'
            ]
            
            for cmd in permission_commands:
                cursor.execute(cmd)
                logger.debug(f"Executed permission command: {cmd}")
            
            # Set search path to new schema for migrations
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            
            # Run migrations directly
            try:
                from django.core.management import call_command
                call_command('migrate', verbosity=0)
                logger.debug(f"Migrations applied to schema {schema_name}")
            except Exception as migrate_error:
                logger.error(f"Error applying migrations to schema {schema_name}: {str(migrate_error)}")
                # Continue even if migrations fail - we'll handle this separately
            
            # Verify schema exists and is accessible using context manager
            with tenant_schema_context(cursor, schema_name):
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                if schema_name not in current_path:
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
        connection = TenantSchemaRouter.get_connection_for_schema(schema_name)
        logger.debug(f"Successfully set schema to: {schema_name} in {time.time() - start_time:.4f}s")
        
        # Store the current schema in thread local storage for the router
        setattr(local, 'tenant_schema', schema_name)
        logger.debug(f"Set thread local tenant_schema to: {schema_name}")
        
        yield
    except Exception as e:
        logger.error(f"Error in tenant_schema_context: {str(e)}")
        raise
    finally:
        try:
            # Restore previous schema using optimized connection
            if previous_schema:
                logger.debug(f"Restoring previous schema: {previous_schema}")
                TenantSchemaRouter.clear_connection_cache()
                TenantSchemaRouter.get_connection_for_schema(previous_schema)
                
                # Update thread local storage with previous schema
                setattr(local, 'tenant_schema', previous_schema)
                logger.debug(f"Restored thread local tenant_schema to: {previous_schema}")
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
        
        if schema_name == 'public':
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
            
            # Use optimized connection for tenant schema
            TenantSchemaRouter.get_connection_for_schema(schema_name)
            
            # Verify search path was set
            cursor.execute('SHOW search_path')
            current_path = cursor.fetchone()[0]
            logger.debug(f"Current search_path: {current_path} (set in {time.time() - start_time:.4f}s)")
            
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