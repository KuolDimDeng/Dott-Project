#!/usr/bin/env python
"""
Script to verify the database state after cleanup.
"""

import psycopg2
from psycopg2.extras import DictCursor
import sys

# Database connection parameters
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

# Primary tenant ID we kept
PRIMARY_TENANT_ID = "7b09156a-c6e3-49e5-a9ff-f0aa0dea6007"

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**DB_PARAMS)
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        sys.exit(1)

def verify_tenants(conn):
    """Verify tenant state."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        # Check if we have only one tenant
        cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant")
        count = cursor.fetchone()[0]
        
        print(f"Total tenants in database: {count}")
        if count != 1:
            print(f"WARNING: Expected 1 tenant, found {count}")
        
        # Get information about the primary tenant
        cursor.execute("""
            SELECT id, name, owner_id, schema_name, created_at, is_active
            FROM custom_auth_tenant
            WHERE id = %s
        """, (PRIMARY_TENANT_ID,))
        
        tenant = cursor.fetchone()
        if tenant:
            print("\nPrimary tenant details:")
            print(f"  ID: {tenant['id']}")
            print(f"  Name: {tenant['name']}")
            print(f"  Owner ID: {tenant['owner_id']}")
            print(f"  Schema: {tenant['schema_name']}")
            print(f"  Created: {tenant['created_at']}")
            print(f"  Active: {tenant['is_active']}")
        else:
            print(f"ERROR: Primary tenant {PRIMARY_TENANT_ID} not found!")
        
        # List any other tenants
        cursor.execute("""
            SELECT id, name, owner_id, schema_name
            FROM custom_auth_tenant
            WHERE id != %s
        """, (PRIMARY_TENANT_ID,))
        
        others = cursor.fetchall()
        if others:
            print("\nWARNING: Found other tenants that should have been deleted:")
            for tenant in others:
                print(f"  - {tenant['id']} ({tenant['name']})")

def verify_users(conn):
    """Verify user state."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        # Get all users and their tenant IDs
        cursor.execute("""
            SELECT id, email, tenant_id
            FROM custom_auth_user
        """)
        
        users = cursor.fetchall()
        print(f"\nTotal users: {len(users)}")
        
        # Check if all users have the primary tenant ID
        non_primary_users = [u for u in users if u['tenant_id'] != PRIMARY_TENANT_ID]
        
        if non_primary_users:
            print(f"WARNING: Found {len(non_primary_users)} users not associated with primary tenant:")
            for user in non_primary_users:
                print(f"  - User {user['email']} (ID: {user['id']}) has tenant_id: {user['tenant_id']}")
        else:
            print("All users are correctly associated with the primary tenant")

def main():
    """Main function."""
    print("\n=== DATABASE VERIFICATION AFTER CLEANUP ===")
    print("=========================================\n")
    
    conn = connect_to_db()
    try:
        verify_tenants(conn)
        verify_users(conn)
        
        print("\nVerification complete.")
        
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        conn.close()
        print("\nDatabase connection closed.")

if __name__ == "__main__":
    main() 