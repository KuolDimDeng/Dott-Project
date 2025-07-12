#!/usr/bin/env python
"""Fix missing database tables by running migrations in correct order"""

import os
import sys
import django
from django.core.management import call_command
from django.db import connection

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def run_migrations_safely():
    """Run migrations in the correct order"""
    print("🔧 Starting database repair process...")
    
    # First, check what tables exist
    tables_to_check = [
        'django_migrations',
        'custom_auth_tenant',
        'custom_auth_user',
        'hr_employee',
        'hr_locationlog'
    ]
    
    print("\n📋 Checking existing tables:")
    for table in tables_to_check:
        exists = table_exists(table)
        status = "✅ EXISTS" if exists else "❌ MISSING"
        print(f"  {table}: {status}")
    
    # Run migrations in order
    apps_order = [
        'contenttypes',
        'auth',
        'sessions',
        'custom_auth',  # This must come before HR
        'hr',
        'invoice',
        'notifications',
        'oauth2',
        'payroll_admin',
        'payroll_wizard',
        'rls_admin',
        'stripe_integration',
        'support',
        'tax_filing',
        'admin',
        'messages',
        'staticfiles',
    ]
    
    print("\n🚀 Running migrations in order:")
    for app in apps_order:
        try:
            print(f"\n  Migrating {app}...")
            call_command('migrate', app, verbosity=0)
            print(f"  ✅ {app} migrated successfully")
        except Exception as e:
            if "No installed app with label" in str(e):
                print(f"  ⏭️  {app} not found, skipping...")
            else:
                print(f"  ❌ Error migrating {app}: {str(e)}")
                # Continue with other apps
    
    # Now run all remaining migrations
    print("\n🏁 Running all remaining migrations...")
    try:
        call_command('migrate', verbosity=1)
        print("✅ All migrations completed successfully!")
    except Exception as e:
        print(f"❌ Error during final migration: {str(e)}")
    
    # Final check
    print("\n📋 Final table check:")
    for table in tables_to_check:
        exists = table_exists(table)
        status = "✅ EXISTS" if exists else "❌ STILL MISSING"
        print(f"  {table}: {status}")
    
    # Specifically check for hr_locationlog
    if table_exists('hr_locationlog'):
        print("\n✅ SUCCESS: hr_locationlog table has been created!")
    else:
        print("\n❌ WARNING: hr_locationlog table is still missing!")
        print("   This might require manual intervention.")

if __name__ == "__main__":
    run_migrations_safely()