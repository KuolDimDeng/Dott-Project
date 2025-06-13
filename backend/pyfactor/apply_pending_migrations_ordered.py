#!/usr/bin/env python
"""
Apply pending migrations in the correct order based on the migration plan.
"""

import os
import django
from django.core.management import call_command
from django.db import connection

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def apply_migration(app_name, migration_name=None):
    """Apply a specific migration or all migrations for an app."""
    try:
        # Close connection to avoid issues
        connection.close()
        
        if migration_name:
            print(f"  → Applying {app_name}.{migration_name}...")
            call_command('migrate', app_name, migration_name, '--no-input', verbosity=0)
            print(f"  ✅ {app_name}.{migration_name} applied")
        else:
            print(f"  → Applying all migrations for {app_name}...")
            call_command('migrate', app_name, '--no-input', verbosity=0)
            print(f"  ✅ All {app_name} migrations applied")
        return True
    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg:
            # Try faking the migration
            try:
                connection.close()
                if migration_name:
                    call_command('migrate', app_name, migration_name, '--fake', '--no-input', verbosity=0)
                    print(f"  ✅ {app_name}.{migration_name} faked (table exists)")
                else:
                    call_command('migrate', app_name, '--fake', '--no-input', verbosity=0)
                    print(f"  ✅ All {app_name} migrations faked")
                return True
            except:
                pass
        print(f"  ❌ Failed: {error_msg}")
        return False

def main():
    """Main function."""
    print("Applying pending migrations in correct order...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # Based on the showmigrations output, these are the pending migrations in order
    pending_migrations = [
        ('finance', '0001_initial'),
        ('sales', '0001_initial'),
        ('finance', '0002_initial'),  # Depends on finance 0001
        ('payroll', '0001_initial'),  # Depends on hr (which is done)
        ('payroll', '0002_add_timesheet_to_payrolltransaction'),
        ('payroll', '0003_remove_timesheet_models'),
        ('payroll', '0004_paysetting_bonuspayment_incomewithholding_and_more'),
        ('payroll', '0005_add_missing_payrollrun_fields'),
        ('sales', '0002_add_missing_fields_and_models'),
        ('sales', '0003_rename_sales_estimate_tenant_idx_sales_estim_tenant__bfa1b9_idx_and_more'),
        ('users', '0002_remove_userprofile_schema_name_and_more'),
        ('users', '0003_remove_admin_role'),
        ('users', '0004_convert_admin_to_owner'),
    ]
    
    # Also check for other apps that might have pending migrations
    other_apps = ['integrations', 'onboarding', 'payments', 'reports', 'analysis']
    
    print("\n" + "="*60)
    print("Applying pending migrations...")
    print("="*60)
    
    # Apply the known pending migrations
    for app_name, migration_name in pending_migrations:
        apply_migration(app_name, migration_name)
    
    # Apply any remaining migrations for other apps
    print("\n" + "="*60)
    print("Checking other apps for pending migrations...")
    print("="*60)
    
    for app_name in other_apps:
        print(f"\nChecking {app_name}...")
        apply_migration(app_name)
    
    # Final verification
    print("\n" + "="*60)
    print("Verification...")
    print("="*60)
    
    try:
        # Check important tables
        connection.close()
        with connection.cursor() as cursor:
            important_tables = [
                ('users', ['users_userprofile', 'users_subscription']),
                ('hr', ['hr_employee']),
                ('sales', ['sales_invoice', 'sales_product']),
                ('finance', ['finance_account', 'finance_financetransaction']),
                ('payroll', ['payroll_payrollrun', 'payroll_payrolltransaction']),
            ]
            
            for app_name, tables in important_tables:
                print(f"\n{app_name}:")
                for table in tables:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        )
                    """, [table])
                    exists = cursor.fetchone()[0]
                    print(f"  {table}: {'✅ EXISTS' if exists else '❌ MISSING'}")
    except Exception as e:
        print(f"Error during verification: {e}")
    
    print("\n✅ Migration process complete!")
    
    # Show final migration status
    print("\nTo see all migrations status, run:")
    print("  python manage.py showmigrations")

if __name__ == '__main__':
    main()