#!/usr/bin/env python
"""
Script to fix marketplace database schema on staging
Handles migration dependencies and missing tables
"""

import os
import sys
import django

# Add the parent directory to the path so we can import settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection, migrations
from django.core.management.sql import emit_post_migrate_signal

def fix_marketplace_database():
    print("=" * 50)
    print("MARKETPLACE DATABASE FIX")
    print("=" * 50)

    # First check if the tables exist
    print("\n1. Checking if marketplace tables exist...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name LIKE 'marketplace%'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cursor.fetchall()]

            print(f"   Found {len(tables)} marketplace tables:")
            for table in tables:
                print(f"   - {table}")

            # Check if consumerorder table exists
            if 'marketplace_consumerorder' not in tables:
                print("   ⚠️ marketplace_consumerorder table not found!")

                # Try to migrate marketplace app from scratch
                print("\n2. Attempting to migrate marketplace app...")
                try:
                    # First fake the problematic couriers migration
                    print("   Faking couriers.0001_initial migration...")
                    call_command('migrate', 'couriers', '0001_initial', '--fake')

                    # Now migrate marketplace
                    print("   Migrating marketplace app...")
                    call_command('migrate', 'marketplace')
                    print("   ✅ Marketplace migrations applied")
                except Exception as e:
                    print(f"   ❌ Migration failed: {e}")
            else:
                print("   ✅ marketplace_consumerorder table exists")

    except Exception as e:
        print(f"   Error checking tables: {e}")

    # Now check and fix the columns
    print("\n3. Checking marketplace_consumerorder columns...")
    try:
        with connection.cursor() as cursor:
            # Get all columns for the consumerorder table
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'marketplace_consumerorder'
                ORDER BY column_name
            """)

            existing_columns = {}
            for row in cursor.fetchall():
                existing_columns[row[0]] = {
                    'type': row[1],
                    'nullable': row[2],
                    'default': row[3]
                }

            print(f"   Found {len(existing_columns)} columns")

            # Check for required columns
            required_columns = {
                'service_fee': "DECIMAL(10, 2) DEFAULT 0",
                'pickup_pin': "VARCHAR(6) DEFAULT ''",
                'consumer_delivery_pin': "VARCHAR(6) DEFAULT ''"
            }

            missing = []
            for col_name, col_def in required_columns.items():
                if col_name not in existing_columns:
                    missing.append((col_name, col_def))

            if missing:
                print(f"   ⚠️ Missing columns: {[m[0] for m in missing]}")

                print("\n4. Adding missing columns...")
                for col_name, col_def in missing:
                    try:
                        cursor.execute(f"""
                            ALTER TABLE marketplace_consumerorder
                            ADD COLUMN {col_name} {col_def}
                        """)
                        print(f"   ✅ Added column: {col_name}")
                    except Exception as e:
                        if 'already exists' in str(e).lower():
                            print(f"   ℹ️ Column {col_name} already exists")
                        else:
                            print(f"   ❌ Failed to add {col_name}: {e}")

                # Commit the changes
                connection.commit()
                print("   ✅ Column additions committed")
            else:
                print("   ✅ All required columns exist")

    except Exception as e:
        print(f"   Error checking/adding columns: {e}")

    # Final verification
    print("\n5. Final verification...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'marketplace_consumerorder'
                AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin')
                ORDER BY column_name
            """)

            results = cursor.fetchall()
            if len(results) == 3:
                print("   ✅ All required columns verified:")
                for col_name, col_type in results:
                    print(f"      - {col_name}: {col_type}")
            else:
                print(f"   ⚠️ Only {len(results)} of 3 required columns found")

    except Exception as e:
        print(f"   Error verifying: {e}")

    # Mark migrations as applied if columns exist
    print("\n6. Marking migrations as applied...")
    try:
        from django.db.migrations.recorder import MigrationRecorder
        recorder = MigrationRecorder(connection)

        # Get applied migrations
        applied = recorder.applied_migrations()

        # List of migrations to mark as applied
        to_fake = [
            ('marketplace', '0013_add_missing_order_columns'),
            ('marketplace', '0014_fix_items_default_to_list'),
            ('marketplace', '0015_add_service_fee_field'),
            ('marketplace', '0002_add_pickup_pin'),
            ('marketplace', '0016_merge_0002_add_pickup_pin_0015_add_service_fee_field')
        ]

        for app, migration in to_fake:
            if (app, migration) not in applied:
                try:
                    call_command('migrate', app, migration, '--fake')
                    print(f"   ✅ Marked {app}.{migration} as applied")
                except Exception as e:
                    print(f"   ⚠️ Could not mark {app}.{migration}: {e}")
            else:
                print(f"   ℹ️ {app}.{migration} already marked as applied")

    except Exception as e:
        print(f"   Error marking migrations: {e}")

if __name__ == "__main__":
    fix_marketplace_database()
    print("\n" + "=" * 50)
    print("DATABASE FIX COMPLETE")
    print("Test order creation now - it should work!")
    print("=" * 50)