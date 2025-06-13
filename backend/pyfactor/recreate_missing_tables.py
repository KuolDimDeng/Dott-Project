#!/usr/bin/env python
"""
Script to recreate missing database tables for tenant apps.
This script will:
1. Identify all tenant apps
2. Reset their migrations to zero using --fake flag
3. Re-run their migrations to create the tables
"""

import os
import sys
import django
from django.core.management import call_command
from django.db import connection

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

# List of tenant apps from settings
TENANT_APPS = [
    'users',
    'sales',
    'finance',
    'reports',
    'banking',
    'payments',
    'payroll',
    'inventory',
    'analysis',
    'chart',
    'integrations',
    'taxes',
    'purchases',
    'hr',
    'crm',
    'transport',
]

def check_table_exists(table_name):
    """Check if a table exists in the database."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def get_app_tables(app_name):
    """Get all model tables for an app."""
    from django.apps import apps
    try:
        app_config = apps.get_app_config(app_name)
        tables = []
        for model in app_config.get_models():
            tables.append(model._meta.db_table)
        return tables
    except LookupError:
        return []

def reset_and_migrate_app(app_name):
    """Reset migrations and re-run them for a specific app."""
    print(f"\n{'='*60}")
    print(f"Processing app: {app_name}")
    print(f"{'='*60}")
    
    # Get expected tables for this app
    expected_tables = get_app_tables(app_name)
    
    # Check which tables are missing
    missing_tables = []
    for table in expected_tables:
        if not check_table_exists(table):
            missing_tables.append(table)
    
    if not missing_tables:
        print(f"✓ All tables exist for {app_name}")
        return
    
    print(f"✗ Missing tables for {app_name}: {', '.join(missing_tables)}")
    
    try:
        # Step 1: Show current migration status
        print(f"\n1. Current migration status for {app_name}:")
        call_command('showmigrations', app_name, verbosity=2)
        
        # Step 2: Reset migrations to zero (fake)
        print(f"\n2. Resetting migrations for {app_name} to zero (fake)...")
        call_command('migrate', app_name, 'zero', '--fake', verbosity=2)
        
        # Step 3: Re-run migrations (this will create the tables)
        print(f"\n3. Re-running migrations for {app_name} (creating tables)...")
        call_command('migrate', app_name, verbosity=2)
        
        # Step 4: Verify tables were created
        print(f"\n4. Verifying tables for {app_name}...")
        still_missing = []
        for table in missing_tables:
            if not check_table_exists(table):
                still_missing.append(table)
        
        if still_missing:
            print(f"⚠️  Still missing tables for {app_name}: {', '.join(still_missing)}")
        else:
            print(f"✅ All tables successfully created for {app_name}")
            
    except Exception as e:
        print(f"❌ Error processing {app_name}: {str(e)}")

def main():
    """Main function to recreate missing tables."""
    print("Starting database table recreation process...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # First, ensure django migrations table exists
    print("\nEnsuring django_migrations table exists...")
    call_command('migrate', '--run-syncdb', verbosity=2)
    
    # Process each tenant app
    for app_name in TENANT_APPS:
        reset_and_migrate_app(app_name)
    
    print("\n" + "="*60)
    print("Database table recreation complete!")
    print("="*60)
    
    # Final summary
    print("\nFinal table status:")
    for app_name in TENANT_APPS:
        tables = get_app_tables(app_name)
        missing = [t for t in tables if not check_table_exists(t)]
        if missing:
            print(f"❌ {app_name}: Still missing {len(missing)} tables")
        else:
            print(f"✅ {app_name}: All tables exist")

if __name__ == '__main__':
    main()