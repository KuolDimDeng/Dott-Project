#!/usr/bin/env python3
"""
Script to fix migration dependency conflicts on staging server.
Run this in Render shell: python scripts/fix_migration_dependencies.py
"""

import os
import sys
import django

# Add the current directory to the Python path (Render's /app directory)
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_migration_dependencies():
    """Remove conflicting migration records and run migrations."""
    
    with connection.cursor() as cursor:
        # Check current migration state
        print("Checking current migration state...")
        cursor.execute("""
            SELECT app, name 
            FROM django_migrations 
            WHERE app IN ('jobs', 'purchases', 'payments', 'users')
            ORDER BY app, id DESC
            LIMIT 20
        """)
        current_migrations = cursor.fetchall()
        print("\nCurrent relevant migrations:")
        for app, name in current_migrations:
            print(f"  {app}.{name}")
        
        # Remove problematic migrations that were applied out of order
        problematic_migrations = [
            ('jobs', '0004_jobassignment_vehicle_and_more'),
            ('purchases', '0004_bill_job'),
            ('payments', '0002_invoicepayment_mobilemoneyprovider_and_more'),
        ]
        
        print("\nRemoving problematic migration records...")
        for app, name in problematic_migrations:
            cursor.execute(
                "DELETE FROM django_migrations WHERE app = %s AND name = %s",
                [app, name]
            )
            if cursor.rowcount > 0:
                print(f"  Removed {app}.{name}")
            else:
                print(f"  {app}.{name} not found (already removed)")
        
        print("\nMigration records cleaned up successfully!")
        print("\nNow run: python manage.py migrate --noinput")

if __name__ == '__main__':
    try:
        fix_migration_dependencies()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)