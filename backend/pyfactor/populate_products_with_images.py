#!/usr/bin/env python
"""
Enhanced script to populate StoreItems with products INCLUDING images
Stores images using Cloudflare-compatible URLs
Run directly: python populate_products_with_images.py
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

def populate_products_with_images():
    print("=" * 60)
    print("POPULATING STOREITEMS WITH PRODUCTS AND IMAGES")
    print("=" * 60)

    imported = 0
    updated = 0
    target = 1000

    print(f"\nCurrent products in database: {StoreItem.objects.count()}")
    print(f"Target: Import/update {target} products with images\n")

    # Fetch from Open Food Facts API
    for page in range(1, 50):  # Try up to 50 pages
        if imported + updated >= target:
            break

        try:
            print(f"Fetching page {page}...")

            # Request more fields including image URLs
            response = requests.get(
                'https://world.openfoodfacts.org/cgi/search.pl',
                params={
                    'action': 'process',
                    'json': '1',
                    'page': page,
                    'page_size': 100,
                    'sort_by': 'unique_scans_n',  # Get most popular products
                    'fields': 'code,product_name,brands,categories,quantity,countries_tags,image_url,image_front_url,image_small_url'
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
                if imported + updated >= target:
                    break

                # Extract product data
                barcode = str(product.get('code', '')).strip()
                name = product.get('product_name', '').strip()

                # Skip if no barcode or name
                if not barcode or not name or len(barcode) > 50:
                    continue

                # Get image URL (prefer front image, then small, then main)
                image_url = (
                    product.get('image_front_url') or
                    product.get('image_small_url') or
                    product.get('image_url') or
                    ''
                )

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

                # Check if product exists
                existing = StoreItem.objects.filter(barcode=barcode).first()

                if existing:
                    # Update existing product with image if it doesn't have one
                    if image_url and not existing.image_url:
                        existing.image_url = image_url
                        existing.save()
                        updated += 1
                        print(f"    Updated {barcode} with image")
                else:
                    # Create new product with image
                    try:
                        StoreItem.objects.create(
                            barcode=barcode,
                            name=name[:255],
                            brand=brand or '',
                            category=category,
                            size=size or '',
                            region_code=region,
                            image_url=image_url if image_url else None,
                            verified=False
                        )
                        imported += 1

                        # Show progress
                        if imported % 10 == 0:
                            print(f"    [{imported} new + {updated} updated/{target}] processed...")

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
    print(f"New products imported: {imported}")
    print(f"Products updated with images: {updated}")
    print(f"Total products in database: {StoreItem.objects.count()}")

    # Count products with images
    with_images = StoreItem.objects.exclude(image_url__isnull=True).exclude(image_url='').count()
    print(f"Products with images: {with_images}")

    # Show some examples with images
    print("\n📦 Sample products with images:")
    print("-" * 40)
    for item in StoreItem.objects.exclude(image_url__isnull=True).exclude(image_url='')[:10]:
        print(f"  {item.barcode:<15} {item.name[:30]:<30}")
        print(f"    Image: {item.image_url[:60]}...")

    print("\n✅ StoreItems populated with images successfully!")

    return imported, updated

if __name__ == '__main__':
    try:
        populate_products_with_images()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()