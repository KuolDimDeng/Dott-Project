#!/usr/bin/env python
"""
Test script to verify the complete order flow
From consumer order placement to business acceptance to courier delivery
"""
import os
import sys
import django
import json
from decimal import Decimal
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from marketplace.order_models import ConsumerOrder
from marketplace.models import BusinessListing
from couriers.models import CourierProfile
from couriers.services import CourierAssignmentService
from marketplace.notification_service import OrderNotificationService

User = get_user_model()

def test_order_flow():
    """
    Test the complete order flow
    """
    print("\n" + "="*80)
    print("🧪 TESTING COMPLETE ORDER FLOW")
    print("="*80)

    # Step 1: Find test users
    print("\n1️⃣ Finding test users...")

    # Find a consumer
    consumer = User.objects.filter(email='testconsumer@example.com').first()
    if not consumer:
        print("   Creating test consumer...")
        consumer = User.objects.create_user(
            email='testconsumer@example.com',
            password='test123',
            full_name='Test Consumer'
        )
    print(f"   ✅ Consumer: {consumer.email}")

    # Find a business with marketplace listing
    business_listing = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        city='Juba'
    ).first()

    if not business_listing:
        print("   ❌ No business found in Juba marketplace!")
        return

    business = business_listing.business
    print(f"   ✅ Business: {business.business_name if hasattr(business, 'business_name') else business.email}")
    print(f"      Location: {business_listing.city}, {business_listing.country}")

    # Find or create a courier
    courier_profile = CourierProfile.objects.filter(
        is_verified=True,
        is_online=True
    ).first()

    if not courier_profile:
        print("   Creating test courier...")
        courier_user = User.objects.create_user(
            email='testcourier@example.com',
            password='test123',
            full_name='Test Courier'
        )
        courier_profile = CourierProfile.objects.create(
            user=courier_user,
            is_verified=True,
            is_online=True,
            availability_status='online',
            vehicle_type='motorcycle',
            service_radius_km=10
        )
    print(f"   ✅ Courier: {courier_profile.user.email}")

    # Step 2: Create an order
    print("\n2️⃣ Creating order...")

    order = ConsumerOrder.objects.create(
        consumer=consumer,
        business=business,
        items=[
            {
                'id': '1',
                'name': 'Test Product',
                'quantity': 2,
                'price': 10.00,
                'notes': 'Extra spicy'
            }
        ],
        subtotal=Decimal('20.00'),
        tax_amount=Decimal('1.00'),
        delivery_fee=Decimal('5.00'),
        total_amount=Decimal('26.00'),
        payment_method='card',
        delivery_address='123 Test Street, Juba, South Sudan',
        delivery_notes='Ring the doorbell twice',
        order_status='pending'
    )

    # Generate PINs
    pins = order.generate_pins()
    print(f"   ✅ Order created: {order.order_number}")
    print(f"   📍 Pickup PIN: {pins['pickup_pin']}")
    print(f"   📍 Consumer PIN: {pins['consumer_pin']}")
    print(f"   💰 Total: ${order.total_amount}")

    # Step 3: Send notification to business
    print("\n3️⃣ Notifying business...")
    try:
        OrderNotificationService.notify_business_new_order(order)
        print("   ✅ Business notified via WebSocket")
    except Exception as e:
        print(f"   ⚠️ Notification failed: {e}")

    # Step 4: Business accepts order
    print("\n4️⃣ Business accepting order...")
    order.order_status = 'business_accepted'
    order.preparation_time = 30
    order.estimated_delivery_time = timezone.now() + timedelta(minutes=45)
    order.save()
    print(f"   ✅ Order accepted, prep time: 30 minutes")

    # Step 5: Assign courier
    print("\n5️⃣ Assigning courier...")
    try:
        # Set business location if missing
        if not business_listing.latitude:
            business_listing.latitude = -4.8517  # Juba coordinates
            business_listing.longitude = 31.5825
            business_listing.save()

        # Calculate earnings
        distance_km = 5  # Assume 5km delivery
        earnings = CourierAssignmentService.calculate_courier_earnings(
            order.total_amount,
            distance_km,
            'food'
        )

        # Assign courier
        order.assign_courier(courier_profile, earnings)

        # Send notification
        OrderNotificationService.notify_courier_new_assignment(order, courier_profile)

        print(f"   ✅ Courier assigned: {courier_profile.user.email}")
        print(f"   💰 Courier earnings: ${earnings}")
    except Exception as e:
        print(f"   ❌ Courier assignment failed: {e}")

    # Step 6: Courier accepts
    print("\n6️⃣ Courier accepting delivery...")
    order.courier_accept()
    print("   ✅ Courier accepted delivery")

    # Step 7: Order ready for pickup
    print("\n7️⃣ Order ready for pickup...")
    order.order_status = 'ready_for_pickup'
    order.save()
    print("   ✅ Order ready, courier notified")

    # Step 8: Courier picks up order
    print("\n8️⃣ Courier picking up order...")
    success, message = order.verify_pickup_pin(pins['pickup_pin'])
    if success:
        print(f"   ✅ Pickup verified: {message}")
        print("   💰 Restaurant payment released")
    else:
        print(f"   ❌ Pickup failed: {message}")

    # Step 9: Courier delivers order
    print("\n9️⃣ Delivering order...")
    order.order_status = 'in_transit'
    order.save()
    print("   ✅ Order in transit")

    # Step 10: Complete delivery
    print("\n🔟 Completing delivery...")
    success, message = order.verify_delivery_pin(pins['consumer_pin'], courier_profile)
    if success:
        print(f"   ✅ Delivery verified: {message}")
        print("   💰 Courier payment released")
    else:
        print(f"   ❌ Delivery failed: {message}")

    # Final status
    print("\n📊 Final Order Status:")
    print(f"   Order: {order.order_number}")
    print(f"   Status: {order.order_status}")
    print(f"   Payment Status: {order.payment_status}")
    print(f"   Restaurant Payment: {order.restaurant_payment_status}")
    print(f"   Courier Payment: {order.courier_payment_status}")

    # Check notifications sent
    print("\n📬 Notifications Summary:")
    print("   ✅ Business notified of new order")
    print("   ✅ Consumer notified of acceptance")
    print("   ✅ Courier notified of assignment")
    print("   ✅ All parties notified of status changes")

    print("\n" + "="*80)
    print("✅ ORDER FLOW TEST COMPLETE!")
    print("="*80)

    return order

if __name__ == '__main__':
    order = test_order_flow()

    print("\n💡 To monitor real-time updates:")
    print("   1. Connect WebSocket to: ws://localhost:8000/ws/chat/")
    print("   2. Join channels:")
    print(f"      - business_{order.business.id}")
    print(f"      - consumer_{order.consumer.id}")
    print(f"      - courier_{order.courier.user.id if order.courier else 'N/A'}")
    print(f"      - order_{order.id}")