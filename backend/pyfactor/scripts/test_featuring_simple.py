#!/usr/bin/env python
"""
Simple test script to verify featuring system
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing
from inventory.models import Product
from menu.models import MenuItem

print("\n" + "="*60)
print("TESTING FEATURING SYSTEM")
print("="*60)

# Test businesses
print("\n📦 Business Listings:")
total = BusinessListing.objects.count()
featured = BusinessListing.objects.filter(is_featured=True).count()
print(f"Total: {total}, Featured: {featured}")

for listing in BusinessListing.objects.filter(is_featured=True):
    print(f"\n✓ Business: {listing.id}")
    print(f"  City: {listing.city}")
    print(f"  Business ID: {listing.business_id}")
    if listing.business:
        print(f"  Name: {listing.business.business_name}")
        print(f"  Email: {listing.business.email}")

# Test products
print("\n📦 Featured Products:")
featured_products = Product.objects.filter(is_featured=True).count()
print(f"Total Featured: {featured_products}")

for product in Product.objects.filter(is_featured=True)[:5]:
    print(f"✓ {product.name} - ${product.price}")

# Test menu items
print("\n🍽️ Featured Menu Items:")
featured_items = MenuItem.objects.filter(is_featured=True).count()
print(f"Total Featured: {featured_items}")

for item in MenuItem.objects.filter(is_featured=True)[:5]:
    print(f"✓ {item.name} - ${item.price}")

print("\n" + "="*60)
print("✅ TEST COMPLETE")
print("="*60)