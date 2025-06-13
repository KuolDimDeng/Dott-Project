#!/usr/bin/env python
"""
Script to apply all pending migrations in the correct order.
This handles dependencies between apps.
"""

import os
import django
from django.core.management import call_command
from django.db import connection

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def main():
    """Apply all pending migrations."""
    print("Applying all pending migrations...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # First, run migrations for all apps without specifying individual apps
    # This lets Django handle the dependency ordering
    print("\n" + "="*60)
    print("Running all migrations (Django will handle dependencies)...")
    print("="*60)
    
    try:
        # Close any existing connections
        connection.close()
        
        # Run all migrations
        call_command('migrate', verbosity=2)
        
        print("\n✅ All migrations completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        print("\nTrying to migrate apps individually in dependency order...")
        
        # If that fails, try migrating specific apps in order
        apps_order = [
            # Core Django apps first
            'contenttypes',
            'auth',
            'sites',
            'sessions',
            'admin',
            
            # Auth-related apps
            'authtoken',
            'token_blacklist',
            'custom_auth',
            
            # Other shared apps
            'django_celery_beat',
            'account',
            'socialaccount',
            
            # Tenant apps in dependency order
            'users',
            'hr',  # Must come before payroll
            'finance',
            'sales',
            'banking',
            'payroll',  # Depends on hr
            'inventory',
            'analysis',
            'integrations',
            'taxes',
            'purchases',
            'reports',
            'crm',
            'transport',
            'payments',
            'onboarding',
        ]
        
        for app_name in apps_order:
            try:
                print(f"\nMigrating {app_name}...")
                connection.close()
                call_command('migrate', app_name, verbosity=1)
                print(f"✅ {app_name} migrated successfully")
            except Exception as app_error:
                print(f"⚠️  Could not migrate {app_name}: {app_error}")
    
    # Show final status
    print("\n" + "="*60)
    print("Final migration status:")
    print("="*60)
    call_command('showmigrations', '--list')

if __name__ == '__main__':
    main()