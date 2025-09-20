#!/usr/bin/env python3
"""
Test order creation to diagnose the issue
"""

import os
import sys
import django
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing
from marketplace.order_models import ConsumerOrder
from django.contrib.auth import get_user_model
from django.db import connection, transaction

User = get_user_model()

def test_order_creation():
    """Test order creation at different levels"""

    print("=" * 80)
    print("TESTING ORDER CREATION")
    print(f"Time: {datetime.now()}")
    print("=" * 80)

    # Step 1: Check BusinessListing
    print("\n📋 STEP 1: Checking BusinessListing")
    print("-" * 40)

    listing_id = 'ba8d366c-9b29-41bc-a770-031d975aab77'

    try:
        bl = BusinessListing.objects.select_related('business').get(id=listing_id)
        print(f"✅ BusinessListing found: {bl.id}")
        print(f"   Business User: {bl.business}")
        print(f"   Business User ID: {bl.business_id}")
        print(f"   Business User Type: {type(bl.business)}")

        business_user = bl.business
        if not business_user:
            print("❌ ERROR: business_user is None!")
            if bl.business_id:
                business_user = User.objects.get(id=bl.business_id)
                print(f"   Fetched business user manually: {business_user}")

    except BusinessListing.DoesNotExist:
        print(f"❌ BusinessListing {listing_id} does not exist!")
        return

    # Step 2: Check Consumer
    print("\n📋 STEP 2: Checking Consumer")
    print("-" * 40)

    try:
        consumer = User.objects.get(id=303)
        print(f"✅ Consumer found: {consumer.email} (ID: {consumer.id})")
    except User.DoesNotExist:
        print("❌ Consumer with ID 303 not found!")
        return

    # Step 3: Test Django ORM Order Creation
    print("\n📋 STEP 3: Testing Django ORM Order Creation")
    print("-" * 40)

    order_data = {
        'consumer': consumer,
        'business': business_user,
        'order_number': f'TEST{datetime.now().strftime("%H%M%S")}',
        'items': [{
            'product_id': 'abc61d1b-9a7a-4e8c-8f1e-9f484926f4a5',
            'name': 'Test Product',
            'quantity': 1,
            'price': 100.00
        }],
        'subtotal': 100.00,
        'total_amount': 100.00,
        'delivery_address': 'Test Address',
        'payment_method': 'card'
    }

    try:
        order = ConsumerOrder(**order_data)
        print(f"✅ Order instance created")
        print(f"   order.consumer: {order.consumer}")
        print(f"   order.consumer_id: {order.consumer_id}")
        print(f"   order.business: {order.business}")
        print(f"   order.business_id: {order.business_id}")

        order.save()
        print(f"✅ Order saved successfully!")
        print(f"   Order ID: {order.id}")
        print(f"   Order Number: {order.order_number}")

        # Verify it's in the database
        saved = ConsumerOrder.objects.get(id=order.id)
        print(f"✅ Order retrieved from database:")
        print(f"   Consumer ID: {saved.consumer_id}")
        print(f"   Business ID: {saved.business_id}")

        # Clean up
        order.delete()
        print("✅ Test order deleted")

    except Exception as e:
        print(f"❌ Django ORM Error: {e}")
        import traceback
        traceback.print_exc()

    # Step 4: Test Raw SQL Insert
    print("\n📋 STEP 4: Testing Raw SQL Insert")
    print("-" * 40)

    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                INSERT INTO marketplace_consumer_orders (
                    id, order_number, consumer_id, business_id,
                    items, subtotal, total_amount,
                    delivery_address, payment_method,
                    order_status, payment_status,
                    created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), %s, %s, %s,
                    %s::jsonb, %s, %s,
                    %s, %s,
                    'pending', 'pending',
                    NOW(), NOW()
                )
                RETURNING id, order_number, consumer_id, business_id
            """, [
                f'SQL{datetime.now().strftime("%H%M%S")}',
                303,  # consumer_id
                250,  # business_id
                json.dumps([]),  # items
                100.00,  # subtotal
                100.00,  # total_amount
                'Test Address',  # delivery_address
                'card'  # payment_method
            ])

            result = cursor.fetchone()
            print(f"✅ SQL Insert successful!")
            print(f"   Order ID: {result[0]}")
            print(f"   Order Number: {result[1]}")
            print(f"   Consumer ID: {result[2]}")
            print(f"   Business ID: {result[3]}")

            # Clean up
            cursor.execute("DELETE FROM marketplace_consumer_orders WHERE id = %s", [result[0]])
            print("✅ Test order deleted")

        except Exception as e:
            print(f"❌ SQL Insert Error: {e}")

    # Step 5: Test the API endpoint directly
    print("\n📋 STEP 5: Testing API Endpoint Logic")
    print("-" * 40)

    try:
        from marketplace.order_create_v2 import create_order_v2
        from django.test import RequestFactory

        factory = RequestFactory()
        request_data = {
            "items": [{
                "product_id": "abc61d1b-9a7a-4e8c-8f1e-9f484926f4a5",
                "name": "Test Product",
                "quantity": 1,
                "price": 100.00,
                "business_id": "ba8d366c-9b29-41bc-a770-031d975aab77"
            }],
            "delivery_type": "delivery",
            "delivery_address": {
                "street": "Test Street",
                "city": "Juba",
                "state": "CE",
                "postal_code": "",
                "country": "SS"
            },
            "payment_method": "card",
            "subtotal": 100.00,
            "total_amount": 100.00
        }

        # Create mock request
        request = factory.post('/api/marketplace/consumer/orders/v2/',
                              data=json.dumps(request_data),
                              content_type='application/json')
        request.user = consumer
        request.data = request_data  # Add this for DRF compatibility

        print(f"✅ Mock request created")
        print(f"   User: {request.user.email}")
        print(f"   Business ID in items: {request_data['items'][0]['business_id']}")

        # Call the endpoint function
        response = create_order_v2(request)

        print(f"📊 API Response:")
        print(f"   Status: {response.status_code}")
        print(f"   Data: {response.data}")

        if response.status_code == 201:
            print("✅ API endpoint successful!")
            # Clean up the created order
            if 'order_id' in response.data:
                ConsumerOrder.objects.filter(id=response.data['order_id']).delete()
                print("✅ Test order cleaned up")
        else:
            print(f"❌ API endpoint failed with status {response.status_code}")

    except Exception as e:
        print(f"❌ API Endpoint Error: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    test_order_creation()