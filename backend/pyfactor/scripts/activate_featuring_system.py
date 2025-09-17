#!/usr/bin/env python
"""
Script to activate the complex featuring system and run initial calculation
This activates the sophisticated multi-factor algorithm for automatic featuring
"""
import os
import sys
import django
from datetime import timedelta

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from django.core.management import call_command
from marketplace.models import BusinessListing
from inventory.models import Product
from menu.models import MenuItem

def activate_featuring_system():
    """Activate the complex featuring algorithm"""

    print("=" * 60)
    print("🚀 ACTIVATING COMPLEX FEATURING SYSTEM")
    print("=" * 60)

    # Step 1: Check current state
    print("\n📊 Current System State:")
    print("-" * 40)

    # Check businesses
    visible_businesses = BusinessListing.objects.filter(
        is_visible_in_marketplace=True
    ).count()
    print(f"✓ Visible businesses in marketplace: {visible_businesses}")

    # Check products
    total_products = Product.objects.filter(is_active=True, quantity__gt=0).count()
    featured_products = Product.objects.filter(
        is_active=True,
        is_featured=True,
        quantity__gt=0
    ).count()
    print(f"✓ Active products: {total_products}")
    print(f"✓ Currently featured products: {featured_products}")

    # Check menu items
    total_menu_items = MenuItem.objects.filter(is_available=True).count()
    featured_menu_items = MenuItem.objects.filter(
        is_available=True,
        is_featured=True
    ).count()
    print(f"✓ Available menu items: {total_menu_items}")
    print(f"✓ Currently featured menu items: {featured_menu_items}")

    # Step 2: Run the complex scoring algorithm
    print("\n🧮 Running Complex Featuring Algorithm...")
    print("-" * 40)
    print("Algorithm includes:")
    print("  • Popularity Score (30% weight) - Views & Orders")
    print("  • Recency Score (10% weight) - Newer items boost")
    print("  • Engagement Score (25% weight) - CTR & Conversions")
    print("  • Business Quality (20% weight) - Business ratings")
    print("  • Inventory Score (15% weight) - Stock levels")
    print("  • Manual boost (+20 points for is_featured=True)")

    try:
        # Run for last 30 days to get comprehensive metrics
        call_command('calculate_featuring_scores', days=30)
        print("\n✅ Featuring scores calculated successfully!")

        # Auto-feature top performers
        print("\n🎯 Auto-Featuring Top Performers...")
        auto_feature_count = auto_feature_top_items()
        print(f"✅ Auto-featured {auto_feature_count['products']} products and {auto_feature_count['menu_items']} menu items")

    except Exception as e:
        print(f"\n⚠️ Error running featuring algorithm: {e}")
        print("Creating fallback featuring...")
        fallback_featuring()

    # Step 3: Display results
    print("\n📈 Featuring System Results:")
    print("-" * 40)

    # Show top featured products
    top_products = Product.objects.filter(
        is_active=True,
        quantity__gt=0,
        featured_score__gt=0
    ).order_by('-featured_score')[:5]

    if top_products.exists():
        print("\nTop 5 Featured Products (by score):")
        for idx, product in enumerate(top_products, 1):
            print(f"  {idx}. {product.name[:30]:30} | Score: {product.featured_score:.1f} | Featured: {'✓' if product.is_featured else '✗'}")

    # Show top featured menu items
    top_menu_items = MenuItem.objects.filter(
        is_available=True,
        featured_score__gt=0
    ).order_by('-featured_score')[:5]

    if top_menu_items.exists():
        print("\nTop 5 Featured Menu Items (by score):")
        for idx, item in enumerate(top_menu_items, 1):
            print(f"  {idx}. {item.name[:30]:30} | Score: {item.featured_score:.1f} | Featured: {'✓' if item.is_featured else '✗'}")

    # Step 4: Set up automated scheduling
    print("\n⏰ Automation Setup:")
    print("-" * 40)
    print("To automate featuring updates, add this to your cron:")
    print("  0 2 * * * cd /backend/pyfactor && python manage.py calculate_featuring_scores")
    print("\nOr add to your Django settings CELERY_BEAT_SCHEDULE:")
    print("""
CELERY_BEAT_SCHEDULE = {
    'calculate-featuring-scores': {
        'task': 'marketplace.tasks.calculate_featuring_scores',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}
""")

    print("\n✅ FEATURING SYSTEM ACTIVATED!")
    print("=" * 60)

def auto_feature_top_items():
    """Automatically mark top-scoring items as featured"""
    counts = {'products': 0, 'menu_items': 0}

    # Auto-feature top 10 products by score
    top_products = Product.objects.filter(
        is_active=True,
        quantity__gt=0,
        featured_score__gt=50  # Score threshold
    ).order_by('-featured_score')[:10]

    for product in top_products:
        if not product.is_featured:
            product.is_featured = True
            product.featured_until = timezone.now() + timedelta(days=7)
            product.featured_priority = 5  # Medium priority
            product.save()
            counts['products'] += 1

    # Auto-feature top 10 menu items by score
    top_menu_items = MenuItem.objects.filter(
        is_available=True,
        featured_score__gt=50  # Score threshold
    ).order_by('-featured_score')[:10]

    for item in top_menu_items:
        if not item.is_featured:
            item.is_featured = True
            item.featured_until = timezone.now() + timedelta(days=7)
            item.featured_priority = 5
            item.save()
            counts['menu_items'] += 1

    return counts

def fallback_featuring():
    """Create basic featuring if algorithm fails"""
    print("\nApplying fallback featuring...")

    # Get businesses in marketplace
    businesses = BusinessListing.objects.filter(
        is_visible_in_marketplace=True
    )[:5]  # Limit to first 5 businesses

    for business in businesses:
        # Feature first 3 products per business
        products = Product.objects.filter(
            tenant_id=business.business_id,
            is_active=True,
            quantity__gt=0
        )[:3]

        for idx, product in enumerate(products):
            product.is_featured = True
            product.featured_score = 80 - (idx * 10)  # 80, 70, 60
            product.featured_priority = 10 - idx
            product.featured_until = timezone.now() + timedelta(days=14)
            product.save()

        # Feature first 3 menu items per business
        menu_items = MenuItem.objects.filter(
            tenant_id=business.business_id,
            is_available=True
        )[:3]

        for idx, item in enumerate(menu_items):
            item.is_featured = True
            item.featured_score = 80 - (idx * 10)
            item.featured_priority = 10 - idx
            item.featured_until = timezone.now() + timedelta(days=14)
            item.save()

    print("✓ Fallback featuring applied")

if __name__ == "__main__":
    try:
        activate_featuring_system()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()