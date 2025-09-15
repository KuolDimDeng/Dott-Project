#!/usr/bin/env python
"""
Enhanced script to populate StoreItems with products and upload images to Cloudinary
Run directly: python populate_storeitems_cloudinary.py
"""

import os
import sys
import django
import requests
import time
from io import BytesIO

# Add the app directory to Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

# Now import Django models and services
from inventory.models_storeitems import StoreItem
from services.cloudinary_service import cloudinary_service
import logging

logger = logging.getLogger(__name__)

def upload_image_to_cloudinary(image_url, barcode):
    """
    Download image from URL and upload to Cloudinary
    Returns dict with cloudinary URLs or None if failed
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=10)
        if response.status_code != 200:
            return None

        # Upload to Cloudinary
        result = cloudinary_service.upload_image(
            file_data=BytesIO(response.content),
            purpose='store_item',
            user_id='global'  # Global catalog, not user-specific
        )

        return {
            'image_url': result['url'],
            'image_public_id': result['public_id'],
            'thumbnail_url': result.get('thumbnail_url', result['url'])
        }
    except Exception as e:
        logger.error(f"Failed to upload image for {barcode}: {e}")
        return None

def populate_products_with_cloudinary():
    print("=" * 60)
    print("POPULATING STOREITEMS WITH CLOUDINARY IMAGES")
    print("=" * 60)

    imported = 0
    updated = 0
    images_uploaded = 0
    target = 1000

    print(f"\nCurrent products in database: {StoreItem.objects.count()}")
    print(f"Target: Import/update {target} products with Cloudinary images\n")

    # Check if Cloudinary is configured
    if not os.environ.get('CLOUDINARY_CLOUD_NAME'):
        print("WARNING: Cloudinary not configured. Images will use direct URLs only.")
        use_cloudinary = False
    else:
        print("✓ Cloudinary configured. Images will be uploaded to CDN.")
        use_cloudinary = True

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
                    'page_size': 50,  # Smaller batch for image processing
                    'sort_by': 'unique_scans_n',  # Get most popular products
                    'fields': 'code,product_name,brands,categories,quantity,countries_tags,image_url,image_front_url,image_small_url,ingredients_text'
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
                original_image_url = (
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

                # Get description from ingredients
                description = product.get('ingredients_text', '')
                if description:
                    description = description[:500]  # Limit description length

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
                    if original_image_url and not existing.image_public_id and use_cloudinary:
                        print(f"    Uploading image for {barcode}...")
                        cloudinary_data = upload_image_to_cloudinary(original_image_url, barcode)

                        if cloudinary_data:
                            existing.image_url = cloudinary_data['image_url']
                            existing.image_public_id = cloudinary_data['image_public_id']
                            existing.thumbnail_url = cloudinary_data['thumbnail_url']
                            existing.save()
                            images_uploaded += 1
                            updated += 1
                            print(f"    ✓ Updated {barcode} with Cloudinary image")
                    elif original_image_url and not existing.image_url:
                        # Just update with direct URL if Cloudinary not available
                        existing.image_url = original_image_url
                        existing.save()
                        updated += 1
                        print(f"    Updated {barcode} with direct image URL")
                else:
                    # Create new product
                    try:
                        # Upload image to Cloudinary if available
                        cloudinary_data = None
                        if original_image_url and use_cloudinary:
                            print(f"    Uploading image for new product {barcode}...")
                            cloudinary_data = upload_image_to_cloudinary(original_image_url, barcode)
                            if cloudinary_data:
                                images_uploaded += 1

                        StoreItem.objects.create(
                            barcode=barcode,
                            name=name[:255],
                            brand=brand or '',
                            category=category,
                            description=description,
                            size=size or '',
                            region_code=region,
                            image_url=cloudinary_data['image_url'] if cloudinary_data else original_image_url,
                            image_public_id=cloudinary_data['image_public_id'] if cloudinary_data else '',
                            thumbnail_url=cloudinary_data['thumbnail_url'] if cloudinary_data else '',
                            verified=False
                        )
                        imported += 1

                        # Show progress
                        if imported % 10 == 0:
                            print(f"    [{imported} new + {updated} updated/{target}] processed...")

                    except Exception as e:
                        logger.error(f"Failed to create product {barcode}: {e}")
                        pass

            # Small delay to be nice to the APIs
            time.sleep(1)

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
    print(f"Products updated: {updated}")
    print(f"Images uploaded to Cloudinary: {images_uploaded}")
    print(f"Total products in database: {StoreItem.objects.count()}")

    # Count products with images
    with_cloudinary = StoreItem.objects.exclude(image_public_id='').count()
    with_any_image = StoreItem.objects.exclude(image_url__isnull=True).exclude(image_url='').count()

    print(f"Products with Cloudinary images: {with_cloudinary}")
    print(f"Products with any image: {with_any_image}")

    # Show some examples with images
    print("\n📦 Sample products with Cloudinary images:")
    print("-" * 40)
    for item in StoreItem.objects.exclude(image_public_id='')[:10]:
        print(f"  {item.barcode:<15} {item.name[:30]:<30}")
        print(f"    Thumbnail: {item.thumbnail_url[:60]}..." if item.thumbnail_url else "    Image: {item.image_url[:60]}...")

    print("\n✅ StoreItems populated with Cloudinary images successfully!")

    return imported, updated

if __name__ == '__main__':
    try:
        populate_products_with_cloudinary()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()