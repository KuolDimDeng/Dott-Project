#!/usr/bin/env python
"""
Simple script to test RLS functionality without Django dependencies.
This script connects directly to PostgreSQL and tests RLS policies.
"""

import psycopg2
import uuid

def main():
    # Database connection parameters
    params = {
        'dbname': input("Database name [pyfactor]: ") or 'pyfactor',
        'user': input("Database user [postgres]: ") or 'postgres',
        'password': input("Database password: ") or '',
        'host': input("Database host [localhost]: ") or 'localhost',
        'port': input("Database port [5432]: ") or '5432'
    }
    
    print(f"\nConnecting to PostgreSQL database: {params['dbname']} on {params['host']}:{params['port']}")
    
    try:
        # Connect to the database
        conn = psycopg2.connect(**params)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected successfully!")
        
        # Create test table if it doesn't exist
        print("\nSetting up test table...")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS rls_test (
            id SERIAL PRIMARY KEY,
            tenant_id UUID NOT NULL,
            name TEXT NOT NULL
        );
        """)
        
        # Enable RLS on the table
        print("Enabling RLS on test table...")
        cur.execute("ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;")
        
        # Create RLS policy
        print("Creating RLS policy...")
        cur.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test;")
        cur.execute("""
        CREATE POLICY tenant_isolation_policy ON rls_test
        USING (
            tenant_id::text = current_setting('app.current_tenant_id', TRUE)
            OR current_setting('app.current_tenant_id', TRUE) = 'unset'
        );
        """)
        
        # Create tenant IDs for testing
        tenant1_id = str(uuid.uuid4())  # Convert to string
        tenant2_id = str(uuid.uuid4())  # Convert to string
        
        # Clear existing data
        print("Clearing existing test data...")
        cur.execute("DELETE FROM rls_test;")
        
        # Insert test data - using UUID strings
        print(f"Inserting test data for tenant {tenant1_id}")
        cur.execute("""
            INSERT INTO rls_test (tenant_id, name) 
            VALUES (UUID(%s), %s), (UUID(%s), %s)
        """, (tenant1_id, "Tenant 1 - Record 1", tenant1_id, "Tenant 1 - Record 2"))
        
        print(f"Inserting test data for tenant {tenant2_id}")
        cur.execute("""
            INSERT INTO rls_test (tenant_id, name) 
            VALUES (UUID(%s), %s), (UUID(%s), %s)
        """, (tenant2_id, "Tenant 2 - Record 1", tenant2_id, "Tenant 2 - Record 2"))
        
        # Test RLS with different tenant contexts
        print("\n--- Testing RLS policies ---")
        
        # Test with no tenant context (should see all records)
        print("\nTest with no tenant context (unset):")
        cur.execute("SET app.current_tenant_id TO 'unset';")
        cur.execute("SELECT * FROM rls_test ORDER BY id;")
        print_results(cur)
        
        # Test with tenant 1
        print(f"\nTest with tenant 1 ({tenant1_id}):")
        cur.execute(f"SET app.current_tenant_id TO '{tenant1_id}';")
        cur.execute("SELECT * FROM rls_test ORDER BY id;")
        print_results(cur)
        
        # Test with tenant 2
        print(f"\nTest with tenant 2 ({tenant2_id}):")
        cur.execute(f"SET app.current_tenant_id TO '{tenant2_id}';")
        cur.execute("SELECT * FROM rls_test ORDER BY id;")
        print_results(cur)
        
        print("\nRLS test completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

def print_results(cursor):
    rows = cursor.fetchall()
    if not rows:
        print("  No records found")
        return
        
    for row in rows:
        print(f"  ID: {row[0]}, Tenant: {row[1]}, Name: {row[2]}")

if __name__ == "__main__":
    main() 