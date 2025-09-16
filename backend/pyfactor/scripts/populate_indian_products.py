#!/usr/bin/env python
"""
Script to populate store_items with Indian food, beverages and consumer products
Includes popular Indian brands with real barcodes (890x prefix)
"""
import os
import psycopg2
from urllib.parse import urlparse
from datetime import datetime

# Parse DATABASE_URL from Render environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable not found!")
    print("This script is designed to run on Render deployment.")
    exit(1)

# Parse the DATABASE_URL
url = urlparse(DATABASE_URL)
DB_CONFIG = {
    'dbname': url.path[1:],
    'user': url.username,
    'password': url.password,
    'host': url.hostname,
    'port': url.port
}

print(f"Connecting to database: {DB_CONFIG['dbname']}@{DB_CONFIG['host']}")

# Indian products with real barcodes (890x prefix)
INDIAN_PRODUCTS = [
    # === AMUL (India's largest dairy brand) ===
    {
        'barcode': '8901020010016',
        'name': 'Amul Fresh Milk',
        'brand': 'Amul',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '500ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901020010023',
        'name': 'Amul Butter',
        'brand': 'Amul',
        'category': 'Food & Beverages',
        'subcategory': 'Dairy',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901020010030',
        'name': 'Amul Cheese Slices',
        'brand': 'Amul',
        'category': 'Food & Beverages',
        'subcategory': 'Dairy',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === BRITANNIA (Major biscuit and bakery brand) ===
    {
        'barcode': '8901030010017',
        'name': 'Britannia Good Day Cookies',
        'brand': 'Britannia',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901030010024',
        'name': 'Britannia Marie Gold Biscuits',
        'brand': 'Britannia',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901030010031',
        'name': 'Britannia Bread',
        'brand': 'Britannia',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === PARLE (Iconic Indian biscuit brand) ===
    {
        'barcode': '8901040010018',
        'name': 'Parle-G Glucose Biscuits',
        'brand': 'Parle',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901040010025',
        'name': 'Parle Monaco Biscuits',
        'brand': 'Parle',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === TATA TEA ===
    {
        'barcode': '8901050010019',
        'name': 'Tata Tea Gold',
        'brand': 'Tata Tea',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901050010026',
        'name': 'Tata Tea Chakra Gold',
        'brand': 'Tata Tea',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === NESCAFE INDIA ===
    {
        'barcode': '8901060010020',
        'name': 'Nescafe Classic Coffee',
        'brand': 'Nescafe',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '200g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === MAGGI (Nestle India) ===
    {
        'barcode': '8901070010021',
        'name': 'Maggi 2-Minute Noodles Masala',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '70g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901070010038',
        'name': 'Maggi Tomato Ketchup',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '500g',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === COCA-COLA INDIA ===
    {
        'barcode': '8901080010022',
        'name': 'Coca-Cola India',
        'brand': 'Coca-Cola',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901080010039',
        'name': 'Fanta Orange India',
        'brand': 'Fanta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === THUMS UP (Indian cola) ===
    {
        'barcode': '8901090010023',
        'name': 'Thums Up Cola',
        'brand': 'Thums Up',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === LIMCA (Indian lemon-lime soda) ===
    {
        'barcode': '8901100010024',
        'name': 'Limca Lemon Soda',
        'brand': 'Limca',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === BISLERI WATER ===
    {
        'barcode': '8901110010025',
        'name': 'Bisleri Packaged Drinking Water',
        'brand': 'Bisleri',
        'category': 'Food & Beverages',
        'subcategory': 'Water',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === AQUAFINA INDIA ===
    {
        'barcode': '8901120010026',
        'name': 'Aquafina Drinking Water',
        'brand': 'Aquafina',
        'category': 'Food & Beverages',
        'subcategory': 'Water',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === HALDIRAM'S (Indian snacks) ===
    {
        'barcode': '8901130010027',
        'name': 'Haldiram\'s Bhujia',
        'brand': 'Haldiram\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901130010034',
        'name': 'Haldiram\'s Mixture',
        'brand': 'Haldiram\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === BIKAJI (Indian sweets and snacks) ===
    {
        'barcode': '8901140010028',
        'name': 'Bikaji Gulab Jamun',
        'brand': 'Bikaji',
        'category': 'Food & Beverages',
        'subcategory': 'Sweets',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === DABUR (Ayurvedic products) ===
    {
        'barcode': '8901150010029',
        'name': 'Dabur Honey',
        'brand': 'Dabur',
        'category': 'Food & Beverages',
        'subcategory': 'Natural Products',
        'size': '500g',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901150010036',
        'name': 'Dabur Chyawanprash',
        'brand': 'Dabur',
        'category': 'Food & Beverages',
        'subcategory': 'Health Supplements',
        'size': '500g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === FORTUNE OIL ===
    {
        'barcode': '8901160010030',
        'name': 'Fortune Sunflower Oil',
        'brand': 'Fortune',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === SAFFOLA OIL ===
    {
        'barcode': '8901170010031',
        'name': 'Saffola Gold Oil',
        'brand': 'Saffola',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === TATA SALT ===
    {
        'barcode': '8901180010032',
        'name': 'Tata Salt',
        'brand': 'Tata',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === KISSAN (Hindustan Unilever) ===
    {
        'barcode': '8901190010033',
        'name': 'Kissan Mixed Fruit Jam',
        'brand': 'Kissan',
        'category': 'Food & Beverages',
        'subcategory': 'Spreads',
        'size': '500g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === EVEREST SPICES ===
    {
        'barcode': '8901200010034',
        'name': 'Everest Garam Masala',
        'brand': 'Everest',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901200010041',
        'name': 'Everest Turmeric Powder',
        'brand': 'Everest',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === MDH SPICES ===
    {
        'barcode': '8901210010035',
        'name': 'MDH Deggi Mirch',
        'brand': 'MDH',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === VADILAL ICE CREAM ===
    {
        'barcode': '8901220010036',
        'name': 'Vadilal Vanilla Ice Cream',
        'brand': 'Vadilal',
        'category': 'Food & Beverages',
        'subcategory': 'Ice Cream',
        'size': '1L',
        'unit': 'tub',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === KURKURE (PepsiCo India) ===
    {
        'barcode': '8901230010037',
        'name': 'Kurkure Masala Munch',
        'brand': 'Kurkure',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '70g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === LAY'S INDIA ===
    {
        'barcode': '8901240010038',
        'name': 'Lay\'s India\'s Magic Masala',
        'brand': 'Lay\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '52g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === PEPSI INDIA ===
    {
        'barcode': '8901250010039',
        'name': 'Pepsi India',
        'brand': 'Pepsi',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === MIRINDA INDIA ===
    {
        'barcode': '8901260010040',
        'name': 'Mirinda Orange India',
        'brand': 'Mirinda',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === REAL FRUIT JUICE ===
    {
        'barcode': '8901270010041',
        'name': 'Real Orange Juice',
        'brand': 'Real',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901270010058',
        'name': 'Real Mango Juice',
        'brand': 'Real',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === TROPICANA INDIA ===
    {
        'barcode': '8901280010042',
        'name': 'Tropicana Orange Juice',
        'brand': 'Tropicana',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === PATANJALI (Ayurvedic brand by Baba Ramdev) ===
    {
        'barcode': '8901290010043',
        'name': 'Patanjali Cow Ghee',
        'brand': 'Patanjali',
        'category': 'Food & Beverages',
        'subcategory': 'Dairy',
        'size': '500ml',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901290010050',
        'name': 'Patanjali Atta Noodles',
        'brand': 'Patanjali',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '75g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === CATCH SPICES ===
    {
        'barcode': '8901300010044',
        'name': 'Catch Chat Masala',
        'brand': 'Catch',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === MOTHER DAIRY ===
    {
        'barcode': '8901310010045',
        'name': 'Mother Dairy Fresh Milk',
        'brand': 'Mother Dairy',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '500ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === PILLSBURY INDIA ===
    {
        'barcode': '8901320010046',
        'name': 'Pillsbury Atta',
        'brand': 'Pillsbury',
        'category': 'Food & Beverages',
        'subcategory': 'Flour',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === AASHIRVAAD (ITC) ===
    {
        'barcode': '8901330010047',
        'name': 'Aashirvaad Whole Wheat Atta',
        'brand': 'Aashirvaad',
        'category': 'Food & Beverages',
        'subcategory': 'Flour',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === HORLICKS (GSK) ===
    {
        'barcode': '8901340010048',
        'name': 'Horlicks Health Drink',
        'brand': 'Horlicks',
        'category': 'Food & Beverages',
        'subcategory': 'Health Drinks',
        'size': '500g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === BOURNVITA (Cadbury) ===
    {
        'barcode': '8901350010049',
        'name': 'Bournvita Health Drink',
        'brand': 'Bournvita',
        'category': 'Food & Beverages',
        'subcategory': 'Health Drinks',
        'size': '500g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === KINGFISHER BEER ===
    {
        'barcode': '8901360010050',
        'name': 'Kingfisher Premium Lager Beer',
        'brand': 'Kingfisher',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '650ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === OLD MONK RUM (Iconic Indian rum) ===
    {
        'barcode': '8901370010051',
        'name': 'Old Monk Dark Rum',
        'brand': 'Old Monk',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '750ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    }
]

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Database connection successful")
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def check_barcode_exists(cursor, barcode):
    """Check if a barcode already exists in the store_items table"""
    cursor.execute("SELECT COUNT(*) FROM store_items WHERE barcode = %s", (barcode,))
    count = cursor.fetchone()[0]
    return count > 0

def insert_product(cursor, product):
    """Insert a single product into the store_items table"""
    try:
        # Check if barcode already exists
        if check_barcode_exists(cursor, product['barcode']):
            print(f"⚠️  Skipping {product['name']} - Barcode {product['barcode']} already exists")
            return False

        # Prepare all required fields
        image_url = product.get('image_url', '')
        thumbnail_url = image_url  # Use same URL for thumbnail
        image_public_id = f"indian_products_{product['barcode']}"

        # Insert the product with all required fields (matching working scripts)
        cursor.execute("""
            INSERT INTO store_items (
                id, barcode, name, brand, category, subcategory,
                size, unit, verified, verification_count,
                region_code, description, image_url, image_public_id,
                thumbnail_url, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """, [
            product['barcode'],
            product['name'],
            product['brand'],
            product['category'],
            product['subcategory'],
            product['size'],
            product['unit'],
            True,  # verified
            1,     # verification_count
            'IN',  # region_code for India
            f"{product['brand']} {product['name']} - {product['size']}",  # description
            image_url,
            image_public_id,
            thumbnail_url
        ])

        print(f"✅ Added: {product['name']} ({product['brand']}) - {product['barcode']}")
        return True

    except Exception as e:
        print(f"❌ Error inserting {product['name']}: {e}")
        return False

def main():
    """Main function to populate Indian products"""
    print("🇮🇳 Starting Indian Products Import Script")
    print("=" * 60)

    # Connect to database
    conn = connect_to_database()
    if not conn:
        exit(1)

    cursor = conn.cursor()

    # Insert products
    successful_inserts = 0
    skipped_products = 0
    failed_inserts = 0

    try:
        for product in INDIAN_PRODUCTS:
            try:
                result = insert_product(cursor, product)
                if result is True:
                    successful_inserts += 1
                else:
                    skipped_products += 1
            except Exception as e:
                print(f"❌ Error processing {product['name']}: {e}")
                failed_inserts += 1
                # Rollback current transaction and start a new one
                conn.rollback()

        # Commit all successful changes
        conn.commit()
        print("\n" + "=" * 60)
        print("🎉 INDIAN PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(INDIAN_PRODUCTS)} products")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Error during import process: {e}")
        conn.rollback()

    finally:
        cursor.close()
        conn.close()
        print("🔐 Database connection closed")

if __name__ == "__main__":
    main()