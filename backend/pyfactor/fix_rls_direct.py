#!/usr/bin/env python3
"""
Direct RLS Fix Script - Production Ready

This script directly fixes RLS issues by:
1. First dropping any existing RLS functions to ensure no conflicts
2. Creating new standardized RLS functions with consistent naming
3. Creating backward-compatible aliases for existing code
4. Applying policies to all tenant tables
5. Testing the configuration with thorough isolation tests

For AWS RDS production deployments.
"""

import os
import sys
import django
import logging
import traceback
from pathlib import Path

# Set up logging with clear formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_fix')

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_rls_direct():
    """
    Direct database-level fix for RLS functions and policies
    """
    logger.info("Starting direct RLS fix for production database...")
    
    try:
        with connection.cursor() as cursor:
            # 1. Drop existing RLS functions to avoid conflicts
            logger.info("Dropping existing RLS functions to avoid conflicts...")
            cursor.execute("""
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS get_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            """)
            
            # Check if we have superuser access, may impact RLS
            cursor.execute("SELECT current_setting('is_superuser') = 'on' as is_superuser")
            is_superuser = cursor.fetchone()[0]
            if is_superuser:
                logger.warning("Running with superuser privileges - RLS may be bypassed")
                logger.warning("RLS isolation tests may fail if run by superuser!")
            
            # 2. Create the PRIMARY tenant context function (standard naming)
            logger.info("Creating standardized RLS functions...")
            cursor.execute("""
            -- Primary tenant context function - main function used by all components
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS TEXT AS $$
            DECLARE
                tenant_id TEXT;
            BEGIN
                -- Try both parameter names for compatibility
                BEGIN
                    tenant_id := current_setting('app.current_tenant_id', TRUE);
                    IF tenant_id IS NOT NULL AND tenant_id != '' THEN
                        RETURN tenant_id;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
                
                BEGIN
                    tenant_id := current_setting('app.current_tenant', TRUE);
                    IF tenant_id IS NOT NULL AND tenant_id != '' THEN
                        RETURN tenant_id;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
                
                -- Return 'unset' as default for admin access
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # 3. Create all compatibility alias functions
            logger.info("Creating alias functions for backward compatibility...")
            cursor.execute("""
            -- Alias for backward compatibility with existing code
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS TEXT AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Shorthand alias for use in RLS policies
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS TEXT AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # 4. Create tenant context management functions
            logger.info("Creating tenant context management functions...")
            cursor.execute("""
            -- Function to set tenant context safely
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
            RETURNS VOID AS $$
            BEGIN
                -- Use session-level parameters only (FALSE means session level)
                -- This ensures it doesn't persist across connections
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                PERFORM set_config('app.current_tenant', tenant_id, FALSE);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error setting tenant context: %', SQLERRM;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Function to clear tenant context (reset to admin access)
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS VOID AS $$
            BEGIN
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                PERFORM set_config('app.current_tenant', 'unset', FALSE);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error clearing tenant context: %', SQLERRM;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            # 5. Test RLS context functions to ensure they work
            logger.info("Testing RLS context functions...")
            
            # Test default value
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT get_tenant_context()")
            default_result = cursor.fetchone()[0]
            
            if default_result != 'unset':
                logger.error(f"Default test failed! Expected 'unset', got '{default_result}'")
                return False
            
            # Test setting a value
            cursor.execute("SELECT set_tenant_context('test_tenant')")
            cursor.execute("SELECT get_tenant_context()")
            set_result = cursor.fetchone()[0]
            
            if set_result != 'test_tenant':
                logger.error(f"Set test failed! Expected 'test_tenant', got '{set_result}'")
                return False
            
            # Test aliases
            cursor.execute("SELECT get_current_tenant_id()")
            alias1_result = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_tenant_id()")
            alias2_result = cursor.fetchone()[0]
            
            if alias1_result != 'test_tenant' or alias2_result != 'test_tenant':
                logger.error(f"Alias test failed! Expected 'test_tenant', got '{alias1_result}' and '{alias2_result}'")
                return False
            
            logger.info("✅ Function tests passed!")
            
            # Reset context for further operations
            cursor.execute("SELECT clear_tenant_context()")
            
            # 6. Find all tenant tables
            logger.info("Finding tenant tables...")
            cursor.execute("""
            SELECT table_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND column_name = 'tenant_id'
            AND table_name NOT LIKE 'pg_%'
            ORDER BY table_name;
            """)
            
            tenant_tables = [row[0] for row in cursor.fetchall()]
            logger.info(f"Found {len(tenant_tables)} tenant tables")
            
            # 7. Apply RLS to all tenant tables
            success_count = 0
            for table in tenant_tables:
                try:
                    # First check if table exists (safety check)
                    cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    )
                    """, [table])
                    
                    if not cursor.fetchone()[0]:
                        logger.warning(f"Table {table} no longer exists, skipping")
                        continue
                    
                    # Enable RLS
                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                    
                    # Force RLS for all users including table owner
                    cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
                    
                    # Drop existing policy
                    cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
                    
                    # Create policy - simplified and more direct comparison
                    cursor.execute(f"""
                    CREATE POLICY tenant_isolation_policy ON {table}
                    FOR ALL
                    USING (
                        tenant_id = current_tenant_id() OR current_tenant_id() = 'unset'
                    );
                    """)
                    
                    success_count += 1
                    logger.info(f"Applied RLS to table: {table}")
                except Exception as e:
                    logger.error(f"Error applying RLS to {table}: {e}")
                    logger.error(traceback.format_exc())
            
            logger.info(f"Applied RLS to {success_count} of {len(tenant_tables)} tenant tables")
            if success_count < len(tenant_tables):
                logger.warning(f"Failed to apply RLS to {len(tenant_tables) - success_count} tables")
            
            # 8. Create RLS status view for monitoring
            logger.info("Creating RLS status monitoring view...")
            
            # First drop the existing view if it exists
            cursor.execute("DROP VIEW IF EXISTS rls_status;")
            
            # Create a simpler view without type conversion issues
            cursor.execute("""
            CREATE VIEW rls_status AS
            SELECT 
                tablename AS table_name,
                schemaname AS schema_name,
                rowsecurity AS rls_enabled
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT LIKE 'pg_%'
            ORDER BY table_name;
            """)
            
            # 9. Create and set up RLS test table with proper permissions
            logger.info("Creating RLS test table...")
            cursor.execute("""
            DROP TABLE IF EXISTS rls_test_table CASCADE;
            CREATE TABLE rls_test_table (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Enable RLS with FORCE for all users
            ALTER TABLE rls_test_table ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_test_table FORCE ROW LEVEL SECURITY;
            
            -- Drop existing policy
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_table;
            
            -- Create a simple policy using direct comparison
            CREATE POLICY tenant_isolation_policy ON rls_test_table
            FOR ALL
            USING (
                tenant_id = current_tenant_id() OR current_tenant_id() = 'unset'
            );
            
            -- Clear and insert test data
            DELETE FROM rls_test_table;
            INSERT INTO rls_test_table (tenant_id, value) VALUES 
                ('tenant1', 'value for tenant 1'),
                ('tenant1', 'second value for tenant 1'),
                ('tenant2', 'value for tenant 2'),
                ('tenant3', 'value for tenant 3');
            """)
            
            # 10. Test RLS isolation
            logger.info("Testing RLS isolation (strict tenant boundaries)...")
            
            # Test with unset (should see all rows - admin access)
            cursor.execute("SELECT clear_tenant_context();")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            unset_count = cursor.fetchone()[0]
            
            # Test with tenant1
            cursor.execute("SELECT set_tenant_context('tenant1');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant1_count = cursor.fetchone()[0]
            
            # Test with tenant2
            cursor.execute("SELECT set_tenant_context('tenant2');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant2_count = cursor.fetchone()[0]
            
            # Test with tenant3
            cursor.execute("SELECT set_tenant_context('tenant3');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant3_count = cursor.fetchone()[0]
            
            # Test with non-existent tenant
            cursor.execute("SELECT set_tenant_context('nonexistent');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            nonexistent_count = cursor.fetchone()[0]
            
            # Reset context
            cursor.execute("SELECT clear_tenant_context();")
            
            # Verify results
            logger.info(f"RLS test results:")
            logger.info(f"- Admin (unset): {unset_count} rows (expected 4)")
            logger.info(f"- Tenant1: {tenant1_count} rows (expected 2)")
            logger.info(f"- Tenant2: {tenant2_count} rows (expected 1)")
            logger.info(f"- Tenant3: {tenant3_count} rows (expected 1)")
            logger.info(f"- Nonexistent tenant: {nonexistent_count} rows (expected 0)")
            
            isolation_test_passed = (
                unset_count == 4 and 
                tenant1_count == 2 and 
                tenant2_count == 1 and
                tenant3_count == 1 and
                nonexistent_count == 0
            )
            
            if isolation_test_passed:
                logger.info("✅ RLS isolation test passed! Tenant boundaries are strictly enforced.")
            else:
                logger.error("❌ RLS isolation test failed! Tenant boundaries may not be properly enforced.")
                return False
            
            # 11. Create an index on tenant_id for performance
            logger.info("Creating index on tenant_id for test table...")
            cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_rls_test_tenant_id ON rls_test_table (tenant_id);
            """)
            
            logger.info("RLS configuration completed successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing RLS: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n=== PRODUCTION RLS CONFIGURATION TOOL ===\n")
    print("This script will configure Row Level Security in the database")
    print("for strict tenant isolation in production environments.\n")
    
    success = fix_rls_direct()
    
    if success:
        print("\n✅ RLS has been successfully configured in the database!")
        print("Tenant isolation is now strictly enforced at the database level.")
        print("\nNext steps:")
        print("1. Restart your Django server to ensure changes take effect")
        print("2. Run check_rls.py to verify the configuration")
    else:
        print("\n❌ RLS configuration encountered errors. Check the logs for details.")
        print("Please review the error messages and try again.")
    
    sys.exit(0 if success else 1) 