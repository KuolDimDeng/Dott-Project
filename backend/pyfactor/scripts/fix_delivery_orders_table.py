#!/usr/bin/env python3
"""
Fix missing columns in delivery_orders table
"""

import os
import sys
import django
from django.db import connection

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_delivery_orders_table():
    """Add missing columns to delivery_orders table"""

    print("=" * 80)
    print("FIXING DELIVERY_ORDERS TABLE")
    print("=" * 80)

    with connection.cursor() as cursor:
        # Check if the column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'delivery_orders'
            AND column_name = 'actual_route_taken'
        """)

        if cursor.fetchone():
            print("\n✅ Column 'actual_route_taken' already exists")
        else:
            print("\n🔧 Adding 'actual_route_taken' column...")
            try:
                cursor.execute("""
                    ALTER TABLE delivery_orders
                    ADD COLUMN actual_route_taken JSONB DEFAULT '[]'::jsonb
                """)
                print("  ✅ Column added successfully")
            except Exception as e:
                print(f"  ❌ Error adding column: {e}")

        # Check for any other missing columns
        print("\n📊 Checking all columns in delivery_orders table...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'delivery_orders'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print(f"\n  Found {len(columns)} columns:")
        for col_name, col_type in columns[:10]:  # Show first 10
            print(f"    - {col_name}: {col_type}")
        if len(columns) > 10:
            print(f"    ... and {len(columns) - 10} more")

if __name__ == '__main__':
    fix_delivery_orders_table()