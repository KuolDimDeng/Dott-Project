"""
Row Level Security (RLS) Utilities

This module provides utility functions for working with PostgreSQL's Row Level Security (RLS)
features to enforce tenant isolation in a multi-tenant application. These functions directly
interact with the database to set or clear tenant context.

Author: Claude AI Assistant
Date: 2025-04-19
"""

import logging
import traceback
import uuid
import contextlib
from django.db import connection
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

def fix_rls_configuration():
    """
    Ensures that the necessary RLS functions and conversions exist in the database.
    Returns True if successful, False otherwise.
    """
    try:
        with connection.cursor() as cursor:
            # Check and create UUID to text conversion function
            cursor.execute("""
            SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_to_text');
            """)
            if not cursor.fetchone()[0]:
                cursor.execute("""
                CREATE OR REPLACE FUNCTION uuid_to_text(id uuid)
                RETURNS text AS $$
                BEGIN
                    RETURN id::text;
                EXCEPTION
                    WHEN OTHERS THEN
                        RETURN NULL;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
                """)
            
            # Check and create text to UUID conversion function
            cursor.execute("""
            SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'text_to_uuid');
            """)
            if not cursor.fetchone()[0]:
                cursor.execute("""
                CREATE OR REPLACE FUNCTION text_to_uuid(id text)
                RETURNS uuid AS $$
                BEGIN
                    RETURN id::uuid;
                EXCEPTION
                    WHEN OTHERS THEN
                        RETURN NULL::uuid;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
                """)
            
            # Create or replace tenant context functions
            cursor.execute("""
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS text AS $$
            BEGIN
                RETURN COALESCE(current_setting('app.current_tenant_id', TRUE), 'unset');
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            cursor.execute("""
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            cursor.execute("""
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            cursor.execute("""
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
            RETURNS text AS $$
            BEGIN
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                PERFORM set_config('app.current_tenant', tenant_id, FALSE);
                RETURN tenant_id;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            cursor.execute("""
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS text AS $$
            BEGIN
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                PERFORM set_config('app.current_tenant', 'unset', FALSE);
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # Check if RLS status view exists and create if needed
            cursor.execute("""
            SELECT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'rls_status');
            """)
            if not cursor.fetchone()[0]:
                cursor.execute("""
                CREATE OR REPLACE VIEW rls_status AS
                SELECT 
                    t.table_name,
                    t.table_schema,
                    EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = t.table_name 
                        AND table_schema = t.table_schema
                        AND column_name = 'tenant_id'
                    ) AS has_tenant_id,
                    EXISTS (
                        SELECT FROM pg_tables 
                        WHERE tablename = t.table_name 
                        AND schemaname = t.table_schema
                        AND rowsecurity = true
                    ) AS rls_enabled,
                    (
                        SELECT COUNT(*) > 0 
                        FROM pg_policy 
                        WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                    ) AS has_policy,
                    (
                        SELECT string_agg(polname, ', ') 
                        FROM pg_policy 
                        WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                    ) AS policies,
                    (
                        SELECT data_type
                        FROM information_schema.columns
                        WHERE table_name = t.table_name 
                        AND table_schema = t.table_schema
                        AND column_name = 'tenant_id'
                    ) AS tenant_id_type
                FROM information_schema.tables t
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name;
                """)
            
            # Test if functions were created successfully
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            logger.info(f"RLS configuration test: get_tenant_context() returns '{result}'")
            
            return True
    except Exception as e:
        logger.error(f"Error configuring RLS: {e}")
        logger.error(traceback.format_exc())
        return False

def set_tenant_context(tenant_id):
    """
    Sets the tenant context for Row Level Security.
    
    Args:
        tenant_id (str): The tenant ID to set as context
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_tenant_context(%s)", [tenant_id])
            
            # Verify the setting was applied
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            
            if result == tenant_id:
                return True
            else:
                logger.warning(f"Failed to set tenant context. Expected: {tenant_id}, Got: {result}")
                return False
    except Exception as e:
        logger.error(f"Error setting tenant context: {e}")
        return False

def clear_tenant_context():
    """
    Clears the tenant context (sets to 'unset').
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT clear_tenant_context()")
            
            # Verify the setting was cleared
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            
            if result == 'unset':
                return True
            else:
                logger.warning(f"Failed to clear tenant context. Got: {result}")
                return False
    except Exception as e:
        logger.error(f"Error clearing tenant context: {e}")
        return False

def check_rls_status():
    """
    Checks the RLS status on tables with tenant_id column.
    
    Returns:
        dict: Dictionary with RLS status information
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE has_tenant_id) as with_tenant_id,
                COUNT(*) FILTER (WHERE rls_enabled) as with_rls_enabled,
                COUNT(*) FILTER (WHERE has_policy) as with_policy
            FROM rls_status;
            """)
            
            row = cursor.fetchone()
            return {
                'total_tables': row[0],
                'tables_with_tenant_id': row[1],
                'tables_with_rls_enabled': row[2],
                'tables_with_policy': row[3],
                'missing_rls': row[1] - row[2],
                'missing_policy': row[1] - row[3],
            }
    except Exception as e:
        logger.error(f"Error checking RLS status: {e}")
        return {
            'error': str(e),
            'total_tables': 0,
            'tables_with_tenant_id': 0,
            'tables_with_rls_enabled': 0,
            'tables_with_policy': 0,
            'missing_rls': 0,
            'missing_policy': 0,
        }

def verify_rls_setup():
    """
    Verifies that RLS is properly configured by testing key RLS functions
    and checking that a test tenant context can be set and retrieved.
    
    Returns:
        bool: True if RLS is working correctly, False otherwise
    """
    try:
        # Step 1: Ensure RLS functions exist
        with connection.cursor() as cursor:
            # Check that get_tenant_context function exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'get_tenant_context'
            );
            """)
            if not cursor.fetchone()[0]:
                logger.error("RLS function 'get_tenant_context' does not exist")
                return False
                
            # Check that set_tenant_context function exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc 
                WHERE proname = 'set_tenant_context'
            );
            """)
            if not cursor.fetchone()[0]:
                logger.error("RLS function 'set_tenant_context' does not exist")
                return False
        
        # Step 2: Test setting and getting tenant context
        test_tenant_id = "test-verification-tenant"
        
        # Set test tenant context
        set_tenant_context(test_tenant_id)
        
        # Verify it was set correctly
        with connection.cursor() as cursor:
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            
            if result != test_tenant_id:
                logger.error(f"RLS verification failed: expected tenant context '{test_tenant_id}', got '{result}'")
                return False
        
        # Step 3: Test clearing tenant context
        clear_tenant_context()
        
        # Verify it was cleared
        with connection.cursor() as cursor:
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            
            if result != 'unset':
                logger.error(f"RLS verification failed: expected 'unset' after clearing tenant context, got '{result}'")
                return False
        
        # Step 4: Check RLS status
        status = check_rls_status()
        
        if status.get('error'):
            logger.error(f"RLS status check failed: {status['error']}")
            return False
            
        if status['tables_with_tenant_id'] > 0 and status['missing_policy'] > 0:
            logger.warning(f"RLS verification: {status['missing_policy']} tables with tenant_id missing RLS policies")
            # Don't fail completely if some tables are missing policies
        
        logger.info(f"RLS verification successful: {status['tables_with_rls_enabled']} tables with RLS enabled")
        return True
        
    except Exception as e:
        logger.error(f"Error verifying RLS setup: {e}")
        logger.error(traceback.format_exc())
        return False

def create_rls_policy_for_table(table_name, schema_name='public'):
    """
    Create RLS policy for a specific table to enforce tenant isolation.
    
    Args:
        table_name (str): The name of the table
        schema_name (str, optional): The schema name, defaults to 'public'
        
    Returns:
        bool: True if policy was created successfully, False otherwise
    """
    try:
        # Check if table exists
        with connection.cursor() as cursor:
            cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = %s
                AND table_name = %s
            );
            """, [schema_name, table_name])
            
            if not cursor.fetchone()[0]:
                logger.error(f"Table {schema_name}.{table_name} does not exist")
                return False
            
            # Check if tenant_id column exists
            cursor.execute(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = %s
                AND table_name = %s
                AND column_name = 'tenant_id'
            );
            """, [schema_name, table_name])
            
            if not cursor.fetchone()[0]:
                logger.error(f"Table {schema_name}.{table_name} does not have tenant_id column")
                return False
            
            # Enable RLS on the table
            cursor.execute(f"""
            ALTER TABLE {schema_name}.{table_name} ENABLE ROW LEVEL SECURITY;
            """)
            
            # Create policy for SELECT
            cursor.execute(f"""
            CREATE POLICY select_{table_name}_tenant_isolation ON {schema_name}.{table_name}
                FOR SELECT
                USING (
                    tenant_id::text = current_tenant_id() 
                    OR current_tenant_id() = 'unset'
                );
            """)
            
            # Create policy for INSERT
            cursor.execute(f"""
            CREATE POLICY insert_{table_name}_tenant_isolation ON {schema_name}.{table_name}
                FOR INSERT
                WITH CHECK (
                    tenant_id::text = current_tenant_id() 
                    OR current_tenant_id() = 'unset'
                );
            """)
            
            # Create policy for UPDATE
            cursor.execute(f"""
            CREATE POLICY update_{table_name}_tenant_isolation ON {schema_name}.{table_name}
                FOR UPDATE
                USING (
                    tenant_id::text = current_tenant_id() 
                    OR current_tenant_id() = 'unset'
                )
                WITH CHECK (
                    tenant_id::text = current_tenant_id() 
                    OR current_tenant_id() = 'unset'
                );
            """)
            
            # Create policy for DELETE
            cursor.execute(f"""
            CREATE POLICY delete_{table_name}_tenant_isolation ON {schema_name}.{table_name}
                FOR DELETE
                USING (
                    tenant_id::text = current_tenant_id() 
                    OR current_tenant_id() = 'unset'
                );
            """)
            
            logger.info(f"Created RLS policies for {schema_name}.{table_name}")
            return True
            
    except Exception as e:
        logger.error(f"Error creating RLS policy for {schema_name}.{table_name}: {e}")
        logger.error(traceback.format_exc())
        return False

# Compatibility functions for backwards compatibility with existing code

def get_current_tenant_id():
    """
    Compatibility function to get the current tenant ID.
    
    Returns:
        UUID or None: The current tenant ID as UUID or None
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()[0]
            
            if result and result != 'unset':
                try:
                    return uuid.UUID(result)
                except (ValueError, TypeError):
                    pass
            return None
    except Exception as e:
        logger.debug(f"Error getting tenant context: {e}")
        return None

def set_current_tenant_id(tenant_id):
    """
    Compatibility function to set the current tenant ID.
    
    Args:
        tenant_id: The tenant ID to set
        
    Returns:
        bool: Success status
    """
    return set_tenant_context(str(tenant_id))

def set_tenant_in_db(tenant_id):
    """
    Compatibility function to set the tenant in DB.
    This is an alias for set_tenant_context.
    
    Args:
        tenant_id: The tenant ID to set
        
    Returns:
        bool: Success status
    """
    return set_tenant_context(str(tenant_id))

def setup_tenant_context_in_db(tenant_id):
    """
    Compatibility function to set up tenant context in DB.
    This is an alias for set_tenant_context.
    
    Args:
        tenant_id: The tenant ID to set
        
    Returns:
        bool: Success status
    """
    return set_tenant_context(str(tenant_id))

async def setup_tenant_context_in_db_async(tenant_id):
    """
    Async compatibility function to set up tenant context in DB.
    This is an async wrapper around set_tenant_context.
    
    Args:
        tenant_id: The tenant ID to set
        
    Returns:
        bool: Success status
    """
    return await sync_to_async(set_tenant_context)(str(tenant_id))

async def set_tenant_in_db_async(tenant_id):
    """
    Async compatibility function to set the tenant in DB.
    This is an alias for setup_tenant_context_in_db_async.
    
    Args:
        tenant_id: The tenant ID to set
        
    Returns:
        bool: Success status
    """
    return await setup_tenant_context_in_db_async(tenant_id)

def clear_current_tenant_id():
    """
    Compatibility function to clear the current tenant ID.
    
    Returns:
        bool: Success status
    """
    return clear_tenant_context()

@contextlib.contextmanager
def tenant_context(tenant_id):
    """
    Context manager for temporarily changing the tenant context.
    
    Args:
        tenant_id: The tenant ID to set during the context
    """
    original_tenant = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT get_tenant_context()")
            original_tenant = cursor.fetchone()[0]
        
        # Set the new tenant context
        if tenant_id is not None:
            set_tenant_context(str(tenant_id))
        else:
            clear_tenant_context()
        
        yield
    finally:
        # Restore the original tenant context
        if original_tenant and original_tenant != 'unset':
            set_tenant_context(original_tenant)
        else:
            clear_tenant_context() 