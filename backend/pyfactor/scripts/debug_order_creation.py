#!/usr/bin/env python3
"""
Debug order creation to understand why business field is empty
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing, ConsumerOrder
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_order_creation():
    """Test creating an order with the BusinessListing"""

    print("=" * 80)
    print("TESTING ORDER CREATION")
    print("=" * 80)

    # The business listing ID from the mobile app
    listing_id = 'ba8d366c-9b29-41bc-a770-031d975aab77'

    try:
        # Get the business listing
        listing = BusinessListing.objects.select_related('business').get(id=listing_id)
        print(f"\n✅ BusinessListing found: {listing.id}")
        print(f"  - business field (relationship): {listing.business}")
        print(f"  - business_id (FK value): {listing.business_id}")

        # Get the business user
        business_user = listing.business
        if not business_user and listing.business_id:
            try:
                business_user = User.objects.get(id=listing.business_id)
                print(f"\n🔍 Had to fetch business user manually: {business_user}")
            except User.DoesNotExist:
                print(f"\n❌ Business user with ID {listing.business_id} doesn't exist!")
                return

        if not business_user:
            print("\n❌ Could not get business user!")
            return

        print(f"\n✅ Business User: {business_user.email}")

        # Get a test consumer
        consumer = User.objects.filter(email='kuoldeng1@gmail.com').first()
        if not consumer:
            # Use any consumer
            consumer = User.objects.filter(role='CONSUMER').first()
            if not consumer:
                print("\n❌ No consumer users found for testing")
                return

        print(f"\n✅ Consumer User: {consumer.email}")

        # Try creating a test order
        print("\n🧪 Testing order creation...")

        test_order_data = {
            'consumer': consumer,
            'business': business_user,  # Pass the User object directly
            'order_number': 'TEST123456',
            'items': [{'name': 'Test Item', 'quantity': 1, 'price': 10.00}],
            'subtotal': 10.00,
            'total_amount': 10.00,
            'delivery_address': 'Test Address',
            'payment_method': 'cash',
        }

        print("\nCreating order with data:")
        for key, value in test_order_data.items():
            if key in ['consumer', 'business']:
                print(f"  - {key}: {value} (type: {type(value)})")
            else:
                print(f"  - {key}: {value}")

        # Try to create the order
        order = ConsumerOrder(**test_order_data)

        print(f"\nAfter instantiation:")
        print(f"  - order.business: {order.business} (type: {type(order.business)})")
        print(f"  - order.business_id: {order.business_id}")

        order.save()

        print(f"\n✅ Order created successfully!")
        print(f"  - Order ID: {order.id}")
        print(f"  - Order Number: {order.order_number}")
        print(f"  - Business: {order.business}")
        print(f"  - Consumer: {order.consumer}")

        # Clean up test order
        order.delete()
        print("\n🧹 Test order deleted")

    except BusinessListing.DoesNotExist:
        print(f"\n❌ BusinessListing with id={listing_id} does not exist")
    except Exception as e:
        print(f"\n❌ Error creating order: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_order_creation()