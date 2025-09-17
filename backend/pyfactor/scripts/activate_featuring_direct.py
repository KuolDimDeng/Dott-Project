#!/usr/bin/env python
"""
Direct featuring activation script that bypasses URL loading issues
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django without loading URLs
sys.path.insert(0, '/opt/render/project/src/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# This bypasses URL loading
os.environ['DJANGO_SKIP_URL_VALIDATION'] = '1'

django.setup()

from inventory.models import Product
from menu.models import MenuItem
from marketplace.models import BusinessListing
from django.utils import timezone
from datetime import timedelta

def activate_featuring():
    print("\n" + "="*60)
    print("🚀 DIRECT FEATURING ACTIVATION")
    print("="*60)

    # Find businesses in Juba
    print("\n📍 Looking for businesses in Juba...")
    businesses = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        city__iexact='Juba'
    )

    if not businesses.exists():
        print("No businesses in Juba. Looking for any visible business...")
        businesses = BusinessListing.objects.filter(
            is_visible_in_marketplace=True
        )[:3]

        if businesses.exists():
            # Update them to Juba
            for biz in businesses:
                biz.city = 'Juba'
                biz.save()
                print(f"✓ Updated {biz.business.business_name} to Juba")

    featured_items = 0
    featured_products = 0

    for business in businesses:
        tenant_id = business.business_id
        business_name = business.business.business_name

        print(f"\n📦 Processing: {business_name}")
        print("-" * 40)

        # Feature menu items
        menu_items = MenuItem.objects.filter(
            tenant_id=tenant_id,
            is_available=True
        )

        for idx, item in enumerate(menu_items[:10]):
            item.is_featured = True
            item.featured_priority = 10 - idx
            item.featured_score = Decimal('80.00') - (idx * 5)
            item.featured_until = timezone.now() + timedelta(days=30)
            item.save()
            featured_items += 1
            print(f"  ✓ Featured menu item: {item.name}")

        # Feature products
        products = Product.objects.filter(
            tenant_id=tenant_id,
            is_active=True
        )

        for idx, product in enumerate(products[:10]):
            product.is_featured = True
            product.featured_priority = 10 - idx
            product.featured_score = Decimal('80.00') - (idx * 5)
            product.featured_until = timezone.now() + timedelta(days=30)
            # Ensure stock
            if not product.quantity or product.quantity < 10:
                product.quantity = 50
            product.save()
            featured_products += 1
            print(f"  ✓ Featured product: {product.name}")

    print("\n" + "="*60)
    print("✅ FEATURING ACTIVATION COMPLETE!")
    print("="*60)
    print(f"Featured {featured_items} menu items")
    print(f"Featured {featured_products} products")
    print(f"From {businesses.count()} businesses")

    # Verify
    total_featured_menu = MenuItem.objects.filter(is_featured=True).count()
    total_featured_products = Product.objects.filter(is_featured=True).count()

    print(f"\nTotal featured in database:")
    print(f"  Menu items: {total_featured_menu}")
    print(f"  Products: {total_featured_products}")

if __name__ == "__main__":
    try:
        activate_featuring()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()