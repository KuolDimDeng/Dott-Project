#!/usr/bin/env python
"""
Simple activation script to run directly in Render shell
Just copy and paste this code into python manage.py shell
"""

from django.utils import timezone
from django.db import transaction
from marketplace.models import BusinessListing
from inventory.models import Product
from menu.models import MenuItem
from custom_auth.models import User
from decimal import Decimal
from datetime import timedelta

def activate():
    print("\n" + "="*80)
    print("🚀 ACTIVATING IMPROVED FEATURING SYSTEM")
    print("="*80)

    # Populate tenant UUIDs
    print("\n🔗 Populating Tenant UUIDs...")
    updated_count = 0
    for listing in BusinessListing.objects.all():
        try:
            user = User.objects.get(id=listing.business_id)
            if user.tenant_id:
                if hasattr(listing, 'tenant_uuid'):
                    if not listing.tenant_uuid:
                        listing.tenant_uuid = user.tenant_id
                        listing.save()
                        updated_count += 1
                        print(f"✓ Updated {user.business_name}")
        except User.DoesNotExist:
            continue
    print(f"✅ Updated {updated_count} listings with tenant UUIDs")

    # Calculate trust scores
    print("\n🏆 Calculating Trust Scores...")
    try:
        from marketplace.rating_service import RatingService
        for listing in BusinessListing.objects.all():
            if hasattr(listing, 'trust_score'):
                trust_score = RatingService.calculate_trust_score(listing)
                listing.trust_score = trust_score
                listing.save()
                print(f"✓ {listing.business.business_name if listing.business else 'Unknown'}: {trust_score}")
    except ImportError:
        print("⚠️ RatingService not available - skipping")

    # Activate featuring for Juba
    print("\n🌟 Activating Featuring for Juba...")
    businesses = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        city__iexact='Juba'
    )

    if not businesses.exists():
        print("⚠️ No businesses in Juba, moving some...")
        any_businesses = BusinessListing.objects.filter(
            is_visible_in_marketplace=True
        )[:3]
        for biz in any_businesses:
            biz.city = 'Juba'
            biz.country = 'SS'
            biz.save()
            print(f"✓ Moved {biz.business.business_name}")
        businesses = BusinessListing.objects.filter(city__iexact='Juba')

    featured_count = 0
    for listing in businesses[:10]:
        listing.is_featured = True
        listing.featured_until = timezone.now().date() + timedelta(days=30)
        if hasattr(listing, 'featuring_score'):
            listing.featuring_score = Decimal('75.00') + (featured_count * 5)
        listing.save()
        featured_count += 1
        print(f"✓ Featured {listing.business.business_name if listing.business else 'Unknown'}")

        # Feature some products and menu items
        tenant_uuid = None
        if hasattr(listing, 'tenant_uuid') and listing.tenant_uuid:
            tenant_uuid = listing.tenant_uuid
        elif listing.business and listing.business.tenant_id:
            tenant_uuid = listing.business.tenant_id

        if tenant_uuid:
            # Feature products
            products = Product.objects.filter(
                tenant_id=tenant_uuid,
                is_active=True
            )[:3]
            for idx, product in enumerate(products):
                product.is_featured = True
                product.featured_priority = 10 - idx
                product.featured_score = Decimal('80.00') - (idx * 5)
                product.featured_until = timezone.now() + timedelta(days=30)
                if not product.quantity or product.quantity < 10:
                    product.quantity = 50
                product.save()
                print(f"  ✓ Featured product: {product.name}")

            # Feature menu items
            menu_items = MenuItem.objects.filter(
                tenant_id=tenant_uuid,
                is_available=True
            )[:3]
            for idx, item in enumerate(menu_items):
                item.is_featured = True
                item.featured_priority = 10 - idx
                item.featured_score = Decimal('80.00') - (idx * 5)
                item.featured_until = timezone.now() + timedelta(days=30)
                item.save()
                print(f"  ✓ Featured menu item: {item.name}")

    print("\n" + "="*80)
    print("✅ FEATURING SYSTEM ACTIVATED!")
    print("="*80)
    print("\n🎯 Test these endpoints:")
    print("  - /api/marketplace/consumer-search/featured/")
    print("  - /api/marketplace/consumer-search/featured_items/")
    return True

# Run activation
if __name__ == '__main__':
    with transaction.atomic():
        activate()