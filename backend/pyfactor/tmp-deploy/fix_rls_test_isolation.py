#!/usr/bin/env python3
"""
RLS Test Isolation Fix Script

This script specifically fixes the RLS policies on test tables to ensure
proper tenant isolation for testing purposes.
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
logger = logging.getLogger('rls_test_isolation_fix')

# Set up Django environment
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def recreate_tenant_context_functions():
    """Recreate the tenant context functions with strong isolation"""
    try:
        with connection.cursor() as cursor:
            # Drop existing functions
            cursor.execute("""
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            
            -- Create tenant context functions
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS text AS $$
            DECLARE
                tenant_id text;
            BEGIN
                -- Try to get the variable from session settings
                BEGIN
                    tenant_id := current_setting('app.current_tenant', true);
                    RETURN tenant_id;
                EXCEPTION WHEN OTHERS THEN
                    RETURN 'unset';
                END;
            END;
            $$ LANGUAGE plpgsql STRICT SECURITY DEFINER;
            
            -- Create policy alias
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql STRICT SECURITY DEFINER;
            
            -- Create setter
            CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id text)
            RETURNS void AS $$
            BEGIN
                -- Set the variable for this transaction/session
                PERFORM set_config('app.current_tenant', p_tenant_id, false);
            END;
            $$ LANGUAGE plpgsql STRICT SECURITY DEFINER;
            
            -- Create reset
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS void AS $$
            BEGIN
                -- Reset to unset
                PERFORM set_config('app.current_tenant', 'unset', false);
            END;
            $$ LANGUAGE plpgsql STRICT SECURITY DEFINER;
            """)
            logger.info("✅ Recreated tenant context functions")
            
            # Test the functions
            cursor.execute("SELECT clear_tenant_context(); SELECT get_tenant_context();")
            default_val = cursor.fetchone()[0]
            logger.info(f"Default tenant context: {default_val}")
            
            cursor.execute("SELECT set_tenant_context('test_tenant'); SELECT get_tenant_context();")
            test_val = cursor.fetchone()[0]
            logger.info(f"Test tenant context: {test_val}")
            
            cursor.execute("SELECT clear_tenant_context();")
            
            return True
    except Exception as e:
        logger.error(f"❌ Error recreating tenant context functions: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_test_tables():
    """Fix the RLS test tables with strict policies"""
    try:
        with connection.cursor() as cursor:
            # Drop existing test tables
            cursor.execute("""
            DROP TABLE IF EXISTS rls_test_check CASCADE;
            DROP TABLE IF EXISTS rls_test CASCADE;
            """)
            logger.info("Dropped existing test tables")
            
            # Create the test table with proper structure
            cursor.execute("""
            -- Create the primary test table
            CREATE TABLE rls_test_check (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create index for better performance
            CREATE INDEX idx_rls_test_check_tenant_id ON rls_test_check(tenant_id);
            
            -- Enable RLS
            ALTER TABLE rls_test_check ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_test_check FORCE ROW LEVEL SECURITY;
            
            -- Create very explicit policy
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_check;
            CREATE POLICY tenant_isolation_policy ON rls_test_check
                FOR ALL
                USING (
                    (tenant_id = current_tenant_id() AND current_tenant_id() != 'unset')
                    OR
                    current_tenant_id() = 'unset'
                );
                
            -- Insert test data
            INSERT INTO rls_test_check (tenant_id, value) VALUES 
                ('tenant1', 'Data for tenant 1'),
                ('tenant1', 'More data for tenant 1'),
                ('tenant2', 'Data for tenant 2'),
                ('tenant3', 'Data for tenant 3');
            """)
            logger.info("✅ Created test table with RLS policy")
            
            # Verify the table exists and has data
            cursor.execute("SELECT COUNT(*) FROM rls_test_check")
            count = cursor.fetchone()[0]
            logger.info(f"Test table has {count} rows")
            
            # Verify RLS is enabled
            cursor.execute("""
            SELECT relrowsecurity FROM pg_class WHERE relname = 'rls_test_check'
            """)
            has_rls = cursor.fetchone()[0]
            logger.info(f"RLS enabled on test table: {has_rls}")
            
            # Verify RLS policies
            cursor.execute("""
            SELECT polname FROM pg_policy WHERE polrelid = 'rls_test_check'::regclass
            """)
            policies = cursor.fetchall()
            logger.info(f"Policies on test table: {[p[0] for p in policies]}")
            
            return True
    except Exception as e:
        logger.error(f"❌ Error fixing test tables: {e}")
        logger.error(traceback.format_exc())
        return False

def test_isolation_direct():
    """Test tenant isolation with explicit SQL functions"""
    try:
        with connection.cursor() as cursor:
            # Create a test function that will test isolation
            cursor.execute("""
            CREATE OR REPLACE FUNCTION test_tenant_isolation()
            RETURNS TABLE (
                context_name TEXT,
                row_count INT
            ) AS $$
            DECLARE
                admin_count INT;
                tenant1_count INT;
                tenant2_count INT;
                tenant3_count INT;
                nonexistent_count INT;
            BEGIN
                -- Reset context to start clean
                PERFORM clear_tenant_context();
                
                -- Test admin (unset) context
                SELECT COUNT(*) INTO admin_count FROM rls_test_check;
                RETURN QUERY SELECT 'admin'::TEXT, admin_count;
                
                -- Test tenant1 context
                PERFORM set_tenant_context('tenant1');
                SELECT COUNT(*) INTO tenant1_count FROM rls_test_check;
                RETURN QUERY SELECT 'tenant1'::TEXT, tenant1_count;
                
                -- Test tenant2 context
                PERFORM set_tenant_context('tenant2');
                SELECT COUNT(*) INTO tenant2_count FROM rls_test_check;
                RETURN QUERY SELECT 'tenant2'::TEXT, tenant2_count;
                
                -- Test tenant3 context
                PERFORM set_tenant_context('tenant3');
                SELECT COUNT(*) INTO tenant3_count FROM rls_test_check;
                RETURN QUERY SELECT 'tenant3'::TEXT, tenant3_count;
                
                -- Test nonexistent tenant context
                PERFORM set_tenant_context('nonexistent');
                SELECT COUNT(*) INTO nonexistent_count FROM rls_test_check;
                RETURN QUERY SELECT 'nonexistent'::TEXT, nonexistent_count;
                
                -- Reset context
                PERFORM clear_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # Run the test function
            cursor.execute("SELECT * FROM test_tenant_isolation();")
            results = cursor.fetchall()
            
            # Create a dictionary of the results
            result_dict = {row[0]: row[1] for row in results}
            logger.info(f"Isolation test results: {result_dict}")
            
            # Check if isolation is working as expected
            expected = {
                'admin': 4,
                'tenant1': 2,
                'tenant2': 1,
                'tenant3': 1,
                'nonexistent': 0
            }
            
            if result_dict == expected:
                logger.info("✅ Tenant isolation is working correctly")
                return True
            else:
                logger.error("❌ Tenant isolation is not working correctly")
                logger.error(f"Expected: {expected}")
                logger.error(f"Actual: {result_dict}")
                
                # Try to fix it with a different approach
                logger.info("Attempting to fix with a different approach...")
                return fix_with_different_approach()
    except Exception as e:
        logger.error(f"❌ Error testing isolation: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_with_different_approach():
    """Try a different approach to fix RLS isolation"""
    try:
        with connection.cursor() as cursor:
            # Use a separate schema for testing
            cursor.execute("""
            -- Create a test schema
            CREATE SCHEMA IF NOT EXISTS rls_test_schema;
            
            -- Drop existing tables if any
            DROP TABLE IF EXISTS rls_test_schema.test_table CASCADE;
            
            -- Create a test table in the schema
            CREATE TABLE rls_test_schema.test_table (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL
            );
            
            -- Insert test data
            INSERT INTO rls_test_schema.test_table (tenant_id, value) VALUES
                ('tenant1', 'Value for tenant 1'),
                ('tenant1', 'Another value for tenant 1'),
                ('tenant2', 'Value for tenant 2'),
                ('tenant3', 'Value for tenant 3');
                
            -- Enable RLS
            ALTER TABLE rls_test_schema.test_table ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_test_schema.test_table FORCE ROW LEVEL SECURITY;
            
            -- Create policy with explicit check
            CREATE POLICY isolation_policy ON rls_test_schema.test_table
                FOR ALL
                USING (
                    tenant_id = current_tenant_id() OR current_tenant_id() = 'unset'
                );
                
            -- Create function to test isolation in a transaction
            CREATE OR REPLACE FUNCTION rls_test_schema.test_isolation() 
            RETURNS BOOLEAN AS $$
            DECLARE
                admin_count INT;
                tenant1_count INT;
                tenant2_count INT;
                tenant3_count INT;
                nonexistent_count INT;
                all_ok BOOLEAN := FALSE;
            BEGIN
                -- Admin test
                PERFORM clear_tenant_context();
                SELECT COUNT(*) INTO admin_count FROM rls_test_schema.test_table;
                
                -- Tenant1 test
                PERFORM set_tenant_context('tenant1');
                SELECT COUNT(*) INTO tenant1_count FROM rls_test_schema.test_table;
                
                -- Tenant2 test
                PERFORM set_tenant_context('tenant2');
                SELECT COUNT(*) INTO tenant2_count FROM rls_test_schema.test_table;
                
                -- Tenant3 test
                PERFORM set_tenant_context('tenant3');
                SELECT COUNT(*) INTO tenant3_count FROM rls_test_schema.test_table;
                
                -- Nonexistent tenant test
                PERFORM set_tenant_context('nonexistent');
                SELECT COUNT(*) INTO nonexistent_count FROM rls_test_schema.test_table;
                
                -- Reset context
                PERFORM clear_tenant_context();
                
                -- Verify the results
                all_ok := (
                    admin_count = 4 AND
                    tenant1_count = 2 AND
                    tenant2_count = 1 AND
                    tenant3_count = 1 AND
                    nonexistent_count = 0
                );
                
                -- Return result
                RETURN all_ok;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # Run the test function
            cursor.execute("SELECT rls_test_schema.test_isolation();")
            result = cursor.fetchone()[0]
            
            if result:
                logger.info("✅ RLS isolation is working with alternative approach")
                
                # Set up the test tables again with lessons learned
                cursor.execute("""
                -- Recreate the main test table
                DROP TABLE IF EXISTS rls_test_check CASCADE;
                
                CREATE TABLE rls_test_check (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    value TEXT NOT NULL
                );
                
                -- Insert test data
                INSERT INTO rls_test_check (tenant_id, value) VALUES
                    ('tenant1', 'Value for tenant 1'),
                    ('tenant1', 'Another value for tenant 1'),
                    ('tenant2', 'Value for tenant 2'),
                    ('tenant3', 'Value for tenant 3');
                    
                -- Enable RLS
                ALTER TABLE rls_test_check ENABLE ROW LEVEL SECURITY;
                ALTER TABLE rls_test_check FORCE ROW LEVEL SECURITY;
                
                -- Create modified policy
                CREATE POLICY tenant_isolation_policy ON rls_test_check
                    FOR ALL
                    USING (
                        CASE 
                            WHEN current_tenant_id() = 'unset' THEN TRUE
                            ELSE tenant_id = current_tenant_id()
                        END
                    );
                """)
                
                # Test if our fix worked
                cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM rls_test_check WHERE clear_tenant_context() IS NULL) as admin_count,
                    (SELECT COUNT(*) FROM rls_test_check WHERE set_tenant_context('tenant1') IS NULL) as tenant1_count,
                    (SELECT COUNT(*) FROM rls_test_check WHERE set_tenant_context('tenant2') IS NULL) as tenant2_count,
                    (SELECT COUNT(*) FROM rls_test_check WHERE set_tenant_context('tenant3') IS NULL) as tenant3_count,
                    (SELECT COUNT(*) FROM rls_test_check WHERE set_tenant_context('nonexistent') IS NULL) as nonexistent_count
                """)
                counts = cursor.fetchone()
                admin_count, tenant1_count, tenant2_count, tenant3_count, nonexistent_count = counts
                
                logger.info(f"Final test counts: admin={admin_count}, tenant1={tenant1_count}, tenant2={tenant2_count}, tenant3={tenant3_count}, nonexistent={nonexistent_count}")
                
                return (admin_count == 4 and tenant1_count == 2 and tenant2_count == 1 and 
                        tenant3_count == 1 and nonexistent_count == 0)
            else:
                logger.error("❌ Alternative approach also failed")
                return False
    except Exception as e:
        logger.error(f"❌ Error with alternative approach: {e}")
        logger.error(traceback.format_exc())
        return False

def create_test_view():
    """Create a view to help with RLS testing"""
    try:
        with connection.cursor() as cursor:
            # Create a view that shows isolation status
            cursor.execute("""
            CREATE OR REPLACE VIEW rls_isolation_status AS
            SELECT
                t.table_name,
                t.table_schema,
                (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'tenant_id') > 0 AS has_tenant_id,
                (SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t.table_name AND rowsecurity = true)) AS has_rls_enabled,
                (SELECT COUNT(*) FROM pg_policy WHERE polrelid = (t.table_schema || '.' || t.table_name)::regclass) > 0 AS has_policy,
                (SELECT string_agg(polname, ', ') FROM pg_policy WHERE polrelid = (t.table_schema || '.' || t.table_name)::regclass) AS policy_names
            FROM information_schema.tables t
            WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            AND t.table_type = 'BASE TABLE'
            AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'tenant_id') > 0
            ORDER BY t.table_schema, t.table_name;
            """)
            logger.info("✅ Created RLS isolation status view")
            return True
    except Exception as e:
        logger.error(f"❌ Error creating test view: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_test_isolation():
    """Main function to fix RLS test isolation"""
    logger.info("Starting RLS test isolation fix...")
    
    # Step 1: Recreate tenant context functions
    if not recreate_tenant_context_functions():
        return False
    
    # Step 2: Fix test tables with RLS policies
    if not fix_test_tables():
        return False
    
    # Step 3: Test isolation
    if not test_isolation_direct():
        return False
    
    # Step 4: Create helper view for status
    if not create_test_view():
        return False
    
    logger.info("✅ RLS test isolation fixed successfully")
    return True

if __name__ == "__main__":
    print("\n=== RLS TEST ISOLATION FIX ===\n")
    print("This script fixes the RLS policies on test tables to ensure proper tenant isolation.\n")
    
    success = fix_rls_test_isolation()
    
    if success:
        print("\n✅ RLS test isolation has been fixed successfully!")
        print("The test tables now properly enforce tenant boundaries.")
    else:
        print("\n❌ Error fixing RLS test isolation. Check the logs for details.")
        sys.exit(1) 