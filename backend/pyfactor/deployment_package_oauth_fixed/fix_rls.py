#!/usr/bin/env python3
"""
One-time script to fix RLS policies and database configuration.
This ensures that all tenant contexts use empty strings instead of NULL values.
Run this script directly from the backend directory:
  python fix_rls.py
"""

import os
import sys
import django
import logging
from pathlib import Path

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('fix_rls')

def fix_tenant_context_param():
    """Initialize the tenant context parameter at session level"""
    try:
        with connection.cursor() as cursor:
            # First check if the parameter already exists
            try:
                cursor.execute("SHOW app.current_tenant;")
                value = cursor.fetchone()[0]
                logger.info(f"Parameter app.current_tenant already exists with value: '{value}'")
                return True
            except Exception:
                logger.info("Parameter app.current_tenant doesn't exist yet, will create it")
            
            # Create a simple helper function for safe setting of values
            cursor.execute('''
            CREATE OR REPLACE FUNCTION set_config_with_empty(param text, value text) RETURNS text AS $$
            BEGIN
                RETURN set_config(param, COALESCE(value, ''), false);
            END;
            $$ LANGUAGE plpgsql;
            ''')
            
            # Set the parameter at session level
            cursor.execute("SET app.current_tenant = '';")
            
            # Verify it's set
            try:
                cursor.execute("SHOW app.current_tenant;")
                current_value = cursor.fetchone()[0]
                logger.info(f"app.current_tenant is now set to: '{current_value}'")
                return True
            except Exception as e:
                logger.error(f"Failed to verify app.current_tenant: {e}")
                return False
    except Exception as e:
        logger.error(f"Error initializing tenant context parameter: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_for_test_table():
    """Create and configure a test table with proper RLS"""
    try:
        with connection.cursor() as cursor:
            # Create test table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.rls_test (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT,
                    value TEXT
                );
            """)
            
            # Enable RLS on the test table
            cursor.execute("ALTER TABLE public.rls_test ENABLE ROW LEVEL SECURITY;")
            
            # Create/replace the RLS policy
            cursor.execute("DROP POLICY IF EXISTS rls_test_policy ON public.rls_test;")
            
            # Create a policy that works with empty strings
            cursor.execute("""
                CREATE POLICY rls_test_policy ON public.rls_test
                USING (
                    (tenant_id = current_setting('app.current_tenant', TRUE))
                    OR (current_setting('app.current_tenant', TRUE) = '')
                );
            """)
            
            # Insert test data
            cursor.execute("DELETE FROM public.rls_test;")
            cursor.execute("INSERT INTO public.rls_test (tenant_id, value) VALUES ('tenant1', 'value1');")
            cursor.execute("INSERT INTO public.rls_test (tenant_id, value) VALUES ('tenant2', 'value2');")
            cursor.execute("INSERT INTO public.rls_test (tenant_id, value) VALUES (NULL, 'value3');")
            
            logger.info("Created and configured RLS test table")
            return True
    except Exception as e:
        logger.error(f"Error fixing RLS for test table: {e}")
        logger.error(traceback.format_exc())
        return False

def test_rls():
    """Test if RLS is working correctly"""
    try:
        with connection.cursor() as cursor:
            # Set tenant1 context
            cursor.execute("SET app.current_tenant = 'tenant1';")
            cursor.execute("SELECT COUNT(*) FROM public.rls_test;")
            tenant1_count = cursor.fetchone()[0]
            
            # Set tenant2 context
            cursor.execute("SET app.current_tenant = 'tenant2';")
            cursor.execute("SELECT COUNT(*) FROM public.rls_test;")
            tenant2_count = cursor.fetchone()[0]
            
            # Set empty context
            cursor.execute("SET app.current_tenant = '';")
            cursor.execute("SELECT COUNT(*) FROM public.rls_test;")
            empty_count = cursor.fetchone()[0]
            
            logger.info(f"RLS test results: tenant1={tenant1_count}, tenant2={tenant2_count}, empty={empty_count}")
            
            # Check if RLS is working correctly - with empty string you should see all rows
            if tenant1_count == 1 and tenant2_count == 1 and empty_count >= 3:
                logger.info("RLS is working correctly!")
                return True
            else:
                logger.error("RLS is NOT working correctly")
                return False
    except Exception as e:
        logger.error(f"Error testing RLS: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("Starting RLS fix...")
    if fix_tenant_context_param():
        logger.info("Successfully initialized tenant context parameter")
        if fix_rls_for_test_table():
            test_rls()
    logger.info("RLS fix script completed") 