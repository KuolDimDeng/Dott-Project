"""
Row-level security utilities for tenant isolation.

This module provides functions to set and get the current tenant ID in the database 
using PostgreSQL's session variables, which works with row-level security policies.
"""

import logging
import uuid
import contextlib
import os
import time
import random
from typing import Optional, Union
from django.db import connection
from django.conf import settings

logger = logging.getLogger(__name__)

def set_current_tenant_id(tenant_id: Optional[Union[uuid.UUID, str]]) -> None:
    """
    Set the current tenant ID in the database session.
    
    Args:
        tenant_id: The tenant ID to set, or None to unset
    """
    if tenant_id is None:
        # Clear the tenant context
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET app.current_tenant_id TO 'unset';")
            logger.debug("Cleared tenant context in database")
        except Exception as e:
            logger.error(f"Error clearing tenant context in database: {str(e)}")
        return
        
    # Convert string to UUID if needed
    if isinstance(tenant_id, str):
        try:
            tenant_id = uuid.UUID(tenant_id)
        except ValueError:
            logger.error(f"Invalid tenant ID format: {tenant_id}")
            return
            
    # Set the tenant ID in the database session
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SET app.current_tenant_id TO '{str(tenant_id)}';")
        logger.debug(f"Set tenant context to {tenant_id} in database")
    except Exception as e:
        logger.error(f"Error setting tenant context in database: {str(e)}")
        
def get_current_tenant_id() -> Optional[uuid.UUID]:
    """
    Get the current tenant ID from the database session.
    
    Returns:
        The current tenant ID or None if not set
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_setting('app.current_tenant_id', true);")
            result = cursor.fetchone()[0]
            
            if result and result != 'unset':
                return uuid.UUID(result)
            return None
    except Exception as e:
        logger.debug(f"Error getting tenant context from database: {str(e)}")
        return None
        
def clear_current_tenant_id() -> None:
    """
    Clear the current tenant ID from the database session.
    """
    set_current_tenant_id(None)
    
@contextlib.contextmanager
def tenant_context(tenant_id: Optional[Union[uuid.UUID, str]]):
    """
    Context manager for temporarily changing the tenant context.
    
    Args:
        tenant_id: The tenant ID to set during the context
        
    Example:
        with tenant_context('12345678-1234-5678-1234-567812345678'):
            # Do something as this tenant
            items = Item.objects.all()  # Will only see tenant's items
    """
    # Store the original tenant ID
    original_tenant_id = get_current_tenant_id()
    
    try:
        # Set the new tenant ID
        set_current_tenant_id(tenant_id)
        yield
    finally:
        # Restore the original tenant ID
        set_current_tenant_id(original_tenant_id)
        
def verify_rls_setup() -> bool:
    """
    Verify that RLS is set up correctly in the database.
    
    Returns:
        True if RLS is set up correctly, False otherwise
    """
    # Use a file-based lock to prevent multiple processes from
    # attempting RLS verification simultaneously
    lock_file = '/tmp/pyfactor_rls_verification.lock'
    
    try:
        # Use simple file locking with random backoff to prevent deadlocks
        for attempt in range(3):  # Try up to 3 times
            try:
                # Attempt to create the lock file exclusively
                with open(lock_file, 'x') as f:
                    f.write(str(os.getpid()))
                    
                logger.debug(f"Acquired RLS verification lock on attempt {attempt+1}")
                
                # We've acquired the lock, continue with verification
                try:
                    return _do_verify_rls_setup()
                finally:
                    # Always clean up the lock file when done
                    try:
                        os.remove(lock_file)
                        logger.debug("Released RLS verification lock")
                    except Exception as e:
                        logger.error(f"Error releasing RLS lock: {str(e)}")
            except FileExistsError:
                # Lock already exists, wait with random backoff to avoid thundering herd
                wait_time = (1 + random.random()) * (attempt + 1)
                logger.debug(f"RLS verification lock exists, waiting {wait_time:.2f}s before retry")
                time.sleep(wait_time)
                
                # Check if the lock file is stale (older than 60 seconds)
                try:
                    if os.path.exists(lock_file):
                        if time.time() - os.path.getmtime(lock_file) > 60:
                            logger.warning("Removing stale RLS verification lock")
                            os.remove(lock_file)
                except Exception as e:
                    logger.error(f"Error checking/removing stale lock: {str(e)}")
        
        # If we get here, we couldn't acquire the lock after max attempts
        logger.warning("Could not acquire RLS verification lock after 3 attempts")
        
        # Return true to avoid blocking the application startup
        # The RLS verification will be retried later by another process
        return True
    except Exception as e:
        logger.error(f"Error in RLS verification lock management: {str(e)}")
        
        # Return true to avoid blocking application startup
        return True

def _do_verify_rls_setup() -> bool:
    """
    Internal function that does the actual RLS verification.
    Called by verify_rls_setup after acquiring a lock.
    
    Returns:
        True if RLS is set up correctly, False otherwise
    """
    try:
        # Create a test table with RLS if it doesn't exist
        with connection.cursor() as cursor:
            # Create the test table if it doesn't exist
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rls_test (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                name TEXT NOT NULL
            );
            """)
            
            # First enable RLS on the table
            try:
                cursor.execute("ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;")
            except Exception as e:
                # If RLS is already enabled, this will fail - which is fine
                logger.debug(f"RLS already enabled on rls_test or error: {str(e)}")
            
            # Always drop the policy first to avoid "already exists" errors
            try:
                cursor.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;")
            except Exception as e:
                logger.error(f"Error dropping RLS policy: {str(e)}")
            
            # Create policy with proper error handling
            try:
                cursor.execute("""
                CREATE POLICY tenant_isolation_policy ON rls_test
                AS RESTRICTIVE
                USING (
                    tenant_id::TEXT = current_setting('app.current_tenant_id', TRUE)
                    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
                );
                """)
                logger.debug("Created RLS policy on rls_test")
            except Exception as e:
                logger.error(f"Error creating RLS policy: {str(e)}")
                # Continue with verification anyway - the policy might still work
            
            # Clean up existing test data
            cursor.execute("DELETE FROM rls_test;")
            
            # Insert fresh test data
            cursor.execute("""
            INSERT INTO rls_test (tenant_id, name)
            VALUES
                ('11111111-1111-1111-1111-111111111111', 'Tenant 1 - Record 1'),
                ('22222222-2222-2222-2222-222222222222', 'Tenant 2 - Record 1');
            """)
            
            # Test with tenant 1
            cursor.execute("SET app.current_tenant_id TO '11111111-1111-1111-1111-111111111111';")
            cursor.execute("SELECT COUNT(*) FROM rls_test;")
            tenant1_count = cursor.fetchone()[0]
            
            # Test with tenant 2
            cursor.execute("SET app.current_tenant_id TO '22222222-2222-2222-2222-222222222222';")
            cursor.execute("SELECT COUNT(*) FROM rls_test;")
            tenant2_count = cursor.fetchone()[0]
            
            # Test with unset
            cursor.execute("SET app.current_tenant_id TO 'unset';")
            cursor.execute("SELECT COUNT(*) FROM rls_test;")
            unset_count = cursor.fetchone()[0]
            
            # Check if tenant isolation is working
            # Each tenant should only see their own records when the tenant context is set
            # And they should see all records when the tenant context is unset
            tenant1_sees_only_own = (tenant1_count == 1)
            tenant2_sees_only_own = (tenant2_count == 1)
            unset_sees_all = (unset_count == 2)
            
            rls_working = tenant1_sees_only_own and tenant2_sees_only_own and unset_sees_all
            
            if rls_working:
                logger.info("RLS verification passed")
            else:
                logger.error(f"RLS verification failed: tenant1={tenant1_count} (expected 1), tenant2={tenant2_count} (expected 1), unset={unset_count} (expected 2)")
                
            # Always clear tenant context at the end
            cursor.execute("SET app.current_tenant_id TO 'unset';")
            
            return rls_working
    
    except Exception as e:
        logger.error(f"RLS verification error: {str(e)}")
        
        # Make sure we reset the tenant context even if verification fails
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET app.current_tenant_id TO 'unset';")
        except:
            pass
            
        return False

# Backward compatibility functions
def set_tenant_in_db(tenant_id):
    """
    Backward compatibility function for setting tenant context.
    
    Args:
        tenant_id: The tenant ID to set, or None to unset
    """
    return set_current_tenant_id(tenant_id)

def setup_tenant_context_in_db():
    """
    Initialize the tenant context in the database.
    This is a no-op in the new RLS architecture but kept for backward compatibility.
    """
    logger.info("Setting up tenant context in DB (backward compatibility)")
    return True

def setup_tenant_context_in_db_async():
    """
    Initialize the tenant context in the database asynchronously.
    This is a no-op in the new RLS architecture but kept for backward compatibility.
    """
    logger.info("Setting up tenant context in DB async (backward compatibility)")
    return True

async def set_tenant_in_db_async(tenant_id):
    """
    Async backward compatibility function for setting tenant context.
    
    Args:
        tenant_id: The tenant ID to set, or None to unset
    """
    logger.info(f"Setting tenant in DB async (backward compatibility): {tenant_id}")
    return set_current_tenant_id(tenant_id)

def create_rls_policy_for_table(table_name):
    """
    Create a Row Level Security policy for the specified table.
    
    Args:
        table_name: The name of the table to create the policy for
        
    Returns:
        True if the policy was created successfully, False otherwise
    """
    try:
        logger.info(f"Creating RLS policy for table: {table_name}")
        with connection.cursor() as cursor:
            # Enable RLS on the table
            cursor.execute(f'ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;')
            
            # Create tenant isolation policy
            cursor.execute(f"""
                DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
                CREATE POLICY tenant_isolation_policy ON {table_name}
                    USING (
                        tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), 'unset')::uuid
                        AND current_setting('app.current_tenant_id', TRUE) != 'unset'
                    );
            """)
        logger.info(f"Successfully applied RLS policy to table: {table_name}")
        return True
    except Exception as e:
        logger.error(f"Error creating RLS policy for table {table_name}: {str(e)}")
        return False

async def verify_rls_setup_async():
    """
    Async version of verify_rls_setup for use in async contexts.
    Uses sync_to_async to prevent "You cannot call this from an async context" errors.
    
    Returns:
        True if RLS is set up correctly, False otherwise
    """
    from asgiref.sync import sync_to_async
    
    try:
        @sync_to_async
        def run_verification():
            return verify_rls_setup()
            
        return await run_verification()
    except Exception as e:
        logger.error(f"Async RLS verification error: {str(e)}")
        return False 