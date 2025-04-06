#!/usr/bin/env python
"""
Direct database script to delete all tenants except the primary Juba Made It tenant.
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

# ID of the primary Juba Made It tenant to keep
PRIMARY_TENANT_ID = "7b09156a-c6e3-49e5-a9ff-f0aa0dea6007"

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

def get_primary_tenant(conn, tenant_id):
    """Get the primary tenant we want to keep"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, schema_name, name, created_at, is_active, owner_id 
            FROM custom_auth_tenant
            WHERE id = %s
        """, (tenant_id,))
        return cursor.fetchone()

def get_all_other_tenants(conn, tenant_id):
    """Get all tenants except the primary one"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, schema_name, name, created_at, is_active, owner_id 
            FROM custom_auth_tenant
            WHERE id != %s
            ORDER BY name, created_at
        """, (tenant_id,))
        return cursor.fetchall()

def delete_tenant(conn, tenant_id):
    """Delete a tenant by ID"""
    with conn.cursor() as cursor:
        cursor.execute("""
            DELETE FROM custom_auth_tenant
            WHERE id = %s
        """, (tenant_id,))
        return cursor.rowcount

def update_user_tenants(conn, primary_tenant_id):
    """Update all users to use the primary tenant"""
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE custom_auth_user
            SET tenant_id = %s
            WHERE tenant_id != %s
        """, (primary_tenant_id, primary_tenant_id))
        return cursor.rowcount

def main():
    """Main function to run the script"""
    print("\n=== DELETE ALL TENANTS EXCEPT PRIMARY TENANT ===")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE RUN'}")
    print("==============================================\n")
    
    # Connect to the database
    conn = connect_to_db()
    
    try:
        # Get the primary tenant
        primary_tenant = get_primary_tenant(conn, PRIMARY_TENANT_ID)
        
        if not primary_tenant:
            print(f"ERROR: Primary tenant with ID {PRIMARY_TENANT_ID} not found!")
            return
        
        print(f"Primary tenant to keep: {primary_tenant['name']} (ID: {primary_tenant['id']})")
        
        # Get all other tenants
        other_tenants = get_all_other_tenants(conn, PRIMARY_TENANT_ID)
        
        if not other_tenants:
            print("No other tenants found. Nothing to delete.")
            return
        
        print(f"\nFound {len(other_tenants)} other tenants to delete:")
        
        # Display the tenants to be deleted
        for i, tenant in enumerate(other_tenants, 1):
            print(f"  {i}. ID: {tenant['id']}")
            print(f"     Name: {tenant['name']}")
            print(f"     Schema: {tenant['schema_name']}")
            print(f"     Created: {tenant['created_at']}")
            print(f"     Active: {tenant['is_active']}")
            print(f"     Owner ID: {tenant['owner_id']}")
            print()
        
        if DRY_RUN:
            print("*** DRY RUN MODE - No changes will be applied ***")
            print("To apply these changes, set DRY_RUN = False in the script and run again.")
            return
        
        # First update all users to use the primary tenant
        updated_users = update_user_tenants(conn, PRIMARY_TENANT_ID)
        print(f"Updated {updated_users} users to use the primary tenant.")
        
        # Then delete all other tenants
        deleted_count = 0
        for tenant in other_tenants:
            rows_affected = delete_tenant(conn, tenant['id'])
            if rows_affected > 0:
                deleted_count += 1
                print(f"Deleted tenant {tenant['id']} - {tenant['name']}")
        
        # Commit the changes
        conn.commit()
        print(f"\nSuccessfully deleted {deleted_count} tenants.")
            
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main() 