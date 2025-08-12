#!/usr/bin/env python3
"""
RLS Isolation Fix

This script addresses critical issues with the Row Level Security (RLS) implementation:
1. Fixes the broken RLS isolation by properly implementing policies with local session parameter
2. Corrects the implementation of tenant context functions
3. Applies proper RLS to tables with incomplete configuration
4. Tests the isolation to verify it's working correctly

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
LOG_FILE = LOG_DIR / f"rls_isolation_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_isolation_fix')

def print_header(title):
    """Print a formatted header"""
    width = 80
    print("\n" + "=" * width)
    print(f"{title.center(width)}")
    print("=" * width + "\n")
    logger.info(f"Starting: {title}")

def fix_tenant_context_functions():
    """Fix the tenant context functions to properly enforce isolation"""
    print_header("FIXING TENANT CONTEXT FUNCTIONS")
    
    try:
        with connection.cursor() as cursor:
            # First check the current implementation
            cursor.execute("SELECT get_tenant_context()")
            current_value = cursor.fetchone()[0]
            logger.info(f"Current tenant context is: {current_value}")
            
            # Drop and recreate the tenant context functions with improved implementation
            cursor.execute("""
            -- Drop existing functions to avoid conflicts
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            
            -- Create improved functions with better isolation and parameter handling
            
            -- Get the current tenant context with improved error handling
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS text AS $$
            DECLARE
                tenant_value text;
            BEGIN
                -- Try to get the setting, return 'unset' if it doesn't exist or is NULL
                BEGIN
                    tenant_value := current_setting('app.current_tenant_id', TRUE);
                EXCEPTION WHEN OTHERS THEN
                    tenant_value := NULL;
                END;
                
                RETURN COALESCE(tenant_value, 'unset');
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Alias for get_tenant_context for backward compatibility
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Simplified alias for use in RLS policies - SECURITY INVOKER is critical for RLS
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY INVOKER;
            
            -- Set the tenant context with parameter validation
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
            RETURNS text AS $$
            BEGIN
                -- Validate input
                IF tenant_id IS NULL THEN
                    RAISE EXCEPTION 'Tenant ID cannot be NULL';
                END IF;
                
                -- Set as session parameter (not transaction)
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                
                -- Return the value to confirm
                RETURN tenant_id;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Clear the tenant context
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS text AS $$
            BEGIN
                -- Use 'unset' as a special value to indicate admin/unscoped access
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            logger.info("Recreated tenant context functions with improved implementation")
            
            # Verify functions work correctly
            cursor.execute("SELECT clear_tenant_context()")
            cursor.execute("SELECT get_tenant_context()")
            unset_value = cursor.fetchone()[0]
            logger.info(f"After clear: {unset_value}")
            
            cursor.execute("SELECT set_tenant_context('test-tenant')")
            cursor.execute("SELECT get_tenant_context()")
            test_value = cursor.fetchone()[0]
            logger.info(f"After set: {test_value}")
            
            # Restore to unset
            cursor.execute("SELECT clear_tenant_context()")
            
            return test_value == 'test-tenant'
    except Exception as e:
        logger.error(f"Error fixing tenant context functions: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_policies():
    """Fix the RLS policies to properly use SECURITY INVOKER and session parameters"""
    print_header("FIXING RLS POLICIES")
    
    try:
        with connection.cursor() as cursor:
            # Get all tables with tenant_id column
            cursor.execute("""
            SELECT table_name, data_type
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
            AND table_schema = 'public'
            ORDER BY table_name;
            """)
            
            tenant_tables = cursor.fetchall()
            logger.info(f"Found {len(tenant_tables)} tables with tenant_id column")
            
            # Create improved RLS policies
            success_count = 0
            
            for table, data_type in tenant_tables:
                try:
                    # Check if the table still exists
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
                    
                    # Create appropriate policy based on data type with improved condition
                    if data_type.lower() == 'uuid':
                        # For UUID type, use cast with explicit NULL handling
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (tenant_id::text = current_tenant_id() AND current_tenant_id() != 'unset')
                            OR current_tenant_id() = 'unset'
                        );
                        """)
                    else:
                        # For TEXT type, use direct comparison
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (tenant_id = current_tenant_id() AND current_tenant_id() != 'unset')
                            OR current_tenant_id() = 'unset'
                        );
                        """)
                    
                    success_count += 1
                    logger.info(f"Applied fixed RLS policy to table: {table} (Type: {data_type})")
                    
                except Exception as e:
                    logger.error(f"Error applying RLS to {table}: {e}")
            
            logger.info(f"Successfully applied fixed RLS to {success_count} of {len(tenant_tables)} tables")
            
            # Fix specific test tables
            try:
                # Fix the test tables specifically
                cursor.execute("""
                -- Fix RLS test table
                DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_table;
                CREATE POLICY tenant_isolation_policy ON rls_test_table
                FOR ALL
                USING (
                    (tenant_id = current_tenant_id() AND current_tenant_id() != 'unset')
                    OR current_tenant_id() = 'unset'
                );
                
                -- Fix UUID test table
                DROP POLICY IF EXISTS tenant_isolation_policy ON rls_uuid_test;
                CREATE POLICY tenant_isolation_policy ON rls_uuid_test
                FOR ALL
                USING (
                    (tenant_id::text = current_tenant_id() AND current_tenant_id() != 'unset')
                    OR current_tenant_id() = 'unset'
                );
                """)
                logger.info("Fixed RLS policies on test tables")
            except Exception as e:
                logger.error(f"Error fixing test tables: {e}")
            
            return success_count > 0
    except Exception as e:
        logger.error(f"Error fixing RLS policies: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_missing_rls_tables():
    """Fix tables with incomplete RLS configuration"""
    print_header("FIXING MISSING RLS CONFIGURATION")
    
    try:
        with connection.cursor() as cursor:
            # Find tables with incomplete RLS
            cursor.execute("""
            SELECT table_name, tenant_id_type
            FROM rls_status
            WHERE has_tenant_id = TRUE AND (rls_enabled = FALSE OR has_policy = FALSE);
            """)
            
            incomplete_tables = cursor.fetchall()
            logger.info(f"Found {len(incomplete_tables)} tables with incomplete RLS configuration")
            
            success_count = 0
            
            for table, data_type in incomplete_tables:
                try:
                    # Enable RLS on the table
                    cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                    cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
                    
                    # Drop existing policy if it exists
                    cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
                    
                    # Create appropriate policy based on data type
                    if data_type and data_type.lower() == 'uuid':
                        # For UUID type, use cast with explicit NULL handling
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (tenant_id::text = current_tenant_id() AND current_tenant_id() != 'unset')
                            OR current_tenant_id() = 'unset'
                        );
                        """)
                    else:
                        # For TEXT or other types, use direct comparison
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (tenant_id = current_tenant_id() AND current_tenant_id() != 'unset')
                            OR current_tenant_id() = 'unset'
                        );
                        """)
                    
                    success_count += 1
                    logger.info(f"Fixed incomplete RLS on table: {table} (Type: {data_type})")
                except Exception as e:
                    logger.error(f"Error fixing incomplete RLS on {table}: {e}")
            
            logger.info(f"Successfully fixed RLS on {success_count} of {len(incomplete_tables)} tables")
            
            return success_count > 0
    except Exception as e:
        logger.error(f"Error fixing missing RLS tables: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_syntax_error():
    """Fix the syntax error in the get_current_tenant_id function in rls.py"""
    print_header("FIXING RLS.PY SYNTAX ERROR")
    
    try:
        # Read the file with correct paths
        file_path = Path(__file__).parent.parent / "custom_auth" / "rls.py"
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return False
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Look for and fix the indentation error in get_current_tenant_id function
        if "            try:" in content and "            cursor.execute" in content:
            content = content.replace(
                "            try:\n                with connection.cursor() as cursor:\n            cursor.execute",
                "    try:\n        with connection.cursor() as cursor:\n            cursor.execute"
            )
            
            with open(file_path, 'w') as f:
                f.write(content)
            
            logger.info(f"Successfully fixed syntax error in {file_path}")
            return True
        else:
            logger.warning("Syntax pattern not found in file, no changes made")
            return False
        
    except Exception as e:
        logger.error(f"Error fixing rls.py syntax error: {e}")
        logger.error(traceback.format_exc())
        return False

def verify_rls_isolation():
    """Test RLS isolation to make sure tenant boundaries are enforced correctly"""
    print_header("VERIFYING RLS ISOLATION")
    
    try:
        with connection.cursor() as cursor:
            # Clear any existing tenant context
            cursor.execute("SELECT clear_tenant_context();")
            
            # Test text-based tenant isolation
            logger.info("Testing TEXT-based tenant isolation:")
            
            # Test with unset (admin access)
            cursor.execute("SELECT clear_tenant_context();")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            unset_count = cursor.fetchone()[0]
            logger.info(f"- Admin (unset): {unset_count} rows (expected 4)")
            
            # Test with tenant1
            cursor.execute("SELECT set_tenant_context('tenant1');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant1_count = cursor.fetchone()[0]
            logger.info(f"- Tenant1: {tenant1_count} rows (expected 2)")
            
            # Test with tenant2
            cursor.execute("SELECT set_tenant_context('tenant2');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            tenant2_count = cursor.fetchone()[0]
            logger.info(f"- Tenant2: {tenant2_count} rows (expected 1)")
            
            # Test with nonexistent tenant
            cursor.execute("SELECT set_tenant_context('nonexistent');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_table;")
            nonexistent_count = cursor.fetchone()[0]
            logger.info(f"- Nonexistent tenant: {nonexistent_count} rows (expected 0)")
            
            # Reset context
            cursor.execute("SELECT clear_tenant_context();")
            
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
            cursor.execute("SELECT clear_tenant_context();")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            unset_count = cursor.fetchone()[0]
            logger.info(f"- Admin (unset): {unset_count} rows (expected 4)")
            
            # Test with tenant1 UUID
            cursor.execute("SELECT set_tenant_context('11111111-1111-1111-1111-111111111111');")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            tenant1_count = cursor.fetchone()[0]
            logger.info(f"- Tenant1 UUID: {tenant1_count} rows (expected 2)")
            
            # Test with tenant2 UUID
            cursor.execute("SELECT set_tenant_context('22222222-2222-2222-2222-222222222222');")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            tenant2_count = cursor.fetchone()[0]
            logger.info(f"- Tenant2 UUID: {tenant2_count} rows (expected 1)")
            
            # Test with nonexistent tenant UUID
            cursor.execute("SELECT set_tenant_context('99999999-9999-9999-9999-999999999999');")
            cursor.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            nonexistent_count = cursor.fetchone()[0]
            logger.info(f"- Nonexistent tenant UUID: {nonexistent_count} rows (expected 0)")
            
            # Reset context
            cursor.execute("SELECT clear_tenant_context();")
            
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

def main():
    """Main function to fix RLS isolation issues"""
    print("\n=== RLS ISOLATION FIX ===")
    print("This script fixes Row Level Security isolation issues for proper tenant boundaries.")
    
    steps = [
        {"name": "Fix Tenant Context Functions", "function": fix_tenant_context_functions},
        {"name": "Fix RLS Policies", "function": fix_rls_policies},
        {"name": "Fix Missing RLS Tables", "function": fix_missing_rls_tables},
        {"name": "Fix RLS Syntax Error", "function": fix_rls_syntax_error},
        {"name": "Verify RLS Isolation", "function": verify_rls_isolation}
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
        print("Row Level Security isolation is now properly enforced at the database level.")
    else:
        print("\n⚠️ SOME FIXES FAILED - CHECK THE LOGS FOR DETAILS")
        print(f"Log file: {LOG_FILE}")
    
    # Final recommendations
    print("\nNext steps:")
    print("1. Restart your Django server to apply the changes")
    print("2. Run the RLS verification script: python backend/pyfactor/scripts/check_rls_middleware.py")
    print("3. Document the changes in your deployment process")
    
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