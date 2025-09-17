#!/usr/bin/env python3
"""
Script to add real product images to items missing them in the database.
Run this in Render shell:
cd /app && python scripts/fix_product_images_render.py
"""
import os
import sys

# Add the parent directory to the Python path
sys.path.insert(0, '/app')

import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def update_product_images():
    """Update products with missing images"""
    try:
        with connection.cursor() as cursor:
            # First, get statistics
            cursor.execute("SELECT COUNT(*) FROM store_items")
            total = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM store_items WHERE image_url IS NOT NULL AND image_url != ''")
            with_images = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM store_items WHERE image_url IS NULL OR image_url = ''")
            without_images = cursor.fetchone()[0]

            print(f"📊 Current statistics:")
            print(f"   Total products: {total}")
            print(f"   With images: {with_images}")
            print(f"   Without images: {without_images}")

            if without_images == 0:
                print("✅ All products already have images!")
                return

            print("\n🔧 Updating products with category-appropriate images...")
            updates = 0

            # African beauty products - shea butter/natural products image
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (barcode LIKE '60%' OR barcode LIKE '690%')
                AND (category = 'beauty' OR LOWER(name) LIKE '%shea%' OR LOWER(name) LIKE '%butter%')
            """)
            beauty_updates = cursor.rowcount
            updates += beauty_updates
            print(f"   ✓ Updated {beauty_updates} beauty products")

            # Hair products - hair care image
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (LOWER(name) LIKE '%hair%' OR LOWER(name) LIKE '%shampoo%' OR
                     LOWER(name) LIKE '%conditioner%' OR category = 'hair')
            """)
            hair_updates = cursor.rowcount
            updates += hair_updates
            print(f"   ✓ Updated {hair_updates} hair products")

            # Skin/cosmetics products
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (LOWER(name) LIKE '%skin%' OR LOWER(name) LIKE '%lotion%' OR
                     LOWER(name) LIKE '%cream%' OR LOWER(name) LIKE '%moistur%')
            """)
            skin_updates = cursor.rowcount
            updates += skin_updates
            print(f"   ✓ Updated {skin_updates} skin care products")

            # Food products - grocery store image
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (category IN ('food', 'grocery', 'snacks') OR
                     LOWER(name) LIKE '%rice%' OR LOWER(name) LIKE '%flour%' OR
                     LOWER(name) LIKE '%pasta%' OR LOWER(name) LIKE '%cereal%')
            """)
            food_updates = cursor.rowcount
            updates += food_updates
            print(f"   ✓ Updated {food_updates} food products")

            # Beverages - drinks image
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1534057308991-b9b3a578f1b1?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1534057308991-b9b3a578f1b1?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (category IN ('beverages', 'drinks', 'alcohol') OR
                     LOWER(name) LIKE '%juice%' OR LOWER(name) LIKE '%water%' OR
                     LOWER(name) LIKE '%soda%' OR LOWER(name) LIKE '%beer%' OR
                     LOWER(name) LIKE '%wine%' OR LOWER(name) LIKE '%tea%' OR
                     LOWER(name) LIKE '%coffee%')
            """)
            beverage_updates = cursor.rowcount
            updates += beverage_updates
            print(f"   ✓ Updated {beverage_updates} beverage products")

            # Household/cleaning items
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (category IN ('household', 'cleaning', 'home') OR
                     LOWER(name) LIKE '%detergent%' OR LOWER(name) LIKE '%soap%' OR
                     LOWER(name) LIKE '%clean%' OR LOWER(name) LIKE '%tissue%')
            """)
            household_updates = cursor.rowcount
            updates += household_updates
            print(f"   ✓ Updated {household_updates} household products")

            # Electronics - tech products
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (category = 'electronics' OR LOWER(name) LIKE '%phone%' OR
                     LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%tablet%')
            """)
            electronic_updates = cursor.rowcount
            updates += electronic_updates
            print(f"   ✓ Updated {electronic_updates} electronic products")

            # Baby products
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND (category = 'baby' OR LOWER(name) LIKE '%baby%' OR
                     LOWER(name) LIKE '%diaper%' OR LOWER(name) LIKE '%infant%')
            """)
            baby_updates = cursor.rowcount
            updates += baby_updates
            print(f"   ✓ Updated {baby_updates} baby products")

            # Regional specific products by barcode
            # Egyptian products (622xxx)
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1594995846645-d58328c3ffa4?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1594995846645-d58328c3ffa4?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND barcode LIKE '622%'
            """)
            egyptian_updates = cursor.rowcount
            updates += egyptian_updates
            if egyptian_updates > 0:
                print(f"   ✓ Updated {egyptian_updates} Egyptian products")

            # Turkish products (869xxx)
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND barcode LIKE '869%'
            """)
            turkish_updates = cursor.rowcount
            updates += turkish_updates
            if turkish_updates > 0:
                print(f"   ✓ Updated {turkish_updates} Turkish products")

            # Indian products (890xxx)
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND barcode LIKE '890%'
            """)
            indian_updates = cursor.rowcount
            updates += indian_updates
            if indian_updates > 0:
                print(f"   ✓ Updated {indian_updates} Indian products")

            # Brazilian products (789xxx)
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=200'
                WHERE (image_url IS NULL OR image_url = '')
                AND barcode LIKE '789%'
            """)
            brazilian_updates = cursor.rowcount
            updates += brazilian_updates
            if brazilian_updates > 0:
                print(f"   ✓ Updated {brazilian_updates} Brazilian products")

            # Generic product image for everything else that's still missing
            cursor.execute("""
                UPDATE store_items
                SET image_url = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
                    thumbnail_url = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200'
                WHERE image_url IS NULL OR image_url = ''
            """)
            generic_updates = cursor.rowcount
            updates += generic_updates
            if generic_updates > 0:
                print(f"   ✓ Updated {generic_updates} remaining products with generic image")

            # Get updated statistics
            cursor.execute("SELECT COUNT(*) FROM store_items WHERE image_url IS NOT NULL AND image_url != ''")
            new_with_images = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM store_items WHERE image_url IS NULL OR image_url = ''")
            remaining_without = cursor.fetchone()[0]

            print(f"\n✅ Successfully updated {updates} products with images")
            print(f"📊 New statistics:")
            print(f"   Products with images: {new_with_images}/{total} ({int(new_with_images*100/total)}%)")
            if remaining_without > 0:
                print(f"   ⚠️ Products still without images: {remaining_without}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🖼️ Starting product image update script...")
    print("=" * 50)
    update_product_images()
    print("=" * 50)
    print("✅ Script completed!")