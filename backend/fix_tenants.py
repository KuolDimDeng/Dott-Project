#!/usr/bin/env python
"""
Direct database script to find and fix duplicate tenants.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
import uuid
from datetime import datetime

# Set this to False to apply changes
DRY_RUN = True

# Database connection parameters from settings.py
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

def list_all_users(conn):
    """List all users in the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, email, tenant_id 
            FROM custom_auth_user 
            ORDER BY email
        """)
        return cursor.fetchall()

def get_all_tenants(conn):
    """Get all tenants in the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT t.id, t.schema_name, t.name, t.created_at, t.is_active, t.owner_id 
            FROM custom_auth_tenant t
            ORDER BY t.name, t.created_at
        """)
        return cursor.fetchall()

def get_tenants_by_exact_name(conn, exact_name):
    """Get all tenants with the exact name"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT t.id, t.schema_name, t.name, t.created_at, t.is_active, t.owner_id 
            FROM custom_auth_tenant t
            WHERE t.name = %s
            ORDER BY t.created_at
        """, (exact_name,))
        return cursor.fetchall()

def main():
    """Main function to run the script"""
    print("\n=== TENANT DUPLICATE RESOLUTION SCRIPT ===")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE RUN'}")
    print("=======================================\n")
    
    # Connect to the database
    conn = connect_to_db()
    
    try:
        # List all users for context
        users = list_all_users(conn)
        print(f"Found {len(users)} total users in the database:")
        for user in users:
            print(f"  - ID: {user['id']}")
            print(f"    Email: {user['email']}")
            print(f"    Tenant ID: {user['tenant_id']}")
            print()
        
        # Get all "Juba Made It" tenants
        target_name = "Juba Made It"
        print(f"\nLooking for tenants with the exact name '{target_name}'...")
        matching_tenants = get_tenants_by_exact_name(conn, target_name)
        
        if not matching_tenants:
            print(f"No tenants found with the name '{target_name}'.")
            return
        
        print(f"\n=== Found {len(matching_tenants)} matching tenants ===")
        
        # Display matching tenants
        for i, tenant in enumerate(matching_tenants, 1):
            print(f"  {i}. ID: {tenant['id']}")
            print(f"     Name: {tenant['name']}")
            print(f"     Schema: {tenant['schema_name']}")
            print(f"     Created: {tenant['created_at']}")
            print(f"     Active: {tenant['is_active']}")
            print(f"     Owner ID: {tenant['owner_id']}")
        
        # Sort tenants by creation date
        sorted_tenants = sorted(matching_tenants, key=lambda t: t['created_at'])
        
        if len(sorted_tenants) < 2:
            print("\nNot enough matching tenants found to perform deduplication.")
            return
        
        primary_tenant = sorted_tenants[0]
        duplicate_tenants = sorted_tenants[1:]
        
        print(f"\nPrimary tenant (will be kept): {primary_tenant['id']} - {primary_tenant['name']}")
        print(f"Duplicates to mark inactive: {len(duplicate_tenants)}")
        
        # Find user IDs that have any of these tenants as their tenant_id
        affected_users = []
        for user in users:
            if user['tenant_id'] in [t['id'] for t in matching_tenants]:
                affected_users.append(user)
        
        if not affected_users:
            print("\nNo users found that are associated with any of the matching tenants.")
            print("Unable to update user-tenant relationships.")
        else:
            print(f"\nFound {len(affected_users)} users that will be updated:")
            for user in affected_users:
                print(f"  - User: {user['email']} (ID: {user['id']})")
                print(f"    Current tenant ID: {user['tenant_id']}")
                print(f"    Will be updated to: {primary_tenant['id']}")
        
        if DRY_RUN:
            print("\n*** DRY RUN MODE - No changes will be applied ***")
            print("To apply these changes, set DRY_RUN = False in the script and run again.")
            return
        
        # Apply changes
        with conn.cursor() as cursor:
            # Update all affected users to use the primary tenant
            for user in affected_users:
                cursor.execute("""
                    UPDATE custom_auth_user 
                    SET tenant_id = %s
                    WHERE id = %s
                """, (primary_tenant['id'], user['id']))
                
                print(f"Updated user {user['email']} to use primary tenant {primary_tenant['id']}")
            
            # Mark duplicate tenants as inactive
            for dup in duplicate_tenants:
                new_name = f"{dup['name']} (DUPLICATE-{dup['id']})"
                cursor.execute("""
                    UPDATE custom_auth_tenant
                    SET is_active = FALSE, name = %s
                    WHERE id = %s
                """, (new_name, dup['id']))
                
                print(f"Marked tenant {dup['id']} as inactive and renamed to '{new_name}'")
            
            # Commit the changes
            conn.commit()
            print("\nChanges committed successfully")
            
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main() 