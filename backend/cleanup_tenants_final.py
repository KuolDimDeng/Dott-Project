#!/usr/bin/env python
"""
Script to keep only one primary Juba Made It tenant and delete all others.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
import argparse

# Database connection parameters
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

# Primary tenant ID to keep (the oldest Juba Made It tenant from the logs)
PRIMARY_TENANT_ID = "7b09156a-c6e3-49e5-a9ff-f0aa0dea6007"

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        # Connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = False  # We want transactions
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        sys.exit(1)

def get_tenant_info(conn, tenant_id):
    """Get information about a specific tenant"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, name, schema_name, owner_id, created_at, is_active
            FROM custom_auth_tenant 
            WHERE id = %s
        """, (tenant_id,))
        return cursor.fetchone()

def get_all_tenants(conn):
    """Get all tenants from the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, name, schema_name, owner_id, created_at, is_active
            FROM custom_auth_tenant
            ORDER BY created_at
        """)
        return cursor.fetchall()

def update_user_tenant_ids(conn, old_tenant_id, new_tenant_id):
    """Update users from old tenant to new tenant"""
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE custom_auth_user
            SET tenant_id = %s
            WHERE tenant_id = %s
            RETURNING id
        """, (new_tenant_id, old_tenant_id))
        return cursor.rowcount

def delete_tenant(conn, tenant_id):
    """Delete a tenant by ID"""
    with conn.cursor() as cursor:
        try:
            # First try to drop the schema if it exists
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            cursor.execute(f"""
                DROP SCHEMA IF EXISTS {schema_name} CASCADE
            """)
            
            # Then delete the tenant record
            cursor.execute("""
                DELETE FROM custom_auth_tenant
                WHERE id = %s
            """, (tenant_id,))
            return cursor.rowcount
        except Exception as e:
            print(f"Error deleting tenant {tenant_id}: {e}")
            return 0

def main(dry_run=True):
    """Main function"""
    print("\n=== FINAL TENANT CLEANUP ===")
    print(f"Mode: {'DRY RUN - No changes will be made' if dry_run else 'LIVE RUN - Changes will be applied'}")
    print("==============================\n")
    
    conn = connect_to_db()
    try:
        # Get primary tenant info
        primary_tenant = get_tenant_info(conn, PRIMARY_TENANT_ID)
        if not primary_tenant:
            print(f"Error: Primary tenant {PRIMARY_TENANT_ID} not found!")
            return
        
        print(f"Primary tenant to keep: {primary_tenant['name']} (ID: {primary_tenant['id']})")
        print(f"  Owner ID: {primary_tenant['owner_id']}")
        print(f"  Schema: {primary_tenant['schema_name']}")
        print(f"  Created: {primary_tenant['created_at']}")
        print(f"  Active: {primary_tenant['is_active']}")
        
        # Get all tenants
        all_tenants = get_all_tenants(conn)
        tenants_to_delete = [t for t in all_tenants if t['id'] != PRIMARY_TENANT_ID]
        
        if not tenants_to_delete:
            print("\nNo other tenants to delete.")
            return
        
        print(f"\nFound {len(tenants_to_delete)} other tenants to delete:")
        for i, tenant in enumerate(tenants_to_delete, 1):
            print(f"  {i}. ID: {tenant['id']}")
            print(f"     Name: {tenant['name']}")
            print(f"     Owner ID: {tenant['owner_id']}")
            print(f"     Schema: {tenant['schema_name']}")
            print(f"     Created: {tenant['created_at']}")
            print(f"     Active: {tenant['is_active']}")
            print()
        
        if dry_run:
            print("\nDRY RUN - No changes made.")
            return
        
        # Process each tenant to delete
        total_users_updated = 0
        deleted_tenants = 0
        
        for tenant in tenants_to_delete:
            # First update any users associated with this tenant
            users_updated = update_user_tenant_ids(conn, tenant['id'], PRIMARY_TENANT_ID)
            if users_updated:
                print(f"Updated {users_updated} users from tenant {tenant['id']} to primary tenant")
                total_users_updated += users_updated
            
            # Then delete the tenant
            if delete_tenant(conn, tenant['id']):
                print(f"Deleted tenant: {tenant['id']} ({tenant['name']})")
                deleted_tenants += 1
        
        # Commit all changes
        conn.commit()
        
        print(f"\nSUMMARY:")
        print(f"  Updated {total_users_updated} users to use primary tenant")
        print(f"  Deleted {deleted_tenants} tenants")
        print(f"  Remaining tenant: {primary_tenant['name']} (ID: {primary_tenant['id']})")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during execution: {e}")
        raise
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Keep one primary tenant and delete all others")
    parser.add_argument("--live", action="store_true", help="Run in live mode (apply changes)")
    args = parser.parse_args()
    
    try:
        main(dry_run=not args.live)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1) 