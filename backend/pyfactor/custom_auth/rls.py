"""
PostgreSQL Row Level Security (RLS) utilities.
This module provides functions to manage database-level row security policies.
"""

import logging
import uuid
from django.db import connection
from django.utils import timezone
import asyncio

logger = logging.getLogger(__name__)

def set_tenant_in_db(tenant_id):
    """
    Set the tenant ID in the PostgreSQL session.
    This allows RLS policies to use the tenant_id for filtering.
    
    Args:
        tenant_id: UUID of the current tenant
    """
    if not tenant_id:
        # Clear the setting if no tenant ID is provided
        try:
            with connection.cursor() as cursor:
                # PostgreSQL doesn't accept NULL directly in SET commands
                # Use empty string or 'unset' as a convention for "no tenant"
                cursor.execute("SET app.current_tenant_id = 'unset'")
            return True
        except Exception as e:
            logger.error(f"Error clearing tenant ID in database session: {str(e)}")
            return False
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET app.current_tenant_id = %s", [str(tenant_id)])
        return True
    except Exception as e:
        logger.error(f"Error setting tenant ID in database session: {str(e)}")
        return False

async def set_tenant_in_db_async(tenant_id):
    """
    Async version of set_tenant_in_db for use in async contexts.
    
    Args:
        tenant_id: UUID of the current tenant
    """
    # Run the synchronous function in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, set_tenant_in_db, tenant_id)

def setup_tenant_context_in_db():
    """
    Create the necessary PostgreSQL settings for RLS.
    Should be run during system startup to ensure the custom settings are available.
    """
    try:
        with connection.cursor() as cursor:
            # Create the custom setting if it doesn't exist
            cursor.execute("""
                DO $$
                BEGIN
                    PERFORM 1 FROM pg_settings WHERE name = 'app.current_tenant_id';
                    IF NOT FOUND THEN
                        PERFORM set_config('app.current_tenant_id', 'unset', false);
                    END IF;
                END $$;
            """)
        return True
    except Exception as e:
        logger.error(f"Error setting up tenant context in database: {str(e)}")
        return False

async def setup_tenant_context_in_db_async():
    """
    Async version of setup_tenant_context_in_db for use in async contexts.
    """
    # Run the synchronous function in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, setup_tenant_context_in_db)

def create_rls_policy_for_table(table_name, schema='public'):
    """
    Create an RLS policy for the specified table.
    
    Args:
        table_name: Name of the table to add the RLS policy to
        schema: Database schema (default: public)
    """
    try:
        with connection.cursor() as cursor:
            # First check if the table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = %s
                )
            """, [schema, table_name])
            
            table_exists = cursor.fetchone()[0]
            if not table_exists:
                logger.warning(f"Table {schema}.{table_name} does not exist yet. Will apply RLS when table is created.")
                return False
                
            # Enable RLS on the table
            cursor.execute(f'ALTER TABLE {schema}.{table_name} ENABLE ROW LEVEL SECURITY;')
            
            # Create the tenant isolation policy with proper error handling for unset values
            cursor.execute(f"""
                DROP POLICY IF EXISTS tenant_isolation_policy ON {schema}.{table_name};
                CREATE POLICY tenant_isolation_policy ON {schema}.{table_name}
                    USING (
                        (tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                        AND current_setting('app.current_tenant_id', TRUE) != 'unset')
                        OR current_setting('app.current_tenant_id', TRUE) = 'unset'
                    );
            """)
        
        logger.info(f"Successfully created RLS policy for {schema}.{table_name}")
        return True
    except Exception as e:
        logger.error(f"Error creating RLS policy for {schema}.{table_name}: {str(e)}")
        return False

async def create_rls_policy_for_table_async(table_name, schema='public'):
    """
    Async version of create_rls_policy_for_table for use in async contexts.
    
    Args:
        table_name: Name of the table to add the RLS policy to
        schema: Database schema (default: public)
    """
    # Run the synchronous function in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, create_rls_policy_for_table, table_name, schema) 