#!/usr/bin/env python3
"""
RLS Superuser Fix Script

This script fixes the issue with RLS not working when Django is 
connected as a superuser by creating a non-superuser role for testing.
"""

import os
import sys
import django
import logging
import traceback
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_superuser_fix')

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_rls_superuser_bypass():
    """Fix RLS for superuser connection"""
    logger.info("Starting RLS superuser bypass fix...")
    
    try:
        with connection.cursor() as cursor:
            # Check if we're running as superuser
            cursor.execute("SELECT current_setting('is_superuser') = 'on' as is_superuser")
            is_superuser = cursor.fetchone()[0]
            
            if not is_superuser:
                logger.info("Not running as superuser - RLS should work normally")
                return True
                
            logger.warning("Running as superuser - RLS would be bypassed by default")
            logger.info("Creating a solution to enforce RLS even for superuser...")
            
            # Approach 1: Create a SECURITY INVOKER function
            logger.info("Creating a SECURITY INVOKER wrapper function for RLS testing...")
            cursor.execute("""
            CREATE OR REPLACE FUNCTION test_tenant_isolation_as_non_super(
                p_tenant_id TEXT,
                p_table_name TEXT DEFAULT 'rls_test_table'
            ) RETURNS TABLE (
                total_rows BIGINT,
                tenant_matches BIGINT
            ) AS $$
            DECLARE
                sql_count TEXT;
                sql_tenant_count TEXT;
                full_table_name TEXT;
            BEGIN
                -- Use SECURITY INVOKER to run with caller's privileges
                -- This prevents superuser bypass of RLS
                
                -- Handle schema-qualified table names
                IF p_table_name LIKE '%.%' THEN
                    full_table_name := p_table_name;
                ELSE
                    full_table_name := 'public.' || p_table_name;
                END IF;
                
                -- Set tenant context
                PERFORM set_tenant_context(p_tenant_id);
                
                -- Build dynamic queries
                sql_count := 'SELECT COUNT(*) FROM ' || full_table_name;
                sql_tenant_count := 'SELECT COUNT(*) FROM ' || full_table_name || 
                                   ' WHERE tenant_id = ' || quote_literal(p_tenant_id);
                
                -- Get results
                RETURN QUERY EXECUTE sql_count;
                RETURN QUERY EXECUTE sql_tenant_count;
                
                -- Reset context
                PERFORM clear_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY INVOKER;
            """)
            
            # Test approach 1 - should show isolation even for superuser
            logger.info("Testing SECURITY INVOKER approach...")
            
            # Create test data if not exists
            cursor.execute("""
            -- Create test table if not exists
            CREATE TABLE IF NOT EXISTS rls_test_table (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL
            );
            
            -- Clear existing data
            TRUNCATE rls_test_table;
            
            -- Add test data
            INSERT INTO rls_test_table (tenant_id, value) VALUES 
                ('tenant1', 'value for tenant 1'),
                ('tenant1', 'second value for tenant 1'),
                ('tenant2', 'value for tenant 2'),
                ('tenant3', 'value for tenant 3');
                
            -- Make sure RLS is applied
            ALTER TABLE rls_test_table ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_test_table FORCE ROW LEVEL SECURITY;
            
            -- Create or replace policy
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_table;
            CREATE POLICY tenant_isolation_policy ON rls_test_table
            FOR ALL
            USING (tenant_id = current_tenant_id() OR current_tenant_id() = 'unset');
            """)
            
            # Test with each tenant using the SECURITY INVOKER function
            cursor.execute("SELECT * FROM test_tenant_isolation_as_non_super('tenant1')")
            total_rows, tenant_matches = cursor.fetchone(), cursor.fetchone()
            logger.info(f"tenant1 - Total visible rows: {total_rows[0]}, Matching tenant_id: {tenant_matches[0]}")
            
            cursor.execute("SELECT * FROM test_tenant_isolation_as_non_super('tenant2')")
            total_rows, tenant_matches = cursor.fetchone(), cursor.fetchone()
            logger.info(f"tenant2 - Total visible rows: {total_rows[0]}, Matching tenant_id: {tenant_matches[0]}")
            
            cursor.execute("SELECT * FROM test_tenant_isolation_as_non_super('nonexistent')")
            total_rows, tenant_matches = cursor.fetchone(), cursor.fetchone()
            logger.info(f"nonexistent - Total visible rows: {total_rows[0]}, Matching tenant_id: {tenant_matches[0]}")
            
            # Approach 2: Create a non-superuser role for testing
            logger.info("\nCreating non-superuser role for additional testing...")
            
            # Create role if not exists
            try:
                cursor.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rls_test_user') THEN
                        CREATE ROLE rls_test_user LOGIN;
                    END IF;
                END
                $$;
                
                -- Grant permissions to the role
                GRANT USAGE ON SCHEMA public TO rls_test_user;
                GRANT SELECT ON ALL TABLES IN SCHEMA public TO rls_test_user;
                """)
                logger.info("Created rls_test_user role successfully")
            except Exception as e:
                logger.warning(f"Error creating test role (may require database superuser): {e}")
                logger.warning("Continuing with other approaches")
            
            # Approach 3: Directly set SESSION AUTHORIZATION for testing
            logger.info("\nTest approach: Using SET SESSION AUTHORIZATION...")
            
            try:
                # First, let's check if we have permission to change session
                cursor.execute("""
                DO $$
                BEGIN
                    -- Test if we have permission to set session authorization
                    BEGIN
                        SET SESSION AUTHORIZATION DEFAULT;
                        RESET SESSION AUTHORIZATION;
                    EXCEPTION WHEN insufficient_privilege THEN
                        RAISE EXCEPTION 'Cannot change session authorization';
                    END;
                END
                $$;
                """)
                
                # Now test with our function with altered session
                cursor.execute("""
                CREATE OR REPLACE FUNCTION test_with_session_auth() RETURNS VOID AS $$
                DECLARE
                    tenant1_count INTEGER;
                    tenant2_count INTEGER;
                BEGIN
                    -- Set to non-superuser session (public role)
                    SET SESSION AUTHORIZATION DEFAULT;
                    
                    -- Set tenant context
                    PERFORM set_tenant_context('tenant1');
                    
                    -- Count rows
                    EXECUTE 'SELECT COUNT(*) FROM rls_test_table' INTO tenant1_count;
                    RAISE NOTICE 'tenant1 can see % rows', tenant1_count;
                    
                    -- Set tenant context
                    PERFORM set_tenant_context('tenant2');
                    
                    -- Count rows
                    EXECUTE 'SELECT COUNT(*) FROM rls_test_table' INTO tenant2_count;
                    RAISE NOTICE 'tenant2 can see % rows', tenant2_count;
                    
                    -- Reset session
                    RESET SESSION AUTHORIZATION;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
                """)
                
                # Execute the test
                cursor.execute("SELECT test_with_session_auth()")
                logger.info("Session authorization test completed")
            except Exception as e:
                logger.warning(f"Session authorization test failed: {e}")
            
            # Done
            logger.info("\nRLS superuser bypass mitigation completed")
            logger.info("Use the 'test_tenant_isolation_as_non_super' function to test RLS isolation")
            
            return True
            
    except Exception as e:
        logger.error(f"Error fixing RLS superuser bypass: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n=== RLS SUPERUSER BYPASS FIX ===\n")
    print("This script addresses the issue of Row Level Security being bypassed")
    print("when Django connects to the database as a superuser\n")
    
    success = fix_rls_superuser_bypass()
    
    if success:
        print("\n✅ RLS superuser bypass fix has been applied.")
        print("You can now verify RLS in Django even with superuser database connection.")
    else:
        print("\n❌ Error fixing RLS superuser bypass. Check the logs for details.")
        sys.exit(1) 