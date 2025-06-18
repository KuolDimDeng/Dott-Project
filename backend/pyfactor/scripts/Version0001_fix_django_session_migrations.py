#!/usr/bin/env python
"""
Script: Version0001_fix_django_session_migrations.py
Purpose: Run Django migrations to create missing django_session table and other database tables
Author: Assistant
Date: 2025-01-18

This script ensures all Django migrations are properly applied, particularly for:
- django.contrib.sessions (creates django_session table)
- django.contrib.auth (creates auth tables)
- django.contrib.contenttypes (creates content types)
- All app-specific migrations

Usage:
    # On local machine:
    python scripts/Version0001_fix_django_session_migrations.py
    
    # On Render backend shell:
    python manage.py migrate

Note: This script must be run from the Django project root directory (/backend/pyfactor)
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def setup_django():
    """Setup Django environment"""
    # Add project root to Python path
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, project_root)
    
    # Setup Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()

def run_migrations():
    """Run all Django migrations"""
    print("Starting Django migrations...")
    print("-" * 50)
    
    try:
        # Show current migration status
        print("\n1. Current migration status:")
        execute_from_command_line(['manage.py', 'showmigrations'])
        
        # Create migrations if needed
        print("\n2. Creating any missing migrations:")
        execute_from_command_line(['manage.py', 'makemigrations'])
        
        # Apply all migrations
        print("\n3. Applying all migrations:")
        execute_from_command_line(['manage.py', 'migrate'])
        
        # Verify django_session table exists
        print("\n4. Verifying django_session table...")
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'django_session';
            """)
            result = cursor.fetchone()
            if result:
                print("✓ django_session table exists!")
            else:
                print("✗ django_session table still missing!")
                print("  Trying to migrate sessions app specifically...")
                execute_from_command_line(['manage.py', 'migrate', 'sessions'])
        
        # Show final migration status
        print("\n5. Final migration status:")
        execute_from_command_line(['manage.py', 'showmigrations'])
        
        print("\n" + "=" * 50)
        print("✓ Migration process completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n✗ Error during migration: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Ensure you're in the correct directory (/backend/pyfactor)")
        print("2. Check database connection settings in settings.py")
        print("3. Verify DATABASE_URL environment variable is set")
        print("4. Try running migrations manually:")
        print("   python manage.py migrate sessions --run-syncdb")
        print("   python manage.py migrate")
        sys.exit(1)

def main():
    """Main function"""
    print("Django Session Migration Fix Script")
    print("==================================")
    
    # Check if we're in the right directory
    if not os.path.exists('manage.py'):
        print("✗ Error: This script must be run from the Django project root directory")
        print("  Current directory:", os.getcwd())
        print("  Please cd to /backend/pyfactor and run again")
        sys.exit(1)
    
    # Setup Django and run migrations
    setup_django()
    run_migrations()

if __name__ == '__main__':
    main()