#!/usr/bin/env python
"""
Script to monitor tenant creation to verify that signing in or refreshing 
doesn't create new tenants.
"""

import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
import time
import datetime
import argparse
import json

# Database connection parameters
DB_PARAMS = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': 'RRfXU6uPPUbBEg1JqGTJ',
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        print(f"[{datetime.datetime.now()}] Connected to PostgreSQL database: {DB_PARAMS['dbname']}")
        return conn
    except Exception as e:
        print(f"[{datetime.datetime.now()}] Error connecting to PostgreSQL database: {e}")
        sys.exit(1)

def get_tenant_count(conn):
    """Get the total count of tenants."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM custom_auth_tenant")
        result = cursor.fetchone()
        return result['count'] if result else 0

def get_user_count(conn):
    """Get the total count of users."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("SELECT COUNT(*) as count FROM custom_auth_user")
        result = cursor.fetchone()
        return result['count'] if result else 0

def get_recent_tenants(conn, minutes=5):
    """Get tenants created in the last n minutes."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, name, owner_id, schema_name, created_at, updated_at, is_active
            FROM custom_auth_tenant
            WHERE created_at > NOW() - INTERVAL '%s minutes'
            ORDER BY created_at DESC
        """, (minutes,))
        return cursor.fetchall()

def get_recent_users(conn, minutes=5):
    """Get users created or updated in the last n minutes."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, email, tenant_id, date_joined, last_login
            FROM custom_auth_user
            WHERE date_joined > NOW() - INTERVAL '%s minutes'
               OR last_login > NOW() - INTERVAL '%s minutes'
            ORDER BY date_joined DESC, last_login DESC
        """, (minutes, minutes))
        return cursor.fetchall()

def get_user_by_tenant(conn, tenant_id):
    """Get users associated with a tenant ID."""
    with conn.cursor(cursor_factory=DictCursor) as cursor:
        cursor.execute("""
            SELECT id, email, tenant_id, date_joined, last_login
            FROM custom_auth_user
            WHERE tenant_id = %s
        """, (tenant_id,))
        return cursor.fetchall()

def monitor_tenant_creation(duration_minutes=5, interval_seconds=5):
    """Monitor tenant creation for a specified duration."""
    conn = connect_to_db()
    
    # Get initial counts
    initial_tenant_count = get_tenant_count(conn)
    initial_user_count = get_user_count(conn)
    
    print(f"[{datetime.datetime.now()}] Starting monitoring for {duration_minutes} minutes")
    print(f"[{datetime.datetime.now()}] Initial tenant count: {initial_tenant_count}")
    print(f"[{datetime.datetime.now()}] Initial user count: {initial_user_count}")
    
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    seen_tenants = set()
    seen_users = set()
    
    while time.time() < end_time:
        current_time = datetime.datetime.now()
        
        # Get recent tenants
        recent_tenants = get_recent_tenants(conn, minutes=duration_minutes)
        
        # Check for new tenants
        for tenant in recent_tenants:
            tenant_id = tenant['id']
            if tenant_id not in seen_tenants:
                seen_tenants.add(tenant_id)
                
                # Format tenant info for display
                tenant_info = {
                    'id': tenant['id'],
                    'name': tenant['name'],
                    'owner_id': tenant['owner_id'],
                    'schema_name': tenant['schema_name'],
                    'created_at': tenant['created_at'].isoformat() if tenant['created_at'] else None,
                    'updated_at': tenant['updated_at'].isoformat() if tenant['updated_at'] else None,
                    'is_active': tenant['is_active']
                }
                
                # Get associated users
                associated_users = get_user_by_tenant(conn, tenant_id)
                user_info = []
                for user in associated_users:
                    user_info.append({
                        'id': user['id'],
                        'email': user['email'],
                        'tenant_id': user['tenant_id'],
                        'date_joined': user['date_joined'].isoformat() if user['date_joined'] else None,
                        'last_login': user['last_login'].isoformat() if user['last_login'] else None
                    })
                
                print(f"\n[{current_time}] 🔔 NEW TENANT DETECTED:")
                print(f"  Tenant: {json.dumps(tenant_info, indent=2)}")
                if user_info:
                    print(f"  Associated Users: {json.dumps(user_info, indent=2)}")
                else:
                    print("  No users associated with this tenant!")
        
        # Get recent users
        recent_users = get_recent_users(conn, minutes=duration_minutes)
        
        # Check for new or updated users
        for user in recent_users:
            user_id = user['id']
            if user_id not in seen_users:
                seen_users.add(user_id)
                
                # Format user info for display
                user_info = {
                    'id': user['id'],
                    'email': user['email'],
                    'tenant_id': user['tenant_id'],
                    'date_joined': user['date_joined'].isoformat() if user['date_joined'] else None,
                    'last_login': user['last_login'].isoformat() if user['last_login'] else None
                }
                
                print(f"\n[{current_time}] 👤 NEW USER DETECTED:")
                print(f"  User: {json.dumps(user_info, indent=2)}")
        
        # Sleep for the specified interval
        time.sleep(interval_seconds)
    
    # Get final counts
    final_tenant_count = get_tenant_count(conn)
    final_user_count = get_user_count(conn)
    
    print(f"\n[{datetime.datetime.now()}] Monitoring completed")
    print(f"[{datetime.datetime.now()}] Final tenant count: {final_tenant_count} (Change: {final_tenant_count - initial_tenant_count})")
    print(f"[{datetime.datetime.now()}] Final user count: {final_user_count} (Change: {final_user_count - initial_user_count})")
    
    # Close the database connection
    conn.close()
    print(f"[{datetime.datetime.now()}] Database connection closed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor tenant and user creation in real-time")
    parser.add_argument("--duration", type=int, default=5, help="Monitoring duration in minutes (default: 5)")
    parser.add_argument("--interval", type=int, default=5, help="Check interval in seconds (default: 5)")
    args = parser.parse_args()
    
    try:
        monitor_tenant_creation(args.duration, args.interval)
    except KeyboardInterrupt:
        print("\nMonitoring interrupted by user")
        sys.exit(0) 