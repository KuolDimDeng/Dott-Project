#!/usr/bin/env python3
"""
Script to add real product images to items missing them in the database.
"""
import os
import sys
import django
import psycopg2
from urllib.parse import urlparse

# Setup Django environment
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Get DATABASE_URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is not set")
    sys.exit(1)

# Parse the DATABASE_URL
url = urlparse(DATABASE_URL)
database = url.path[1:]
user = url.username
password = url.password
host = url.hostname
port = url.port

# Image URLs for products by category/region
image_updates = {
    # African Beauty Products
    'african_beauty': [
        ('8901030', 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=400'),  # Hair oil
        ('690123', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400'),  # Shea butter
        ('603456', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400'),  # Black soap
        ('8901030865', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400'),  # Hair cream
    ],
    # Egyptian Products
    'egyptian': [
        ('622000', 'https://images.unsplash.com/photo-1594995846645-d58328c3ffa4?w=400'),  # Tea
        ('622001', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'),  # Dates
        ('622002', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'),  # Rice
        ('622003', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400'),  # Spices
    ],
    # Turkish Products
    'turkish': [
        ('869000', 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=400'),  # Turkish delight
        ('869001', 'https://images.unsplash.com/photo-1544459117-39364d32ca2c?w=400'),  # Tea
        ('869002', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400'),  # Coffee
        ('869003', 'https://images.unsplash.com/photo-1601001815894-4bb6c81416d7?w=400'),  # Halva
    ],
    # Kenyan/Ugandan Products
    'kenyan': [
        ('616000', 'https://images.unsplash.com/photo-1577653394926-ed91f5d5f456?w=400'),  # Coffee
        ('616001', 'https://images.unsplash.com/photo-1587049352846-4a222e784cb3?w=400'),  # Tea
        ('616002', 'https://images.unsplash.com/photo-1574914629385-46448b767aec?w=400'),  # Beer
        ('616003', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400'),  # Ugali flour
    ],
    # South African Products
    'south_african': [
        ('600000', 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=400'),  # Biltong
        ('600001', 'https://images.unsplash.com/photo-1594995846645-d58328c3ffa4?w=400'),  # Rooibos tea
        ('600002', 'https://images.unsplash.com/photo-1505404919723-002ecad81b92?w=400'),  # Wine
        ('600003', 'https://images.unsplash.com/photo-1574914629385-46448b767aec?w=400'),  # Castle Lager
    ],
    # Indian Products
    'indian': [
        ('890000', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400'),  # Basmati rice
        ('890001', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400'),  # Spices
        ('890002', 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=400'),  # Tea
        ('890003', 'https://images.unsplash.com/photo-1626957341926-98752fc2ba90?w=400'),  # Snacks
    ],
    # Brazilian Products
    'brazilian': [
        ('789000', 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400'),  # Coffee
        ('789001', 'https://images.unsplash.com/photo-1578855691621-8c1c8c3c8f0e?w=400'),  # Guarana
        ('789002', 'https://images.unsplash.com/photo-1505404919723-002ecad81b92?w=400'),  # Beer
        ('789003', 'https://images.unsplash.com/photo-1574914629385-46448b767aec?w=400'),  # Cachaça
    ],
    # Mexican Products
    'mexican': [
        ('750000', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),  # Tacos
        ('750001', 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400'),  # Tortillas
        ('750002', 'https://images.unsplash.com/photo-1535406208535-1429839cfd13?w=400'),  # Tequila
        ('750003', 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=400'),  # Hot sauce
    ],
    # Household Products
    'household': [
        ('400000', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400'),  # Detergent
        ('400001', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400'),  # Soap
        ('400002', 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400'),  # Toilet paper
        ('400003', 'https://images.unsplash.com/photo-1527515579903-1d53a7a8f3e6?w=400'),  # Cleaning spray
    ],
}

def update_product_images():
    """Update products with missing images"""
    try:
        # Connect to database
        conn = psycopg2.connect(
            database=database,
            user=user,
            password=password,
            host=host,
            port=port,
            sslmode='require'
        )
        cursor = conn.cursor()

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

        # Update products with generic category images based on barcode patterns
        updates = 0

        # African beauty products (barcode starts with 600-609, 690)
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND (barcode LIKE '60%' OR barcode LIKE '690%')
            AND category = 'beauty'
        """)
        updates += cursor.rowcount

        # Food products (various barcodes)
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND category IN ('food', 'grocery', 'snacks')
        """)
        updates += cursor.rowcount

        # Beverages
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1534057308991-b9b3a578f1b1?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1534057308991-b9b3a578f1b1?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND category IN ('beverages', 'drinks', 'alcohol')
        """)
        updates += cursor.rowcount

        # Hair products
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND (LOWER(name) LIKE '%hair%' OR LOWER(name) LIKE '%shampoo%' OR category = 'hair')
        """)
        updates += cursor.rowcount

        # Skin products
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND (LOWER(name) LIKE '%skin%' OR LOWER(name) LIKE '%lotion%' OR LOWER(name) LIKE '%cream%')
        """)
        updates += cursor.rowcount

        # Household items
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200'
            WHERE (image_url IS NULL OR image_url = '')
            AND category IN ('household', 'cleaning', 'home')
        """)
        updates += cursor.rowcount

        # Generic product image for everything else
        cursor.execute("""
            UPDATE store_items
            SET image_url = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
                thumbnail_url = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200'
            WHERE image_url IS NULL OR image_url = ''
        """)
        updates += cursor.rowcount

        # Commit changes
        conn.commit()

        # Get updated statistics
        cursor.execute("SELECT COUNT(*) FROM store_items WHERE image_url IS NOT NULL AND image_url != ''")
        new_with_images = cursor.fetchone()[0]

        print(f"\n✅ Successfully updated {updates} products with images")
        print(f"📊 New statistics:")
        print(f"   Products with images: {new_with_images}/{total}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    update_product_images()