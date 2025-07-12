#!/usr/bin/env python3
"""
Check RLS Enabled

This script verifies if Row Level Security is properly enabled at the PostgreSQL database level.
It directly checks PostgreSQL settings and permissions to identify potential issues.

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
LOG_FILE = LOG_DIR / f"rls_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_check')

# Try to establish a direct PostgreSQL connection without Django
try:
    import psycopg2
    import psycopg2.extras
    
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

    # Check PostgreSQL version
    with conn.cursor() as cur:
        cur.execute("SELECT version();")
        result = cur.fetchone()
        version = result[0] if result else "Unknown"
        print(f"PostgreSQL version: {version}")
        
        # Check if RLS is available in this version
        rls_available = False
        if version and "Postgres" in version:
            rls_available = (
                "9.5" in version or 
                "9.6" in version or 
                "10." in version or 
                "11." in version or 
                "12." in version or 
                "13." in version or 
                "14." in version or
                "15." in version or
                "16." in version
            )
        
        if not rls_available:
            print("⚠️ WARNING: PostgreSQL version might not support RLS. Version 9.5+ required.")
        
        # Check user permissions
        cur.execute("SELECT rolname, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = current_user;")
        role = cur.fetchone()
        if role:
            rolname, rolsuper, rolcreaterole, rolcreatedb = role
            
            print(f"Current user: {rolname}")
            print(f"Is superuser: {rolsuper}")
            print(f"Can create roles: {rolcreaterole}")
            print(f"Can create databases: {rolcreatedb}")
            
            if not rolsuper:
                print("⚠️ WARNING: Current user is not a superuser. This may limit RLS management capabilities.")
        else:
            print("⚠️ WARNING: Could not retrieve current user information")
        
        # Check if RLS is enabled on test tables
        cur.execute("""
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename IN ('rls_test_table', 'rls_uuid_test');
        """)
        
        test_tables = cur.fetchall()
        for table, rls_enabled in test_tables:
            print(f"Table {table} - RLS enabled: {rls_enabled}")
            
            if not rls_enabled:
                print(f"⚠️ WARNING: RLS is not enabled on test table {table}")
        
        # Check policies on test tables
        cur.execute("""
        SELECT tablename, polname, polcmd, polpermissive, polroles
        FROM pg_tables 
        JOIN pg_policy ON pg_policy.polrelid = (schemaname || '.' || tablename)::regclass
        WHERE tablename IN ('rls_test_table', 'rls_uuid_test');
        """)
        
        policies = cur.fetchall()
        if policies:
            print("\nRLS Policies on test tables:")
            for table, policy, cmd, permissive, roles in policies:
                print(f"Table: {table}, Policy: {policy}, Command: {cmd}, Permissive: {permissive}, Roles: {roles}")
        else:
            print("⚠️ WARNING: No policies found on test tables")
        
        # Test if settings are properly set
        print("\nTesting session parameters:")
        
        # Clear and set tenant context
        cur.execute("SET app.current_tenant_id TO 'unset';")
        cur.execute("SELECT current_setting('app.current_tenant_id', true);")
        result = cur.fetchone()
        unset_value = result[0] if result else None
        print(f"After SET to unset: {unset_value}")
        
        cur.execute("SET app.current_tenant_id TO 'tenant1';")
        cur.execute("SELECT current_setting('app.current_tenant_id', true);")
        result = cur.fetchone()
        tenant1_value = result[0] if result else None
        print(f"After SET to tenant1: {tenant1_value}")
        
        # Check table data
        print("\nDirect data access check:")
        cur.execute("SELECT tenant_id, value FROM rls_test_table;")
        rows = cur.fetchall()
        print(f"All rows in rls_test_table:")
        for row in rows:
            print(f"- Tenant: {row[0]}, Value: {row[1]}")
        
        # Test RLS directly
        print("\nDirectly testing RLS with session parameter:")
        
        # Admin view (unset)
        cur.execute("SET app.current_tenant_id TO 'unset';")
        cur.execute("SELECT COUNT(*) FROM rls_test_table;")
        result = cur.fetchone()
        unset_count = result[0] if result else None
        
        # Tenant1 view
        cur.execute("SET app.current_tenant_id TO 'tenant1';")
        cur.execute("SELECT COUNT(*) FROM rls_test_table;")
        result = cur.fetchone()
        tenant1_count = result[0] if result else None
        
        # Tenant2 view
        cur.execute("SET app.current_tenant_id TO 'tenant2';")
        cur.execute("SELECT COUNT(*) FROM rls_test_table;")
        result = cur.fetchone()
        tenant2_count = result[0] if result else None
        
        print(f"Admin (unset) view: {unset_count if unset_count is not None else 'unknown'} rows")
        print(f"Tenant1 view: {tenant1_count if tenant1_count is not None else 'unknown'} rows")
        print(f"Tenant2 view: {tenant2_count if tenant2_count is not None else 'unknown'} rows")
        
        if unset_count is not None and tenant1_count is not None and tenant2_count is not None:
            if unset_count != 4 or tenant1_count != 2 or tenant2_count != 1:
                print("⚠️ WARNING: RLS policies are not working correctly with session parameters")
                print(f"Expected counts: Admin=4, Tenant1=2, Tenant2=1")
                print(f"Actual counts: Admin={unset_count}, Tenant1={tenant1_count}, Tenant2={tenant2_count}")
            else:
                print("✅ RLS policies are working correctly with direct session parameters")
        else:
            print("⚠️ WARNING: Could not verify RLS policy effectiveness due to missing data")
            
        # Check the policy definition for one table
        cur.execute("""
        SELECT pg_get_expr(polqual, polrelid) as policy_definition
        FROM pg_policy
        WHERE polrelid = 'public.rls_test_table'::regclass;
        """)
        
        policy_def = cur.fetchone()
        if policy_def:
            print(f"\nRLS policy definition for rls_test_table: {policy_def[0]}")
        else:
            print("⚠️ WARNING: No policy definition found for rls_test_table")
        
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