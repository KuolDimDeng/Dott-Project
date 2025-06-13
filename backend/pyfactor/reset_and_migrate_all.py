#!/usr/bin/env python
"""
Reset all fake migrations and recreate tables properly.
This is a nuclear option but will fix all the issues.
"""

import os
import django
from django.core.management import call_command
from django.db import connection, transaction

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.conf import settings

def main():
    """Main function."""
    print("Resetting and recreating all missing tables...")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    # List of apps that need their tables created
    apps_to_fix = [
        'inventory',  # Many apps depend on this
        'hr',         # payroll and others depend on this
        'purchases',  # finance depends on this
        'users',      # Many apps depend on this
        'finance',
        'sales',
        'payroll',
        'integrations',
        'onboarding',
        'payments',
        'reports',
        'analysis',
    ]
    
    print("\n" + "="*60)
    print("Step 1: Removing ALL migration records for apps with missing tables...")
    print("="*60)
    
    with connection.cursor() as cursor:
        for app in apps_to_fix:
            try:
                # Check if tables exist
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE %s
                """, [f'{app}_%'])
                
                table_count = cursor.fetchone()[0]
                
                # Check migration count
                cursor.execute("""
                    SELECT COUNT(*) FROM django_migrations 
                    WHERE app = %s
                """, [app])
                
                migration_count = cursor.fetchone()[0]
                
                print(f"\n{app}: {table_count} tables, {migration_count} migrations")
                
                if table_count == 0 and migration_count > 0:
                    # Remove all migration records
                    cursor.execute("""
                        DELETE FROM django_migrations 
                        WHERE app = %s
                    """, [app])
                    print(f"  ✓ Removed {migration_count} migration records")
                
            except Exception as e:
                print(f"  ⚠️  Error processing {app}: {e}")
    
    print("\n" + "="*60)
    print("Step 2: Running sqlmigrate to see what tables should be created...")
    print("="*60)
    
    # Show what will be created for a few key apps
    for app in ['inventory', 'hr', 'users']:
        print(f"\n{app} 0001_initial will create:")
        try:
            sql = call_command('sqlmigrate', app, '0001_initial', verbosity=0)
            # Extract table names from CREATE TABLE statements
            import re
            tables = re.findall(r'CREATE TABLE.*?"([^"]+)"', str(sql))
            for table in tables[:5]:
                print(f"  - {table}")
            if len(tables) > 5:
                print(f"  ... and {len(tables)-5} more tables")
        except:
            pass
    
    print("\n" + "="*60)
    print("Step 3: Running migrations in correct dependency order...")
    print("="*60)
    
    # Migration order based on dependencies
    migration_order = [
        ('inventory', None),     # No dependencies
        ('hr', None),            # No dependencies on our apps
        ('purchases', None),     # Depends on inventory
        ('users', None),         # Base user models
        ('finance', None),       # Depends on purchases
        ('sales', None),         # Depends on inventory
        ('payroll', None),       # Depends on hr
        ('integrations', None),  # Depends on users
        ('onboarding', None),    # Depends on users
        ('payments', None),      # Depends on hr
        ('reports', None),       # Depends on users
        ('analysis', None),      # Depends on users
    ]
    
    for app, migration in migration_order:
        print(f"\nMigrating {app}...")
        try:
            if migration:
                call_command('migrate', app, migration, '--no-input', verbosity=0)
            else:
                call_command('migrate', app, '--no-input', verbosity=0)
            print(f"✅ {app} migrated successfully")
        except Exception as e:
            error_msg = str(e)
            if "already exists" in error_msg:
                print(f"⚠️  Some tables already exist, trying --fake-initial...")
                try:
                    call_command('migrate', app, '--fake-initial', '--no-input', verbosity=0)
                    print(f"✅ {app} migrated with --fake-initial")
                except Exception as e2:
                    print(f"❌ {app} failed: {e2}")
            else:
                print(f"❌ {app} failed: {error_msg}")
    
    print("\n" + "="*60)
    print("Step 4: Final verification...")
    print("="*60)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND (
                table_name LIKE 'inventory_%' OR
                table_name LIKE 'hr_%' OR
                table_name LIKE 'users_%' OR
                table_name LIKE 'sales_%' OR
                table_name LIKE 'finance_%' OR
                table_name LIKE 'payroll_%'
            )
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        
        # Group by app
        apps = {}
        for table in tables:
            app = table[0].split('_')[0]
            if app not in apps:
                apps[app] = []
            apps[app].append(table[0])
        
        print("\nCreated tables by app:")
        for app, app_tables in sorted(apps.items()):
            print(f"\n{app}: {len(app_tables)} tables")
            for table in app_tables[:3]:
                print(f"  - {table}")
            if len(app_tables) > 3:
                print(f"  ... and {len(app_tables)-3} more")
    
    print("\n✅ Process complete!")
    print("\nIf tables are still missing, check the migration files in each app's migrations folder.")

if __name__ == '__main__':
    main()