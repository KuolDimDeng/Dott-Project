#!/usr/bin/env python
"""
Standalone script to populate StoreItems with real products from API
Run directly: python populate_products.py
"""

import os
import sys
import django

# Add the app directory to Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

# Now import Django models
from inventory.models_storeitems import StoreItem
import requests
import time

def populate_products():
    print("=" * 60)
    print("POPULATING STOREITEMS WITH REAL PRODUCTS")
    print("=" * 60)

    imported = 0
    target = 1000

    print(f"\nCurrent products in database: {StoreItem.objects.count()}")
    print(f"Target: Import {target} products from Open Food Facts API\n")

    # Fetch from Open Food Facts API
    for page in range(1, 25):  # Try up to 25 pages
        if imported >= target:
            break

        try:
            print(f"Fetching page {page}...")

            # Use the API to get real products
            response = requests.get(
                'https://world.openfoodfacts.org/cgi/search.pl',
                params={
                    'action': 'process',
                    'json': '1',
                    'page': page,
                    'page_size': 100,
                    'sort_by': 'unique_scans_n',  # Get most popular products
                    'fields': 'code,product_name,brands,categories,quantity,countries_tags'
                },
                timeout=15
            )

            if response.status_code != 200:
                print(f"  API returned status {response.status_code}")
                continue

            data = response.json()
            products = data.get('products', [])

            if not products:
                print(f"  No products returned")
                continue

            print(f"  Processing {len(products)} products...")

            for product in products:
                if imported >= target:
                    break

                # Extract product data
                barcode = str(product.get('code', '')).strip()
                name = product.get('product_name', '').strip()

                # Skip if no barcode or name
                if not barcode or not name or len(barcode) > 50:
                    continue

                # Skip if already exists
                if StoreItem.objects.filter(barcode=barcode).exists():
                    continue

                # Get other fields
                brand = product.get('brands', '')
                if brand:
                    brand = brand.split(',')[0].strip()[:100]

                categories = product.get('categories', '')
                if categories:
                    category = categories.split(',')[0].strip()[:100]
                else:
                    category = 'General'

                size = product.get('quantity', '')[:50]

                # Determine region
                countries = product.get('countries_tags', [])
                region = 'WORLD'
                if any('south-africa' in c for c in countries):
                    region = 'ZA'
                elif any('kenya' in c for c in countries):
                    region = 'KE'
                elif any('nigeria' in c for c in countries):
                    region = 'NG'

                # Create the product
                try:
                    StoreItem.objects.create(
                        barcode=barcode,
                        name=name[:255],
                        brand=brand or '',
                        category=category,
                        size=size or '',
                        region_code=region,
                        verified=False
                    )
                    imported += 1

                    # Show progress
                    if imported % 10 == 0:
                        print(f"    [{imported}/{target}] imported...")

                except Exception as e:
                    # Skip on error
                    pass

            # Small delay to be nice to the API
            time.sleep(0.5)

        except requests.exceptions.RequestException as e:
            print(f"  Network error: {e}")
            continue
        except Exception as e:
            print(f"  Error: {e}")
            continue

    # Final summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Successfully imported: {imported} products")
    print(f"Total products in database: {StoreItem.objects.count()}")

    # Show some examples
    print("\n📦 Sample products you can now scan:")
    print("-" * 40)
    for item in StoreItem.objects.all()[:15]:
        print(f"  {item.barcode:<15} {item.name[:40]}")

    print("\n✅ StoreItems populated successfully!")
    print("API endpoints are now ready:")
    print("  - /api/inventory/store-items/")
    print("  - /api/inventory/store-items/scan/?barcode=XXXX")

    return imported

if __name__ == '__main__':
    try:
        populate_products()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()