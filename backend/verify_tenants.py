#!/usr/bin/env python
"""
Script to verify the current state of users and tenants in the database.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor

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

def get_all_tenants(conn):
    """Get all tenants in the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, schema_name, name, created_at, is_active, owner_id 
            FROM custom_auth_tenant
            ORDER BY name, created_at
        """)
        return cursor.fetchall()

def get_all_users(conn):
    """Get all users in the database"""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, email, tenant_id, is_active, date_joined
            FROM custom_auth_user
            ORDER BY email
        """)
        return cursor.fetchall()

def main():
    """Main function to run the script"""
    print("\n=== DATABASE VERIFICATION SCRIPT ===")
    print("==================================\n")
    
    # Connect to the database
    conn = connect_to_db()
    
    try:
        # Get all tenants
        tenants = get_all_tenants(conn)
        active_tenants = [t for t in tenants if t['is_active']]
        inactive_tenants = [t for t in tenants if not t['is_active']]
        
        print(f"Total tenants in database: {len(tenants)}")
        print(f"Active tenants: {len(active_tenants)}")
        print(f"Inactive tenants: {len(inactive_tenants)}")
        
        # Display all active tenants
        if active_tenants:
            print("\nActive tenants:")
            for i, tenant in enumerate(active_tenants, 1):
                print(f"  {i}. ID: {tenant['id']}")
                print(f"     Name: {tenant['name']}")
                print(f"     Schema: {tenant['schema_name']}")
                print(f"     Created: {tenant['created_at']}")
                print(f"     Owner ID: {tenant['owner_id']}")
                print()
        
        # Get all users
        users = get_all_users(conn)
        active_users = [u for u in users if u['is_active']]
        inactive_users = [u for u in users if not u['is_active']]
        
        print(f"\nTotal users in database: {len(users)}")
        print(f"Active users: {len(active_users)}")
        print(f"Inactive users: {len(inactive_users)}")
        
        # Display all active users
        if active_users:
            print("\nActive users:")
            for i, user in enumerate(active_users, 1):
                tenant_info = ""
                for tenant in tenants:
                    if tenant['id'] == user['tenant_id']:
                        tenant_info = f"{tenant['name']} (ID: {tenant['id']})"
                        break
                
                print(f"  {i}. ID: {user['id']}")
                print(f"     Email: {user['email']}")
                print(f"     Tenant: {tenant_info}")
                print(f"     Joined: {user['date_joined']}")
                print()
        
    finally:
        conn.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    main() 