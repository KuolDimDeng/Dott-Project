#!/usr/bin/env python3
"""
RLS Diagnostic Test Script
This script checks if Row Level Security is properly configured and working
"""

import os
import sys
import logging
import django
from django.db import connection

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_rls_isolation():
    """Test if RLS isolation is properly working"""
    logger.info("Testing RLS isolation directly")
    
    with connection.cursor() as cursor:
        # First check if RLS functions exist
        try:
            cursor.execute("SELECT get_tenant_context()")
            context = cursor.fetchone()[0]
            logger.info(f"RLS context functions exist: current context = {context}")
        except Exception as e:
            logger.error(f"RLS context functions not working: {e}")
            return False
        
        # Test context switching
        cursor.execute("SELECT set_tenant_context('test_context')")
        cursor.execute("SELECT get_tenant_context()")
        test_context = cursor.fetchone()[0]
        logger.info(f"Set context to: {test_context}")
        
        cursor.execute("SELECT clear_tenant_context()")
        cursor.execute("SELECT get_tenant_context()")
        cleared_context = cursor.fetchone()[0]
        logger.info(f"Cleared context to: {cleared_context}")
        
        # Check RLS test table
        try:
            # Check if rls_test_table exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'rls_test_table'
            )
            """)
            if not cursor.fetchone()[0]:
                logger.error("RLS test table does not exist")
                return False
            
            # Check if RLS is enabled on the table
            cursor.execute("""
            SELECT c.relrowsecurity, c.relforcerowsecurity
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'rls_test_table'
            """)
            row = cursor.fetchone()
            if not row:
                logger.error("Could not find rls_test_table in system catalog")
                return False
            
            rls_enabled, rls_forced = row
            logger.info(f"RLS enabled: {rls_enabled}, RLS forced: {rls_forced}")
            
            if not rls_enabled:
                logger.error("RLS is not enabled on the test table")
                return False
            
            # Check if RLS policies exist
            cursor.execute("""
            SELECT COUNT(*)
            FROM pg_policies
            WHERE tablename = 'rls_test_table'
            """)
            policy_count = cursor.fetchone()[0]
            logger.info(f"Found {policy_count} RLS policies on test table")
            
            if policy_count == 0:
                logger.error("No RLS policies defined on test table")
                return False
            
            # Look at the actual policy definition
            cursor.execute("""
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies
            WHERE tablename = 'rls_test_table'
            """)
            for policy in cursor.fetchall():
                policy_name, cmd, qual, with_check = policy
                logger.info(f"Policy: {policy_name}, Cmd: {cmd}")
                logger.info(f"  Using: {qual}")
                logger.info(f"  With check: {with_check if with_check else 'None'}")
            
            # Test the policy with different tenants
            logger.info("\nPerforming isolation tests:")
            
            # First as admin (unset)
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            unset_count = cursor.fetchone()[0]
            logger.info(f"Admin (unset) sees {unset_count} rows")
            
            # Test with tenant1
            cursor.execute("SELECT set_tenant_context('tenant1')")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            tenant1_count = cursor.fetchone()[0]
            logger.info(f"Tenant1 sees {tenant1_count} rows (expected 2)")
            
            # Test with tenant2
            cursor.execute("SELECT set_tenant_context('tenant2')")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            tenant2_count = cursor.fetchone()[0]
            logger.info(f"Tenant2 sees {tenant2_count} rows (expected 1)")
            
            # Test with non-existent tenant
            cursor.execute("SELECT set_tenant_context('nonexistent')")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            nonexistent_count = cursor.fetchone()[0]
            logger.info(f"Nonexistent tenant sees {nonexistent_count} rows (expected 0)")
            
            # Test getting actual rows for tenant1
            cursor.execute("SELECT set_tenant_context('tenant1')")
            cursor.execute("SELECT id, tenant_id, value FROM rls_test_table")
            tenant1_rows = cursor.fetchall()
            logger.info(f"Tenant1 rows: {tenant1_rows}")
            
            # Reset context
            cursor.execute("SELECT clear_tenant_context()")
            
            return True
            
        except Exception as e:
            logger.error(f"Error testing RLS isolation: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

if __name__ == "__main__":
    print("\n=== RLS DIAGNOSTIC TEST ===\n")
    success = test_rls_isolation()
    
    if success:
        print("\nRLS diagnostic test completed. Check the logs for details.")
    else:
        print("\nRLS diagnostic test failed. Check the logs for errors.")
        sys.exit(1) 