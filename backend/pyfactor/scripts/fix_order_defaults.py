#!/usr/bin/env python3
"""
Fix default values for marketplace_consumer_orders table
"""

import os
import sys
import django
from django.db import connection

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_order_defaults():
    """Add proper default values to marketplace_consumer_orders columns"""

    print("=" * 80)
    print("FIXING MARKETPLACE_CONSUMER_ORDERS DEFAULTS")
    print("=" * 80)

    with connection.cursor() as cursor:
        # List of columns and their defaults
        defaults = [
            ('tax_amount', '0'),
            ('delivery_fee', '0'),
            ('service_fee', '0'),
            ('tip_amount', '0'),
            ('discount_amount', '0'),
            ('created_from_chat', 'false'),
            ('pin_verified', 'false'),
        ]

        for column, default_value in defaults:
            try:
                print(f"\n🔧 Setting default for {column} to {default_value}...")
                cursor.execute(f"""
                    ALTER TABLE marketplace_consumer_orders
                    ALTER COLUMN {column} SET DEFAULT {default_value}
                """)
                print(f"  ✅ Default set for {column}")
            except Exception as e:
                print(f"  ⚠️  Error setting default for {column}: {e}")

        # Verify the changes
        print("\n📊 Verifying column defaults...")
        cursor.execute("""
            SELECT column_name, column_default
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_name IN ('tax_amount', 'delivery_fee', 'service_fee',
                                'tip_amount', 'discount_amount', 'created_from_chat',
                                'pin_verified')
            ORDER BY column_name
        """)

        results = cursor.fetchall()
        print("\n  Column defaults after update:")
        for col_name, col_default in results:
            print(f"    - {col_name}: {col_default or 'NULL'}")

        print("\n✅ Defaults fixed successfully!")

if __name__ == '__main__':
    fix_order_defaults()