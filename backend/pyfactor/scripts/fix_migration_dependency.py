#!/usr/bin/env python
"""
Fix migration dependency conflicts between marketplace and couriers apps.
This script handles the circular dependency issue where marketplace.0003 depends on couriers.0001
but was applied before it.
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.core.management import call_command

def fix_migration_dependency():
    """Fix the migration dependency issue between marketplace and couriers"""
    
    with connection.cursor() as cursor:
        # Check current migration state
        print("🔍 Checking current migration state...")
        cursor.execute("""
            SELECT app, name 
            FROM django_migrations 
            WHERE app IN ('marketplace', 'couriers')
            ORDER BY app, name
        """)
        current_migrations = cursor.fetchall()
        print(f"Current migrations: {current_migrations}")
        
        # Check if the problematic migration exists
        cursor.execute("""
            SELECT id, app, name 
            FROM django_migrations 
            WHERE app = 'marketplace' AND name = '0003_add_courier_integration'
        """)
        problematic = cursor.fetchone()
        
        if problematic:
            print(f"⚠️  Found problematic migration: {problematic}")
            
            # Remove the problematic marketplace migration
            with transaction.atomic():
                print("🗑️  Removing marketplace.0003_add_courier_integration from django_migrations...")
                cursor.execute("""
                    DELETE FROM django_migrations 
                    WHERE app = 'marketplace' AND name = '0003_add_courier_integration'
                """)
                print("✅ Removed problematic migration record")
        
        # Check if couriers.0001_initial exists
        cursor.execute("""
            SELECT id FROM django_migrations 
            WHERE app = 'couriers' AND name = '0001_initial'
        """)
        courier_initial = cursor.fetchone()
        
        if not courier_initial:
            print("📝 Marking couriers.0001_initial as applied...")
            # Mark couriers.0001_initial as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('couriers', '0001_initial', NOW())
            """)
            print("✅ Marked couriers.0001_initial as applied")
        else:
            print("✅ couriers.0001_initial already exists")
        
        # Now re-apply marketplace.0003 if needed
        if problematic:
            print("🔄 Re-applying marketplace.0003_add_courier_integration...")
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('marketplace', '0003_add_courier_integration', NOW())
            """)
            print("✅ Re-applied marketplace.0003_add_courier_integration")
        
        # Check final state
        print("\n📊 Final migration state:")
        cursor.execute("""
            SELECT app, name 
            FROM django_migrations 
            WHERE app IN ('marketplace', 'couriers', 'users')
            ORDER BY app, name
        """)
        final_migrations = cursor.fetchall()
        for app, name in final_migrations:
            print(f"  - {app}.{name}")

if __name__ == "__main__":
    try:
        fix_migration_dependency()
        print("\n✅ Migration dependency issue resolved!")
        print("\n🚀 Now you can run: python manage.py migrate")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)