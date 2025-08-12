#!/usr/bin/env python
"""
Improved script to recreate missing database tables for tenant apps.
This version handles:
- Database transaction issues
- Dependency ordering between apps
- Better error handling
"""

import os
import sys
import django
from django.core.management import call_command
from django.db import connection, transaction as db_transaction

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

# List of tenant apps with proper dependency ordering
# HR should come before payroll since payroll depends on hr_employee
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
        # Reset the connection to clear any transaction issues
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

def reset_and_migrate_app(app_name, force=False):
    """Reset migrations and re-run them for a specific app."""
    print(f"\n{'='*60}")
    print(f"Processing app: {app_name}")
    print(f"{'='*60}")
    
    # Get expected tables for this app
    expected_tables = get_app_tables(app_name)
    
    if not expected_tables:
        print(f"⚠️  No models found for {app_name}")
        return
    
    # Check which tables are missing
    missing_tables = []
    for table in expected_tables:
        if not check_table_exists(table):
            missing_tables.append(table)
    
    if not missing_tables and not force:
        print(f"✓ All tables exist for {app_name}")
        return
    
    if missing_tables:
        print(f"✗ Missing tables for {app_name}: {', '.join(missing_tables)}")
    
    try:
        # Close any existing connections to avoid transaction issues
        connection.close()
        
        # Step 1: Show current migration status
        print(f"\n1. Current migration status for {app_name}:")
        try:
            call_command('showmigrations', app_name, verbosity=2)
        except Exception as e:
            print(f"Could not show migrations: {e}")
        
        # Step 2: Check if migrations exist for this app
        migration_dir = os.path.join(app_name, 'migrations')
        if not os.path.exists(migration_dir):
            print(f"⚠️  No migrations directory found for {app_name}")
            print(f"Creating migrations for {app_name}...")
            try:
                call_command('makemigrations', app_name, verbosity=2)
            except Exception as e:
                print(f"Error creating migrations: {e}")
                return
        
        # Step 3: Reset migrations to zero (fake)
        print(f"\n2. Resetting migrations for {app_name} to zero (fake)...")
        try:
            call_command('migrate', app_name, 'zero', '--fake', verbosity=2)
        except Exception as e:
            print(f"Warning during reset: {e}")
        
        # Close connection again to clear any issues
        connection.close()
        
        # Step 4: Re-run migrations (this will create the tables)
        print(f"\n3. Re-running migrations for {app_name} (creating tables)...")
        try:
            call_command('migrate', app_name, verbosity=2)
        except Exception as e:
            print(f"Error during migration: {e}")
            # Try to continue anyway
        
        # Step 5: Verify tables were created
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
        # Close connection to reset any transaction issues
        connection.close()

def main():
    """Main function to recreate missing tables."""
    print("Starting database table recreation process...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # First, ensure django migrations table exists
    print("\nEnsuring django_migrations table exists...")
    try:
        call_command('migrate', '--run-syncdb', verbosity=2)
    except Exception as e:
        print(f"Warning during syncdb: {e}")
    
    # Process each tenant app in order
    for app_name in TENANT_APPS_ORDERED:
        reset_and_migrate_app(app_name)
    
    print("\n" + "="*60)
    print("Database table recreation complete!")
    print("="*60)
    
    # Final summary
    print("\nFinal table status:")
    for app_name in TENANT_APPS_ORDERED:
        tables = get_app_tables(app_name)
        if not tables:
            print(f"⚠️  {app_name}: No models found")
            continue
            
        missing = [t for t in tables if not check_table_exists(t)]
        if missing:
            print(f"❌ {app_name}: Still missing {len(missing)} tables: {', '.join(missing)}")
        else:
            print(f"✅ {app_name}: All tables exist")

if __name__ == '__main__':
    # Add command line option to force specific app
    if len(sys.argv) > 1:
        app_name = sys.argv[1]
        if app_name in TENANT_APPS_ORDERED:
            reset_and_migrate_app(app_name, force=True)
        else:
            print(f"Unknown app: {app_name}")
            print(f"Available apps: {', '.join(TENANT_APPS_ORDERED)}")
    else:
        main()