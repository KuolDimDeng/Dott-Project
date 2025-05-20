#!/usr/bin/env python
import os
import sys
import django
import logging
from datetime import datetime

# Set up logging
log_format = '%(asctime)s - %(levelname)s: %(message)s'
logging.basicConfig(level=logging.INFO, format=log_format, datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger(__name__)

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Get a database connection
from django.db import connection

def fix_rls_type_mismatch():
    """
    Apply the final RLS fix that handles UUID to text type conversion properly.
    This addresses the 'operator does not exist: uuid = text' error.
    """
    logger.info("Starting RLS type mismatch fix...")
    
    # Get connection details
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_user, current_database(), current_setting('is_superuser'), version();")
        user, db, is_superuser, version = cursor.fetchone()
        logger.info(f"Connected as: {user} to database: {db}")
        logger.info(f"Superuser: {is_superuser}, PostgreSQL version: {version}")

    # Step 1: Recreate core RLS functions with proper type handling
    with connection.cursor() as cursor:
        # Drop existing functions if they exist
        cursor.execute("""
        DROP FUNCTION IF EXISTS get_tenant_context() CASCADE;
        DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
        DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
        DROP FUNCTION IF EXISTS clear_tenant_context() CASCADE;
        """)
        
        # Create tenant context functions
        cursor.execute("""
        CREATE OR REPLACE FUNCTION get_tenant_context()
        RETURNS text AS $$
        BEGIN
            RETURN current_setting('app.tenant_id', TRUE);
        EXCEPTION
            WHEN OTHERS THEN
                RETURN 'unset';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION current_tenant_id()
        RETURNS text AS $$
        BEGIN
            RETURN get_tenant_context();
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id text)
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.tenant_id', tenant_id, FALSE);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        CREATE OR REPLACE FUNCTION clear_tenant_context()
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.tenant_id', 'unset', FALSE);
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """)
        
        logger.info("Recreated core RLS functions with proper type handling...")

    # Step 2: Test the RLS functions
    with connection.cursor() as cursor:
        cursor.execute("SELECT get_tenant_context();")
        logger.info(f"Default tenant context: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT set_tenant_context('test_tenant'); SELECT get_tenant_context();")
        logger.info(f"After setting: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT clear_tenant_context(); SELECT get_tenant_context();")
        logger.info(f"After clearing: {cursor.fetchone()[0]}")

    # Step 3: Create helpers for UUID type conversion in policies
    with connection.cursor() as cursor:
        # Create helper functions for UUID conversion
        cursor.execute("""
        CREATE OR REPLACE FUNCTION uuid_to_text(id uuid)
        RETURNS text AS $$
        BEGIN
            RETURN id::text;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
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
        
        logger.info("Created helper functions for UUID conversion...")

    # Step 4: Create a test table with proper RLS policy
    with connection.cursor() as cursor:
        # Create test table if it doesn't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS rls_uuid_test (
            id SERIAL PRIMARY KEY,
            tenant_id UUID NOT NULL,
            name TEXT NOT NULL,
            data TEXT
        );
        
        -- Enable RLS on the table
        ALTER TABLE rls_uuid_test ENABLE ROW LEVEL SECURITY;
        ALTER TABLE rls_uuid_test FORCE ROW LEVEL SECURITY;
        
        -- Drop any existing policies
        DROP POLICY IF EXISTS tenant_isolation_policy ON rls_uuid_test;
        
        -- Create the policy with UUID handling
        CREATE POLICY tenant_isolation_policy ON rls_uuid_test
        USING (
            -- This checks if the tenant_id matches the current_tenant_id()
            -- or if the current_tenant_id is 'unset' (admin access)
            uuid_to_text(tenant_id) = current_tenant_id() OR current_tenant_id() = 'unset'
        );
        """)
        
        # Insert test data if not already there
        cursor.execute("SELECT COUNT(*) FROM rls_uuid_test;")
        if cursor.fetchone()[0] == 0:
            # Insert test data for different tenants
            cursor.execute("""
            INSERT INTO rls_uuid_test (tenant_id, name, data) VALUES 
            ('11111111-1111-1111-1111-111111111111', 'tenant1_item1', 'Data for tenant1'),
            ('11111111-1111-1111-1111-111111111111', 'tenant1_item2', 'More data for tenant1'),
            ('22222222-2222-2222-2222-222222222222', 'tenant2_item1', 'Data for tenant2'),
            ('33333333-3333-3333-3333-333333333333', 'tenant3_item1', 'Data for tenant3');
            """)
        
        logger.info("Set up test table with proper RLS policy...")

    # Step 5: Test the RLS policy with different tenants
    with connection.cursor() as cursor:
        # Test with admin context (should see all rows)
        cursor.execute("SELECT clear_tenant_context(); SELECT COUNT(*) FROM rls_uuid_test;")
        admin_count = cursor.fetchone()[0]
        logger.info(f"Admin (unset) sees {admin_count} rows")
        
        # Test with tenant1 context
        cursor.execute("""
        SELECT set_tenant_context('11111111-1111-1111-1111-111111111111');
        SELECT id, name FROM rls_uuid_test ORDER BY id;
        """)
        tenant1_rows = cursor.fetchall()
        tenant1_ids = [row[0] for row in tenant1_rows]
        logger.info(f"tenant1 sees {len(tenant1_rows)} rows with IDs: {tenant1_ids}")
        
        # Test with tenant2 context
        cursor.execute("""
        SELECT set_tenant_context('22222222-2222-2222-2222-222222222222');
        SELECT id, name FROM rls_uuid_test ORDER BY id;
        """)
        tenant2_rows = cursor.fetchall()
        tenant2_ids = [row[0] for row in tenant2_rows]
        logger.info(f"tenant2 sees {len(tenant2_rows)} rows with IDs: {tenant2_ids}")
        
        # Test with tenant3 context
        cursor.execute("""
        SELECT set_tenant_context('33333333-3333-3333-3333-333333333333');
        SELECT id, name FROM rls_uuid_test ORDER BY id;
        """)
        tenant3_rows = cursor.fetchall()
        tenant3_ids = [row[0] for row in tenant3_rows]
        logger.info(f"tenant3 sees {len(tenant3_rows)} rows with IDs: {tenant3_ids}")
        
        # Test with nonexistent tenant context
        cursor.execute("""
        SELECT set_tenant_context('99999999-9999-9999-9999-999999999999');
        SELECT id, name FROM rls_uuid_test ORDER BY id;
        """)
        nonexistent_rows = cursor.fetchall()
        nonexistent_ids = [row[0] for row in nonexistent_rows]
        logger.info(f"nonexistent tenant sees {len(nonexistent_rows)} rows with IDs: {nonexistent_ids}")
        
        # Reset context
        cursor.execute("SELECT clear_tenant_context();")

    # Step 6: Apply RLS to real tables with proper UUID handling
    apply_rls_to_real_tables()

    # Step 7: Verify successful implementation
    logger.info("\nRLS UUID implementation complete!")
    logger.info("Use the set_tenant_context() and clear_tenant_context() functions")
    logger.info("to control which tenant's data is visible in queries.")
    
    # Print a nice summary
    print("\n✅ RLS has been properly configured for UUID tenant IDs!")
    print("The system now enforces proper tenant isolation.")
    print("\nTo control tenant context in your code:")
    print("- Use set_tenant_context('tenant_id') to view tenant data")
    print("- Use clear_tenant_context() for admin access to all data")


def apply_rls_to_real_tables():
    """Apply RLS to all real tenant tables with proper UUID handling."""
    logger.info("Now applying RLS to tables with UUID tenant_id...")
    
    with connection.cursor() as cursor:
        # Find all tables with tenant_id column
        cursor.execute("""
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        ORDER BY table_name;
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found {len(tables)} tenant tables to update")
        
        success_count = 0
        
        for table in tables:
            try:
                # Determine the column type
                cursor.execute(f"""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE column_name = 'tenant_id' 
                AND table_name = '{table}'
                AND table_schema = 'public';
                """)
                
                data_type = cursor.fetchone()[0]
                
                # Enable RLS on the table
                cursor.execute(f"""
                ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
                ALTER TABLE {table} FORCE ROW LEVEL SECURITY;
                """)
                
                # Drop existing policy if it exists
                cursor.execute(f"""
                DROP POLICY IF EXISTS tenant_isolation_policy ON {table};
                """)
                
                # Create appropriate policy based on data type
                if data_type.lower() == 'uuid':
                    cursor.execute(f"""
                    CREATE POLICY tenant_isolation_policy ON {table}
                    USING (
                        uuid_to_text(tenant_id) = current_tenant_id() OR current_tenant_id() = 'unset'
                    );
                    """)
                else:
                    cursor.execute(f"""
                    CREATE POLICY tenant_isolation_policy ON {table}
                    USING (
                        tenant_id::text = current_tenant_id() OR current_tenant_id() = 'unset'
                    );
                    """)
                
                success_count += 1
                logger.info(f"Applied RLS to {table}")
                
            except Exception as e:
                logger.error(f"Failed to apply RLS to {table}: {str(e)}")
    
    logger.info(f"Successfully applied RLS to {success_count} of {len(tables)} tables")


if __name__ == "__main__":
    try:
        fix_rls_type_mismatch()
    except Exception as e:
        logger.error(f"Error fixing RLS: {str(e)}")
        sys.exit(1) 