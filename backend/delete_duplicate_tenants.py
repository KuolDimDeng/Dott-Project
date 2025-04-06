#!/usr/bin/env python
"""
Direct database script to delete tenants marked as duplicates.
This script finds tenants with '(DUPLICATE-' in their name and deletes them.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor

# Set this to False to apply changes
DRY_RUN = True

# Database connection parameters
DB_NAME = "dott_main"
DB_USER = "dott_admin"
DB_PASSWORD = "RRfXU6uPPUbBEg1JqGTJ"
DB_HOST = "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
DB_PORT = "5432"

def connect_to_db():
    """Connect to the PostgreSQL database server"""
    try:
        # connect to the PostgreSQL server
        print('Connecting to the PostgreSQL database...')
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except (Exception, psycopg2.DatabaseError) as error:
        print(f"Error connecting to the database: {error}")
        sys.exit(1)

def get_duplicate_tenants(conn):
    """Get all tenants marked as duplicates"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT t.id, t.schema_name, t.name, t.created_at, t.is_active, t.owner_id 
            FROM custom_auth_tenant t
            WHERE t.name LIKE '%(DUPLICATE-%)'
            ORDER BY t.name
        """)
        return cursor.fetchall()

def delete_tenant(conn, tenant_id):
    """Delete a tenant by ID"""
    with conn.cursor() as cursor:
        cursor.execute("""
            DELETE FROM custom_auth_tenant
            WHERE id = %s
        """, (tenant_id,))
        return cursor.rowcount

def main():
    """Main function to run the script"""
    print("\n=== DUPLICATE TENANT DELETION SCRIPT ===")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE RUN'}")
    print("=======================================\n")
    
    # Connect to the database
    conn = connect_to_db()
    
    try:
        # Get all duplicate tenants
        duplicate_tenants = get_duplicate_tenants(conn)
        
        if not duplicate_tenants:
            print("No tenants marked as duplicates found. Nothing to delete.")
            return
        
        print(f"Found {len(duplicate_tenants)} tenants marked as duplicates:\n")
        
        # Display the tenants to be deleted
        for i, tenant in enumerate(duplicate_tenants, 1):
            print(f"  {i}. ID: {tenant['id']}")
            print(f"     Name: {tenant['name']}")
            print(f"     Schema: {tenant['schema_name']}")
            print(f"     Created: {tenant['created_at']}")
            print(f"     Active: {tenant['is_active']}")
            print(f"     Owner ID: {tenant['owner_id']}")
            print()
        
        if DRY_RUN:
            print("*** DRY RUN MODE - No changes will be applied ***")
            print("To delete these tenants, set DRY_RUN = False in the script and run again.")
            return
        
        # Delete the duplicate tenants
        deleted_count = 0
        for tenant in duplicate_tenants:
            rows_affected = delete_tenant(conn, tenant['id'])
            if rows_affected > 0:
                deleted_count += 1
                print(f"Deleted tenant {tenant['id']} - {tenant['name']}")
        
        # Commit the changes
        conn.commit()
        print(f"\nSuccessfully deleted {deleted_count} duplicate tenants.")
            
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main() 