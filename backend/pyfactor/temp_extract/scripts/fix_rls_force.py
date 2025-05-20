#!/usr/bin/env python3
"""
Fix RLS Force Policy

This script applies FORCE ROW LEVEL SECURITY to all tables with tenant_id column.
The FORCE option is critical because it ensures RLS policies apply to all users,
including the table owner and administrators (which is often the user running Django).

Created: 2025-04-19
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

# Configure database environment variables if needed
db_name = os.environ.get('DB_NAME')
db_user = os.environ.get('DB_USER')
db_password = os.environ.get('DB_PASSWORD')
db_host = os.environ.get('DB_HOST')
db_port = os.environ.get('DB_PORT', '5432')

# If environment variables are missing, set defaults
if not db_name:
    print("DB environment variables not found. Setting from defaults...")
    os.environ['DB_NAME'] = 'dott_main'
    os.environ['DB_USER'] = 'dott_admin'
    os.environ['DB_PASSWORD'] = 'RRfXU6uPPUbBEg1JqGTJ'
    os.environ['DB_HOST'] = 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'
    os.environ['DB_PORT'] = '5432'

# Set up logging
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"rls_force_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_force_fix')

try:
    import psycopg2

    # Connect directly to PostgreSQL
    conn = psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ['DB_HOST'],
        port=os.environ['DB_PORT']
    )
    
    conn.autocommit = True
    print(f"Connected to PostgreSQL database: {os.environ['DB_NAME']} on {os.environ['DB_HOST']}")
    
    # First check if the user has sufficient permissions
    with conn.cursor() as cur:
        cur.execute("SELECT current_user, session_user")
        result = cur.fetchone()
        if result:
            current_user, session_user = result
            print(f"Current user: {current_user}, Session user: {session_user}")
        else:
            print("Warning: Could not retrieve current user information")
            current_user = "unknown"
            session_user = "unknown"
        
        # Get list of tables with tenant_id column
        cur.execute("""
        SELECT table_name
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
        AND table_schema = 'public'
        ORDER BY table_name;
        """)
        
        tenant_tables = [row[0] for row in cur.fetchall()]
        print(f"Found {len(tenant_tables)} tables with tenant_id column")
        
        # Check which tables already have RLS enabled and forced
        cur.execute("""
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename = ANY(%s) AND schemaname = 'public'
        """, [tenant_tables])
        
        rls_status = cur.fetchall()
        enabled_tables = {table: enabled for table, enabled in rls_status}
        
        # Apply FORCE ROW LEVEL SECURITY to all tables
        success_count = 0
        for table in tenant_tables:
            try:
                # Check if table exists first
                cur.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                )
                """, [table])
                
                result = cur.fetchone()
                if not result or not result[0]:
                    print(f"Warning: Table {table} does not exist, skipping")
                    continue
                
                # Force RLS to apply to all users, including owner
                cur.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                cur.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
                
                # Recreate the tenant isolation policy to ensure it's up to date
                cur.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
                
                # Direct use of current_setting for the policy
                cur.execute(f"""
                CREATE POLICY tenant_isolation_policy ON {table}
                FOR ALL
                USING (
                    tenant_id::text = current_setting('app.current_tenant_id', TRUE) OR 
                    current_setting('app.current_tenant_id', TRUE) = 'unset'
                );
                """)
                
                success_count += 1
                print(f"Applied FORCE RLS and updated policy on table: {table}")
            except Exception as e:
                print(f"Error applying FORCE RLS to {table}: {e}")
        
        print(f"Successfully applied FORCE RLS to {success_count} of {len(tenant_tables)} tables")
        
        # Test the test tables directly with different session parameters
        print("\nTesting RLS isolation on test tables:")
        
        # Test rls_test_table with session parameters
        print("\nTesting rls_test_table:")
        
        # Admin view (unset)
        try:
            cur.execute("SET app.current_tenant_id TO 'unset';")
            cur.execute("SELECT COUNT(*) FROM rls_test_table;")
            result = cur.fetchone()
            unset_count = result[0] if result else None
            print(f"Admin (unset) view: {unset_count if unset_count is not None else 'unknown'} rows (expected 4)")
            
            # Tenant1 view
            cur.execute("SET app.current_tenant_id TO 'tenant1';")
            cur.execute("SELECT COUNT(*) FROM rls_test_table;")
            result = cur.fetchone()
            tenant1_count = result[0] if result else None
            print(f"Tenant1 view: {tenant1_count if tenant1_count is not None else 'unknown'} rows (expected 2)")
            
            # Tenant2 view
            cur.execute("SET app.current_tenant_id TO 'tenant2';")
            cur.execute("SELECT COUNT(*) FROM rls_test_table;")
            result = cur.fetchone()
            tenant2_count = result[0] if result else None
            print(f"Tenant2 view: {tenant2_count if tenant2_count is not None else 'unknown'} rows (expected 1)")
            
            # Nonexistent tenant
            cur.execute("SET app.current_tenant_id TO 'nonexistent';")
            cur.execute("SELECT COUNT(*) FROM rls_test_table;")
            result = cur.fetchone()
            nonexistent_count = result[0] if result else None
            print(f"Nonexistent tenant view: {nonexistent_count if nonexistent_count is not None else 'unknown'} rows (expected 0)")
            
            if all(x is not None for x in [unset_count, tenant1_count, tenant2_count, nonexistent_count]):
                text_isolation_passed = (
                    unset_count == 4 and 
                    tenant1_count == 2 and 
                    tenant2_count == 1 and
                    nonexistent_count == 0
                )
                
                if text_isolation_passed:
                    print("✅ TEXT-based RLS isolation test passed!")
                else:
                    print("❌ TEXT-based RLS isolation test failed!")
                    print(f"Expected counts: Admin=4, Tenant1=2, Tenant2=1, Nonexistent=0")
                    print(f"Actual counts: Admin={unset_count}, Tenant1={tenant1_count}, Tenant2={tenant2_count}, Nonexistent={nonexistent_count}")
            else:
                print("⚠️ Could not complete TEXT-based RLS isolation test due to missing data")
        except Exception as e:
            print(f"Error testing text-based RLS isolation: {e}")
        
        # Test UUID table
        print("\nTesting rls_uuid_test:")
        
        try:
            # Admin view (unset)
            cur.execute("SET app.current_tenant_id TO 'unset';")
            cur.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            result = cur.fetchone()
            unset_count = result[0] if result else None
            print(f"Admin (unset) view: {unset_count if unset_count is not None else 'unknown'} rows (expected 4)")
            
            # Tenant1 UUID view
            cur.execute("SET app.current_tenant_id TO '11111111-1111-1111-1111-111111111111';")
            cur.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            result = cur.fetchone()
            tenant1_count = result[0] if result else None
            print(f"Tenant1 UUID view: {tenant1_count if tenant1_count is not None else 'unknown'} rows (expected 2)")
            
            # Tenant2 UUID view
            cur.execute("SET app.current_tenant_id TO '22222222-2222-2222-2222-222222222222';")
            cur.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            result = cur.fetchone()
            tenant2_count = result[0] if result else None
            print(f"Tenant2 UUID view: {tenant2_count if tenant2_count is not None else 'unknown'} rows (expected 1)")
            
            # Nonexistent UUID tenant
            cur.execute("SET app.current_tenant_id TO '99999999-9999-9999-9999-999999999999';")
            cur.execute("SELECT COUNT(*) FROM rls_uuid_test;")
            result = cur.fetchone()
            nonexistent_count = result[0] if result else None
            print(f"Nonexistent UUID tenant view: {nonexistent_count if nonexistent_count is not None else 'unknown'} rows (expected 0)")
            
            if all(x is not None for x in [unset_count, tenant1_count, tenant2_count, nonexistent_count]):
                uuid_isolation_passed = (
                    unset_count == 4 and 
                    tenant1_count == 2 and 
                    tenant2_count == 1 and
                    nonexistent_count == 0
                )
                
                if uuid_isolation_passed:
                    print("✅ UUID-based RLS isolation test passed!")
                else:
                    print("❌ UUID-based RLS isolation test failed!")
                    print(f"Expected counts: Admin=4, Tenant1=2, Tenant2=1, Nonexistent=0")
                    print(f"Actual counts: Admin={unset_count}, Tenant1={tenant1_count}, Tenant2={tenant2_count}, Nonexistent={nonexistent_count}")
            else:
                print("⚠️ Could not complete UUID-based RLS isolation test due to missing data")

            if text_isolation_passed and uuid_isolation_passed:
                print("\n✅ FORCE RLS is properly applied and working!")
            else:
                print("\n⚠️ WARNING: RLS isolation is still not working correctly despite FORCE being applied.")
                print("This suggests there might be an issue with the user permissions or PostgreSQL configuration.")
                
                # Check for table owner
                cur.execute("""
                SELECT t.tablename, t.tableowner
                FROM pg_tables t
                WHERE t.tablename IN ('rls_test_table', 'rls_uuid_test') AND t.schemaname = 'public';
                """)
                
                owners = cur.fetchall()
                print("\nTable ownership:")
                for table, owner in owners:
                    print(f"Table {table} is owned by: {owner}")
        except Exception as e:
            print(f"Error testing UUID-based RLS isolation: {e}")

except ImportError:
    print("Error: psycopg2 module not installed. Install with 'pip install psycopg2-binary'")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if 'conn' in locals():
        conn.close()
        print("Database connection closed")

print(f"\nCheck the log file for more details: {LOG_FILE}") 