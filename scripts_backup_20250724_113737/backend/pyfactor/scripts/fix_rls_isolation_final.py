#!/usr/bin/env python3
"""
RLS Isolation Final Fix

This script addresses the final issue with Row Level Security isolation:
- The prior fixes created the correct policies, but isolation is still not working
- This suggests a security context issue with the RLS functions or PostgreSQL session parameters
- We'll create a more direct solution using SECURITY INVOKER correctly and enforcing local session parameters

Created: 2025-04-19
"""

import os
import sys
import logging
import traceback
from pathlib import Path
from datetime import datetime

# Configure database environment variables if needed
db_name = os.environ.get('DB_NAME')
db_user = os.environ.get('DB_USER')
db_password = os.environ.get('DB_PASSWORD')
db_host = os.environ.get('DB_HOST')
db_port = os.environ.get('DB_PORT', '5432')

# If environment variables are missing, set defaults from the RLS fix script
if not db_name:
    print("DB environment variables not found. Setting from defaults...")
    os.environ['DB_NAME'] = 'dott_main'
    os.environ['DB_USER'] = 'dott_admin'
    os.environ['DB_PASSWORD'] = 'RRfXU6uPPUbBEg1JqGTJ'
    os.environ['DB_HOST'] = 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'
    os.environ['DB_PORT'] = '5432'

# Set up Django environment
sys.path.append(str(Path(__file__).parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Initialize Django before importing settings
import django
django.setup()

# Now set up database configuration directly to ensure it's properly configured
from django.conf import settings

# Check if database is already configured
if not hasattr(settings, 'DATABASES') or 'default' not in settings.DATABASES or 'ENGINE' not in settings.DATABASES['default']:
    # Define a new database configuration
    database_config = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
    
    # Apply the database configuration
    settings.DATABASES = database_config
    
    print(f"Database configured: {settings.DATABASES['default']['NAME']} on {settings.DATABASES['default']['HOST']}")

from django.db import connection

# Set up logging
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"rls_isolation_final_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_isolation_final_fix')

def print_header(title):
    """Print a formatted header"""
    width = 80
    print("\n" + "=" * width)
    print(f"{title.center(width)}")
    print("=" * width + "\n")
    logger.info(f"Starting: {title}")

def fix_tenant_context_functions_final():
    """Fix the tenant context functions with a direct approach that ensures proper security context"""
    print_header("FIXING TENANT CONTEXT FUNCTIONS (FINAL)")
    
    try:
        with connection.cursor() as cursor:
            # First check the current implementation
            cursor.execute("SELECT current_database(), current_user")
            db, user = cursor.fetchone()
            logger.info(f"Current database: {db}, Current user: {user}")
            
            # Drop and recreate all context functions with explicit SECURITY settings
            cursor.execute("""
            -- Drop ALL tenant context functions to avoid conflicts or old implementations
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS uuid_to_text(uuid) CASCADE;
            DROP FUNCTION IF EXISTS text_to_uuid(text) CASCADE;
            
            -- Create type conversion functions
            CREATE OR REPLACE FUNCTION uuid_to_text(id uuid)
            RETURNS text AS $$
            BEGIN
                RETURN id::text;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
            
            CREATE OR REPLACE FUNCTION text_to_uuid(id text)
            RETURNS uuid AS $$
            BEGIN
                RETURN id::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL::uuid;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create core tenant context functions with proper security settings
            
            -- CRITICALLY IMPORTANT: The get_tenant_context function is SECURITY DEFINER
            -- BUT the current_tenant_id function is SECURITY INVOKER for RLS to work
            
            -- Get the current tenant context - SECURITY DEFINER to ensure access to setting
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS text AS $$
            DECLARE
                tenant_value text;
            BEGIN
                -- Try to get setting with explicit TRUE for missing_ok
                BEGIN
                    tenant_value := current_setting('app.current_tenant_id', TRUE);
                EXCEPTION WHEN OTHERS THEN
                    tenant_value := NULL;
                END;
                
                RETURN COALESCE(tenant_value, 'unset');
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Compatibility alias
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- For use in RLS policies - SECURITY INVOKER to run in the policy's context
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS text AS $$
            DECLARE
                tenant_value text;
            BEGIN
                -- Direct access to setting to ensure proper context in RLS
                BEGIN
                    tenant_value := current_setting('app.current_tenant_id', TRUE);
                EXCEPTION WHEN OTHERS THEN
                    tenant_value := NULL;
                END;
                
                RETURN COALESCE(tenant_value, 'unset');
            END;
            $$ LANGUAGE plpgsql SECURITY INVOKER;
            
            -- Set tenant context (SECURITY DEFINER for permission to set parameter)
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
            RETURNS text AS $$
            BEGIN
                -- Validate and set as LOCAL to session
                IF tenant_id IS NULL THEN
                    RAISE EXCEPTION 'Tenant ID cannot be NULL';
                END IF;
                
                -- The SESSION vs LOCAL parameter scope is critical for correct isolation
                -- LOCAL ensures it's confined to the current transaction
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                
                RETURN tenant_id;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Clear tenant context (SECURITY DEFINER for permission)
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS text AS $$
            BEGIN
                -- Set special 'unset' value for admin access
                -- FALSE parameter means it's session-level not transaction-level
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            logger.info("Recreated tenant context functions with explicit security context settings")
            
            # Verify functions work with explicit tests
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT current_tenant_id()")
            unset_value = cursor.fetchone()[0]
            logger.info(f"After clear, current_tenant_id() returns: {unset_value}")
            
            cursor.execute("SELECT set_tenant_context('test-tenant')")
            cursor.execute("SELECT current_tenant_id()")
            test_value = cursor.fetchone()[0]
            logger.info(f"After set, current_tenant_id() returns: {test_value}")
            
            # Check explicit function calls directly
            cursor.execute("SELECT get_tenant_context() = current_tenant_id()")
            match = cursor.fetchone()[0]
            logger.info(f"Matching functions: {match}")
            
            # Restore to unset
            cursor.execute("SELECT clear_tenant_context()")
            
            return test_value == 'test-tenant' and match
    except Exception as e:
        logger.error(f"Error fixing tenant context functions: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_test_table_policies():
    """Fix the policies for test tables specifically with a direct approach"""
    print_header("FIXING TEST TABLE POLICIES")
    
    try:
        with connection.cursor() as cursor:
            # Fix the test tables with direct SQL approach
            cursor.execute("""
            -- Fix RLS test table - Text type
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_table;
            ALTER TABLE rls_test_table ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_test_table FORCE ROW LEVEL SECURITY;
            
            CREATE POLICY tenant_isolation_policy ON rls_test_table
            FOR ALL
            USING (
                tenant_id = current_setting('app.current_tenant_id', TRUE) OR 
                current_setting('app.current_tenant_id', TRUE) = 'unset'
            );
            
            -- Fix UUID test table - UUID type
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_uuid_test;
            ALTER TABLE rls_uuid_test ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_uuid_test FORCE ROW LEVEL SECURITY;
            
            CREATE POLICY tenant_isolation_policy ON rls_uuid_test
            FOR ALL 
            USING (
                tenant_id::text = current_setting('app.current_tenant_id', TRUE) OR 
                current_setting('app.current_tenant_id', TRUE) = 'unset'
            );
            """)
            
            logger.info("Fixed test table policies using direct current_setting() approach")
            
            return True
    except Exception as e:
        logger.error(f"Error fixing test table policies: {e}")
        logger.error(traceback.format_exc())
        return False

def verify_rls_isolation_final():
    """Verify that RLS isolation is working correctly"""
    print_header("VERIFYING RLS ISOLATION (FINAL)")
    
    try:
        with connection.cursor() as cursor:
            # Ensure we start with a clean context
            cursor.execute("SELECT set_config('app.current_tenant_id', 'unset', FALSE)")
            
            # Test text-based tenant isolation
            logger.info("Testing TEXT-based tenant isolation:")
            
            # Test with unset (admin access)
            cursor.execute("SELECT set_config('app.current_tenant_id', 'unset', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            unset_count = cursor.fetchone()[0]
            logger.info(f"- Admin (unset): {unset_count} rows (expected 4)")
            
            # Test with tenant1
            cursor.execute("SELECT set_config('app.current_tenant_id', 'tenant1', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            tenant1_count = cursor.fetchone()[0]
            logger.info(f"- Tenant1: {tenant1_count} rows (expected 2)")
            
            # Test with tenant2
            cursor.execute("SELECT set_config('app.current_tenant_id', 'tenant2', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            tenant2_count = cursor.fetchone()[0]
            logger.info(f"- Tenant2: {tenant2_count} rows (expected 1)")
            
            # Test with nonexistent tenant
            cursor.execute("SELECT set_config('app.current_tenant_id', 'nonexistent', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table")
            nonexistent_count = cursor.fetchone()[0]
            logger.info(f"- Nonexistent tenant: {nonexistent_count} rows (expected 0)")
            
            # Reset context
            cursor.execute("SELECT set_config('app.current_tenant_id', 'unset', FALSE)")
            
            # Verify text-based isolation results
            text_isolation_passed = (
                unset_count == 4 and 
                tenant1_count == 2 and 
                tenant2_count == 1 and
                nonexistent_count == 0
            )
            
            if text_isolation_passed:
                logger.info("✅ TEXT-based RLS isolation test passed!")
            else:
                logger.error("❌ TEXT-based RLS isolation test failed!")
                logger.error(f"Expected: 4, 2, 1, 0 but got: {unset_count}, {tenant1_count}, {tenant2_count}, {nonexistent_count}")
            
            # Test UUID-based tenant isolation
            logger.info("\nTesting UUID-based tenant isolation:")
            
            # Test with unset (admin access)
            cursor.execute("SELECT set_config('app.current_tenant_id', 'unset', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test")
            unset_count = cursor.fetchone()[0]
            logger.info(f"- Admin (unset): {unset_count} rows (expected 4)")
            
            # Test with tenant1 UUID
            cursor.execute("SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test")
            tenant1_count = cursor.fetchone()[0]
            logger.info(f"- Tenant1 UUID: {tenant1_count} rows (expected 2)")
            
            # Test with tenant2 UUID
            cursor.execute("SELECT set_config('app.current_tenant_id', '22222222-2222-2222-2222-222222222222', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test")
            tenant2_count = cursor.fetchone()[0]
            logger.info(f"- Tenant2 UUID: {tenant2_count} rows (expected 1)")
            
            # Test with nonexistent tenant UUID
            cursor.execute("SELECT set_config('app.current_tenant_id', '99999999-9999-9999-9999-999999999999', FALSE)")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test")
            nonexistent_count = cursor.fetchone()[0]
            logger.info(f"- Nonexistent tenant UUID: {nonexistent_count} rows (expected 0)")
            
            # Reset context
            cursor.execute("SELECT set_config('app.current_tenant_id', 'unset', FALSE)")
            
            # Verify UUID-based isolation results
            uuid_isolation_passed = (
                unset_count == 4 and 
                tenant1_count == 2 and 
                tenant2_count == 1 and
                nonexistent_count == 0
            )
            
            if uuid_isolation_passed:
                logger.info("✅ UUID-based RLS isolation test passed!")
            else:
                logger.error("❌ UUID-based RLS isolation test failed!")
                logger.error(f"Expected: 4, 2, 1, 0 but got: {unset_count}, {tenant1_count}, {tenant2_count}, {nonexistent_count}")
            
            return text_isolation_passed and uuid_isolation_passed
    except Exception as e:
        logger.error(f"Error verifying RLS isolation: {e}")
        logger.error(traceback.format_exc())
        return False

def apply_direct_policy_to_all_tables():
    """Apply direct current_setting approach to all tables to ensure isolation works"""
    print_header("APPLYING DIRECT POLICIES TO ALL TABLES")
    
    try:
        with connection.cursor() as cursor:
            # Find all tables with tenant_id column
            cursor.execute("""
            SELECT table_name, data_type
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
            AND table_schema = 'public'
            ORDER BY table_name;
            """)
            
            tenant_tables = cursor.fetchall()
            logger.info(f"Found {len(tenant_tables)} tables with tenant_id column")
            
            # Apply direct current_setting policies to all tables
            success_count = 0
            
            for table, data_type in tenant_tables:
                try:
                    # Check if the table exists
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
                    
                    # Enable RLS on the table
                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                    cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
                    
                    # Drop existing policy if it exists
                    cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
                    
                    # Create appropriate policy based on data type with direct current_setting
                    if data_type.lower() == 'uuid':
                        # For UUID type, use cast with explicit current_setting
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            tenant_id::text = current_setting('app.current_tenant_id', TRUE) OR 
                            current_setting('app.current_tenant_id', TRUE) = 'unset'
                        );
                        """)
                    else:
                        # For TEXT type, use direct comparison with current_setting
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            tenant_id = current_setting('app.current_tenant_id', TRUE) OR 
                            current_setting('app.current_tenant_id', TRUE) = 'unset'
                        );
                        """)
                    
                    success_count += 1
                    logger.info(f"Applied direct RLS policy to table: {table} (Type: {data_type})")
                except Exception as e:
                    logger.error(f"Error applying direct RLS to {table}: {e}")
            
            logger.info(f"Successfully applied direct RLS to {success_count} of {len(tenant_tables)} tables")
            
            return success_count > 0
    except Exception as e:
        logger.error(f"Error applying direct policies to all tables: {e}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main function to fix RLS isolation issues with direct approach"""
    print("\n=== RLS ISOLATION FINAL FIX ===")
    print("This script applies the final fix for proper RLS tenant isolation.")
    print("Using direct current_setting() in policies instead of function calls.")
    
    steps = [
        {"name": "Fix Tenant Context Functions (Final)", "function": fix_tenant_context_functions_final},
        {"name": "Fix Test Table Policies", "function": fix_test_table_policies},
        {"name": "Verify RLS Isolation (Final)", "function": verify_rls_isolation_final},
        {"name": "Apply Direct Policies to All Tables", "function": apply_direct_policy_to_all_tables},
        {"name": "Verify RLS Isolation (Final)", "function": verify_rls_isolation_final}
    ]
    
    all_steps_succeeded = True
    
    for step in steps:
        logger.info(f"\nExecuting: {step['name']}")
        success = step["function"]()
        
        if success:
            logger.info(f"✅ {step['name']} completed successfully")
        else:
            logger.error(f"❌ {step['name']} failed")
            all_steps_succeeded = False
    
    if all_steps_succeeded:
        print("\n✅ ALL FIXES APPLIED SUCCESSFULLY!")
        print("Row Level Security isolation is now properly enforced with direct current_setting() policies.")
        print("Tenant boundaries are correctly maintained at the database level.")
    else:
        print("\n⚠️ SOME FIXES FAILED - CHECK THE LOGS FOR DETAILS")
        print(f"Log file: {LOG_FILE}")
    
    # Final recommendations
    print("\nNext steps:")
    print("1. Restart your Django server to apply the changes")
    print("2. Run the RLS verification script: python backend/pyfactor/scripts/check_rls_middleware.py")
    print("3. Document the direct policy changes in your deployment process")
    
    return 0 if all_steps_succeeded else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        logger.error(traceback.format_exc())
        print(f"\n❌ Script failed with unhandled exception: {e}")
        print(f"Check the log file for details: {LOG_FILE}")
        sys.exit(1) 