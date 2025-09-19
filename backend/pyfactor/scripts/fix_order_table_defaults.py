#!/usr/bin/env python
"""
Fix marketplace_consumer_orders table defaults to prevent JSON parsing errors
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_order_defaults():
    """Remove empty string defaults from marketplace_consumer_orders table"""

    with connection.cursor() as cursor:
        print("Fixing marketplace_consumer_orders defaults...")

        # Check current column defaults
        cursor.execute("""
            SELECT column_name, column_default
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_default LIKE '''''%%'
        """)

        bad_columns = cursor.fetchall()
        if bad_columns:
            print(f"Found {len(bad_columns)} columns with empty string defaults:")
            for col_name, col_default in bad_columns:
                print(f"  - {col_name}: {col_default}")

        # Fix the defaults
        try:
            cursor.execute("""
                -- Remove empty string defaults
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN order_number DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_address DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_notes DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN cancellation_reason DROP DEFAULT;

                -- Ensure PIN fields default to NULL not empty string
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_pin SET DEFAULT NULL;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN pickup_pin SET DEFAULT NULL;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN consumer_delivery_pin SET DEFAULT NULL;
            """)

            print("✅ Successfully removed empty string defaults")

        except Exception as e:
            print(f"❌ Error fixing defaults: {e}")
            raise

        # Verify the fix
        cursor.execute("""
            SELECT column_name, column_default
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_name IN ('order_number', 'delivery_address', 'delivery_notes',
                                'cancellation_reason', 'delivery_pin', 'pickup_pin',
                                'consumer_delivery_pin')
        """)

        print("\nColumn defaults after fix:")
        for col_name, col_default in cursor.fetchall():
            print(f"  - {col_name}: {col_default if col_default else 'NULL'}")

if __name__ == '__main__':
    fix_order_defaults()
    print("\n✅ Table defaults fixed successfully!")