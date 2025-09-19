#!/usr/bin/env python
"""
Comprehensive fix for marketplace_consumer_orders table defaults
This script fixes all JSON parsing errors and empty string default issues
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_all_order_defaults():
    """Fix all defaults and clean up existing bad data"""

    with connection.cursor() as cursor:
        print("🔧 Starting comprehensive fix for marketplace_consumer_orders...")
        print("-" * 60)

        # Step 1: Check current issues
        print("\n📋 Step 1: Checking for current issues...")
        cursor.execute("""
            SELECT
                COUNT(*) FILTER (WHERE order_number = '') as empty_order_numbers,
                COUNT(*) FILTER (WHERE pickup_pin = '') as empty_pickup_pins,
                COUNT(*) FILTER (WHERE consumer_delivery_pin = '') as empty_consumer_pins,
                COUNT(*) FILTER (WHERE delivery_pin = '') as empty_delivery_pins,
                COUNT(*) FILTER (WHERE payment_intent_id = '') as empty_payment_intents,
                COUNT(*) FILTER (WHERE payment_transaction_id = '') as empty_transactions
            FROM marketplace_consumer_orders
        """)

        issues = cursor.fetchone()
        print(f"  Empty order_numbers: {issues[0]}")
        print(f"  Empty pickup_pins: {issues[1]}")
        print(f"  Empty consumer_delivery_pins: {issues[2]}")
        print(f"  Empty delivery_pins: {issues[3]}")
        print(f"  Empty payment_intent_ids: {issues[4]}")
        print(f"  Empty payment_transaction_ids: {issues[5]}")

        # Step 2: Fix existing data
        print("\n📝 Step 2: Fixing existing empty string values...")
        cursor.execute("""
            UPDATE marketplace_consumer_orders
            SET
                order_number = CASE
                    WHEN order_number = '' THEN 'ORD' || LPAD(CAST(id AS TEXT), 8, '0')
                    ELSE order_number
                END,
                pickup_pin = CASE WHEN pickup_pin = '' THEN NULL ELSE pickup_pin END,
                consumer_delivery_pin = CASE WHEN consumer_delivery_pin = '' THEN NULL ELSE consumer_delivery_pin END,
                delivery_pin = CASE WHEN delivery_pin = '' THEN NULL ELSE delivery_pin END,
                payment_intent_id = CASE WHEN payment_intent_id = '' THEN NULL ELSE payment_intent_id END,
                payment_transaction_id = CASE WHEN payment_transaction_id = '' THEN NULL ELSE payment_transaction_id END
            WHERE
                order_number = '' OR
                pickup_pin = '' OR
                consumer_delivery_pin = '' OR
                delivery_pin = '' OR
                payment_intent_id = '' OR
                payment_transaction_id = '';
        """)
        print(f"  Updated {cursor.rowcount} rows")

        # Step 3: Check and display current column defaults
        print("\n🔍 Step 3: Checking current column defaults...")
        cursor.execute("""
            SELECT column_name, column_default, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_name IN (
                'order_number', 'delivery_address', 'delivery_notes',
                'cancellation_reason', 'delivery_pin', 'pickup_pin',
                'consumer_delivery_pin', 'payment_intent_id', 'payment_transaction_id'
            )
            ORDER BY ordinal_position
        """)

        print("\n  Current column settings:")
        print("  " + "-" * 75)
        print(f"  {'Column':<30} {'Type':<20} {'Nullable':<10} {'Default':<20}")
        print("  " + "-" * 75)

        for col_name, col_default, is_nullable, data_type in cursor.fetchall():
            default_display = col_default if col_default else 'None'
            if "''" in str(default_display):
                default_display = "EMPTY STRING ⚠️"
            print(f"  {col_name:<30} {data_type:<20} {is_nullable:<10} {default_display:<20}")

        # Step 4: Fix the defaults
        print("\n⚙️  Step 4: Fixing column defaults...")
        try:
            # Fix CharField fields that should allow NULL
            char_fields_nullable = [
                'pickup_pin', 'consumer_delivery_pin', 'delivery_pin',
                'payment_intent_id', 'payment_transaction_id'
            ]

            for field in char_fields_nullable:
                cursor.execute(f"""
                    ALTER TABLE marketplace_consumer_orders
                    ALTER COLUMN {field} DROP DEFAULT;

                    ALTER TABLE marketplace_consumer_orders
                    ALTER COLUMN {field} SET DEFAULT NULL;
                """)
                print(f"  ✅ Fixed {field} - set default to NULL")

            # Fix order_number to not have a default (required field)
            cursor.execute("""
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN order_number DROP DEFAULT;
            """)
            print("  ✅ Fixed order_number - removed default (required field)")

            # TextFields should have empty string as default
            text_fields = ['delivery_address', 'delivery_notes', 'cancellation_reason']
            for field in text_fields:
                cursor.execute(f"""
                    ALTER TABLE marketplace_consumer_orders
                    ALTER COLUMN {field} SET DEFAULT '';
                """)
                print(f"  ✅ Fixed {field} - set default to empty string")

        except Exception as e:
            print(f"  ❌ Error fixing defaults: {e}")
            raise

        # Step 5: Verify the fix
        print("\n✔️  Step 5: Verifying the fix...")
        cursor.execute("""
            SELECT column_name, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND column_name IN (
                'order_number', 'delivery_address', 'delivery_notes',
                'cancellation_reason', 'delivery_pin', 'pickup_pin',
                'consumer_delivery_pin', 'payment_intent_id', 'payment_transaction_id'
            )
            ORDER BY ordinal_position
        """)

        print("\n  Final column settings:")
        print("  " + "-" * 75)
        print(f"  {'Column':<30} {'Nullable':<10} {'Default':<35}")
        print("  " + "-" * 75)

        for col_name, col_default, is_nullable in cursor.fetchall():
            default_display = col_default if col_default else 'NULL'
            if "''" in str(default_display):
                default_display = "'' (empty string)"
            status = "✅" if ("''" not in str(col_default) or col_name in text_fields) else "⚠️"
            print(f"  {status} {col_name:<28} {is_nullable:<10} {default_display:<33}")

        # Step 6: Test order creation capability
        print("\n🧪 Step 6: Testing order creation capability...")
        cursor.execute("""
            SELECT
                column_name,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND is_nullable = 'NO'
            AND column_default IS NULL
            AND column_name NOT IN (
                'id', 'consumer_id', 'business_id', 'items',
                'subtotal', 'total_amount', 'created_at', 'updated_at',
                'order_status', 'payment_status', 'payment_method',
                'tax_amount', 'delivery_fee', 'service_fee', 'tip_amount',
                'discount_amount', 'pin_verified', 'pickup_verified',
                'delivery_verified', 'created_from_chat',
                'restaurant_payment_status', 'courier_payment_status'
            )
        """)

        required_without_defaults = cursor.fetchall()
        if required_without_defaults:
            print("  ⚠️  Required fields without defaults (must be set in code):")
            for col_name, is_nullable, col_default in required_without_defaults:
                print(f"    - {col_name}")
        else:
            print("  ✅ All required fields have appropriate defaults or are handled in code")

        print("\n" + "=" * 60)
        print("✅ Comprehensive fix completed successfully!")
        print("=" * 60)

        # Final recommendations
        print("\n📌 Recommendations:")
        print("  1. Run migrations: python manage.py migrate marketplace")
        print("  2. Restart the backend service to apply code changes")
        print("  3. Test order creation from the mobile app")
        print("  4. Monitor logs for any remaining JSON parsing errors")

if __name__ == '__main__':
    fix_all_order_defaults()
    print("\n🎉 Database has been fixed and is ready for order processing!")