#!/usr/bin/env python3
"""
Check BusinessListing data to debug order creation issue
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing
from django.contrib.auth import get_user_model

User = get_user_model()

def check_business_listing():
    """Check the specific business listing causing issues"""

    print("=" * 80)
    print("CHECKING BUSINESS LISTING DATA")
    print("=" * 80)

    # The business listing ID from the mobile app
    listing_id = 'ba8d366c-9b29-41bc-a770-031d975aab77'

    try:
        # Try with select_related first
        listing = BusinessListing.objects.select_related('business').get(id=listing_id)
        print(f"\n✅ BusinessListing found: {listing.id}")
        print(f"  - business field (relationship): {listing.business}")
        print(f"  - business_id (FK value): {listing.business_id}")

        if listing.business:
            print(f"\n📋 Business User Details:")
            print(f"  - User ID: {listing.business.id}")
            print(f"  - Email: {listing.business.email}")
            print(f"  - Username: {getattr(listing.business, 'username', 'N/A')}")
            print(f"  - Full Name: {getattr(listing.business, 'full_name', 'N/A')}")
            print(f"  - Is Active: {listing.business.is_active}")
        else:
            print("\n❌ business field is None!")

            # Try to find the user by business_id
            if listing.business_id:
                print(f"\n🔍 Checking for User with ID={listing.business_id}")
                try:
                    user = User.objects.get(id=listing.business_id)
                    print(f"  ✅ User found: {user.email}")
                    print(f"     - Business Name: {user.business_name}")
                    print(f"     - Is Active: {user.is_active}")

                    # Try to fix the relationship
                    print("\n🔧 FIXING: Setting business relationship...")
                    listing.business = user
                    listing.save()
                    print("  ✅ Business relationship fixed!")

                    # Verify the fix
                    listing.refresh_from_db()
                    if listing.business:
                        print(f"\n✅ Relationship verified: {listing.business.email}")
                    else:
                        print("\n⚠️  Relationship still not working after save!")

                except User.DoesNotExist:
                    print(f"  ❌ No user found with ID={listing.business_id}")
            else:
                print("  ❌ business_id is also None!")

    except BusinessListing.DoesNotExist:
        print(f"\n❌ BusinessListing with id={listing_id} does not exist")

    # Check other business listings
    print("\n" + "=" * 80)
    print("CHECKING OTHER BUSINESS LISTINGS")
    print("=" * 80)

    all_listings = BusinessListing.objects.all()
    total = all_listings.count()
    broken = all_listings.filter(business__isnull=True).count()

    print(f"\n📊 Statistics:")
    print(f"  - Total BusinessListings: {total}")
    print(f"  - Listings with NULL business: {broken}")
    print(f"  - Percentage broken: {(broken/total*100) if total > 0 else 0:.1f}%")

    if broken > 0:
        print(f"\n🔍 First 5 broken listings:")
        for bl in BusinessListing.objects.filter(business__isnull=True)[:5]:
            print(f"  - {bl.id}: business_id={bl.business_id}")
            if bl.business_id:
                try:
                    user = User.objects.get(id=bl.business_id)
                    print(f"    → User exists: {user.email}")
                except User.DoesNotExist:
                    print(f"    → User does NOT exist!")

    # Test order creation
    print("\n" + "=" * 80)
    print("TESTING ORDER CREATION")
    print("=" * 80)

    try:
        from marketplace.order_models import ConsumerOrder

        # Use the listing we just checked
        listing = BusinessListing.objects.select_related('business').get(id=listing_id)
        business_user = listing.business

        # Get a test consumer (user 303 from the error logs)
        try:
            consumer = User.objects.get(id=303)
            print(f"\n✅ Found consumer: {consumer.email} (ID: 303)")
        except User.DoesNotExist:
            print("\n❌ Consumer with ID 303 not found, using any consumer")
            consumer = User.objects.filter(role='CONSUMER').first()
            if not consumer:
                print("  ❌ No consumer users available")
                return

        print(f"\n🧪 Creating test order...")
        print(f"  - Consumer: {consumer.email} (ID: {consumer.id})")
        print(f"  - Business: {business_user.email} (ID: {business_user.id})")
        print(f"  - Business Type: {type(business_user)}")

        # Create a minimal test order
        test_order = ConsumerOrder(
            consumer=consumer,
            business=business_user,
            order_number='TEST999999',
            items=[],  # Empty list instead of empty string
            subtotal=10.00,
            total_amount=10.00,
            delivery_address='Test Address'
        )

        print(f"\n📝 Order instance created:")
        print(f"  - order.business: {test_order.business}")
        print(f"  - order.business_id: {test_order.business_id}")
        print(f"  - order.items: {test_order.items}")

        # Try to save
        test_order.save()
        print(f"\n✅ Test order saved successfully!")
        print(f"  - Order ID: {test_order.id}")

        # Clean up
        test_order.delete()
        print("  - Test order deleted")

    except Exception as e:
        print(f"\n❌ Error during test order creation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_business_listing()