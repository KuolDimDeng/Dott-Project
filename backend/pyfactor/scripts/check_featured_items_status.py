#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime
from decimal import Decimal

sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from inventory.models import Product
from menu.models import MenuItem
from marketplace.models import BusinessListing, FeaturingScore
from django.utils import timezone
from django.db.models import Q

def check_featured_status():
    print("\n" + "="*60)
    print("🔍 FEATURING SYSTEM DIAGNOSTIC")
    print("="*60)

    # Check Dott Restaurant & Cafe
    print("\n📍 Looking for Dott Restaurant & Cafe...")
    businesses = BusinessListing.objects.filter(
        Q(business__business_name__icontains='Dott') |
        Q(business__business_name__icontains='Restaurant')
    )

    print(f"Found {businesses.count()} matching businesses:")
    for biz in businesses:
        print(f"  - {biz.business.business_name} (ID: {biz.business_id}, City: {biz.city}, Visible: {biz.is_visible_in_marketplace})")

    # Check businesses in Juba specifically
    print("\n📍 Businesses in Juba:")
    juba_businesses = BusinessListing.objects.filter(city__iexact='Juba', is_visible_in_marketplace=True)
    print(f"Found {juba_businesses.count()} visible businesses in Juba")
    for biz in juba_businesses[:5]:
        print(f"  - {biz.business.business_name}")

    # Check menu items
    print("\n🍽️ MENU ITEMS STATUS:")
    if businesses.exists():
        for biz in businesses:
            tenant_id = biz.business_id
            menu_items = MenuItem.objects.filter(tenant_id=tenant_id)
            featured_menu = menu_items.filter(is_featured=True)

            print(f"\n  Business: {biz.business.business_name}")
            print(f"  Total menu items: {menu_items.count()}")
            print(f"  Featured menu items: {featured_menu.count()}")
            print(f"  Available items: {menu_items.filter(is_available=True).count()}")

            if menu_items.exists():
                print("  Menu items details:")
                for item in menu_items[:10]:
                    score_info = f"Score: {item.featured_score}" if item.featured_score else "No score"
                    featured_status = "✓ Featured" if item.is_featured else "✗ Not featured"
                    available_status = "Available" if item.is_available else "Not available"
                    print(f"    - {item.name}: {featured_status}, {available_status}, {score_info}")

    # Check products
    print("\n📦 PRODUCTS STATUS:")
    if businesses.exists():
        for biz in businesses:
            tenant_id = biz.business_id
            products = Product.objects.filter(tenant_id=tenant_id)
            featured_products = products.filter(is_featured=True)

            print(f"\n  Business: {biz.business.business_name}")
            print(f"  Total products: {products.count()}")
            print(f"  Featured products: {featured_products.count()}")
            print(f"  Active products: {products.filter(is_active=True).count()}")

            if products.exists():
                print("  Product details:")
                for product in products[:10]:
                    score_info = f"Score: {product.featured_score}" if product.featured_score else "No score"
                    featured_status = "✓ Featured" if product.is_featured else "✗ Not featured"
                    active_status = "Active" if product.is_active else "Inactive"
                    stock_info = f"Stock: {product.quantity or 0}"
                    print(f"    - {product.name}: {featured_status}, {active_status}, {score_info}, {stock_info}")

    # Check featuring scores
    print("\n📊 FEATURING SCORES:")
    recent_scores = FeaturingScore.objects.filter(
        updated_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).order_by('-score')

    print(f"Recent score calculations (last 7 days): {recent_scores.count()}")
    if recent_scores.exists():
        print("Top 5 scores:")
        for score in recent_scores[:5]:
            print(f"  - {score.content_type.model} ID {score.object_id}: Score {score.score}")
            print(f"    Popularity: {score.popularity_score}, Recency: {score.recency_score}")
            print(f"    Engagement: {score.engagement_score}, Quality: {score.business_quality_score}")

    # Check global featuring status
    print("\n🌟 GLOBAL FEATURING STATUS:")
    all_featured_menu = MenuItem.objects.filter(is_featured=True, is_available=True)
    all_featured_products = Product.objects.filter(is_featured=True, is_active=True)

    print(f"Total featured menu items (all businesses): {all_featured_menu.count()}")
    print(f"Total featured products (all businesses): {all_featured_products.count()}")

    # Check featuring expiration
    print("\n⏰ FEATURING EXPIRATION:")
    non_expired_menu = MenuItem.objects.filter(
        is_featured=True,
        featured_until__gte=timezone.now()
    ).count()
    non_expired_products = Product.objects.filter(
        is_featured=True,
        featured_until__gte=timezone.now()
    ).count()

    print(f"Non-expired featured menu items: {non_expired_menu}")
    print(f"Non-expired featured products: {non_expired_products}")

    # Check if featuring system has ever been activated
    print("\n🔧 SYSTEM ACTIVATION CHECK:")
    any_scores = FeaturingScore.objects.exists()
    any_featured_ever = (
        MenuItem.objects.filter(featured_score__gt=0).exists() or
        Product.objects.filter(featured_score__gt=0).exists()
    )

    print(f"Featuring scores exist: {'Yes' if any_scores else 'No'}")
    print(f"Items with scores > 0: {'Yes' if any_featured_ever else 'No'}")

    if not any_scores and not any_featured_ever:
        print("\n⚠️  WARNING: The featuring system appears to have never been activated!")
        print("    You may need to run: python manage.py calculate_featuring_scores")
        print("    Or use the quick activation script: ./scripts/quick_activate_featuring.sh")

if __name__ == "__main__":
    check_featured_status()