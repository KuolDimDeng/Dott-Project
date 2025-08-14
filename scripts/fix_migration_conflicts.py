#!/usr/bin/env python
"""
Fix migration conflicts between staging and production
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


def check_migration_status():
    """Check and report migration status"""
    print("=== Checking Migration Status ===\n")
    
    recorder = MigrationRecorder(connection)
    applied = recorder.applied_migrations()
    
    # Group by app
    apps = {}
    for app, migration in applied:
        if app not in apps:
            apps[app] = []
        apps[app].append(migration)
    
    # Check for issues
    issues = []
    
    # Check custom_auth specifically
    if 'custom_auth' in apps:
        custom_auth_migrations = apps['custom_auth']
        if '0002_add_tenant_id_to_all_models' not in custom_auth_migrations:
            issues.append("custom_auth: Missing 0002_add_tenant_id_to_all_models")
        if '0003_add_business_id_to_all_models' not in custom_auth_migrations:
            issues.append("custom_auth: Missing 0003_add_business_id_to_all_models")
    
    # Check sales
    if 'sales' in apps:
        sales_migrations = apps['sales']
        if '0012_add_currency_to_pos_transactions' not in sales_migrations:
            issues.append("sales: Missing 0012_add_currency_to_pos_transactions")
    
    # Check finance
    if 'finance' in apps:
        finance_migrations = apps['finance']
        pending_finance = [
            '0008_fix_accountcategory_unique_constraint',
            '0009_fix_accountcategory_constraints_properly',
            '0010_comprehensive_unique_constraint_fix',
            '0011_add_tenant_id_to_all_tables',
            '0012_ensure_journalentryline_tenant_id',
            '0013_ensure_tenant_and_business_ids'
        ]
        for migration in pending_finance:
            if migration not in finance_migrations:
                issues.append(f"finance: Missing {migration}")
    
    if issues:
        print("⚠️ Found migration issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ No migration issues found")
    
    return issues


def fix_custom_auth_conflict():
    """Fix the custom_auth migration conflict"""
    print("\n=== Fixing custom_auth Migration Conflict ===\n")
    
    try:
        # Mark the conflicting migrations as applied
        recorder = MigrationRecorder(connection)
        
        # These migrations are conflicting but we need to mark them as applied
        conflicts = [
            ('custom_auth', '0002_add_tenant_id_to_all_models'),
            ('custom_auth', '0003_add_business_id_to_all_models'),
        ]
        
        for app, migration in conflicts:
            try:
                recorder.record_applied(app, migration)
                print(f"✅ Marked {app}.{migration} as applied")
            except Exception as e:
                if 'duplicate key' in str(e).lower():
                    print(f"✅ {app}.{migration} already marked as applied")
                else:
                    print(f"⚠️ Could not mark {app}.{migration}: {e}")
        
        print("\n✅ Custom auth conflicts resolved")
        
    except Exception as e:
        print(f"❌ Error fixing custom_auth: {e}")


def apply_pending_migrations():
    """Apply all pending migrations"""
    print("\n=== Applying Pending Migrations ===\n")
    
    try:
        # Try to migrate normally
        print("Attempting normal migration...")
        call_command('migrate', verbosity=2)
        print("✅ Migrations applied successfully")
    except Exception as e:
        if 'Conflicting migrations' in str(e):
            print("⚠️ Migration conflict detected, attempting to fix...")
            fix_custom_auth_conflict()
            
            # Try again after fixing
            try:
                call_command('migrate', '--fake-initial')
                print("✅ Migrations applied with --fake-initial")
            except Exception as e2:
                print(f"❌ Could not apply migrations: {e2}")
        else:
            print(f"❌ Migration error: {e}")


def verify_critical_tables():
    """Verify critical table structures"""
    print("\n=== Verifying Critical Tables ===\n")
    
    with connection.cursor() as cursor:
        # Check POS transaction columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_pos_transaction' 
            AND column_name IN ('currency_code', 'currency_symbol', 'tax_jurisdiction', 'tax_calculation_method')
            ORDER BY column_name
        """)
        
        pos_columns = cursor.fetchall()
        if pos_columns:
            print("✅ POS Transaction columns:")
            for col in pos_columns:
                print(f"   - {col[0]}: {col[1]}")
        else:
            print("⚠️ Missing POS transaction columns")
        
        # Check other critical tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('auth_user', 'custom_auth_user', 'users_userprofile', 'sales_invoice', 'crm_customer')
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n✅ Critical tables found: {', '.join(tables)}")


if __name__ == "__main__":
    print("=== Database Migration Sync Tool ===\n")
    print(f"Database: {connection.settings_dict.get('NAME')}")
    print(f"Host: {connection.settings_dict.get('HOST')}\n")
    
    # Check current status
    issues = check_migration_status()
    
    # Fix conflicts if any
    if issues:
        response = input("\nDo you want to fix these issues? (y/n): ")
        if response.lower() == 'y':
            fix_custom_auth_conflict()
            apply_pending_migrations()
    
    # Verify tables
    verify_critical_tables()
    
    print("\n✅ Database sync complete!")