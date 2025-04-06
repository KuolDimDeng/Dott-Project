#!/usr/bin/env python3
"""
Tenant Creation Verification Script

This script monitors the database for tenant creation events and checks whether
any tenants with the name 'My Business' are still being created.
"""

import psycopg2
import argparse
import time
import os
from datetime import datetime, timedelta
import sys

# Database connection parameters
DB_CONFIG = {
    'dbname': 'dott_main',
    'user': 'dott_admin',
    'password': os.environ.get('POSTGRES_PASSWORD', ''),
    'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    'port': '5432'
}

def connect_to_db():
    """Connect to the PostgreSQL database."""
    try:
        # Create connection with proper parameter formatting
        conn = psycopg2.connect(
            dbname=DB_CONFIG['dbname'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port']
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def get_tenant_count(conn):
    """Get the current count of tenants."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant;")
    count = cursor.fetchone()[0]
    cursor.close()
    return count

def get_my_business_count(conn):
    """Get the count of tenants with name 'My Business'."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant WHERE name = 'My Business';")
    count = cursor.fetchone()[0]
    cursor.close()
    return count

def get_default_business_count(conn):
    """Get the count of tenants with name 'Default Business'."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant WHERE name = 'Default Business';")
    count = cursor.fetchone()[0]
    cursor.close()
    return count

def get_recent_tenants(conn, minutes=10):
    """Get tenants created in the last N minutes."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, created_at FROM custom_auth_tenant WHERE created_at > %s ORDER BY created_at DESC;",
        [datetime.now() - timedelta(minutes=minutes)]
    )
    tenants = cursor.fetchall()
    cursor.close()
    return tenants

def get_tenant_users(conn, tenant_id):
    """Get users associated with a tenant."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email FROM custom_auth_user WHERE tenant_id = %s;",
        [tenant_id]
    )
    users = cursor.fetchall()
    cursor.close()
    return users

def monitor_tenants(interval=5, duration=60):
    """
    Monitor tenant creation for the specified duration.
    
    Args:
        interval: Check interval in seconds
        duration: Total monitoring duration in seconds
    """
    conn = connect_to_db()
    
    # Get initial counts
    initial_tenant_count = get_tenant_count(conn)
    initial_my_business_count = get_my_business_count(conn)
    initial_default_business_count = get_default_business_count(conn)
    
    print(f"\n=== Tenant Monitoring Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"Initial tenant count: {initial_tenant_count}")
    print(f"Initial 'My Business' count: {initial_my_business_count}")
    print(f"Initial 'Default Business' count: {initial_default_business_count}")
    print(f"Monitoring for new tenants every {interval} seconds for {duration} seconds...\n")
    
    start_time = time.time()
    last_check_time = start_time
    
    try:
        while time.time() - start_time < duration:
            time.sleep(interval)
            
            # Check for new tenants
            current_count = get_tenant_count(conn)
            current_my_business = get_my_business_count(conn)
            current_default_business = get_default_business_count(conn)
            
            # Calculate time since last check
            current_time = time.time()
            time_diff = current_time - last_check_time
            last_check_time = current_time
            
            if current_count > initial_tenant_count:
                # New tenants detected
                new_count = current_count - initial_tenant_count
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ {new_count} new tenant(s) detected!")
                
                # Check if any new 'My Business' tenants
                my_business_diff = current_my_business - initial_my_business_count
                if my_business_diff > 0:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ {my_business_diff} new 'My Business' tenant(s) created!")
                
                # Check if any new 'Default Business' tenants
                default_business_diff = current_default_business - initial_default_business_count
                if default_business_diff > 0:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ℹ️ {default_business_diff} new 'Default Business' tenant(s) created")
                
                # List recently created tenants
                recent_tenants = get_recent_tenants(conn, minutes=int(time_diff/60) + 1)
                if recent_tenants:
                    print(f"\nRecent tenants created in the last {int(time_diff/60) + 1} minutes:")
                    for tenant_id, name, created_at in recent_tenants:
                        users = get_tenant_users(conn, tenant_id)
                        user_emails = [email for _, email in users]
                        print(f"  - ID: {tenant_id}")
                        print(f"    Name: {name}")
                        print(f"    Created: {created_at}")
                        print(f"    Users: {', '.join(user_emails) if user_emails else 'None'}")
                    print()
                
                # Update our baseline
                initial_tenant_count = current_count
                initial_my_business_count = current_my_business
                initial_default_business_count = current_default_business
            else:
                sys.stdout.write(".")
                sys.stdout.flush()
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped by user")
    finally:
        elapsed = time.time() - start_time
        print(f"\n=== Tenant Monitoring Completed ===")
        print(f"Duration: {elapsed:.1f} seconds")
        print(f"Final tenant count: {get_tenant_count(conn)}")
        print(f"Final 'My Business' count: {get_my_business_count(conn)}")
        print(f"Final 'Default Business' count: {get_default_business_count(conn)}")
        
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor tenant creation in the database")
    parser.add_argument("-i", "--interval", type=int, default=5, 
                        help="Check interval in seconds (default: 5)")
    parser.add_argument("-d", "--duration", type=int, default=300, 
                        help="Total monitoring duration in seconds (default: 300)")
    args = parser.parse_args()
    
    monitor_tenants(interval=args.interval, duration=args.duration) 