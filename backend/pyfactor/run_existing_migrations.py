#!/usr/bin/env python
"""
Script to run only existing migrations without creating new ones.
This avoids issues with missing tables that new migrations are trying to modify.
"""

import os
import django
from django.core.management import call_command
from django.db import connection, transaction as db_transaction

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def run_migration_safely(app_name):
    """Run migration for an app safely."""
    try:
        # Close any existing connection
        connection.close()
        
        # Run the migration
        call_command('migrate', app_name, '--no-input', verbosity=2)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Main function."""
    print("Running existing migrations to create missing tables...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # First, let's just try to run all migrations at once
    print("\n" + "="*60)
    print("Attempting to run all migrations together...")
    print("="*60)
    
    try:
        connection.close()
        call_command('migrate', '--no-input', '--run-syncdb', verbosity=2)
        print("\n✅ All migrations completed successfully!")
        return
    except Exception as e:
        print(f"\n⚠️  Could not run all migrations together: {e}")
    
    # If that fails, run specific apps
    print("\n" + "="*60)
    print("Running migrations for individual apps...")
    print("="*60)
    
    # These are the apps with pending migrations based on the earlier output
    apps_with_pending_migrations = [
        'finance',      # 0001_initial, 0002_initial
        'hr',           # Already applied but let's check
        'integrations', # 0001_initial  
        'onboarding',   # 0001_initial, 0002_userprofile_alter_onboardingprogress_current_step_and_more
        'payments',     # 0001_initial
        'payroll',      # 0001_initial through 0005_add_missing_payrollrun_fields
        'reports',      # 0001_initial
        'sales',        # 0001_initial, 0002_add_missing_fields_and_models, 0003_rename...
    ]
    
    for app in apps_with_pending_migrations:
        print(f"\n{'='*40}")
        print(f"Migrating {app}...")
        print(f"{'='*40}")
        
        if run_migration_safely(app):
            print(f"✅ {app} migrated successfully")
        else:
            print(f"❌ {app} migration failed")
    
    # Final summary
    print("\n" + "="*60)
    print("Migration Summary:")
    print("="*60)
    
    try:
        connection.close()
        # Get a fresh connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT app, name 
                FROM django_migrations 
                WHERE app IN ('finance', 'hr', 'integrations', 'onboarding', 
                             'payments', 'payroll', 'reports', 'sales')
                ORDER BY app, id
            """)
            
            current_app = None
            for app, migration in cursor.fetchall():
                if app != current_app:
                    print(f"\n{app}:")
                    current_app = app
                print(f"  ✓ {migration}")
                
    except Exception as e:
        print(f"Could not fetch migration status: {e}")
    
    print("\nTo check which tables were created, run:")
    print("  python check_and_fix_tables.py")

if __name__ == '__main__':
    main()