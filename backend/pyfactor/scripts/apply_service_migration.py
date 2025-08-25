#!/usr/bin/env python
"""
Script to safely apply the Service customer field migration to production.
This migration adds the customer_id column to the inventory_service table.

Usage:
    python apply_service_migration.py --check    # Check migration status
    python apply_service_migration.py --apply    # Apply the migration
"""

import os
import sys
import django
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.core.management import call_command
import argparse

def check_migration_status():
    """Check if the migration has been applied"""
    executor = MigrationExecutor(connection)
    applied_migrations = executor.loader.applied_migrations
    
    migration_name = ('inventory', '0016_add_customer_to_service')
    
    if migration_name in applied_migrations:
        print(f"✅ Migration {migration_name[0]}.{migration_name[1]} has been applied")
        return True
    else:
        print(f"❌ Migration {migration_name[0]}.{migration_name[1]} has NOT been applied")
        return False

def check_column_exists():
    """Check if the customer_id column exists in inventory_service table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_service' 
            AND column_name = 'customer_id';
        """)
        result = cursor.fetchone()
        if result:
            print("✅ Column customer_id exists in inventory_service table")
            return True
        else:
            print("❌ Column customer_id does NOT exist in inventory_service table")
            return False

def apply_migration():
    """Apply the specific migration"""
    print("\n📋 Applying migration 0016_add_customer_to_service...")
    
    try:
        # Run the specific migration
        call_command('migrate', 'inventory', '0016', verbosity=2)
        print("✅ Migration applied successfully!")
        return True
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Apply Service customer field migration')
    parser.add_argument('--check', action='store_true', help='Check migration status')
    parser.add_argument('--apply', action='store_true', help='Apply the migration')
    
    args = parser.parse_args()
    
    if not args.check and not args.apply:
        print("Please specify --check or --apply")
        parser.print_help()
        return
    
    print("=== Service Customer Field Migration Tool ===\n")
    
    # Always check status first
    print("📊 Checking current status...")
    migration_applied = check_migration_status()
    column_exists = check_column_exists()
    
    if args.check:
        print("\n=== Status Summary ===")
        if migration_applied and column_exists:
            print("✅ Everything is properly configured")
        elif not migration_applied and not column_exists:
            print("⚠️ Migration needs to be applied")
            print("Run with --apply to fix this issue")
        elif migration_applied and not column_exists:
            print("⚠️ Migration marked as applied but column missing!")
            print("This indicates a database inconsistency")
        elif not migration_applied and column_exists:
            print("⚠️ Column exists but migration not marked as applied!")
            print("This indicates a migration tracking issue")
    
    if args.apply:
        if migration_applied and column_exists:
            print("\n✅ Migration already applied and column exists. Nothing to do.")
        else:
            print("\n⚠️ About to apply migration...")
            print("This will add the customer_id column to inventory_service table")
            
            response = input("\nProceed? (yes/no): ")
            if response.lower() == 'yes':
                if apply_migration():
                    # Verify after applying
                    print("\n📊 Verifying changes...")
                    check_migration_status()
                    check_column_exists()
            else:
                print("❌ Migration cancelled")

if __name__ == "__main__":
    main()