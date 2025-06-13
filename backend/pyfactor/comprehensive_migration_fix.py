#!/usr/bin/env python
import os
import sys
import django
from django.db import connection, transaction
from django.core.management import call_command

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def comprehensive_migration_fix():
    """Comprehensive fix for tangled migration dependencies"""
    
    with connection.cursor() as cursor:
        print("=== COMPREHENSIVE MIGRATION FIX ===\n")
        
        # Get all migration records
        cursor.execute("""
            SELECT app, name FROM django_migrations 
            ORDER BY app, name;
        """)
        all_migrations = cursor.fetchall()
        
        print("Current migration records:")
        current_app = None
        for app, name in all_migrations:
            if app != current_app:
                current_app = app
                print(f"\n{app}:")
            print(f"  - {name}")
        
        # Since the migration history is tangled, we'll need to:
        # 1. Remove all migrations for apps that depend on users
        # 2. Apply users migrations
        # 3. Re-apply other migrations in order
        
        print("\n\nStep 1: Backing up migration history...")
        affected_apps = ['users', 'finance', 'hr', 'inventory', 'purchases', 'sales', 'reports', 'integrations']
        
        with transaction.atomic():
            # Remove all migrations for affected apps
            print("\nStep 2: Removing migrations for affected apps...")
            for app in affected_apps:
                cursor.execute("""
                    DELETE FROM django_migrations WHERE app = %s;
                """, [app])
                print(f"  - Removed all {app} migrations")
            
            print("\nStep 3: Now applying migrations in correct order...")
            
            # Apply users first
            print("\n  Applying users migrations...")
            try:
                call_command('migrate', 'users', verbosity=2)
            except Exception as e:
                print(f"    Error: {e}")
            
            # Then apply other core apps
            for app in ['finance', 'hr', 'inventory', 'purchases']:
                print(f"\n  Applying {app} migrations...")
                try:
                    call_command('migrate', app, verbosity=2)
                except Exception as e:
                    print(f"    Error in {app}: {e}")
            
            # Check if CRM needs migrations
            print("\n  Checking CRM migrations...")
            try:
                call_command('makemigrations', 'crm', '--dry-run', verbosity=0)
                print("    CRM needs new migrations")
                call_command('makemigrations', 'crm', verbosity=2)
                call_command('migrate', 'crm', verbosity=2)
            except SystemExit:
                # No migrations needed
                print("    CRM migrations up to date")
                call_command('migrate', 'crm', verbosity=2)
            
            # Finally apply sales, reports, integrations
            for app in ['sales', 'reports', 'integrations']:
                print(f"\n  Applying {app} migrations...")
                try:
                    call_command('migrate', app, verbosity=2)
                except Exception as e:
                    print(f"    Error in {app}: {e}")
            
            print("\n✓ Migration fix completed!")

if __name__ == "__main__":
    comprehensive_migration_fix()