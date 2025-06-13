#!/usr/bin/env python
"""
Final script to fix missing tables by running migrations properly.
This version handles all the issues we've encountered.
"""

import os
import django
import sys
from django.core.management import call_command
from django.db import connection, transaction

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def close_db_connection():
    """Close database connection to avoid transaction issues."""
    try:
        connection.close()
    except:
        pass

def main():
    """Main function."""
    print("Final approach to fix missing database tables...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # Step 1: Delete the problematic new migrations we created
    print("\n" + "="*60)
    print("Step 1: Cleaning up new migrations that are causing issues...")
    print("="*60)
    
    migrations_to_delete = [
        'analysis/migrations/0002_chartconfiguration_tenant_id_financialdata_tenant_id.py',
        'banking/migrations/0004_bankaccount_tenant_id_banktransaction_tenant_id_and_more.py',
        'crm/migrations/0006_customer_tenant_id_and_more.py',
        'hr/migrations/0012_accesspermission_tenant_id_benefits_tenant_id_and_more.py',
        'payroll/migrations/0006_bonuspayment_tenant_id_incomewithholding_tenant_id_and_more.py',
        'reports/migrations/0002_report_tenant_id.py',
        'taxes/migrations/0002_incometaxrate_tenant_id_payrolltaxfiling_tenant_id_and_more.py',
    ]
    
    for migration_file in migrations_to_delete:
        if os.path.exists(migration_file):
            try:
                os.remove(migration_file)
                print(f"✓ Deleted {migration_file}")
            except Exception as e:
                print(f"⚠️  Could not delete {migration_file}: {e}")
    
    # Step 2: Run migrate with --run-syncdb to create tables without migrations
    print("\n" + "="*60)
    print("Step 2: Running migrate with --run-syncdb...")
    print("="*60)
    
    close_db_connection()
    
    try:
        # This will create tables for apps without migrations
        call_command('migrate', '--run-syncdb', '--no-input', verbosity=2)
        print("✅ Syncdb completed")
    except Exception as e:
        print(f"⚠️  Syncdb had issues: {e}")
    
    # Step 3: Run individual app migrations in correct order
    print("\n" + "="*60)
    print("Step 3: Running migrations for apps with missing tables...")
    print("="*60)
    
    # Apps to migrate in order (dependencies first)
    apps_to_migrate = [
        ('users', ['0001_initial', '0002_remove_userprofile_schema_name_and_more']),
        ('finance', ['0001_initial', '0002_initial']),
        ('sales', ['0001_initial', '0002_add_missing_fields_and_models', 
                   '0003_rename_sales_estimate_tenant_idx_sales_estim_tenant__bfa1b9_idx_and_more']),
        ('integrations', ['0001_initial']),
        ('onboarding', ['0001_initial', '0002_userprofile_alter_onboardingprogress_current_step_and_more']),
        ('payments', ['0001_initial']),
        ('payroll', ['0001_initial', '0002_add_timesheet_to_payrolltransaction', 
                     '0003_remove_timesheet_models', '0004_paysetting_bonuspayment_incomewithholding_and_more',
                     '0005_add_missing_payrollrun_fields']),
        ('reports', ['0001_initial']),
    ]
    
    for app_name, migrations in apps_to_migrate:
        print(f"\n--- Migrating {app_name} ---")
        
        # Check which migrations are already applied
        close_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT name FROM django_migrations 
                    WHERE app = %s
                """, [app_name])
                applied_migrations = [row[0] for row in cursor.fetchall()]
        except:
            applied_migrations = []
        
        # Apply each migration if not already applied
        for migration_name in migrations:
            if migration_name in applied_migrations:
                print(f"  ✓ {migration_name} already applied")
            else:
                print(f"  → Applying {migration_name}...")
                close_db_connection()
                try:
                    call_command('migrate', app_name, migration_name, '--no-input', verbosity=0)
                    print(f"  ✅ {migration_name} applied successfully")
                except Exception as e:
                    error_msg = str(e)
                    if "already exists" in error_msg:
                        # If table already exists, fake the migration
                        print(f"  ⚠️  Table already exists, faking migration...")
                        close_db_connection()
                        try:
                            call_command('migrate', app_name, migration_name, '--fake', '--no-input', verbosity=0)
                            print(f"  ✅ {migration_name} faked successfully")
                        except Exception as fake_error:
                            print(f"  ❌ Could not fake migration: {fake_error}")
                    else:
                        print(f"  ❌ Failed: {error_msg}")
    
    # Step 4: Final verification
    print("\n" + "="*60)
    print("Step 4: Final verification...")
    print("="*60)
    
    close_db_connection()
    
    # Count tables
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            table_count = cursor.fetchone()[0]
            print(f"\nTotal tables in database: {table_count}")
            
            # Check specific important tables
            important_tables = [
                'hr_employee', 'users_userprofile', 'sales_invoice', 
                'finance_account', 'payroll_payrollrun'
            ]
            
            print("\nChecking important tables:")
            for table in important_tables:
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
        print(f"Could not verify tables: {e}")
    
    print("\n✅ Table fix process complete!")
    print("\nIf some tables are still missing, you may need to:")
    print("1. Check the migration files exist in each app's migrations folder")
    print("2. Manually create missing tables using SQL scripts")
    print("3. Use Django's sqlmigrate command to see the SQL for a migration")

if __name__ == '__main__':
    main()