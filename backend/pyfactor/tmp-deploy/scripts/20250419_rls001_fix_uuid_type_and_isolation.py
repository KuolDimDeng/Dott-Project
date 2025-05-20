#!/usr/bin/env python3
"""
RLS UUID Type Mismatch and Isolation Fix

This script resolves RLS issues for production environments by:
1. Fixing the type mismatch between UUID tenant_id columns and text in RLS policies
2. Creating proper type conversion functions (uuid_to_text, text_to_uuid)
3. Recreating the RLS status view with all required columns
4. Applying proper RLS policies to all tenant tables
5. Testing and verifying tenant isolation

Version: v1.0
Created: 2025-04-19
Issue ID: RLS001
"""

import os
import sys
import logging
import traceback
from pathlib import Path
from datetime import datetime

# Set up Django environment
sys.path.append(str(Path(__file__).parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Configure Django database settings from environment variables if not already set
# This ensures we can run the script directly with database configuration from environment
import django

# Get database configuration from environment
db_name = os.environ.get('DB_NAME')
db_user = os.environ.get('DB_USER')
db_password = os.environ.get('DB_PASSWORD')
db_host = os.environ.get('DB_HOST')
db_port = os.environ.get('DB_PORT', '5432')

# Check if we have all required database settings
if all([db_name, db_user, db_password, db_host]):
    # Initialize Django before importing settings
    django.setup()
    
    # Now set up database configuration directly
    from django.conf import settings
    
    # Check if database is already configured
    if not hasattr(settings, 'DATABASES') or 'default' not in settings.DATABASES or 'ENGINE' not in settings.DATABASES['default']:
        # Define a new database configuration
        database_config = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': db_name,
                'USER': db_user,
                'PASSWORD': db_password,
                'HOST': db_host,
                'PORT': db_port,
            }
        }
        
        # Apply the database configuration
        settings.DATABASES = database_config
        
        print(f"Database configured: {db_name} on {db_host}")
else:
    print("Error: Missing required database environment variables")
    print("Please ensure DB_NAME, DB_USER, DB_PASSWORD, and DB_HOST are set")
    sys.exit(1)

try:
    from django.db import connection
    # Verify database configuration
    db_settings = settings.DATABASES.get('default', {})
    if 'ENGINE' not in db_settings:
        print("Error: Database engine not configured in Django settings")
        print("Please configure the database settings properly")
        sys.exit(1)
except ImportError as e:
    print(f"Error: Django setup failed - {e}")
    sys.exit(1)

# Set up logging
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"rls_uuid_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_uuid_fix')

def print_header(title):
    """Print a formatted header"""
    width = 80
    print("\n" + "=" * width)
    print(f"{title.center(width)}")
    print("=" * width + "\n")
    logger.info(f"Starting: {title}")

def fix_rls_functions():
    """Create or fix the RLS functions, including UUID conversion functions"""
    print_header("CREATING RLS FUNCTIONS WITH UUID SUPPORT")
    
    try:
        with connection.cursor() as cursor:
            # First, drop any existing functions to avoid conflicts - use specific signatures
            cursor.execute("""
            DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
            DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
            DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
            DROP FUNCTION IF EXISTS uuid_to_text(uuid) CASCADE;
            DROP FUNCTION IF EXISTS text_to_uuid(text) CASCADE;
            """)
            
            logger.info("Dropped existing RLS functions")
            
            # Create the UUID conversion functions
            cursor.execute("""
            -- Convert UUID to text safely
            CREATE OR REPLACE FUNCTION uuid_to_text(id uuid)
            RETURNS text AS $$
            BEGIN
                RETURN id::text;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Convert text to UUID safely
            CREATE OR REPLACE FUNCTION text_to_uuid(id text)
            RETURNS uuid AS $$
            BEGIN
                RETURN id::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL::uuid;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            logger.info("Created UUID conversion functions")
            
            # Create the core RLS functions
            cursor.execute("""
            -- Get the current tenant context
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS text AS $$
            BEGIN
                -- Return the tenant ID if set, otherwise 'unset'
                RETURN COALESCE(current_setting('app.current_tenant_id', TRUE), 'unset');
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Alias for get_tenant_context for backward compatibility
            CREATE OR REPLACE FUNCTION get_current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Simplified alias for use in RLS policies
            CREATE OR REPLACE FUNCTION current_tenant_id()
            RETURNS text AS $$
            BEGIN
                RETURN get_tenant_context();
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Set the tenant context
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
            RETURNS text AS $$
            BEGIN
                -- Set the tenant ID in session variables
                PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                PERFORM set_config('app.current_tenant', tenant_id, FALSE);
                
                RETURN tenant_id;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Clear the tenant context (for admin access)
            CREATE OR REPLACE FUNCTION clear_tenant_context()
            RETURNS text AS $$
            BEGIN
                -- Clear tenant context for admin access
                PERFORM set_config('app.current_tenant_id', 'unset', FALSE);
                PERFORM set_config('app.current_tenant', 'unset', FALSE);
                
                RETURN 'unset';
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            
            logger.info("Created core RLS functions")
            
            # Verify that the functions work
            cursor.execute("SELECT current_tenant_id()")
            result = cursor.fetchone()[0]
            logger.info(f"Verification: current_tenant_id() returns '{result}'")
            
            # Test set_tenant_context
            cursor.execute("SELECT set_tenant_context('test-tenant')")
            
            # Test current_tenant_id again after setting
            cursor.execute("SELECT current_tenant_id()")
            result = cursor.fetchone()[0]
            logger.info(f"Verification: After setting, current_tenant_id() returns '{result}'")
            
            # Test clear_tenant_context
            cursor.execute("SELECT clear_tenant_context()")
            
            # Test current_tenant_id again after clearing
            cursor.execute("SELECT current_tenant_id()")
            result = cursor.fetchone()[0]
            logger.info(f"Verification: After clearing, current_tenant_id() returns '{result}'")
            
            return True
    except Exception as e:
        logger.error(f"Error creating RLS functions: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_status_view():
    """Fix the RLS status view with all required columns"""
    print_header("FIXING RLS STATUS VIEW")
    
    try:
        with connection.cursor() as cursor:
            # Drop the existing view if it exists
            cursor.execute("DROP VIEW IF EXISTS rls_status CASCADE;")
            logger.info("Dropped existing RLS status view")
            
            # Create a comprehensive RLS status view with all required columns
            cursor.execute("""
            CREATE OR REPLACE VIEW rls_status AS
            SELECT 
                t.table_name,
                t.table_schema,
                EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = t.table_name 
                    AND table_schema = t.table_schema
                    AND column_name = 'tenant_id'
                ) AS has_tenant_id,
                EXISTS (
                    SELECT FROM pg_tables 
                    WHERE tablename = t.table_name 
                    AND schemaname = t.table_schema
                    AND rowsecurity = true
                ) AS rls_enabled,
                (
                    SELECT COUNT(*) > 0 
                    FROM pg_policy 
                    WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                ) AS has_policy,
                (
                    SELECT string_agg(polname, ', ') 
                    FROM pg_policy 
                    WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                ) AS policies,
                (
                    SELECT data_type
                    FROM information_schema.columns
                    WHERE table_name = t.table_name 
                    AND table_schema = t.table_schema
                    AND column_name = 'tenant_id'
                ) AS tenant_id_type
            FROM information_schema.tables t
            WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_schema, t.table_name;
            """)
            
            logger.info("Created new RLS status view with all required columns")
            
            # Verify the view exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_views 
                WHERE viewname = 'rls_status'
            );
            """)
            
            if cursor.fetchone()[0]:
                logger.info("✅ Verified RLS status view exists")
                
                # Verify the columns exist
                required_columns = ['has_tenant_id', 'rls_enabled', 'has_policy', 'tenant_id_type']
                all_columns_exist = True
                
                for column in required_columns:
                    cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'rls_status' 
                        AND column_name = '{column}'
                    );
                    """)
                    
                    if not cursor.fetchone()[0]:
                        logger.error(f"❌ Column '{column}' missing in RLS status view")
                        all_columns_exist = False
                
                if all_columns_exist:
                    logger.info("✅ All required columns exist in RLS status view")
                    return True
                else:
                    logger.error("❌ Some columns are missing in RLS status view")
                    return False
            else:
                logger.error("❌ Failed to create RLS status view")
                return False
                
    except Exception as e:
        logger.error(f"Error fixing RLS status view: {e}")
        logger.error(traceback.format_exc())
        return False

def create_test_tables():
    """Create and set up test tables for RLS verification"""
    print_header("CREATING RLS TEST TABLES")
    
    try:
        with connection.cursor() as cursor:
            # Text-based tenant ID test table
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
            
            -- Create policy with direct comparison (TEXT type)
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_table;
            CREATE POLICY tenant_isolation_policy ON rls_test_table
            FOR ALL
            USING (
                (tenant_id = current_tenant_id()) OR current_tenant_id() = 'unset'
            );
            
            -- Insert test data
            INSERT INTO rls_test_table (tenant_id, value) VALUES 
                ('tenant1', 'value for tenant 1'),
                ('tenant1', 'second value for tenant 1'),
                ('tenant2', 'value for tenant 2'),
                ('tenant3', 'value for tenant 3');
            """)
            
            logger.info("Created text-based tenant ID test table")
            
            # UUID-based tenant ID test table
            cursor.execute("""
            DROP TABLE IF EXISTS rls_uuid_test CASCADE;
            CREATE TABLE rls_uuid_test (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Enable RLS with FORCE for all users
            ALTER TABLE rls_uuid_test ENABLE ROW LEVEL SECURITY;
            ALTER TABLE rls_uuid_test FORCE ROW LEVEL SECURITY;
            
            -- Create policy with UUID conversion
            DROP POLICY IF EXISTS tenant_isolation_policy ON rls_uuid_test;
            CREATE POLICY tenant_isolation_policy ON rls_uuid_test
            FOR ALL
            USING (
                (uuid_to_text(tenant_id) = current_tenant_id()) OR current_tenant_id() = 'unset'
            );
            
            -- Insert test data
            INSERT INTO rls_uuid_test (tenant_id, value) VALUES 
                ('11111111-1111-1111-1111-111111111111', 'value for tenant 1 UUID'),
                ('11111111-1111-1111-1111-111111111111', 'second value for tenant 1 UUID'),
                ('22222222-2222-2222-2222-222222222222', 'value for tenant 2 UUID'),
                ('33333333-3333-3333-3333-333333333333', 'value for tenant 3 UUID');
            """)
            
            logger.info("Created UUID-based tenant ID test table")
            
            # Verify RLS is enabled on test tables
            cursor.execute("""
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname IN ('rls_test_table', 'rls_uuid_test');
            """)
            
            rls_status = cursor.fetchall()
            for table, enabled in rls_status:
                logger.info(f"Table {table} - RLS Enabled: {enabled}")
            
            return True
    except Exception as e:
        logger.error(f"Error creating test tables: {e}")
        logger.error(traceback.format_exc())
        return False

def test_rls_isolation():
    """Test RLS isolation to make sure tenant boundaries are enforced"""
    print_header("TESTING RLS ISOLATION")
    
    try:
        with connection.cursor() as cursor:
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
            
            return text_isolation_passed and uuid_isolation_passed
    except Exception as e:
        logger.error(f"Error testing RLS isolation: {e}")
        logger.error(traceback.format_exc())
        return False

def apply_rls_to_tenant_tables():
    """Apply proper RLS policies to all tenant tables with appropriate type handling"""
    print_header("APPLYING RLS TO TENANT TABLES")
    
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
                    
                    # Create appropriate policy based on data type
                    if data_type.lower() == 'uuid':
                        # For UUID type, use the conversion function
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (uuid_to_text(tenant_id) = current_tenant_id()) OR current_tenant_id() = 'unset'
                        );
                        """)
                    else:
                        # For TEXT or other types, use direct comparison
                        cursor.execute(f"""
                        CREATE POLICY tenant_isolation_policy ON {table}
                        FOR ALL
                        USING (
                            (tenant_id::text = current_tenant_id()) OR current_tenant_id() = 'unset'
                        );
                        """)
                    
                    success_count += 1
                    logger.info(f"Applied RLS to table: {table} (Type: {data_type})")
                    
                except Exception as e:
                    logger.error(f"Error applying RLS to {table}: {e}")
            
            logger.info(f"Successfully applied RLS to {success_count} of {len(tenant_tables)} tables")
            
            if success_count < len(tenant_tables):
                logger.warning(f"Failed to apply RLS to {len(tenant_tables) - success_count} tables")
            
            # Verify some policies were created
            cursor.execute("""
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE policyname = 'tenant_isolation_policy';
            """)
            
            policy_count = cursor.fetchone()[0]
            logger.info(f"Created {policy_count} tenant isolation policies")
                
            return success_count > 0
            
    except Exception as e:
        logger.error(f"Error applying RLS to tenant tables: {e}")
        logger.error(traceback.format_exc())
        return False

def verify_rls_configuration():
    """Verify RLS configuration by checking the status view"""
    print_header("VERIFYING RLS CONFIGURATION")
    
    try:
        with connection.cursor() as cursor:
            # Query the RLS status view
            cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE has_tenant_id) as with_tenant_id,
                COUNT(*) FILTER (WHERE rls_enabled) as with_rls_enabled,
                COUNT(*) FILTER (WHERE has_policy) as with_policy
            FROM rls_status;
            """)
            
            result = cursor.fetchone()
            total, with_tenant_id, with_rls_enabled, with_policy = result
            
            logger.info(f"Total tables: {total}")
            logger.info(f"Tables with tenant_id column: {with_tenant_id}")
            logger.info(f"Tables with RLS enabled: {with_rls_enabled}")
            logger.info(f"Tables with policies: {with_policy}")
            
            # Check if any tenant tables have incomplete RLS setup
            cursor.execute("""
            SELECT COUNT(*) 
            FROM rls_status 
            WHERE has_tenant_id = TRUE AND (rls_enabled = FALSE OR has_policy = FALSE);
            """)
            
            incomplete_tables = cursor.fetchone()[0]
            
            if incomplete_tables == 0:
                logger.info("✅ All tenant tables have complete RLS configuration")
                return True
            else:
                logger.warning(f"⚠️ {incomplete_tables} tenant tables have incomplete RLS configuration")
                
                # List the tables with incomplete configuration
                cursor.execute("""
                SELECT table_name, rls_enabled, has_policy, tenant_id_type
                FROM rls_status
                WHERE has_tenant_id = TRUE AND (rls_enabled = FALSE OR has_policy = FALSE)
                ORDER BY table_name;
                """)
                
                incomplete_list = cursor.fetchall()
                logger.warning("Tables with incomplete RLS configuration:")
                
                for table in incomplete_list:
                    table_name, rls_enabled, has_policy, tenant_id_type = table
                    logger.warning(f"- {table_name}: RLS Enabled={rls_enabled}, Has Policy={has_policy}, Type={tenant_id_type}")
                
                return False
                
    except Exception as e:
        logger.error(f"Error verifying RLS configuration: {e}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main function to fix RLS UUID type mismatch and tenant isolation"""
    print("\n=== RLS UUID TYPE MISMATCH AND ISOLATION FIX ===")
    print("This script fixes Row Level Security for proper tenant isolation")
    print("with UUID tenant IDs in AWS RDS PostgreSQL databases.")
    
    steps = [
        {"name": "Fix RLS Functions", "function": fix_rls_functions},
        {"name": "Fix RLS Status View", "function": fix_rls_status_view},
        {"name": "Create Test Tables", "function": create_test_tables},
        {"name": "Test RLS Isolation", "function": test_rls_isolation},
        {"name": "Apply RLS to Tenant Tables", "function": apply_rls_to_tenant_tables},
        {"name": "Verify RLS Configuration", "function": verify_rls_configuration}
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
        print("Row Level Security is now properly configured with UUID support")
        print("and tenant isolation is enforced at the database level.")
    else:
        print("\n⚠️ SOME FIXES FAILED - CHECK THE LOGS FOR DETAILS")
        print(f"Log file: {LOG_FILE}")
    
    # Final recommendations
    print("\nNext steps:")
    print("1. Restart your Django server to apply the changes")
    print("2. Run the RLS verification script: python backend/pyfactor/scripts/rls_manager.py --check-only")
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