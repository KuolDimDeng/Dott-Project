#!/usr/bin/env python3
"""
Production Migration Fix Script
===============================

This script fixes the recurring transport migration conflicts by:
1. Safely checking database state
2. Marking problematic migrations as applied without running SQL
3. Ensuring migration history consistency

Usage:
    python manage.py shell < scripts/fix_production_migrations.py

Or in production:
    docker exec -it container python manage.py shell < scripts/fix_production_migrations.py
"""

import os
import sys
import django
from django.conf import settings
from django.db import connection, transaction
from django.core.management.commands.migrate import Command as MigrateCommand
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.recorder import MigrationRecorder

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def check_migration_applied(app_name, migration_name):
    """Check if a migration is marked as applied"""
    recorder = MigrationRecorder(connection)
    try:
        applied = recorder.migration_qs.filter(
            app=app_name,
            name=migration_name
        ).exists()
        return applied
    except Exception as e:
        print(f"Error checking migration {app_name}.{migration_name}: {e}")
        return False

def mark_migration_applied(app_name, migration_name):
    """Mark a migration as applied without running it"""
    recorder = MigrationRecorder(connection)
    try:
        recorder.record_applied(app_name, migration_name)
        print(f"✅ Marked {app_name}.{migration_name} as applied")
        return True
    except Exception as e:
        print(f"❌ Failed to mark {app_name}.{migration_name} as applied: {e}")
        return False

def fix_transport_migrations():
    """Fix transport migration conflicts"""
    print("\n🔧 === TRANSPORT MIGRATION FIX ===")
    
    # Check if transport tables exist
    transport_tables = [
        'transport_equipment', 
        'transport_driver', 
        'transport_expense',
        'transport_equipmenttype',
        'transport_maintenancerecord'
    ]
    
    tables_exist = {}
    for table in transport_tables:
        exists = check_table_exists(table)
        tables_exist[table] = exists
        print(f"Table {table}: {'EXISTS' if exists else 'MISSING'}")
    
    # Transport migrations to check/fix
    transport_migrations = [
        ('0001_ensure_base_tables', ['transport_equipmenttype']),
        ('0002_initial', ['transport_equipment']),
        ('0003_add_transport_models', ['transport_driver', 'transport_expense']),
        ('0004_fix_user_foreign_key_types', [])  # This one fixes existing data
    ]
    
    for migration_name, required_tables in transport_migrations:
        is_applied = check_migration_applied('transport', migration_name)
        print(f"\nMigration transport.{migration_name}: {'APPLIED' if is_applied else 'NOT APPLIED'}")
        
        if not is_applied:
            # Check if the required tables exist
            if required_tables:
                tables_ready = all(tables_exist.get(table, False) for table in required_tables)
                if tables_ready:
                    print(f"  Tables exist, marking migration as applied")
                    mark_migration_applied('transport', migration_name)
                else:
                    print(f"  Required tables missing, migration needs to run")
            else:
                # For migrations that don't create tables (like 0004), always mark as applied if tables exist
                if any(tables_exist.values()):
                    print(f"  Transport system exists, marking migration as applied")
                    mark_migration_applied('transport', migration_name)

def fix_custom_auth_migrations():
    """Fix custom_auth migration conflicts"""
    print("\n🔧 === CUSTOM_AUTH MIGRATION FIX ===")
    
    # Check if custom_auth_tenant exists
    tenant_exists = check_table_exists('custom_auth_tenant')
    user_exists = check_table_exists('custom_auth_user')
    
    print(f"Table custom_auth_tenant: {'EXISTS' if tenant_exists else 'MISSING'}")
    print(f"Table custom_auth_user: {'EXISTS' if user_exists else 'MISSING'}")
    
    # If tables exist but migration not marked, mark it
    if tenant_exists and user_exists:
        is_applied = check_migration_applied('custom_auth', '0001_initial')
        if not is_applied:
            print("Tables exist but migration not marked, fixing...")
            mark_migration_applied('custom_auth', '0001_initial')

def fix_other_critical_migrations():
    """Fix other critical migration conflicts"""
    print("\n🔧 === OTHER CRITICAL MIGRATIONS ===")
    
    critical_apps = ['users', 'banking', 'payments', 'hr']
    
    for app_name in critical_apps:
        # Check if the app has any tables
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name LIKE %s
            """, [f"{app_name}_%"])
            table_count = cursor.fetchone()[0]
        
        if table_count > 0:
            print(f"App {app_name}: {table_count} tables exist")
            
            # Get migration status
            executor = MigrationExecutor(connection)
            try:
                plan = executor.migration_plan([(app_name, None)])
                if plan:
                    print(f"  {len(plan)} migrations need to be applied")
                else:
                    print(f"  All migrations up to date")
            except Exception as e:
                print(f"  Error checking migration plan: {e}")

def main():
    """Main migration fix function"""
    print("🚀 === PRODUCTION MIGRATION FIX SCRIPT ===")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print(f"Environment: {os.environ.get('ENVIRONMENT', 'unknown')}")
    
    try:
        with transaction.atomic():
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            print("✅ Database connection successful")
            
            # Fix migrations
            fix_custom_auth_migrations()
            fix_transport_migrations()
            fix_other_critical_migrations()
            
            print("\n✅ === MIGRATION FIX COMPLETED ===")
            print("You can now run: python manage.py migrate")
            
    except Exception as e:
        print(f"❌ Migration fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    main()