#!/usr/bin/env python
"""
Debug script to check marketplace_consumer_orders table state
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def debug_order_table():
    """Check the current state of the order table"""

    with connection.cursor() as cursor:
        print("=" * 80)
        print("🔍 DEBUGGING MARKETPLACE_CONSUMER_ORDERS TABLE")
        print("=" * 80)

        # Check column information
        print("\n📊 Column Information:")
        cursor.execute("""
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_name IN (
                'id', 'order_number', 'consumer_id', 'business_id',
                'items', 'delivery_pin', 'pickup_pin', 'consumer_delivery_pin',
                'delivery_address', 'delivery_notes', 'cancellation_reason',
                'payment_intent_id', 'payment_transaction_id', 'chat_conversation_id'
            )
            ORDER BY ordinal_position
        """)

        print(f"\n{'Column':<25} {'Type':<20} {'Nullable':<10} {'Default':<30} {'Max Length':<10}")
        print("-" * 105)

        for row in cursor.fetchall():
            col_name, data_type, is_nullable, col_default, max_length = row
            default_str = str(col_default) if col_default else 'NULL'
            if "''" in default_str:
                default_str = "EMPTY STRING ⚠️"
            max_len_str = str(max_length) if max_length else 'N/A'
            print(f"{col_name:<25} {data_type:<20} {is_nullable:<10} {default_str:<30} {max_len_str:<10}")

        # Check for problematic records
        print("\n🔍 Checking for problematic records:")
        cursor.execute("""
            SELECT COUNT(*) FROM marketplace_consumer_orders
            WHERE order_number = '' OR order_number IS NULL
        """)
        empty_order_numbers = cursor.fetchone()[0]
        print(f"  - Records with empty/null order_number: {empty_order_numbers}")

        cursor.execute("""
            SELECT COUNT(*) FROM marketplace_consumer_orders
            WHERE items = '[]'::jsonb OR items IS NULL OR jsonb_array_length(items) = 0
        """)
        problematic_items = cursor.fetchone()[0]
        print(f"  - Records with problematic items field: {problematic_items}")

        # Check the latest order attempts
        print("\n📝 Latest 5 orders (checking for issues):")
        cursor.execute("""
            SELECT
                id,
                order_number,
                items,
                delivery_pin,
                pickup_pin,
                consumer_delivery_pin,
                created_at
            FROM marketplace_consumer_orders
            ORDER BY created_at DESC
            LIMIT 5
        """)

        orders = cursor.fetchall()
        if orders:
            for order in orders:
                print(f"\n  Order ID: {order[0]}")
                print(f"    - order_number: {repr(order[1])}")
                print(f"    - items: {repr(order[2])}")
                print(f"    - delivery_pin: {repr(order[3])}")
                print(f"    - pickup_pin: {repr(order[4])}")
                print(f"    - consumer_delivery_pin: {repr(order[5])}")
                print(f"    - created_at: {order[6]}")
        else:
            print("  No orders found")

        # Test what happens with different insert values
        print("\n🧪 Testing INSERT behavior (dry run):")
        test_cases = [
            ("Empty string for items", "''"),
            ("Empty JSON array", "'[]'"),
            ("NULL for items", "NULL"),
            ("Valid JSON", "'[{\"test\": \"value\"}]'")
        ]

        for test_name, test_value in test_cases:
            try:
                # This is a dry run - we rollback
                cursor.execute("BEGIN")
                cursor.execute(f"""
                    INSERT INTO marketplace_consumer_orders (
                        id, consumer_id, business_id, order_number,
                        items, subtotal, total_amount
                    ) VALUES (
                        gen_random_uuid(),
                        1, 1, 'TEST123',
                        {test_value}::jsonb,
                        100, 100
                    )
                """)
                cursor.execute("ROLLBACK")
                print(f"  ✅ {test_name}: Would succeed")
            except Exception as e:
                cursor.execute("ROLLBACK")
                print(f"  ❌ {test_name}: Would fail - {str(e).split('DETAIL')[0].strip()}")

        print("\n" + "=" * 80)
        print("🔍 RECOMMENDATIONS:")
        print("=" * 80)

        if empty_order_numbers > 0:
            print("  ⚠️  Fix empty order numbers with:")
            print("     UPDATE marketplace_consumer_orders")
            print("     SET order_number = 'ORD' || id")
            print("     WHERE order_number = '' OR order_number IS NULL;")

        if problematic_items > 0:
            print("  ⚠️  Fix problematic items fields with:")
            print("     UPDATE marketplace_consumer_orders")
            print("     SET items = '[]'::jsonb")
            print("     WHERE items = '' OR items IS NULL;")

        print("\n  💡 Ensure the application code:")
        print("     1. Never sends empty strings for JSONB fields")
        print("     2. Validates all fields before insert")
        print("     3. Uses proper defaults ([] for arrays, {} for objects)")

if __name__ == '__main__':
    debug_order_table()
    print("\n✅ Debug analysis complete!")