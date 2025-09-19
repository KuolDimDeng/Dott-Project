#!/usr/bin/env python
"""
Debug and fix the order creation JSON parsing issue
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from marketplace.order_models import ConsumerOrder

def check_problematic_values():
    """Check for problematic values in the database"""
    with connection.cursor() as cursor:
        # Check for empty string values in UUID fields
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'marketplace_consumer_orders'
            AND data_type = 'uuid'
            ORDER BY ordinal_position;
        """)

        uuid_columns = cursor.fetchall()
        print("UUID columns in marketplace_consumer_orders:")
        for col in uuid_columns:
            print(f"  - {col[0]}: {col[1]}, nullable={col[2]}")

        # Check if chat_conversation_id has any empty strings
        cursor.execute("""
            SELECT COUNT(*)
            FROM marketplace_consumer_orders
            WHERE chat_conversation_id IS NOT NULL
            AND chat_conversation_id::text = '';
        """)
        empty_uuid_count = cursor.fetchone()[0]
        print(f"\nOrders with empty string chat_conversation_id: {empty_uuid_count}")

        # Check recent order values
        cursor.execute("""
            SELECT id, order_number, chat_conversation_id,
                   pickup_pin, consumer_delivery_pin, delivery_pin,
                   created_at
            FROM marketplace_consumer_orders
            ORDER BY created_at DESC
            LIMIT 5;
        """)

        print("\nRecent orders:")
        recent_orders = cursor.fetchall()
        for order in recent_orders:
            print(f"  Order {order[1]}: chat_id={order[2]}, pickup_pin={order[3]}, consumer_pin={order[4]}, delivery_pin={order[5]}")

        # Check items field for issues
        cursor.execute("""
            SELECT id, order_number, items
            FROM marketplace_consumer_orders
            WHERE items IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 3;
        """)

        print("\nRecent order items:")
        items_data = cursor.fetchall()
        for item in items_data:
            print(f"  Order {item[1]}: items type={type(item[2])}, value={item[2]}")

def test_order_creation():
    """Test creating an order programmatically"""
    from django.contrib.auth import get_user_model
    from marketplace.models import BusinessListing

    User = get_user_model()

    try:
        # Find a consumer user
        consumer = User.objects.filter(email__icontains='john').first()
        if not consumer:
            print("No consumer found with 'john' in email")
            return

        # Find a business
        business_listing = BusinessListing.objects.filter(is_active=True).first()
        if not business_listing:
            print("No active business listing found")
            return

        print(f"\nTesting order creation:")
        print(f"  Consumer: {consumer.email}")
        print(f"  Business: {business_listing.business.email}")

        # Test creating order with explicit None for chat_conversation_id
        order = ConsumerOrder(
            consumer=consumer,
            business=business_listing.business,
            items=[{"name": "Test Item", "quantity": 1, "price": 10.00}],
            subtotal=10.00,
            tax_amount=1.00,
            delivery_fee=2.00,
            service_fee=0.50,
            tip_amount=2.00,
            total_amount=15.50,
            payment_method='cash',
            delivery_address='Test Address',
            delivery_notes='Test order',
            created_from_chat=False,
            chat_conversation_id=None  # Explicitly set to None
        )

        # Try to save
        order.save()
        print(f"  ✅ Order created successfully: {order.order_number}")

        # Check the actual values
        print(f"  chat_conversation_id: {order.chat_conversation_id}")
        print(f"  pickup_pin: {order.pickup_pin}")
        print(f"  consumer_delivery_pin: {order.consumer_delivery_pin}")
        print(f"  delivery_pin: {order.delivery_pin}")

        # Clean up test order
        order.delete()
        print("  Test order deleted")

    except Exception as e:
        print(f"  ❌ Error creating order: {e}")
        import traceback
        traceback.print_exc()

def fix_order_view():
    """Generate fix for order view to handle empty strings"""
    print("\n" + "="*60)
    print("FIX FOR ORDER VIEW")
    print("="*60)
    print("""
Update line 101 in /marketplace/order_views.py from:
    chat_conversation_id=request.data.get('conversation_id', None)

To:
    chat_conversation_id=request.data.get('conversation_id') or None

This ensures empty strings are converted to None for UUID fields.

Additionally, ensure all UUID and nullable fields handle empty strings:
    # Handle UUID field - convert empty string to None
    conversation_id = request.data.get('conversation_id')
    if conversation_id == '':
        conversation_id = None
""")

if __name__ == "__main__":
    print("Debugging order creation JSON parsing issue...")
    print("="*60)
    check_problematic_values()
    test_order_creation()
    fix_order_view()