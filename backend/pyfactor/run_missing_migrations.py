#!/usr/bin/env python
"""
Simple script to run migrations for apps with missing tables.
This doesn't reset anything, just runs pending migrations.
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

# List of tenant apps with proper dependency ordering
TENANT_APPS_ORDERED = [
    'users',      # Base user models
    'hr',         # HR models (employee, etc) - needed by payroll
    'sales',      # Sales models
    'finance',    # Finance models
    'banking',    # Banking models
    'payroll',    # Payroll (depends on hr)
    'inventory',  # Inventory models
    'analysis',   # Analysis models
    'chart',      # Chart models
    'integrations', # Integration models
    'taxes',      # Tax models
    'purchases',  # Purchase models
    'reports',    # Reports (may depend on other models)
    'crm',        # CRM models
    'transport',  # Transport models
    'payments',   # Payment models
]

def check_table_exists(table_name):
    """Check if a table exists in the database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, [table_name])
            return cursor.fetchone()[0]
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")
        connection.close()
        return False

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

def main():
    """Main function to run missing migrations."""
    print("Running migrations for apps with missing tables...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # First check current status
    print("\nChecking current table status...")
    apps_needing_migration = []
    
    for app_name in TENANT_APPS_ORDERED:
        tables = get_app_tables(app_name)
        if not tables:
            continue
            
        missing = [t for t in tables if not check_table_exists(t)]
        if missing:
            apps_needing_migration.append((app_name, missing))
            print(f"❌ {app_name}: Missing {len(missing)} tables: {', '.join(missing)}")
        else:
            print(f"✅ {app_name}: All tables exist")
    
    if not apps_needing_migration:
        print("\n✅ All tables exist! No migrations needed.")
        return
    
    print(f"\nNeed to run migrations for {len(apps_needing_migration)} apps")
    
    # Show current migration status
    print("\n" + "="*60)
    print("Current migration status:")
    print("="*60)
    call_command('showmigrations', '--list', '--verbosity=2')
    
    # Run migrations for each app that needs them
    print("\n" + "="*60)
    print("Running migrations...")
    print("="*60)
    
    for app_name, missing_tables in apps_needing_migration:
        print(f"\nMigrating {app_name} (missing: {', '.join(missing_tables)})...")
        try:
            # Close connection to avoid transaction issues
            connection.close()
            
            # Run migration
            call_command('migrate', app_name, verbosity=2)
            
            # Check if tables were created
            still_missing = [t for t in missing_tables if not check_table_exists(t)]
            if still_missing:
                print(f"⚠️  Still missing after migration: {', '.join(still_missing)}")
            else:
                print(f"✅ All tables created for {app_name}")
                
        except Exception as e:
            print(f"❌ Error migrating {app_name}: {e}")
    
    # Final summary
    print("\n" + "="*60)
    print("Final status:")
    print("="*60)
    
    for app_name in TENANT_APPS_ORDERED:
        tables = get_app_tables(app_name)
        if not tables:
            continue
            
        missing = [t for t in tables if not check_table_exists(t)]
        if missing:
            print(f"❌ {app_name}: Still missing {len(missing)} tables")
        else:
            print(f"✅ {app_name}: All tables exist")

if __name__ == '__main__':
    main()