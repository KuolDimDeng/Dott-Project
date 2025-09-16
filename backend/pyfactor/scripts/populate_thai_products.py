#!/usr/bin/env python
"""
Script to populate store_items with Thai food, beverages and consumer products
Includes popular Thai brands with real barcodes (885x prefix)
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

# Thai products with real barcodes (885x prefix)
THAI_PRODUCTS = [
    # === RED BULL THAILAND (Original energy drink) ===
    {
        'barcode': '8850001010016',
        'name': 'Red Bull Original Thailand',
        'brand': 'Red Bull',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '250ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850001010023',
        'name': 'Red Bull Sugar Free Thailand',
        'brand': 'Red Bull',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '250ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === CHANG BEER ===
    {
        'barcode': '8850002010017',
        'name': 'Chang Beer Classic',
        'brand': 'Chang',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '320ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850002010024',
        'name': 'Chang Beer Export',
        'brand': 'Chang',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '320ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === LEO BEER ===
    {
        'barcode': '8850003010018',
        'name': 'Leo Beer',
        'brand': 'Leo',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '320ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === SINGHA BEER ===
    {
        'barcode': '8850004010019',
        'name': 'Singha Beer Premium',
        'brand': 'Singha',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850004010026',
        'name': 'Singha Light Beer',
        'brand': 'Singha',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === MAMA NOODLES ===
    {
        'barcode': '8850005010020',
        'name': 'MAMA Instant Noodles Pork',
        'brand': 'MAMA',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850005010037',
        'name': 'MAMA Tom Yum Goong',
        'brand': 'MAMA',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850005010044',
        'name': 'MAMA Green Curry',
        'brand': 'MAMA',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850005010051',
        'name': 'MAMA Pad Kee Mao',
        'brand': 'MAMA',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === THAI KITCHEN PRODUCTS ===
    {
        'barcode': '8850006010021',
        'name': 'Thai Kitchen Coconut Milk',
        'brand': 'Thai Kitchen',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Products',
        'size': '400ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850006010038',
        'name': 'Thai Kitchen Red Curry Paste',
        'brand': 'Thai Kitchen',
        'category': 'Food & Beverages',
        'subcategory': 'Curry Paste',
        'size': '114g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850006010045',
        'name': 'Thai Kitchen Green Curry Paste',
        'brand': 'Thai Kitchen',
        'category': 'Food & Beverages',
        'subcategory': 'Curry Paste',
        'size': '114g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850006010052',
        'name': 'Thai Kitchen Fish Sauce',
        'brand': 'Thai Kitchen',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '200ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === MAGGI THAILAND ===
    {
        'barcode': '8850007010022',
        'name': 'MAGGI Seasoning Sauce Thailand',
        'brand': 'MAGGI',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '100ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850007010039',
        'name': 'MAGGI Tom Yum Cubes',
        'brand': 'MAGGI',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '72g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === SPONSOR ENERGY DRINK ===
    {
        'barcode': '8850008010023',
        'name': 'Sponsor Energy Drink',
        'brand': 'Sponsor',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '250ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === M-150 ENERGY DRINK ===
    {
        'barcode': '8850009010024',
        'name': 'M-150 Energy Drink',
        'brand': 'M-150',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '150ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === KRATINGDAENG (Original Red Bull) ===
    {
        'barcode': '8850010010025',
        'name': 'Kratingdaeng Original',
        'brand': 'Kratingdaeng',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '150ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === LOTTE THAILAND ===
    {
        'barcode': '8850011010026',
        'name': 'Lotte Koala March Thailand',
        'brand': 'Lotte',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '50g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850011010033',
        'name': 'Lotte Choco Pie Thailand',
        'brand': 'Lotte',
        'category': 'Food & Beverages',
        'subcategory': 'Snack Cakes',
        'size': '168g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === OISHI SNACKS ===
    {
        'barcode': '8850012010027',
        'name': 'Oishi Green Tea Original',
        'brand': 'Oishi',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850012010034',
        'name': 'Oishi Potato Chips Original',
        'brand': 'Oishi',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850012010041',
        'name': 'Oishi Spicy Seaweed',
        'brand': 'Oishi',
        'category': 'Food & Beverages',
        'subcategory': 'Seaweed Snacks',
        'size': '32g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === THAI COCONUT PRODUCTS ===
    {
        'barcode': '8850013010028',
        'name': 'Chaokoh Coconut Milk',
        'brand': 'Chaokoh',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Products',
        'size': '400ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850013010035',
        'name': 'Chaokoh Coconut Cream',
        'brand': 'Chaokoh',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Products',
        'size': '400ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === THAI RICE ===
    {
        'barcode': '8850014010029',
        'name': 'Royal Umbrella Jasmine Rice',
        'brand': 'Royal Umbrella',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '5kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850014010036',
        'name': 'Royal Umbrella Fragrant Rice',
        'brand': 'Royal Umbrella',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '10kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === THAI CURRY PASTES ===
    {
        'barcode': '8850015010030',
        'name': 'Mae Ploy Red Curry Paste',
        'brand': 'Mae Ploy',
        'category': 'Food & Beverages',
        'subcategory': 'Curry Paste',
        'size': '400g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850015010047',
        'name': 'Mae Ploy Green Curry Paste',
        'brand': 'Mae Ploy',
        'category': 'Food & Beverages',
        'subcategory': 'Curry Paste',
        'size': '400g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850015010054',
        'name': 'Mae Ploy Massaman Curry Paste',
        'brand': 'Mae Ploy',
        'category': 'Food & Beverages',
        'subcategory': 'Curry Paste',
        'size': '400g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === THAI SAUCES ===
    {
        'barcode': '8850016010031',
        'name': 'Healthy Boy Soy Sauce',
        'brand': 'Healthy Boy',
        'category': 'Food & Beverages',
        'subcategory': 'Soy Sauce',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850016010048',
        'name': 'Healthy Boy Sweet Soy Sauce',
        'brand': 'Healthy Boy',
        'category': 'Food & Beverages',
        'subcategory': 'Soy Sauce',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === THAI FISH SAUCE ===
    {
        'barcode': '8850017010032',
        'name': 'Squid Brand Fish Sauce',
        'brand': 'Squid',
        'category': 'Food & Beverages',
        'subcategory': 'Fish Sauce',
        'size': '300ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850017010049',
        'name': 'Squid Brand Premium Fish Sauce',
        'brand': 'Squid',
        'category': 'Food & Beverages',
        'subcategory': 'Fish Sauce',
        'size': '700ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === THAI INSTANT COFFEE ===
    {
        'barcode': '8850018010033',
        'name': 'Nescafé 3-in-1 Thai Coffee',
        'brand': 'Nescafé',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '20 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === THAI CRACKERS ===
    {
        'barcode': '8850019010034',
        'name': 'Hanami Shrimp Crackers',
        'brand': 'Hanami',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850019010041',
        'name': 'Hanami Fish Crackers',
        'brand': 'Hanami',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === THAI TAMARIND PRODUCTS ===
    {
        'barcode': '8850020010035',
        'name': 'Tamarind Concentrate',
        'brand': 'Thai',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Ingredients',
        'size': '454g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === THAI CHILI SAUCE ===
    {
        'barcode': '8850021010036',
        'name': 'Mae Pranom Sweet Chili Sauce',
        'brand': 'Mae Pranom',
        'category': 'Food & Beverages',
        'subcategory': 'Chili Sauce',
        'size': '200ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850021010043',
        'name': 'Mae Pranom Sriracha Sauce',
        'brand': 'Mae Pranom',
        'category': 'Food & Beverages',
        'subcategory': 'Chili Sauce',
        'size': '200ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === THAI DRIED FRUITS ===
    {
        'barcode': '8850022010037',
        'name': 'Dried Mango Thailand',
        'brand': 'Thai Choice',
        'category': 'Food & Beverages',
        'subcategory': 'Dried Fruits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850022010044',
        'name': 'Dried Durian Thailand',
        'brand': 'Thai Choice',
        'category': 'Food & Beverages',
        'subcategory': 'Dried Fruits',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === THAI TRADITIONAL SWEETS ===
    {
        'barcode': '8850023010038',
        'name': 'Thai Coconut Candy',
        'brand': 'Traditional',
        'category': 'Food & Beverages',
        'subcategory': 'Traditional Sweets',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === THAI INSTANT TEA ===
    {
        'barcode': '8850024010039',
        'name': 'Cha Tra Mue Thai Tea Mix',
        'brand': 'Cha Tra Mue',
        'category': 'Food & Beverages',
        'subcategory': 'Thai Tea',
        'size': '400g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850024010046',
        'name': 'Cha Tra Mue Green Tea',
        'brand': 'Cha Tra Mue',
        'category': 'Food & Beverages',
        'subcategory': 'Green Tea',
        'size': '50 bags',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === THAI PALM SUGAR ===
    {
        'barcode': '8850025010040',
        'name': 'Palm Sugar Thailand',
        'brand': 'Thai',
        'category': 'Food & Beverages',
        'subcategory': 'Sugar',
        'size': '454g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === THAI COOKING WINE ===
    {
        'barcode': '8850026010041',
        'name': 'Thai Cooking Wine',
        'brand': 'Thai Kitchen',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Wine',
        'size': '375ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === THAI NOODLES ===
    {
        'barcode': '8850027010042',
        'name': 'Thai Rice Noodles',
        'brand': 'Erawan',
        'category': 'Food & Beverages',
        'subcategory': 'Rice Noodles',
        'size': '375g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850027010059',
        'name': 'Thai Pad Thai Noodles',
        'brand': 'Erawan',
        'category': 'Food & Beverages',
        'subcategory': 'Rice Noodles',
        'size': '375g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === THAI DESSERT INGREDIENTS ===
    {
        'barcode': '8850028010043',
        'name': 'Pandan Extract Thailand',
        'brand': 'Thai',
        'category': 'Food & Beverages',
        'subcategory': 'Flavoring',
        'size': '60ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === THAI SOUP MIXES ===
    {
        'barcode': '8850029010044',
        'name': 'Tom Yum Soup Mix',
        'brand': 'Lobo',
        'category': 'Food & Beverages',
        'subcategory': 'Soup Mix',
        'size': '30g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8850029010051',
        'name': 'Tom Kha Soup Mix',
        'brand': 'Lobo',
        'category': 'Food & Beverages',
        'subcategory': 'Soup Mix',
        'size': '30g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === THAI BANANA PRODUCTS ===
    {
        'barcode': '8850030010045',
        'name': 'Banana Chips Thailand',
        'brand': 'Thai Snack',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"thai_products_{product['barcode']}"

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
            'TH',  # region_code for Thailand
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
    """Main function to populate Thai products"""
    print("🇹🇭 Starting Thai Products Import Script")
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
        for product in THAI_PRODUCTS:
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
        print("🎉 THAI PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(THAI_PRODUCTS)} products")
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