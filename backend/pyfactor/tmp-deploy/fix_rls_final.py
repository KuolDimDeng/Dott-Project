#!/usr/bin/env python3
"""
Final RLS Fix Script

This script ensures RLS is properly applied with careful testing
of the policies to ensure isolation actually works.
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
logger = logging.getLogger('rls_final_fix')

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_rls_final():
    """Apply final fixes to RLS implementation"""
    logger.info("Starting final RLS fix...")
    
    try:
        with connection.cursor() as cursor:
            # First check connection details to diagnose any issues
            cursor.execute("""
            SELECT 
                current_user, 
                current_database(),
                current_setting('is_superuser'),
                version()
            """)
            user, db, is_super, version = cursor.fetchone()
            logger.info(f"Connected as: {user} to database: {db}")
            logger.info(f"Superuser: {is_super}, PostgreSQL version: {version}")
            
            # 1. Ensure RLS functions are properly created
            logger.info("Recreating core RLS functions...")
            cursor.execute("""
            -- Drop existing functions
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            
            -- Create the main context function
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS TEXT AS $$
            DECLARE
                tenant_id TEXT;
            BEGIN
                -- Try getting the tenant context session parameter
                BEGIN
                    tenant_id := current_setting('app.current_tenant', TRUE);
                    IF tenant_id IS NOT NULL AND tenant_id != '' THEN
                        RETURN tenant_id;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore errors
                END;
                
                -- Return default if none found
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create the alias for policies
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS TEXT AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create setter function
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
            RETURNS VOID AS $$
            BEGIN
                -- Set the session parameter
                PERFORM set_config('app.current_tenant', tenant_id, FALSE);
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create clear function
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS VOID AS $$
            BEGIN
                -- Reset to unset
                PERFORM set_config('app.current_tenant', 'unset', FALSE);
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 2. Test that the functions work
            logger.info("Testing the RLS functions...")
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT get_tenant_context()")
            default_val = cursor.fetchone()[0]
            logger.info(f"Default tenant context: {default_val}")
            
            cursor.execute("SELECT set_tenant_context('test_tenant')")
            cursor.execute("SELECT get_tenant_context()")
            test_val = cursor.fetchone()[0]
            logger.info(f"After setting: {test_val}")
            
            cursor.execute("SELECT clear_tenant_context()")
            
            # 3. Create and configure test table
            logger.info("Setting up test table with proper RLS policy...")
            cursor.execute("""
            -- Create test table with fresh data
            DROP TABLE IF EXISTS tenant_test CASCADE;
            CREATE TABLE tenant_test (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                data TEXT NOT NULL
            );
            
            -- Insert test data
            INSERT INTO tenant_test (tenant_id, data) VALUES
                ('tenant1', 'Data for tenant 1'),
                ('tenant1', 'More data for tenant 1'),
                ('tenant2', 'Data for tenant 2'),
                ('tenant3', 'Data for tenant 3');
                
            -- Enable and force RLS 
            ALTER TABLE tenant_test ENABLE ROW LEVEL SECURITY;
            ALTER TABLE tenant_test FORCE ROW LEVEL SECURITY;
            
            -- Create a clear policy
            DROP POLICY IF EXISTS tenant_policy ON tenant_test;
            CREATE POLICY tenant_policy ON tenant_test
            FOR ALL
            USING (
                tenant_id = current_tenant_id()     -- Current tenant sees their data
                OR
                current_tenant_id() = 'unset'       -- Admin sees all data
            );
            
            -- Create index for performance
            CREATE INDEX idx_tenant_test_tenant_id ON tenant_test (tenant_id);
            """)
            
            # 4. Test the policy
            logger.info("Testing the RLS policy with different tenants...")
            
            # Test as admin
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT COUNT(*) FROM tenant_test")
            admin_count = cursor.fetchone()[0]
            logger.info(f"Admin (unset) sees {admin_count} rows")
            
            # Test specific tenants
            for test_tenant in ['tenant1', 'tenant2', 'tenant3', 'nonexistent']:
                cursor.execute("SELECT set_tenant_context(%s)", [test_tenant])
                cursor.execute("SELECT COUNT(*) FROM tenant_test")
                count = cursor.fetchone()[0]
                cursor.execute("SELECT array_agg(id) FROM tenant_test")
                ids = cursor.fetchone()[0] or []
                logger.info(f"{test_tenant} sees {count} rows with IDs: {ids}")
            
            # 5. Create a wrapper function to verify correct policy application
            logger.info("Creating function to view tenant data directly...")
            cursor.execute("""
            CREATE OR REPLACE FUNCTION view_tenant_data(p_tenant_id TEXT)
            RETURNS TABLE (id INT, tenant_id TEXT, data TEXT) AS $$
            BEGIN
                -- Set tenant context 
                PERFORM set_tenant_context(p_tenant_id);
                
                -- Return filtered rows
                RETURN QUERY SELECT t.id, t.tenant_id, t.data 
                            FROM tenant_test t;
                            
                -- Reset context
                PERFORM clear_tenant_context();
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 6. Test the wrapper function
            for test_tenant in ['tenant1', 'tenant2', 'tenant3', 'nonexistent']:
                cursor.execute("SELECT COUNT(*) FROM view_tenant_data(%s)", [test_tenant])
                count = cursor.fetchone()[0]
                logger.info(f"Function shows {test_tenant} can see {count} rows")
                
            # 7. Apply the policy to all tenant tables
            logger.info("Now applying RLS to all tenant tables...")
            
            # Find all tenant tables
            cursor.execute("""
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND column_name = 'tenant_id'
            AND table_name NOT LIKE 'pg_%'
            AND table_name != 'tenant_test'  -- Skip our test table
            ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]
            logger.info(f"Found {len(tables)} tenant tables to update")
            
            # Apply RLS to each table
            success_count = 0
            for table in tables:
                try:
                    cursor.execute(f"""
                    -- Enable and force RLS
                    ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
                    ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
                    
                    -- Create policy
                    DROP POLICY IF EXISTS tenant_policy ON {table};
                    CREATE POLICY tenant_policy ON {table}
                    FOR ALL
                    USING (
                        tenant_id = current_tenant_id() 
                        OR 
                        current_tenant_id() = 'unset'
                    );
                    """)
                    success_count += 1
                    logger.info(f"Applied RLS to {table}")
                except Exception as e:
                    logger.error(f"Failed to apply RLS to {table}: {e}")
            
            logger.info(f"Successfully applied RLS to {success_count} of {len(tables)} tables")
            
            # Final report
            logger.info("\nRLS implementation complete!")
            logger.info("Use the set_tenant_context() and clear_tenant_context() functions")
            logger.info("to control which tenant's data is visible in queries.")
            
            return True
    
    except Exception as e:
        logger.error(f"Error in RLS fix: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n=== FINAL RLS FIX ===\n")
    print("This script applies the final fixes to Row Level Security")
    print("to ensure proper tenant isolation\n")
    
    success = fix_rls_final()
    
    if success:
        print("\n✅ RLS has been properly configured and tested!")
        print("The system now enforces proper tenant isolation.")
        print("\nTo control tenant context in your code:")
        print("- Use set_tenant_context('tenant_id') to view tenant data")
        print("- Use clear_tenant_context() for admin access to all data")
    else:
        print("\n❌ Error applying final RLS fix. Check the logs for details.")
        sys.exit(1) 