#!/usr/bin/env python
"""
Direct database script to find and fix all duplicate tenants.
This script checks for tenants with the same name and marks duplicates as inactive.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
import uuid
from datetime import datetime
import re

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
            WHERE t.is_active = TRUE
            ORDER BY t.name, t.created_at
        """)
        return cursor.fetchall()

def update_user_tenant(conn, user_id, tenant_id):
    """Update a user's tenant ID"""
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE custom_auth_user 
            SET tenant_id = %s
            WHERE id = %s
        """, (tenant_id, user_id))

def mark_tenant_inactive(conn, tenant_id, name_suffix):
    """Mark a tenant as inactive and rename it"""
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE custom_auth_tenant
            SET is_active = FALSE, name = %s
            WHERE id = %s
        """, (name_suffix, tenant_id))

def find_duplicate_tenants(tenants):
    """Find tenants with the same name"""
    tenant_groups = {}
    
    for tenant in tenants:
        name = tenant['name']
        
        # Normalize the name to better match duplicates
        normalized_name = re.sub(r'\s+', ' ', name.strip().lower())
        
        if normalized_name not in tenant_groups:
            tenant_groups[normalized_name] = []
        
        tenant_groups[normalized_name].append(tenant)
    
    # Filter to only groups with duplicates
    duplicate_groups = {name: tenants for name, tenants in tenant_groups.items() if len(tenants) > 1}
    
    return duplicate_groups

def fix_duplicate_tenants(conn, duplicate_groups):
    """Fix duplicate tenants by keeping the oldest and marking others as inactive"""
    users = list_all_users(conn)
    users_by_id = {user['id']: user for user in users}
    users_updated = set()
    tenants_deactivated = 0
    
    print(f"\nFound {len(duplicate_groups)} groups of duplicate tenants:")
    
    for name, tenants in duplicate_groups.items():
        # Sort by creation date (oldest first)
        sorted_tenants = sorted(tenants, key=lambda t: t['created_at'])
        primary_tenant = sorted_tenants[0]
        duplicate_tenants = sorted_tenants[1:]
        
        print(f"\n=== Group: {name} ===")
        print(f"  Primary tenant (will be kept): {primary_tenant['id']} - {primary_tenant['name']}")
        print(f"  Duplicates to mark inactive: {len(duplicate_tenants)}")
        
        # Identify affected users
        affected_users = []
        for user in users:
            if user['tenant_id'] in [t['id'] for t in duplicate_tenants]:
                affected_users.append(user)
        
        if affected_users:
            print(f"  Found {len(affected_users)} users to update:")
            for user in affected_users:
                print(f"    - User: {user['email']} (ID: {user['id']})")
                print(f"      Current tenant ID: {user['tenant_id']}")
                print(f"      Will be updated to: {primary_tenant['id']}")
        
        if not DRY_RUN:
            # Update affected users
            for user in affected_users:
                update_user_tenant(conn, user['id'], primary_tenant['id'])
                users_updated.add(user['id'])
                print(f"  Updated user {user['email']} to use primary tenant {primary_tenant['id']}")
            
            # Mark duplicate tenants as inactive
            for dup in duplicate_tenants:
                new_name = f"{dup['name']} (DUPLICATE-{dup['id']})"
                mark_tenant_inactive(conn, dup['id'], new_name)
                tenants_deactivated += 1
                print(f"  Marked tenant {dup['id']} as inactive and renamed to '{new_name}'")
    
    return len(users_updated), tenants_deactivated

def main():
    """Main function to run the script"""
    print("\n=== DUPLICATE TENANT RESOLUTION SCRIPT ===")
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'LIVE RUN'}")
    print("========================================\n")
    
    # Connect to the database
    conn = connect_to_db()
    
    try:
        # Get all active tenants
        tenants = get_all_tenants(conn)
        print(f"Found {len(tenants)} active tenants in the database.")
        
        # Find duplicate tenants
        duplicate_groups = find_duplicate_tenants(tenants)
        
        if not duplicate_groups:
            print("\nNo duplicate tenants found. Nothing to do.")
            return
        
        # Fix duplicate tenants
        users_updated, tenants_deactivated = fix_duplicate_tenants(conn, duplicate_groups)
        
        if DRY_RUN:
            print("\n*** DRY RUN MODE - No changes were applied ***")
            print("To apply these changes, set DRY_RUN = False in the script and run again.")
        else:
            conn.commit()
            print("\n=== Changes committed successfully ===")
            print(f"Users updated: {users_updated}")
            print(f"Tenants deactivated: {tenants_deactivated}")
            
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main() 