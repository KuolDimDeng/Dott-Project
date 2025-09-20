#!/usr/bin/env python
"""
Test the new v2 order creation endpoint
"""
import os
import sys
import django
import json
import requests

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from marketplace.models import BusinessListing

def test_order_v2():
    """Test the v2 order creation endpoint"""

    print("=" * 80)
    print("🧪 TESTING ORDER CREATION V2 ENDPOINT")
    print("=" * 80)

    # Get a test user and business
    User = get_user_model()

    # Get or create test user
    try:
        test_user = User.objects.get(email='johnpeter.test@dottapps.com')
        print(f"✅ Found test user: {test_user.email} (ID: {test_user.id})")
    except User.DoesNotExist:
        print("❌ Test user not found. Please ensure johnpeter.test@dottapps.com exists")
        return

    # Get a business listing
    try:
        business_listing = BusinessListing.objects.first()
        if business_listing:
            print(f"✅ Found business: {business_listing.business.email} (ID: {business_listing.id})")
        else:
            print("❌ No business listings found in database")
            return
    except Exception as e:
        print(f"❌ Error getting business: {e}")
        return

    # Prepare test order data
    test_order_data = {
        "items": [
            {
                "product_id": "test-product-123",
                "name": "Test Product",
                "quantity": 1,
                "price": 100.00,
                "business_id": str(business_listing.id)
            }
        ],
        "delivery_type": "delivery",
        "delivery_address": {
            "street": "123 Test Street",
            "city": "Juba",
            "state": "CE",
            "postal_code": "00000",
            "country": "SS"
        },
        "payment_method": "cash",
        "subtotal": 100.00,
        "tax_amount": 18.00,
        "delivery_fee": 5.00,
        "service_fee": 10.00,
        "tip_amount": 0,
        "total": 133.00,
        "special_instructions": "Test order - please ignore"
    }

    print("\n📋 Test order data:")
    print(json.dumps(test_order_data, indent=2))

    # Test data validation without making HTTP request
    print("\n🔍 Testing data validation...")
    from marketplace.order_create_v2 import validate_and_clean_order_data

    cleaned_data, errors = validate_and_clean_order_data(test_order_data)

    if errors:
        print(f"❌ Validation errors: {errors}")
    else:
        print("✅ Data validation passed!")
        print("\n📦 Cleaned data:")
        for key, value in cleaned_data.items():
            if key == 'items':
                print(f"  - {key}: {json.dumps(value, indent=4)}")
            else:
                print(f"  - {key}: {repr(value)}")

    # Create the order using Django ORM directly (not HTTP)
    print("\n🔧 Creating order using Django ORM...")
    from marketplace.order_models import ConsumerOrder
    import random
    import string

    try:
        # Generate order number
        order_number = f"TEST{''.join(random.choices(string.digits, k=8))}"

        # Create order
        order = ConsumerOrder(
            consumer=test_user,
            business=business_listing.business,
            order_number=order_number,
            items=cleaned_data['items'],
            subtotal=cleaned_data['subtotal'],
            tax_amount=cleaned_data['tax_amount'],
            delivery_fee=cleaned_data['delivery_fee'],
            service_fee=cleaned_data['service_fee'],
            tip_amount=cleaned_data['tip_amount'],
            total_amount=cleaned_data['total_amount'],
            payment_method=cleaned_data['payment_method'],
            delivery_address=cleaned_data['delivery_address'],
            delivery_notes=cleaned_data['delivery_notes'],
            # All nullable fields explicitly set
            delivery_pin=None,
            pickup_pin=None,
            consumer_delivery_pin=None
        )

        print(f"✅ Order instance created (not saved yet)")
        print(f"  - order_number: {order.order_number}")
        print(f"  - items type: {type(order.items)}")
        print(f"  - items value: {order.items}")

        # Save the order
        order.save()
        print(f"✅ Order saved successfully!")
        print(f"  - Order ID: {order.id}")
        print(f"  - Order Number: {order.order_number}")

        # Generate PINs
        pins = order.generate_pins()
        print(f"✅ PINs generated: {pins}")

        # Clean up test order
        order.delete()
        print("✅ Test order cleaned up")

    except Exception as e:
        print(f"❌ Error creating order: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == '__main__':
    test_order_v2()
    print("\n✅ Test complete!")