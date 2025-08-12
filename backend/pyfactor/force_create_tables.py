#!/usr/bin/env python
"""
Force create tables by running migrations in the correct dependency order.
This script handles circular dependencies and connection issues.
"""

import os
import django
from django.core.management import call_command
from django.db import connection, transaction as db_transaction
import time

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def reset_connection():
    """Reset database connection."""
    try:
        connection.close()
        time.sleep(0.1)  # Small delay to ensure connection is closed
    except:
        pass

def run_single_migration(app, migration, fake=False):
    """Run a single migration with error handling."""
    reset_connection()
    try:
        if fake:
            call_command('migrate', app, migration, '--fake', '--no-input', verbosity=0)
            return True, "faked"
        else:
            call_command('migrate', app, migration, '--no-input', verbosity=0)
            return True, "applied"
    except Exception as e:
        return False, str(e)

def main():
    """Main function."""
    print("Force creating missing tables...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # Step 1: Run all migrations at once, ignoring errors
    print("\n" + "="*60)
    print("Step 1: Attempting to run all migrations (ignoring errors)...")
    print("="*60)
    
    reset_connection()
    try:
        call_command('migrate', '--no-input', '--fake-initial', verbosity=2)
        print("✅ All migrations completed!")
        return
    except Exception as e:
        print(f"⚠️  Could not complete all migrations: {e}")
    
    # Step 2: Run migrations in dependency order
    print("\n" + "="*60)
    print("Step 2: Running migrations in dependency order...")
    print("="*60)
    
    # Order based on dependencies
    migration_plan = [
        # Core migrations first
        ('purchases', '0001_initial'),  # finance depends on this
        ('users', '0001_initial'),      # Already faked
        
        # Then apps that depend on purchases
        ('finance', '0001_initial'),
        ('finance', '0002_initial'),
        
        # Sales migrations
        ('sales', '0001_initial'),
        ('sales', '0002_add_missing_fields_and_models'),
        ('sales', '0003_rename_sales_estimate_tenant_idx_sales_estim_tenant__bfa1b9_idx_and_more'),
        
        # HR is already done, so payroll can proceed
        ('payroll', '0001_initial'),
        ('payroll', '0002_add_timesheet_to_payrolltransaction'),
        ('payroll', '0003_remove_timesheet_models'),
        ('payroll', '0004_paysetting_bonuspayment_incomewithholding_and_more'),
        ('payroll', '0005_add_missing_payrollrun_fields'),
        
        # User migrations
        ('users', '0002_remove_userprofile_schema_name_and_more'),
        ('users', '0003_remove_admin_role'),
        ('users', '0004_convert_admin_to_owner'),
        
        # Other apps
        ('integrations', '0001_initial'),
        ('onboarding', '0001_initial'),
        ('onboarding', '0002_userprofile_alter_onboardingprogress_current_step_and_more'),
        ('payments', '0001_initial'),
        ('reports', '0001_initial'),
        ('analysis', '0001_initial'),
    ]
    
    for app_name, migration_name in migration_plan:
        print(f"\n{app_name}.{migration_name}:")
        
        # Check if already applied
        reset_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 1 FROM django_migrations 
                    WHERE app = %s AND name = %s
                """, [app_name, migration_name])
                if cursor.fetchone():
                    print("  ✓ Already applied")
                    continue
        except:
            pass
        
        # Try to apply the migration
        success, result = run_single_migration(app_name, migration_name)
        if success:
            print(f"  ✅ Migration {result}")
        else:
            # If it fails, try faking it
            if "already exists" in result:
                print(f"  ⚠️  Table exists, trying to fake...")
                success, result = run_single_migration(app_name, migration_name, fake=True)
                if success:
                    print(f"  ✅ Migration {result}")
                else:
                    print(f"  ❌ Failed to fake: {result}")
            else:
                print(f"  ❌ Failed: {result}")
    
    # Step 3: Verify results
    print("\n" + "="*60)
    print("Step 3: Verification...")
    print("="*60)
    
    reset_connection()
    try:
        with connection.cursor() as cursor:
            # Count total tables
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            total_tables = cursor.fetchone()[0]
            print(f"\nTotal tables: {total_tables}")
            
            # Check key tables
            key_tables = {
                'HR': ['hr_employee', 'hr_role'],
                'Users': ['users_userprofile', 'users_subscription'],
                'Sales': ['sales_invoice', 'sales_product'],
                'Finance': ['finance_account', 'finance_financetransaction'],
                'Payroll': ['payroll_payrollrun', 'payroll_payrolltransaction'],
                'Inventory': ['inventory_inventoryitem', 'inventory_product'],
            }
            
            print("\nKey tables status:")
            for app, tables in key_tables.items():
                print(f"\n{app}:")
                for table in tables:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        )
                    """, [table])
                    exists = cursor.fetchone()[0]
                    print(f"  {table}: {'✅' if exists else '❌'}")
                    
    except Exception as e:
        print(f"Error during verification: {e}")
    
    print("\n✅ Process complete!")
    print("\nIf tables are still missing:")
    print("1. Check migration files exist in app/migrations/")
    print("2. Run: python manage.py showmigrations")
    print("3. Check for migration dependencies")

if __name__ == '__main__':
    main()