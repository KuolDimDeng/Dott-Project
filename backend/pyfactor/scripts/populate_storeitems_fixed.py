#!/usr/bin/env python3
"""
Fixed script to populate StoreItems from Open Food Facts API
"""
import os
import sys
import django
import requests
import time
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from inventory.models_storeitems import StoreItem

def fetch_from_openfoodfacts(page=1, page_size=100, country='world'):
    """Fetch products from Open Food Facts API"""
    try:
        # Use the world endpoint for more products
        url = f"https://{country}.openfoodfacts.org/cgi/search.pl"

        params = {
            'action': 'process',
            'json': '1',
            'page': page,
            'page_size': page_size,
            'sort_by': 'unique_scans_n',  # Get popular products
            'fields': 'code,product_name,brands,categories_tags,quantity,image_url,countries_tags'
        }

        # Add country filter for African products if specified
        if country != 'world':
            params['tagtype_0'] = 'countries'
            params['tag_contains_0'] = 'contains'
            params['tag_0'] = country

        print(f"Fetching from {url} with params: {params}")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        return data.get('products', [])
    except Exception as e:
        print(f"Error fetching from Open Food Facts: {e}")
        return []

def import_products(limit=1000):
    """Import products from Open Food Facts"""
    imported = 0
    page = 1
    page_size = 100

    # List of countries to fetch from (African and global)
    countries = ['world', 'south-africa', 'kenya', 'nigeria', 'egypt']

    for country in countries:
        if imported >= limit:
            break

        print(f"\n=== Fetching products from {country.upper()} ===")

        # Fetch multiple pages if needed
        for page_num in range(1, 11):  # Try up to 10 pages
            if imported >= limit:
                break

            products = fetch_from_openfoodfacts(page_num, page_size, country)

            if not products:
                print(f"No more products from {country} (page {page_num})")
                break

            print(f"Processing {len(products)} products from page {page_num}...")

            for product in products:
                if imported >= limit:
                    break

                # Extract product data
                barcode = product.get('code', '').strip()
                name = product.get('product_name', '').strip()

                # Skip if no barcode or name
                if not barcode or not name:
                    continue

                # Skip if already exists
                if StoreItem.objects.filter(barcode=barcode).exists():
                    continue

                # Extract other fields
                brand = product.get('brands', '').split(',')[0].strip() if product.get('brands') else ''
                categories = product.get('categories_tags', [])
                category = categories[0].split(':')[-1].replace('-', ' ').title() if categories else 'General'
                size = product.get('quantity', '')
                image_url = product.get('image_url', '')

                # Determine region from countries_tags
                countries_tags = product.get('countries_tags', [])
                region = 'WORLD'
                if any('south-africa' in tag for tag in countries_tags):
                    region = 'ZA'
                elif any('kenya' in tag for tag in countries_tags):
                    region = 'KE'
                elif any('nigeria' in tag for tag in countries_tags):
                    region = 'NG'
                elif any('egypt' in tag for tag in countries_tags):
                    region = 'EG'
                elif any('africa' in tag.lower() for tag in countries_tags):
                    region = 'AFRICA'

                try:
                    # Create the product
                    StoreItem.objects.create(
                        barcode=barcode,
                        name=name[:255],
                        brand=brand[:100] if brand else '',
                        category=category[:100],
                        size=size[:50] if size else '',
                        image_url=image_url[:500] if image_url else '',
                        region_code=region,
                        verified=False
                    )
                    imported += 1
                    print(f"  [{imported}/{limit}] Added: {name[:50]} ({barcode})")

                except Exception as e:
                    print(f"  Error adding {name}: {e}")

            # Small delay to be nice to the API
            time.sleep(0.5)

    return imported

def add_essential_african_products():
    """Add essential African products that might not be in Open Food Facts"""
    products = [
        # South African Products
        ('6001087001163', 'Jungle Oats 500g', 'Tiger Brands', 'Food', '500g', 'ZA'),
        ('6009510800104', 'White Star Maize Meal 5kg', 'Pioneer', 'Food', '5kg', 'ZA'),
        ('6001068013654', 'Simba Chips Original', 'PepsiCo', 'Snacks', '125g', 'ZA'),
        ('6003827000018', 'Biltong Original 50g', 'Crown National', 'Snacks', '50g', 'ZA'),
        ('6001240100035', 'Mrs Balls Chutney 470g', 'Mrs Balls', 'Condiments', '470g', 'ZA'),

        # Common African Items
        ('AIRTIME-MTN-5', 'MTN Airtime R5', 'MTN', 'Digital', 'R5', 'AFRICA'),
        ('AIRTIME-VODACOM-10', 'Vodacom Airtime R10', 'Vodacom', 'Digital', 'R10', 'AFRICA'),
        ('089836187328', 'Indomie Noodles Chicken', 'IndoFood', 'Food', '70g', 'AFRICA'),

        # Beverages
        ('5449000000996', 'Coca-Cola 500ml', 'Coca-Cola', 'Beverages', '500ml', 'WORLD'),
        ('5449000131805', 'Sprite 500ml', 'Coca-Cola', 'Beverages', '500ml', 'WORLD'),
        ('5449000011527', 'Fanta Orange 500ml', 'Coca-Cola', 'Beverages', '500ml', 'WORLD'),

        # Personal Care
        ('8901030865278', 'Lifebuoy Soap 100g', 'Unilever', 'Personal Care', '100g', 'WORLD'),
        ('5000299223178', 'Vaseline Petroleum Jelly 100ml', 'Unilever', 'Personal Care', '100ml', 'WORLD'),
        ('5410091728977', 'Colgate Toothpaste 100ml', 'Colgate', 'Personal Care', '100ml', 'WORLD'),
    ]

    added = 0
    for barcode, name, brand, category, size, region in products:
        item, created = StoreItem.objects.get_or_create(
            barcode=barcode,
            defaults={
                'name': name,
                'brand': brand,
                'category': category,
                'size': size,
                'region_code': region,
                'verified': True,
                'verification_count': 3
            }
        )
        if created:
            added += 1
            print(f"Added essential: {name}")

    return added

if __name__ == '__main__':
    print("=== StoreItems Population Script ===")
    print(f"Current products in database: {StoreItem.objects.count()}")

    # Add essential products first
    print("\n1. Adding essential African products...")
    essential_added = add_essential_african_products()
    print(f"Added {essential_added} essential products")

    # Import from Open Food Facts
    print("\n2. Importing from Open Food Facts API...")
    api_imported = import_products(limit=1000)
    print(f"Imported {api_imported} products from API")

    # Final summary
    total = StoreItem.objects.count()
    print(f"\n=== COMPLETE ===")
    print(f"Total products in database: {total}")
    print(f"Verified products: {StoreItem.objects.filter(verified=True).count()}")
    print(f"Categories: {StoreItem.objects.values('category').distinct().count()}")

    # Show sample products
    print("\nSample products:")
    for item in StoreItem.objects.all()[:5]:
        print(f"  - {item.barcode}: {item.name} ({item.category})")