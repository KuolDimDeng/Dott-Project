#!/usr/bin/env python
"""
Script to fix duplicate table error for page_permissions table.
This script will fake the problematic migration if the table already exists.
"""

import os
import sys
import django
from django.db import connection

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_table_exists(table_name):
    """Check if a table exists in the database."""
    with connection.cursor() as cursor:
        if connection.vendor == 'postgresql':
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, [table_name])
        else:
            # For other databases, adapt as needed
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=%s;
            """, [table_name])
        
        return cursor.fetchone()[0] if cursor.fetchone() else False

def fake_migration(app_name, migration_name):
    """Mark a migration as applied without running it."""
    from django.db.migrations.recorder import MigrationRecorder
    migration_recorder = MigrationRecorder(connection)
    migration_recorder.record_applied(app_name, migration_name)
    print(f"✅ Marked migration {app_name}.{migration_name} as applied")

def main():
    print("🔍 Checking for duplicate table issues...")
    
    # Check if page_permissions table exists
    if check_table_exists('page_permissions'):
        print("⚠️  Table 'page_permissions' already exists")
        
        # Check if the migration is already applied
        from django.db.migrations.recorder import MigrationRecorder
        recorder = MigrationRecorder(connection)
        applied = recorder.applied_migrations()
        
        if ('custom_auth', '0012_add_rbac_models') not in applied:
            print("📝 Faking migration custom_auth.0012_add_rbac_models...")
            fake_migration('custom_auth', '0012_add_rbac_models')
            print("✅ Successfully faked the migration!")
            print("\n💡 You can now run 'python manage.py migrate' again")
        else:
            print("✅ Migration custom_auth.0012_add_rbac_models is already marked as applied")
    else:
        print("❌ Table 'page_permissions' does not exist")
        print("💡 You should run the migration normally: python manage.py migrate")

if __name__ == '__main__':
    main()