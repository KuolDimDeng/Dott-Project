#!/usr/bin/env python
"""
Script to mark some products and menu items as featured for testing
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from inventory.models import Product
from menu.models import MenuItem
from marketplace.models import BusinessListing
from django.utils import timezone
from datetime import timedelta

def setup_featured_items():
    """Mark some items as featured for testing"""
    print("Setting up featured items...")

    # Get businesses in Juba
    business_listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        city__iexact='Juba'
    )

    print(f"Found {business_listings.count()} businesses in Juba")

    if business_listings.exists():
        # Get the first business (Dott Restaurant)
        listing = business_listings.first()
        tenant_id = listing.business_id

        print(f"Using business: {listing.business.business_name} (ID: {tenant_id})")

        # Mark some products as featured
        products = Product.objects.filter(tenant_id=tenant_id, is_active=True)[:5]
        featured_count = 0
        for idx, product in enumerate(products):
            product.is_featured = True
            product.featured_priority = 10 - idx  # Higher priority for first items
            product.featured_score = 5 - (idx * 0.5)
            product.featured_until = timezone.now() + timedelta(days=30)  # Featured for 30 days
            product.save()
            featured_count += 1
            print(f"  - Marked product '{product.name}' as featured")

        print(f"Marked {featured_count} products as featured")

        # Mark some menu items as featured
        menu_items = MenuItem.objects.filter(tenant_id=tenant_id, is_available=True)[:5]
        featured_count = 0
        for idx, item in enumerate(menu_items):
            item.is_featured = True
            item.featured_priority = 10 - idx
            item.featured_score = 5 - (idx * 0.5)
            item.featured_until = timezone.now() + timedelta(days=30)
            item.save()
            featured_count += 1
            print(f"  - Marked menu item '{item.name}' as featured")

        print(f"Marked {featured_count} menu items as featured")

        # If no items exist, create some sample ones
        if products.count() == 0:
            print("\nNo products found, creating sample products...")
            sample_products = [
                {"name": "Burger", "description": "Delicious beef burger", "price": 12.99, "quantity": 50},
                {"name": "Pizza Margherita", "description": "Classic Italian pizza", "price": 15.99, "quantity": 30},
                {"name": "Chicken Wings", "description": "Spicy chicken wings", "price": 9.99, "quantity": 100},
                {"name": "Caesar Salad", "description": "Fresh caesar salad", "price": 8.99, "quantity": 40},
                {"name": "French Fries", "description": "Crispy golden fries", "price": 4.99, "quantity": 200},
            ]

            for idx, product_data in enumerate(sample_products):
                product = Product.objects.create(
                    tenant_id=tenant_id,
                    **product_data,
                    is_active=True,
                    is_featured=True,
                    featured_priority=10 - idx,
                    featured_score=5 - (idx * 0.5),
                    featured_until=timezone.now() + timedelta(days=30)
                )
                print(f"  - Created and featured product '{product.name}'")

        if menu_items.count() == 0:
            print("\nNo menu items found, creating sample menu items...")
            from menu.models import MenuCategory

            # Create or get a category
            category, _ = MenuCategory.objects.get_or_create(
                tenant_id=tenant_id,
                name="Main Dishes",
                defaults={"description": "Our main course offerings"}
            )

            sample_items = [
                {"name": "Grilled Steak", "description": "Premium beef steak", "price": 24.99},
                {"name": "Pasta Carbonara", "description": "Creamy pasta with bacon", "price": 14.99},
                {"name": "Fish and Chips", "description": "Beer-battered fish with fries", "price": 16.99},
                {"name": "Vegetable Curry", "description": "Spicy vegetable curry with rice", "price": 12.99},
                {"name": "BBQ Ribs", "description": "Tender pork ribs with BBQ sauce", "price": 22.99},
            ]

            for idx, item_data in enumerate(sample_items):
                menu_item = MenuItem.objects.create(
                    tenant_id=tenant_id,
                    category=category,
                    **item_data,
                    is_available=True,
                    is_featured=True,
                    featured_priority=10 - idx,
                    featured_score=5 - (idx * 0.5),
                    featured_until=timezone.now() + timedelta(days=30),
                    preparation_time=20 + (idx * 5)
                )
                print(f"  - Created and featured menu item '{menu_item.name}'")

        print("\n✅ Featured items setup complete!")

        # Show summary
        total_featured_products = Product.objects.filter(
            tenant_id=tenant_id,
            is_featured=True
        ).count()

        total_featured_menu_items = MenuItem.objects.filter(
            tenant_id=tenant_id,
            is_featured=True
        ).count()

        print(f"\nSummary:")
        print(f"  - Total featured products: {total_featured_products}")
        print(f"  - Total featured menu items: {total_featured_menu_items}")

    else:
        print("No businesses found in Juba. Please ensure businesses are set up first.")

if __name__ == "__main__":
    setup_featured_items()