#!/usr/bin/env python
"""
Fix the JSON parsing issue for ConsumerOrder model
The error pattern shows: 303, '', '[]' indicating empty strings/arrays being passed to JSON fields
"""

import os
import sys
import django

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_order_json_issue():
    print("=" * 50)
    print("FIXING ORDER JSON ISSUE")
    print("=" * 50)

    with connection.cursor() as cursor:
        # First, check the actual table name and columns
        print("\n1. Checking marketplace order tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%consumer%order%'
        """)

        tables = cursor.fetchall()
        print(f"   Found tables: {[t[0] for t in tables]}")

        table_name = 'marketplace_consumer_orders'

        # Check all columns
        print(f"\n2. Checking columns in {table_name}...")
        cursor.execute(f"""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print(f"   Found {len(columns)} columns")

        # Check for missing columns
        existing_cols = {col[0] for col in columns}
        required_cols = {
            'service_fee': "DECIMAL(10, 2) DEFAULT 0",
            'pickup_pin': "VARCHAR(6) DEFAULT ''",
            'consumer_delivery_pin': "VARCHAR(6) DEFAULT ''",
            'delivery_pin': "VARCHAR(6) DEFAULT ''"  # Add this missing field
        }

        missing = []
        for col_name, col_def in required_cols.items():
            if col_name not in existing_cols:
                missing.append((col_name, col_def))

        if missing:
            print(f"\n3. Adding missing columns: {[m[0] for m in missing]}")
            for col_name, col_def in missing:
                try:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        ADD COLUMN IF NOT EXISTS {col_name} {col_def}
                    """)
                    print(f"   ✅ Added {col_name}")
                except Exception as e:
                    print(f"   ❌ Failed to add {col_name}: {e}")
        else:
            print("\n3. All required columns exist")

        # Check JSON columns and fix their defaults
        print("\n4. Checking JSON columns...")
        cursor.execute(f"""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            AND data_type = 'json'
        """)

        json_cols = cursor.fetchall()
        for col_name, col_type, col_default in json_cols:
            print(f"   JSON Column: {col_name} (default: {col_default})")

            # Fix any NULL defaults for JSON columns to be empty list or dict
            if col_name == 'items' and (col_default is None or col_default == "''::json"):
                print(f"   ⚠️ Fixing default for {col_name}...")
                try:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        ALTER COLUMN {col_name} SET DEFAULT '[]'::json
                    """)
                    print(f"   ✅ Fixed default for {col_name}")
                except Exception as e:
                    print(f"   ❌ Failed to fix {col_name}: {e}")

        # Fix any existing rows with invalid JSON
        print("\n5. Fixing existing rows with invalid JSON...")
        cursor.execute(f"""
            UPDATE {table_name}
            SET items = '[]'::json
            WHERE items IS NULL
            OR items::text = ''
            OR items::text = '""'
        """)
        fixed_count = cursor.rowcount
        print(f"   ✅ Fixed {fixed_count} rows with invalid items JSON")

        # Commit changes
        connection.commit()
        print("\n6. Changes committed successfully")

        # Final verification
        print("\n7. Final verification...")
        cursor.execute(f"""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin', 'delivery_pin', 'items')
            ORDER BY column_name
        """)

        results = cursor.fetchall()
        print("   Verified columns:")
        for col_name, col_type, col_default in results:
            print(f"      {col_name}: {col_type} (default: {col_default})")

if __name__ == "__main__":
    fix_order_json_issue()
    print("\n" + "=" * 50)
    print("JSON ISSUE FIX COMPLETE")
    print("Try placing an order now - it should work!")
    print("=" * 50)