#!/usr/bin/env python
"""
Script to update AWS RDS database with the recent changes made to User model.
This will add the business_id field and update the role default to 'owner'.
"""

import os
import sys
import django
import argparse

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.conf import settings
import psycopg2

def get_connection_info():
    """Get database connection info from Django settings"""
    db_settings = settings.DATABASES.get('default', {})
    return {
        'host': db_settings.get('HOST', 'localhost'),
        'port': db_settings.get('PORT', '5432'),
        'database': db_settings.get('NAME', ''),
        'user': db_settings.get('USER', ''),
        'password': db_settings.get('PASSWORD', '')
    }

def print_sql_commands():
    """Print the SQL commands that would be executed"""
    sql_commands = [
        "ALTER TABLE custom_auth_user ADD COLUMN IF NOT EXISTS business_id uuid NULL;",
        "-- Update default value for role field (this will be applied to new records)",
        "-- Existing records won't be modified unless you want to run an UPDATE command."
    ]
    
    print("\nSQL commands to execute on your AWS RDS database:")
    print("=" * 80)
    for cmd in sql_commands:
        print(cmd)
    print("=" * 80)

def execute_sql_commands(conn_info, dry_run=True):
    """Execute SQL commands on the database"""
    print(f"\nConnecting to database: {conn_info['database']} on {conn_info['host']}:{conn_info['port']}")
    
    try:
        if dry_run:
            print("DRY RUN: Would execute the following SQL commands:")
            print_sql_commands()
            return True
            
        # Connect to the database
        conn = psycopg2.connect(
            host=conn_info['host'],
            port=conn_info['port'],
            database=conn_info['database'],
            user=conn_info['user'],
            password=conn_info['password']
        )
        
        # Create a cursor
        with conn.cursor() as cursor:
            # Start a transaction
            conn.autocommit = False
            
            print("Executing SQL commands...")
            
            # Add business_id column if it doesn't exist
            cursor.execute("ALTER TABLE custom_auth_user ADD COLUMN IF NOT EXISTS business_id uuid NULL;")
            print("✅ Added business_id column")
            
            # Commit the transaction
            conn.commit()
            print("✅ All changes committed successfully")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    parser = argparse.ArgumentParser(description='Update AWS RDS database schema')
    parser.add_argument('--execute', action='store_true', help='Execute SQL commands (default is dry run)')
    parser.add_argument('--host', help='Database host')
    parser.add_argument('--port', help='Database port')
    parser.add_argument('--name', help='Database name')
    parser.add_argument('--user', help='Database user')
    parser.add_argument('--password', help='Database password')
    
    args = parser.parse_args()
    
    # Get connection info from Django settings
    conn_info = get_connection_info()
    
    # Override with command line arguments if provided
    if args.host:
        conn_info['host'] = args.host
    if args.port:
        conn_info['port'] = args.port
    if args.name:
        conn_info['database'] = args.name
    if args.user:
        conn_info['user'] = args.user
    if args.password:
        conn_info['password'] = args.password
    
    # Check if connection info is available
    missing_params = [k for k, v in conn_info.items() if not v and k != 'password']
    if missing_params:
        print(f"⚠️  Missing connection parameters: {', '.join(missing_params)}")
        print("Please provide them as command line arguments or check your Django settings.")
        print_sql_commands()
        return
    
    # Execute SQL commands
    execute_sql_commands(conn_info, dry_run=not args.execute)
    
    if not args.execute:
        print("\n⚠️  This was a DRY RUN. No changes were made to the database.")
        print("To execute the changes, run with --execute flag:")
        cmd = f"python {sys.argv[0]} --execute"
        if args.host:
            cmd += f" --host={args.host}"
        if args.port:
            cmd += f" --port={args.port}"
        if args.name:
            cmd += f" --name={args.name}"
        if args.user:
            cmd += f" --user={args.user}"
        print(f"\n{cmd}")

if __name__ == "__main__":
    main() 