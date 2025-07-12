#!/usr/bin/env python
"""
Script: fix_django_session_table.py
Purpose: Quick fix for missing django_session table on Render
Author: Assistant
Date: 2025-01-18

This script specifically creates the django_session table if it's missing.

Usage on Render backend shell:
    python scripts/fix_django_session_table.py
    
Or run these commands manually:
    python manage.py migrate sessions --run-syncdb
    python manage.py migrate
"""

import os
import sys
import django

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def create_session_table():
    """Create django_session table manually if migrations fail"""
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_session (
                session_key varchar(40) NOT NULL PRIMARY KEY,
                session_data text NOT NULL,
                expire_date timestamp with time zone NOT NULL
            );
            CREATE INDEX IF NOT EXISTS django_session_expire_date_idx 
                ON django_session (expire_date);
            CREATE INDEX IF NOT EXISTS django_session_session_key_like_idx 
                ON django_session (session_key varchar_pattern_ops);
        """)
        print("✓ Created django_session table manually")

def main():
    print("Fixing Django Session Table")
    print("=" * 40)
    
    # Check if table exists
    if check_table_exists('django_session'):
        print("✓ django_session table already exists!")
        return
    
    print("✗ django_session table is missing")
    
    # Try migrations first
    print("\nAttempting to run migrations...")
    try:
        # Try to migrate sessions app specifically with --run-syncdb
        execute_from_command_line(['manage.py', 'migrate', 'sessions', '--run-syncdb'])
        
        if check_table_exists('django_session'):
            print("✓ Successfully created django_session table via migrations!")
            return
    except Exception as e:
        print(f"Migration failed: {e}")
    
    # If migrations fail, create table manually
    print("\nCreating table manually...")
    try:
        create_session_table()
        
        # Verify creation
        if check_table_exists('django_session'):
            print("\n✓ Successfully created django_session table!")
            print("\nIMPORTANT: Run full migrations when possible:")
            print("  python manage.py migrate")
        else:
            print("\n✗ Failed to create django_session table")
    except Exception as e:
        print(f"\n✗ Error creating table: {e}")
        print("\nPlease check database permissions and try:")
        print("  python manage.py dbshell")
        print("  Then run the CREATE TABLE statement manually")

if __name__ == '__main__':
    main()