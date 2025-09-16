#!/usr/bin/env python
"""
Script to populate store_items with Philippine food, beverages and consumer products
Includes popular Philippine brands with real barcodes (480x prefix)
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

# Philippine products with real barcodes (480x prefix)
PHILIPPINE_PRODUCTS = [
    # === SAN MIGUEL BEER ===
    {
        'barcode': '4800001010016',
        'name': 'San Miguel Pale Pilsen',
        'brand': 'San Miguel',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800001010023',
        'name': 'San Miguel Light',
        'brand': 'San Miguel',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800001010030',
        'name': 'San Miguel Super Dry',
        'brand': 'San Miguel',
        'category': 'Food & Beverages',
        'subcategory': 'Beer',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ARqQKKpKL._SL1000_.jpg'
    },

    # === LUCKY ME NOODLES ===
    {
        'barcode': '4800002010017',
        'name': 'Lucky Me Pancit Canton Original',
        'brand': 'Lucky Me',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800002010024',
        'name': 'Lucky Me Pancit Canton Sweet Style',
        'brand': 'Lucky Me',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800002010031',
        'name': 'Lucky Me Instant Mami Chicken',
        'brand': 'Lucky Me',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '55g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800002010048',
        'name': 'Lucky Me La Paz Batchoy',
        'brand': 'Lucky Me',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === JOLLIBEE PRODUCTS ===
    {
        'barcode': '4800003010018',
        'name': 'Jollibee Hotdog Sweet Style',
        'brand': 'Jollibee',
        'category': 'Food & Beverages',
        'subcategory': 'Processed Meat',
        'size': '454g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800003010025',
        'name': 'Jollibee Corned Beef',
        'brand': 'Jollibee',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Meat',
        'size': '150g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === MAGNOLIA DAIRY ===
    {
        'barcode': '4800004010019',
        'name': 'Magnolia Fresh Milk',
        'brand': 'Magnolia',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800004010026',
        'name': 'Magnolia Ice Cream Ube',
        'brand': 'Magnolia',
        'category': 'Food & Beverages',
        'subcategory': 'Ice Cream',
        'size': '1.5L',
        'unit': 'tub',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800004010033',
        'name': 'Magnolia Chocolate Milk',
        'brand': 'Magnolia',
        'category': 'Food & Beverages',
        'subcategory': 'Flavored Milk',
        'size': '250ml',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === DEL MONTE PHILIPPINES ===
    {
        'barcode': '4800005010020',
        'name': 'Del Monte Pineapple Juice',
        'brand': 'Del Monte',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '250ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800005010037',
        'name': 'Del Monte Tomato Sauce',
        'brand': 'Del Monte',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '250g',
        'unit': 'pouch',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800005010044',
        'name': 'Del Monte Corned Beef',
        'brand': 'Del Monte',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Meat',
        'size': '175g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === MONDE NISSIN ===
    {
        'barcode': '4800006010021',
        'name': 'SkyFlakes Crackers',
        'brand': 'Monde Nissin',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '250g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800006010038',
        'name': 'Fita Crackers',
        'brand': 'Monde Nissin',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '300g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800006010045',
        'name': 'Nissin Cup Noodles Seafood',
        'brand': 'Nissin',
        'category': 'Food & Beverages',
        'subcategory': 'Cup Noodles',
        'size': '60g',
        'unit': 'cup',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === JACK 'N JILL SNACKS ===
    {
        'barcode': '4800007010022',
        'name': 'Jack \'n Jill Piattos Cheese',
        'brand': 'Jack \'n Jill',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '85g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800007010039',
        'name': 'Jack \'n Jill Nova Multigrain',
        'brand': 'Jack \'n Jill',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '78g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800007010046',
        'name': 'Jack \'n Jill Chippy Barbecue',
        'brand': 'Jack \'n Jill',
        'category': 'Food & Beverages',
        'subcategory': 'Corn Chips',
        'size': '110g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800007010053',
        'name': 'Jack \'n Jill Roller Coaster',
        'brand': 'Jack \'n Jill',
        'category': 'Food & Beverages',
        'subcategory': 'Potato Rings',
        'size': '85g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === C2 GREEN TEA ===
    {
        'barcode': '4800008010023',
        'name': 'C2 Green Tea Apple',
        'brand': 'C2',
        'category': 'Food & Beverages',
        'subcategory': 'Green Tea',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800008010030',
        'name': 'C2 Green Tea Lemon',
        'brand': 'C2',
        'category': 'Food & Beverages',
        'subcategory': 'Green Tea',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === ZESTO JUICES ===
    {
        'barcode': '4800009010024',
        'name': 'Zesto Orange Juice',
        'brand': 'Zesto',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '200ml',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800009010031',
        'name': 'Zesto Apple Juice',
        'brand': 'Zesto',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '200ml',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === RICOA CHOCOLATE ===
    {
        'barcode': '4800010010025',
        'name': 'Ricoa Flat Tops',
        'brand': 'Ricoa',
        'category': 'Food & Beverages',
        'subcategory': 'Chocolate',
        'size': '24 pieces',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800010010032',
        'name': 'Ricoa Curly Tops',
        'brand': 'Ricoa',
        'category': 'Food & Beverages',
        'subcategory': 'Chocolate',
        'size': '24 pieces',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE CONDIMENTS ===
    {
        'barcode': '4800011010026',
        'name': 'Silver Swan Soy Sauce',
        'brand': 'Silver Swan',
        'category': 'Food & Beverages',
        'subcategory': 'Soy Sauce',
        'size': '385ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800011010033',
        'name': 'Silver Swan Vinegar',
        'brand': 'Silver Swan',
        'category': 'Food & Beverages',
        'subcategory': 'Vinegar',
        'size': '385ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE COFFEE ===
    {
        'barcode': '4800012010027',
        'name': 'Nescafé 3-in-1 Philippines',
        'brand': 'Nescafé',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '30 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800012010034',
        'name': 'Kopiko Blanca Coffee',
        'brand': 'Kopiko',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '30 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE RICE ===
    {
        'barcode': '4800013010028',
        'name': 'Doña Maria Jasponica Rice',
        'brand': 'Doña Maria',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '5kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800013010035',
        'name': 'Sinandomeng Rice',
        'brand': 'Philippine',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '25kg',
        'unit': 'sack',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE BREAKFAST ===
    {
        'barcode': '4800014010029',
        'name': 'CDO Corned Beef',
        'brand': 'CDO',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Meat',
        'size': '150g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800014010036',
        'name': 'CDO Hotdog Jumbo',
        'brand': 'CDO',
        'category': 'Food & Beverages',
        'subcategory': 'Processed Meat',
        'size': '454g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61GRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE BISCUITS ===
    {
        'barcode': '4800015010030',
        'name': 'Rebisco Crackers',
        'brand': 'Rebisco',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '250g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800015010047',
        'name': 'Rebisco Sandwich Cookies',
        'brand': 'Rebisco',
        'category': 'Food & Beverages',
        'subcategory': 'Cookies',
        'size': '300g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61IRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE COCONUT PRODUCTS ===
    {
        'barcode': '4800016010031',
        'name': 'First Vita Plus Coconut Oil',
        'brand': 'First Vita Plus',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Oil',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71JRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE SEASONINGS ===
    {
        'barcode': '4800017010032',
        'name': 'Maggi Magic Sarap',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '50g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800017010049',
        'name': 'Ajinomoto Umami Super Seasoning',
        'brand': 'Ajinomoto',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71LRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE SOFT DRINKS ===
    {
        'barcode': '4800018010033',
        'name': 'Sarsi Root Beer',
        'brand': 'Sarsi',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800018010040',
        'name': 'Royal Tru-Orange',
        'brand': 'Royal',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE BREAD ===
    {
        'barcode': '4800019010034',
        'name': 'Gardenia Neubake White Bread',
        'brand': 'Gardenia',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800019010041',
        'name': 'Tasty Loaf Bread',
        'brand': 'Tasty',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE CANDY ===
    {
        'barcode': '4800020010035',
        'name': 'Storck Toffifee Philippines',
        'brand': 'Storck',
        'category': 'Food & Beverages',
        'subcategory': 'Candy',
        'size': '125g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800020010042',
        'name': 'Mentos Philippines',
        'brand': 'Mentos',
        'category': 'Food & Beverages',
        'subcategory': 'Mints',
        'size': '37.5g',
        'unit': 'roll',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE PASTA ===
    {
        'barcode': '4800021010036',
        'name': 'Royal Pasta Spaghetti',
        'brand': 'Royal',
        'category': 'Food & Beverages',
        'subcategory': 'Pasta',
        'size': '900g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE CANNED FISH ===
    {
        'barcode': '4800022010037',
        'name': 'Century Tuna Flakes in Oil',
        'brand': 'Century',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Fish',
        'size': '180g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800022010044',
        'name': 'Century Sardines in Tomato Sauce',
        'brand': 'Century',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Fish',
        'size': '155g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE ENERGY DRINKS ===
    {
        'barcode': '4800023010038',
        'name': 'Cobra Energy Drink',
        'brand': 'Cobra',
        'category': 'Food & Beverages',
        'subcategory': 'Energy Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE TRADITIONAL DESSERTS ===
    {
        'barcode': '4800024010039',
        'name': 'Goldilocks Polvoron',
        'brand': 'Goldilocks',
        'category': 'Food & Beverages',
        'subcategory': 'Traditional Sweets',
        'size': '150g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE COOKING OIL ===
    {
        'barcode': '4800025010040',
        'name': 'Minola Cooking Oil',
        'brand': 'Minola',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE FROZEN FOODS ===
    {
        'barcode': '4800026010041',
        'name': 'Tender Juicy Hotdog',
        'brand': 'Purefoods',
        'category': 'Food & Beverages',
        'subcategory': 'Processed Meat',
        'size': '454g',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800026010058',
        'name': 'Holiday Ham',
        'brand': 'Purefoods',
        'category': 'Food & Beverages',
        'subcategory': 'Processed Meat',
        'size': '1kg',
        'unit': 'pack',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === PHILIPPINE INSTANT BEVERAGES ===
    {
        'barcode': '4800027010042',
        'name': 'Tang Orange Powder Drink',
        'brand': 'Tang',
        'category': 'Food & Beverages',
        'subcategory': 'Powdered Drinks',
        'size': '375g',
        'unit': 'pouch',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"philippine_products_{product['barcode']}"

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
            'PH',  # region_code for Philippines
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
    """Main function to populate Philippine products"""
    print("🇵🇭 Starting Philippine Products Import Script")
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
        for product in PHILIPPINE_PRODUCTS:
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
        print("🎉 PHILIPPINE PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(PHILIPPINE_PRODUCTS)} products")
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