#!/usr/bin/env python
"""
Script to delete ALL tenants in the database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
import argparse
import datetime

# Database connection parameters - update these with your actual DB credentials
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        # Connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(
            dbname=DB_PARAMS['dbname'],
            user=DB_PARAMS['user'],
            password=DB_PARAMS['password'],
            host=DB_PARAMS['host'],
            port=DB_PARAMS['port']
        )
        conn.autocommit = False  # We want transactions
        return conn
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        sys.exit(1)

def get_all_tenants(conn):
    """Get all tenants from the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, name, schema_name, owner_id, created_at, is_active
            FROM custom_auth_tenant
            ORDER BY created_at
        """)
        return cursor.fetchall()

def delete_tenant_data(conn, tenant_id, schema_name):
    """Delete a tenant's schema and all its data"""
    with conn.cursor() as cursor:
        try:
            # Drop the schema if it exists
            cursor.execute(f"""
                DROP SCHEMA IF EXISTS {schema_name} CASCADE
            """)
            print(f"  ✓ Dropped schema {schema_name}")
            return True
        except Exception as e:
            print(f"  ✗ Error dropping schema {schema_name}: {e}")
            return False

def delete_tenant_record(conn, tenant_id):
    """Delete a tenant record from the custom_auth_tenant table"""
    success = True
    with conn.cursor() as cursor:
        try:
            # First delete from tenant_users table to resolve foreign key constraint
            cursor.execute("""
                DELETE FROM tenant_users
                WHERE tenant_id = %s
                RETURNING tenant_id
            """, (tenant_id,))
            deleted_tenant_users = cursor.rowcount
            print(f"  ✓ Deleted {deleted_tenant_users} records from tenant_users for tenant {tenant_id}")
            
            # Delete users associated with this tenant
            cursor.execute("""
                DELETE FROM custom_auth_user
                WHERE tenant_id = %s
                RETURNING id
            """, (tenant_id,))
            deleted_users = cursor.rowcount
            print(f"  ✓ Deleted {deleted_users} users associated with tenant {tenant_id}")
            
            # Check if custom_auth_tenant_users table exists before trying to delete from it
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'custom_auth_tenant_users'
                );
            """)
            table_exists = cursor.fetchone()[0]
            
            if table_exists:
                # Delete from custom_auth_tenant_users junction table
                cursor.execute("""
                    DELETE FROM custom_auth_tenant_users
                    WHERE tenant_id = %s
                    RETURNING tenant_id
                """, (tenant_id,))
                deleted_tenant_user_records = cursor.rowcount
                print(f"  ✓ Deleted {deleted_tenant_user_records} records from custom_auth_tenant_users for tenant {tenant_id}")
            else:
                print(f"  ℹ Table custom_auth_tenant_users does not exist, skipping")
            
            # Delete the tenant record
            cursor.execute("""
                DELETE FROM custom_auth_tenant
                WHERE id = %s
                RETURNING id
            """, (tenant_id,))
            if cursor.rowcount > 0:
                print(f"  ✓ Deleted tenant record {tenant_id}")
                return True
            else:
                print(f"  ✗ No tenant record found with ID {tenant_id}")
                return False
        except Exception as e:
            print(f"  ✗ Error deleting tenant record {tenant_id}: {e}")
            success = False
            
            # Continue with deleting the tenant record even if there were errors with related tables
            try:
                cursor.execute("""
                    DELETE FROM custom_auth_tenant
                    WHERE id = %s
                    RETURNING id
                """, (tenant_id,))
                if cursor.rowcount > 0:
                    print(f"  ✓ Deleted tenant record {tenant_id} after error recovery")
                    return True
                else:
                    print(f"  ✗ No tenant record found with ID {tenant_id} during error recovery")
                    return False
            except Exception as e2:
                print(f"  ✗ Error during recovery attempt: {e2}")
                return False
        
        return success

def main(dry_run=True, backup=True):
    """Main function"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    print("\n=== COMPLETE TENANT CLEANUP ===")
    print(f"Mode: {'DRY RUN - No changes will be made' if dry_run else 'LIVE RUN - Changes will be applied'}")
    print(f"Backup: {'Will create a backup file' if backup and not dry_run else 'No backup will be created'}")
    print("================================\n")
    
    conn = connect_to_db()
    try:
        # Get all tenants
        all_tenants = get_all_tenants(conn)
        
        if not all_tenants:
            print("No tenants found in the database.")
            return
        
        print(f"Found {len(all_tenants)} tenants to delete:")
        for i, tenant in enumerate(all_tenants, 1):
            print(f"  {i}. ID: {tenant['id']}")
            print(f"     Name: {tenant['name']}")
            print(f"     Schema: {tenant['schema_name']}")
            print(f"     Created: {tenant['created_at']}")
            
        # Create backup if requested and not dry run
        if backup and not dry_run:
            backup_file = f"tenant_backup_{timestamp}.csv"
            with open(backup_file, 'w') as f:
                f.write("id,name,schema_name,owner_id,created_at,is_active\n")
                for tenant in all_tenants:
                    f.write(f"{tenant['id']},{tenant['name']},{tenant['schema_name']}," +
                           f"{tenant['owner_id']},{tenant['created_at']},{tenant['is_active']}\n")
            print(f"\nCreated backup file: {backup_file}")
        
        if dry_run:
            print("\nDRY RUN - No changes made.")
            return
        
        # Confirm deletion
        confirm = input("\nAre you sure you want to delete ALL tenants? This cannot be undone! (yes/no): ")
        if confirm.lower() != 'yes':
            print("Operation cancelled by user.")
            return
        
        # Process each tenant to delete
        deleted_count = 0
        schema_deleted_count = 0
        
        for tenant in all_tenants:
            print(f"\nProcessing tenant: {tenant['id']} ({tenant['name']})")
            # First delete the schema and its data
            if delete_tenant_data(conn, tenant['id'], tenant['schema_name']):
                schema_deleted_count += 1
            
            # Then delete the tenant record
            if delete_tenant_record(conn, tenant['id']):
                deleted_count += 1
        
        # Commit all changes
        conn.commit()
        
        print(f"\nSUMMARY:")
        print(f"  Deleted {schema_deleted_count} tenant schemas")
        print(f"  Deleted {deleted_count} tenant records")
        print(f"  Database is now clean!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during execution: {e}")
        raise
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete ALL tenants in the database")
    parser.add_argument("--live", action="store_true", help="Run in live mode (apply changes)")
    parser.add_argument("--no-backup", action="store_true", help="Skip creating a backup file")
    args = parser.parse_args()
    
    try:
        main(dry_run=not args.live, backup=not args.no_backup)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1) 