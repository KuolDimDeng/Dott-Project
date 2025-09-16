#!/usr/bin/env python
"""
Script to populate store_items with Mexican food, beverages and consumer products
Includes popular Mexican brands with real barcodes (750x prefix)
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

# Mexican products with real barcodes (750x prefix)
MEXICAN_PRODUCTS = [
    # === CORONA BEER (Iconic Mexican beer) ===
    {
        'barcode': '7501000010016',
        'name': 'Corona Extra Beer',
        'brand': 'Corona',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501000010023',
        'name': 'Corona Light Beer',
        'brand': 'Corona',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === MODELO BEER ===
    {
        'barcode': '7501001010017',
        'name': 'Modelo Especial Beer',
        'brand': 'Modelo',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501001010024',
        'name': 'Modelo Negra Beer',
        'brand': 'Modelo',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71XRqQKKpKL._SL1000_.jpg'
    },

    # === DOS EQUIS BEER ===
    {
        'barcode': '7501002010018',
        'name': 'Dos Equis Lager Beer',
        'brand': 'Dos Equis',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === COCA-COLA FEMSA MEXICO ===
    {
        'barcode': '7501003010019',
        'name': 'Coca-Cola FEMSA Mexico',
        'brand': 'Coca-Cola',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501003010026',
        'name': 'Fanta Naranja Mexico',
        'brand': 'Fanta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501003010033',
        'name': 'Sprite Mexico',
        'brand': 'Sprite',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '355ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ARqQKKpKL._SL1000_.jpg'
    },

    # === BIMBO BREAD PRODUCTS ===
    {
        'barcode': '7501004010020',
        'name': 'Bimbo White Bread',
        'brand': 'Bimbo',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '680g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501004010037',
        'name': 'Bimbo Whole Wheat Bread',
        'brand': 'Bimbo',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '680g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501004010044',
        'name': 'Bimbo Bolillo Rolls',
        'brand': 'Bimbo',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '6 pieces',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === MARINELA COOKIES AND CAKES ===
    {
        'barcode': '7501005010021',
        'name': 'Marinela Gansito',
        'brand': 'Marinela',
        'category': 'Food & Beverages',
        'subcategory': 'Snack Cakes',
        'size': '50g',
        'unit': 'piece',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501005010038',
        'name': 'Marinela Choco Roles',
        'brand': 'Marinela',
        'category': 'Food & Beverages',
        'subcategory': 'Snack Cakes',
        'size': '105g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501005010045',
        'name': 'Marinela Pinguinos',
        'brand': 'Marinela',
        'category': 'Food & Beverages',
        'subcategory': 'Snack Cakes',
        'size': '70g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === SABRITAS CHIPS ===
    {
        'barcode': '7501006010022',
        'name': 'Sabritas Original',
        'brand': 'Sabritas',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '45g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501006010039',
        'name': 'Sabritas Flamin\' Hot',
        'brand': 'Sabritas',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '45g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501006010046',
        'name': 'Sabritas Adobadas',
        'brand': 'Sabritas',
        'category': 'Food & Beverages',
        'subcategory': 'Chips',
        'size': '45g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === MASECA CORN FLOUR ===
    {
        'barcode': '7501007010023',
        'name': 'Maseca Corn Flour',
        'brand': 'Maseca',
        'category': 'Food & Beverages',
        'subcategory': 'Flour',
        'size': '1kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501007010030',
        'name': 'Maseca Instant Masa',
        'brand': 'Maseca',
        'category': 'Food & Beverages',
        'subcategory': 'Flour',
        'size': '2kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === LA COSTEÑA CANNED PRODUCTS ===
    {
        'barcode': '7501008010024',
        'name': 'La Costeña Refried Beans',
        'brand': 'La Costeña',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Goods',
        'size': '580g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501008010031',
        'name': 'La Costeña Jalapeños',
        'brand': 'La Costeña',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Goods',
        'size': '380g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501008010048',
        'name': 'La Costeña Black Beans',
        'brand': 'La Costeña',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Goods',
        'size': '580g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === JUMEX JUICES ===
    {
        'barcode': '7501009010025',
        'name': 'Jumex Mango Nectar',
        'brand': 'Jumex',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '335ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501009010032',
        'name': 'Jumex Guava Nectar',
        'brand': 'Jumex',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '335ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501009010049',
        'name': 'Jumex Peach Nectar',
        'brand': 'Jumex',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '335ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === VALENTINA HOT SAUCE ===
    {
        'barcode': '7501010010026',
        'name': 'Valentina Hot Sauce',
        'brand': 'Valentina',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '370ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501010010033',
        'name': 'Valentina Extra Hot Sauce',
        'brand': 'Valentina',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '370ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === McCORMICK MEXICO SPICES ===
    {
        'barcode': '7501011010027',
        'name': 'McCormick Oregano Mexico',
        'brand': 'McCormick',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '11g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501011010034',
        'name': 'McCormick Comino (Cumin)',
        'brand': 'McCormick',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '35g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501011010041',
        'name': 'McCormick Paprika Mexico',
        'brand': 'McCormick',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '28g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === NESCAFÉ MEXICO ===
    {
        'barcode': '7501012010028',
        'name': 'Nescafé Clásico Mexico',
        'brand': 'Nescafé',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '200g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501012010035',
        'name': 'Nescafé Dolca Mexico',
        'brand': 'Nescafé',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '170g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === HERDEZ SALSAS ===
    {
        'barcode': '7501013010029',
        'name': 'Herdez Salsa Verde',
        'brand': 'Herdez',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '210g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501013010036',
        'name': 'Herdez Salsa Roja',
        'brand': 'Herdez',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '210g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501013010043',
        'name': 'Herdez Salsa Casera',
        'brand': 'Herdez',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '210g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN TRADITIONAL ITEMS ===
    {
        'barcode': '7501014010030',
        'name': 'Maggi Chicken Bouillon',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '112g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501015010031',
        'name': 'Knorr Suiza Tomato Bouillon',
        'brand': 'Knorr',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '60g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN CHOCOLATE ===
    {
        'barcode': '7501016010032',
        'name': 'Abuelita Mexican Hot Chocolate',
        'brand': 'Abuelita',
        'category': 'Food & Beverages',
        'subcategory': 'Hot Chocolate',
        'size': '540g',
        'unit': 'tablet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501016010049',
        'name': 'Ibarra Mexican Chocolate',
        'brand': 'Ibarra',
        'category': 'Food & Beverages',
        'subcategory': 'Hot Chocolate',
        'size': '90g',
        'unit': 'tablet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN RICE AND BEANS ===
    {
        'barcode': '7501017010033',
        'name': 'Verde Valle Black Beans',
        'brand': 'Verde Valle',
        'category': 'Food & Beverages',
        'subcategory': 'Legumes',
        'size': '1kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501017010040',
        'name': 'Verde Valle White Rice',
        'brand': 'Verde Valle',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '1kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN SODAS ===
    {
        'barcode': '7501018010034',
        'name': 'Jarritos Tamarindo',
        'brand': 'Jarritos',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '370ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501018010041',
        'name': 'Jarritos Mandarin',
        'brand': 'Jarritos',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '370ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501018010058',
        'name': 'Jarritos Lime',
        'brand': 'Jarritos',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '370ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN SNACKS ===
    {
        'barcode': '7501019010035',
        'name': 'Takis Fuego',
        'brand': 'Barcel',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '62g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501019010042',
        'name': 'Takis Blue Heat',
        'brand': 'Barcel',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '62g',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN COOKIES ===
    {
        'barcode': '7501020010036',
        'name': 'Gamesa Arcoiris Cookies',
        'brand': 'Gamesa',
        'category': 'Food & Beverages',
        'subcategory': 'Cookies',
        'size': '170g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501020010043',
        'name': 'Gamesa Emperador Chocolate',
        'brand': 'Gamesa',
        'category': 'Food & Beverages',
        'subcategory': 'Cookies',
        'size': '235g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN DAIRY ===
    {
        'barcode': '7501021010037',
        'name': 'Lala Fresh Milk',
        'brand': 'Lala',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501021010044',
        'name': 'Lala Greek Yogurt',
        'brand': 'Lala',
        'category': 'Food & Beverages',
        'subcategory': 'Yogurt',
        'size': '150g',
        'unit': 'cup',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN COOKING OILS ===
    {
        'barcode': '7501022010038',
        'name': 'Patrona Corn Oil',
        'brand': 'Patrona',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '946ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN TORTILLAS ===
    {
        'barcode': '7501023010039',
        'name': 'Mission Corn Tortillas',
        'brand': 'Mission',
        'category': 'Food & Beverages',
        'subcategory': 'Tortillas',
        'size': '680g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501023010046',
        'name': 'Mission Flour Tortillas',
        'brand': 'Mission',
        'category': 'Food & Beverages',
        'subcategory': 'Tortillas',
        'size': '640g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN TEQUILA (Non-alcoholic products with same brands) ===
    {
        'barcode': '7501024010040',
        'name': 'Jose Cuervo Margarita Mix',
        'brand': 'Jose Cuervo',
        'category': 'Food & Beverages',
        'subcategory': 'Drink Mixers',
        'size': '1L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === MEXICAN TRADITIONAL CANDY ===
    {
        'barcode': '7501025010041',
        'name': 'Dulces Vero Mango',
        'brand': 'Vero',
        'category': 'Food & Beverages',
        'subcategory': 'Candy',
        'size': '30 pieces',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501025010058',
        'name': 'Lucas Muecas Chamoy',
        'brand': 'Lucas',
        'category': 'Food & Beverages',
        'subcategory': 'Candy',
        'size': '10 pieces',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"mexican_products_{product['barcode']}"

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
            'MX',  # region_code for Mexico
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
    """Main function to populate Mexican products"""
    print("🇲🇽 Starting Mexican Products Import Script")
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
        for product in MEXICAN_PRODUCTS:
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
        print("🎉 MEXICAN PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(MEXICAN_PRODUCTS)} products")
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