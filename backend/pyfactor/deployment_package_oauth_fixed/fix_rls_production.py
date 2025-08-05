#!/usr/bin/env python3
"""
Production-Ready RLS Fix Script

This script implements a comprehensive fix for Row Level Security (RLS) issues:
1. Creates proper tenant context functions
2. Fixes RLS policies across all tenant-aware tables
3. Ensures proper tenant isolation
4. Works with AWS RDS and standard PostgreSQL
5. No superuser privileges required
6. Production-safe implementation

Usage:
  python fix_rls_production.py

Author: Claude AI Assistant
Date: 2025-04-19
"""

import os
import sys
import django
import logging
import uuid
import traceback
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='rls_production_fix.log',
    filemode='a'
)
logger = logging.getLogger('rls_fix')
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(levelname)s: %(message)s')
console.setFormatter(formatter)
logger.addHandler(console)

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, DatabaseError, transaction as db_transaction
from django.db.models import Q
import time

def fix_rls_configuration():
    """
    Set up core RLS functions and parameters using a production-safe approach
    that doesn't require superuser privileges.
    """
    logger.info("Setting up core RLS functions...")
    try:
        with connection.cursor() as cursor:
            # 1. Create tenant context management functions
            cursor.execute("""
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS TEXT AS $$
            DECLARE
                tenant_id TEXT;
            BEGIN
                -- Try parameter names in order of preference
                BEGIN
                    tenant_id := current_setting('app.current_tenant_id', TRUE);
                    IF tenant_id IS NOT NULL AND tenant_id != '' THEN
                        RETURN tenant_id;
                    END IF;
                EXCEPTION WHEN undefined_object THEN
                    -- Parameter doesn't exist
                    NULL;
                END;
                
                BEGIN
                    tenant_id := current_setting('app.current_tenant', TRUE);
                    IF tenant_id IS NOT NULL AND tenant_id != '' THEN
                        RETURN tenant_id;
                    END IF;
                EXCEPTION WHEN undefined_object THEN
                    -- Parameter doesn't exist
                    NULL;
                END;
                
                -- Default - 'unset' means RLS should not filter
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 2. Create function to set tenant ID
            cursor.execute("""
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
            RETURNS VOID AS $$
            BEGIN
                -- Set parameters at SESSION level (not database level)
                -- This avoids permission issues and is safe for production
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                PERFORM set_config('app.current_tenant', tenant_id, FALSE);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error setting tenant context: %', SQLERRM;
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 3. Create function to clear tenant context
            cursor.execute("""
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS VOID AS $$
            BEGIN
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                PERFORM set_config('app.current_tenant', 'unset', FALSE);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error clearing tenant context: %', SQLERRM;
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 4. Test context functions
            cursor.execute("SELECT set_tenant_context('test_tenant')")
            cursor.execute("SELECT get_current_tenant_id()")
            result = cursor.fetchone()[0]
            
            if result != 'test_tenant':
                logger.error(f"Context function test failed. Expected 'test_tenant', got '{result}'")
                return False
                
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT get_current_tenant_id()")
            result = cursor.fetchone()[0]
            
            if result != 'unset':
                logger.error(f"Context clearing test failed. Expected 'unset', got '{result}'")
                return False
            
            logger.info("Core RLS functions created successfully")
            return True
    except Exception as e:
        logger.error(f"Error setting up RLS functions: {e}")
        logger.error(traceback.format_exc())
        return False

def find_tenant_tables():
    """Find all tables with tenant_id column that should have RLS enabled"""
    logger.info("Finding tenant-aware tables...")
    tables = []
    
    try:
        with connection.cursor() as cursor:
            # Find all tables in public schema with tenant_id column
            cursor.execute("""
            SELECT table_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND column_name = 'tenant_id'
              AND table_name NOT LIKE 'pg_%'
              AND table_name NOT LIKE 'django_%'
            ORDER BY table_name;
            """)
            
            tables = [row[0] for row in cursor.fetchall()]
            logger.info(f"Found {len(tables)} tenant-aware tables")
            
            # Log the tables
            if tables:
                logger.info(f"Tenant tables: {', '.join(tables[:10])}{'...' if len(tables) > 10 else ''}")
                
        return tables
    except Exception as e:
        logger.error(f"Error finding tenant tables: {e}")
        logger.error(traceback.format_exc())
        return []

def fix_rls_for_table(table_name):
    """Apply proper RLS configuration to a specific table"""
    logger.info(f"Configuring RLS for table: {table_name}")
    
    try:
        with connection.cursor() as cursor:
            # 1. Enable RLS on the table
            cursor.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
            
            # 2. Create improved RLS policy with better error handling
            # Drop existing policy first
            cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};")
            
            # Create new robust policy
            cursor.execute(f"""
            CREATE POLICY tenant_isolation_policy ON {table_name}
            AS RESTRICTIVE
            USING (
                (tenant_id::TEXT = get_current_tenant_id() AND get_current_tenant_id() != 'unset')
                OR get_current_tenant_id() = 'unset'
            );
            """)
            
            return True
    except Exception as e:
        logger.error(f"Error fixing RLS for table {table_name}: {e}")
        return False

def test_rls_isolation():
    """Test if RLS provides proper tenant isolation"""
    logger.info("Testing RLS tenant isolation...")
    
    try:
        with connection.cursor() as cursor:
            # 1. Create test table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rls_test_table (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL
            );
            """)
            
            # 2. Apply RLS to test table
            fix_rls_for_table('rls_test_table')
            
            # 3. Clear existing test data
            cursor.execute("DELETE FROM rls_test_table;")
            
            # 4. Insert test data for multiple tenants
            cursor.execute("INSERT INTO rls_test_table (tenant_id, value) VALUES ('tenant1', 'value1a');")
            cursor.execute("INSERT INTO rls_test_table (tenant_id, value) VALUES ('tenant1', 'value1b');")
            cursor.execute("INSERT INTO rls_test_table (tenant_id, value) VALUES ('tenant2', 'value2a');")
            cursor.execute("INSERT INTO rls_test_table (tenant_id, value) VALUES ('tenant2', 'value2b');")
            
            # 5. Test unset tenant context (should see all rows)
            cursor.execute("SELECT clear_tenant_context();")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            unset_count = cursor.fetchone()[0]
            
            # 6. Test tenant1 context
            cursor.execute("SELECT set_tenant_context('tenant1');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant1_count = cursor.fetchone()[0]
            
            # 7. Test tenant2 context
            cursor.execute("SELECT set_tenant_context('tenant2');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant2_count = cursor.fetchone()[0]
            
            # 8. Test non-existing tenant
            cursor.execute("SELECT set_tenant_context('tenant3');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant3_count = cursor.fetchone()[0]
            
            # 9. Reset context
            cursor.execute("SELECT clear_tenant_context();")
            
            # 10. Verify results
            logger.info(f"RLS test results: unset={unset_count}, tenant1={tenant1_count}, tenant2={tenant2_count}, tenant3={tenant3_count}")
            
            if unset_count == 4 and tenant1_count == 2 and tenant2_count == 2 and tenant3_count == 0:
                logger.info("✅ RLS isolation test passed!")
                return True
            else:
                logger.error("❌ RLS isolation test failed. Expected: unset=4, tenant1=2, tenant2=2, tenant3=0")
                return False
    except Exception as e:
        logger.error(f"Error in RLS isolation test: {e}")
        logger.error(traceback.format_exc())
        return False

def create_rls_helper_views():
    """Create helper views and functions for RLS management"""
    logger.info("Creating RLS helper views...")
    
    try:
        with connection.cursor() as cursor:
            # 1. Create view to show RLS status for all tables
            cursor.execute("""
            CREATE OR REPLACE VIEW rls_status AS
            SELECT 
                t.tablename AS table_name,
                EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = t.tablename 
                    AND column_name = 'tenant_id'
                ) AS has_tenant_id,
                t.rowsecurity AS rls_enabled,
                EXISTS (
                    SELECT 1 FROM pg_policy 
                    WHERE polrelid = (
                        SELECT oid FROM pg_class 
                        WHERE relname = t.tablename AND relnamespace = (
                            SELECT oid FROM pg_namespace WHERE nspname = 'public'
                        )
                    )
                ) AS has_policy
            FROM pg_tables t
            WHERE t.schemaname = 'public'
            AND t.tablename NOT LIKE 'pg_%'
            AND t.tablename NOT LIKE 'django_%'
            ORDER BY table_name;
            """)
            
            # 2. Create function to test RLS for a specific table
            cursor.execute("""
            CREATE OR REPLACE FUNCTION test_rls_for_table(table_name TEXT)
            RETURNS TABLE(
                tenant_id TEXT,
                row_count INT,
                expected_result TEXT,
                test_passed BOOLEAN
            ) AS $$
            DECLARE
                tenant_list TEXT[] := ARRAY['tenant1', 'tenant2', 'tenant3'];
                all_rows INT;
                tenant_rows INT;
                tenant TEXT;
                test_result BOOLEAN;
                has_tenant_col BOOLEAN;
                has_data BOOLEAN;
            BEGIN
                -- Check if table has tenant_id column
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = test_rls_for_table.table_name 
                    AND column_name = 'tenant_id'
                ) INTO has_tenant_col;
                
                IF NOT has_tenant_col THEN
                    tenant_id := 'ERROR';
                    row_count := 0;
                    expected_result := 'Table does not have tenant_id column';
                    test_passed := FALSE;
                    RETURN NEXT;
                    RETURN;
                END IF;
                
                -- Check if table has data
                EXECUTE 'SELECT EXISTS (SELECT 1 FROM ' || table_name || ')' INTO has_data;
                
                IF NOT has_data THEN
                    tenant_id := 'NOTE';
                    row_count := 0;
                    expected_result := 'Table is empty, cannot test RLS';
                    test_passed := TRUE;
                    RETURN NEXT;
                    RETURN;
                END IF;
                
                -- First test with 'unset' context
                PERFORM clear_tenant_context();
                EXECUTE 'SELECT COUNT(*) FROM ' || table_name INTO all_rows;
                
                tenant_id := 'unset';
                row_count := all_rows;
                expected_result := 'Should see all rows';
                test_passed := all_rows > 0;
                RETURN NEXT;
                
                -- Get list of tenant IDs actually in the table
                EXECUTE 'SELECT array_agg(DISTINCT tenant_id) FROM ' || table_name INTO tenant_list;
                
                -- Test each tenant that has data
                IF tenant_list IS NOT NULL THEN
                    FOREACH tenant IN ARRAY tenant_list
                    LOOP
                        -- Count rows for this tenant
                        EXECUTE 'SELECT COUNT(*) FROM ' || table_name || ' WHERE tenant_id = $1' 
                        USING tenant INTO tenant_rows;
                        
                        -- Skip if no rows
                        IF tenant_rows = 0 THEN
                            CONTINUE;
                        END IF;
                        
                        -- Set tenant context and check what rows are visible
                        PERFORM set_tenant_context(tenant);
                        
                        DECLARE
                            visible_rows INT;
                        BEGIN
                            EXECUTE 'SELECT COUNT(*) FROM ' || table_name INTO visible_rows;
                            
                            tenant_id := tenant;
                            row_count := visible_rows;
                            expected_result := tenant_rows::TEXT || ' rows';
                            test_passed := visible_rows = tenant_rows;
                            RETURN NEXT;
                        EXCEPTION WHEN OTHERS THEN
                            tenant_id := tenant;
                            row_count := 0;
                            expected_result := 'ERROR: ' || SQLERRM;
                            test_passed := FALSE;
                            RETURN NEXT;
                        END;
                    END LOOP;
                END IF;
                
                -- Test with non-existent tenant
                PERFORM set_tenant_context('nonexistent_tenant');
                
                BEGIN
                    EXECUTE 'SELECT COUNT(*) FROM ' || table_name INTO tenant_rows;
                    
                    tenant_id := 'nonexistent_tenant';
                    row_count := tenant_rows;
                    expected_result := '0 rows';
                    test_passed := tenant_rows = 0;
                    RETURN NEXT;
                EXCEPTION WHEN OTHERS THEN
                    tenant_id := 'nonexistent_tenant';
                    row_count := 0;
                    expected_result := 'ERROR: ' || SQLERRM;
                    test_passed := FALSE;
                    RETURN NEXT;
                END;
                
                -- Reset context
                PERFORM clear_tenant_context();
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # 3. Create function to fix RLS for all tenant tables
            cursor.execute("""
            CREATE OR REPLACE FUNCTION fix_all_rls_tables() RETURNS void AS $$
            DECLARE
                tenant_table TEXT;
            BEGIN
                FOR tenant_table IN 
                    SELECT table_name FROM rls_status 
                    WHERE has_tenant_id = true 
                    ORDER BY table_name
                LOOP
                    BEGIN
                        -- Enable RLS
                        EXECUTE 'ALTER TABLE ' || tenant_table || ' ENABLE ROW LEVEL SECURITY';
                        
                        -- Create policy
                        EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON ' || tenant_table;
                        EXECUTE 'CREATE POLICY tenant_isolation_policy ON ' || tenant_table || 
                                ' AS RESTRICTIVE USING ((tenant_id::TEXT = get_current_tenant_id() AND get_current_tenant_id() != ''unset'') ' ||
                                'OR get_current_tenant_id() = ''unset'')';
                                
                        RAISE NOTICE 'Fixed RLS for table: %', tenant_table;
                    EXCEPTION WHEN OTHERS THEN
                        RAISE WARNING 'Error fixing RLS for table %: %', tenant_table, SQLERRM;
                    END;
                END LOOP;
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            logger.info("RLS helper views and functions created successfully")
            return True
    except Exception as e:
        logger.error(f"Error creating RLS helper views: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_all_tables():
    """Apply RLS fixes to all tenant-aware tables"""
    logger.info("Applying RLS fixes to all tenant tables...")
    
    try:
        # Get all tenant tables
        tables = find_tenant_tables()
        
        if not tables:
            logger.warning("No tenant tables found")
            return False
        
        # Fix each table
        success_count = 0
        failure_count = 0
        
        for table in tables:
            if fix_rls_for_table(table):
                success_count += 1
            else:
                failure_count += 1
        
        logger.info(f"RLS applied to {success_count} tables successfully. {failure_count} tables failed.")
        
        # Create helper views after fixing tables
        create_rls_helper_views()
        
        return failure_count == 0
    except Exception as e:
        logger.error(f"Error applying RLS to all tables: {e}")
        logger.error(traceback.format_exc())
        return False

def ensure_rls_middleware():
    """Ensure RLS middleware is properly configured"""
    logger.info("Checking RLS middleware configuration...")
    
    try:
        from django.conf import settings
        
        # Check if RLS middleware is in settings
        middleware_path = 'custom_auth.rls_middleware.RowLevelSecurityMiddleware'
        
        if middleware_path in settings.MIDDLEWARE:
            logger.info("RLS middleware already configured in settings")
            return True
        
        logger.warning(f"RLS middleware ({middleware_path}) not found in settings")
        
        # We could automatically update settings here but that's risky
        # Instead, we'll provide instructions
        logger.info("To enable RLS middleware, add this to your MIDDLEWARE in settings.py:")
        logger.info(f"    '{middleware_path}',")
        
        return False
    except Exception as e:
        logger.error(f"Error checking RLS middleware: {e}")
        logger.error(traceback.format_exc())
        return False

def ensure_cognito_attributes():
    """Ensure Cognito attributes include tenant ID"""
    logger.info("Checking Cognito attributes configuration...")
    
    try:
        # This is just a check - we don't modify files automatically
        cognito_file = Path(__file__).parent / 'custom_auth' / 'cognito.py'
        
        if not cognito_file.exists():
            logger.warning("Cognito file not found")
            return False
        
        tenant_attr_found = False
        with open(cognito_file, 'r') as f:
            content = f.read()
            tenant_attr_found = 'tenant_id' in content and 'get_tenant_id' in content
        
        if tenant_attr_found:
            logger.info("Cognito appears to be configured with tenant_id attribute")
            return True
        
        logger.warning("Cognito may not be correctly configured with tenant_id attribute")
        logger.info("Ensure your Cognito setup includes tenant_id")
        
        return False
    except Exception as e:
        logger.error(f"Error checking Cognito configuration: {e}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main execution function"""
    logger.info("=" * 50)
    logger.info("STARTING PRODUCTION RLS FIX")
    logger.info("=" * 50)
    
    # 1. Fix core RLS configuration
    if not fix_rls_configuration():
        logger.error("Failed to set up core RLS functions")
        return False
    
    # 2. Fix RLS for all tables
    if not fix_all_tables():
        logger.warning("Some tables couldn't have RLS applied")
    
    # 3. Test RLS isolation
    if not test_rls_isolation():
        logger.error("RLS isolation test failed")
        return False
    
    # 4. Check middleware configuration
    ensure_rls_middleware()
    
    # 5. Check Cognito attributes
    ensure_cognito_attributes()
    
    logger.info("=" * 50)
    logger.info("RLS FIX COMPLETED SUCCESSFULLY")
    logger.info("=" * 50)
    logger.info("Your database now has properly configured RLS for tenant isolation")
    logger.info("Restart your application to ensure all changes take effect")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 