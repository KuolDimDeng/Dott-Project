#!/usr/bin/env python
"""
Fix JSON field issues in marketplace_consumer_orders table
"""
import os
import sys
import django
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from marketplace.order_models import ConsumerOrder

def fix_json_fields():
    """Fix JSON field issues in orders"""

    print("=" * 80)
    print("🔧 FIXING JSON FIELDS IN CONSUMER ORDERS")
    print("=" * 80)

    with connection.cursor() as cursor:
        # First, let's see what we're dealing with using raw SQL
        print("\n📊 Checking current state...")

        # Get count of orders
        cursor.execute("SELECT COUNT(*) FROM marketplace_consumer_orders")
        total_orders = cursor.fetchone()[0]
        print(f"  Total orders in database: {total_orders}")

        if total_orders == 0:
            print("  No orders found - nothing to fix")
            return

        # Fix using Django ORM to be safe
        print("\n🔧 Fixing orders using Django ORM...")
        fixed_count = 0
        error_count = 0

        for order in ConsumerOrder.objects.all():
            try:
                needs_save = False

                # Check and fix items field
                if order.items is None or order.items == '' or order.items == '[]':
                    print(f"  Fixing order {order.id}: items field is empty/invalid")
                    order.items = []
                    needs_save = True
                elif not isinstance(order.items, list):
                    print(f"  Fixing order {order.id}: items field is not a list")
                    try:
                        if isinstance(order.items, str):
                            order.items = json.loads(order.items)
                        else:
                            order.items = []
                    except:
                        order.items = []
                    needs_save = True

                # Ensure order_number is not empty
                if not order.order_number or order.order_number.strip() == '':
                    import random
                    import string
                    order.order_number = f"ORD{''.join(random.choices(string.digits, k=8))}"
                    print(f"  Generated order number for {order.id}: {order.order_number}")
                    needs_save = True

                # Fix PIN fields - ensure they're None, not empty strings
                pin_fields = ['delivery_pin', 'pickup_pin', 'consumer_delivery_pin']
                for field in pin_fields:
                    value = getattr(order, field, None)
                    if value == '':
                        setattr(order, field, None)
                        needs_save = True

                # Fix text fields - ensure they're empty strings, not None
                text_fields = ['delivery_address', 'delivery_notes', 'cancellation_reason']
                for field in text_fields:
                    value = getattr(order, field, None)
                    if value is None:
                        setattr(order, field, '')
                        needs_save = True

                if needs_save:
                    order.save()
                    fixed_count += 1

            except Exception as e:
                print(f"  ❌ Error fixing order {order.id}: {str(e)}")
                error_count += 1

        print(f"\n✅ Fixed {fixed_count} orders")
        if error_count > 0:
            print(f"⚠️  {error_count} orders had errors")

        # Now fix the database defaults to prevent future issues
        print("\n🔧 Fixing database defaults...")
        try:
            with transaction.atomic():
                # Set proper defaults for JSONB field
                cursor.execute("""
                    ALTER TABLE marketplace_consumer_orders
                    ALTER COLUMN items SET DEFAULT '[]'::jsonb;
                """)
                print("  ✅ Set items default to empty JSON array")

                # Remove any bad defaults from text fields
                text_fields = ['delivery_address', 'delivery_notes', 'cancellation_reason']
                for field in text_fields:
                    cursor.execute(f"""
                        ALTER TABLE marketplace_consumer_orders
                        ALTER COLUMN {field} SET DEFAULT '';
                    """)
                    print(f"  ✅ Set {field} default to empty string")

                # Ensure PIN fields default to NULL
                pin_fields = ['delivery_pin', 'pickup_pin', 'consumer_delivery_pin']
                for field in pin_fields:
                    cursor.execute(f"""
                        ALTER TABLE marketplace_consumer_orders
                        ALTER COLUMN {field} DROP DEFAULT;

                        ALTER TABLE marketplace_consumer_orders
                        ALTER COLUMN {field} SET DEFAULT NULL;
                    """)
                    print(f"  ✅ Set {field} default to NULL")

                print("\n✅ Database defaults fixed!")

        except Exception as e:
            print(f"\n⚠️  Could not fix defaults: {str(e)}")
            print("  (This may be okay if they're already correct)")

        # Final verification
        print("\n📊 Final verification:")
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE jsonb_array_length(items) > 0) as with_items,
                COUNT(*) FILTER (WHERE jsonb_array_length(items) = 0) as empty_items
            FROM marketplace_consumer_orders
        """)

        result = cursor.fetchone()
        if result:
            total, with_items, empty_items = result
            print(f"  Total orders: {total}")
            print(f"  Orders with items: {with_items}")
            print(f"  Orders with empty items: {empty_items}")

if __name__ == '__main__':
    fix_json_fields()
    print("\n✅ JSON field fixing complete!")