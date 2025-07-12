#!/usr/bin/env python
"""
Force run HR migrations on production
This script can be executed via Render's shell to manually apply migrations
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def run_migrations():
    print("🚀 Forcing HR migrations...")
    
    # Show current migration status
    print("\n📋 Current migration status:")
    execute_from_command_line(['manage.py', 'showmigrations', 'hr'])
    
    # Run migrations
    print("\n🔄 Applying migrations...")
    execute_from_command_line(['manage.py', 'migrate', 'hr', '--noinput'])
    
    # Verify columns
    print("\n✅ Verifying columns...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee'
            AND column_name IN ('date_of_birth', 'direct_deposit', 'vacation_time', 'vacation_days_per_year')
        """)
        columns = cursor.fetchall()
        
        if columns:
            print("Found columns:")
            for col in columns:
                print(f"  ✓ {col[0]}")
        else:
            print("❌ No expected columns found!")
    
    print("\n🎉 Migration check complete!")

if __name__ == "__main__":
    run_migrations()