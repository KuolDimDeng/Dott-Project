#!/usr/bin/env python
"""
Script to apply marketplace migrations on staging
Run this in Render shell to add the missing database fields
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
from django.db import connection

def check_and_apply_migrations():
    print("=" * 50)
    print("MARKETPLACE MIGRATION CHECKER")
    print("=" * 50)

    # Check current migration status
    print("\n1. Checking current migration status...")
    try:
        with connection.cursor() as cursor:
            # Check if the service_fee column exists
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'marketplace_consumerorder'
                AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin')
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]

            print(f"   Existing columns: {existing_columns}")

            missing_columns = []
            for col in ['service_fee', 'pickup_pin', 'consumer_delivery_pin']:
                if col not in existing_columns:
                    missing_columns.append(col)

            if missing_columns:
                print(f"   ⚠️ Missing columns: {missing_columns}")
            else:
                print("   ✅ All required columns exist")
                return
    except Exception as e:
        print(f"   Error checking columns: {e}")

    # Show migrations
    print("\n2. Marketplace migrations:")
    call_command('showmigrations', 'marketplace')

    # Apply migrations
    print("\n3. Applying marketplace migrations...")
    try:
        call_command('migrate', 'marketplace', verbosity=2)
        print("   ✅ Migrations applied successfully")
    except Exception as e:
        print(f"   ❌ Error applying migrations: {e}")

        # Try to manually add the missing columns if migration fails
        print("\n4. Attempting manual column addition...")
        try:
            with connection.cursor() as cursor:
                if 'service_fee' not in existing_columns:
                    cursor.execute("""
                        ALTER TABLE marketplace_consumerorder
                        ADD COLUMN service_fee DECIMAL(10, 2) DEFAULT 0
                    """)
                    print("   ✅ Added service_fee column")

                if 'pickup_pin' not in existing_columns:
                    cursor.execute("""
                        ALTER TABLE marketplace_consumerorder
                        ADD COLUMN pickup_pin VARCHAR(6) DEFAULT ''
                    """)
                    print("   ✅ Added pickup_pin column")

                if 'consumer_delivery_pin' not in existing_columns:
                    cursor.execute("""
                        ALTER TABLE marketplace_consumerorder
                        ADD COLUMN consumer_delivery_pin VARCHAR(6) DEFAULT ''
                    """)
                    print("   ✅ Added consumer_delivery_pin column")

                connection.commit()
                print("   ✅ Manual column addition completed")
        except Exception as e2:
            print(f"   ❌ Manual column addition failed: {e2}")

    # Verify the fix
    print("\n5. Verifying database schema...")
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'marketplace_consumerorder'
                AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin')
                ORDER BY column_name
            """)

            print("   Final column status:")
            for row in cursor.fetchall():
                print(f"   - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
    except Exception as e:
        print(f"   Error verifying: {e}")

if __name__ == "__main__":
    check_and_apply_migrations()
    print("\n" + "=" * 50)
    print("MIGRATION CHECK COMPLETE")
    print("=" * 50)