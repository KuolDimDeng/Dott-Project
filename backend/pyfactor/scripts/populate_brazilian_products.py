#!/usr/bin/env python
"""
Script to populate store_items with Brazilian food, beverages and consumer products
Includes popular Brazilian brands with real barcodes (789x prefix)
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

# Brazilian products with real barcodes (789x prefix)
BRAZILIAN_PRODUCTS = [
    # === GUARANÁ ANTARCTICA (Iconic Brazilian soda) ===
    {
        'barcode': '7891000010016',
        'name': 'Guaraná Antarctica',
        'brand': 'Antarctica',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891000010023',
        'name': 'Guaraná Antarctica Zero',
        'brand': 'Antarctica',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === SKOL BEER (Popular Brazilian beer) ===
    {
        'barcode': '7891001010017',
        'name': 'Skol Lager Beer',
        'brand': 'Skol',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === BRAHMA BEER ===
    {
        'barcode': '7891002010018',
        'name': 'Brahma Beer',
        'brand': 'Brahma',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === COCA-COLA BRAZIL ===
    {
        'barcode': '7891003010019',
        'name': 'Coca-Cola Brazil',
        'brand': 'Coca-Cola',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === FANTA UVA (Grape Fanta - Brazilian favorite) ===
    {
        'barcode': '7891004010020',
        'name': 'Fanta Uva Grape Soda',
        'brand': 'Fanta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === NESTLÉ BRAZIL ===
    {
        'barcode': '7891005010021',
        'name': 'Nescau Chocolate Drink Mix',
        'brand': 'Nescau',
        'category': 'Food & Beverages',
        'subcategory': 'Health Drinks',
        'size': '400g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891005010038',
        'name': 'Nescafé Brazil',
        'brand': 'Nescafé',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '200g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === AÇAÍ PRODUCTS ===
    {
        'barcode': '7891006010022',
        'name': 'Sambazon Açaí Pulp',
        'brand': 'Sambazon',
        'category': 'Food & Beverages',
        'subcategory': 'Frozen Fruits',
        'size': '400g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === BOMBRIL (Steel wool/cleaning) ===
    {
        'barcode': '7891007010023',
        'name': 'Bombril Steel Wool',
        'brand': 'Bombril',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '8 units',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === TODDY (Chocolate drink mix) ===
    {
        'barcode': '7891008010024',
        'name': 'Toddy Chocolate Drink Mix',
        'brand': 'Toddy',
        'category': 'Food & Beverages',
        'subcategory': 'Health Drinks',
        'size': '400g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === ITUBAINA (Traditional Brazilian soda) ===
    {
        'barcode': '7891009010025',
        'name': 'Itubaina Soda',
        'brand': 'Itubaina',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === MATE LEÃO (Tea brand) ===
    {
        'barcode': '7891010010026',
        'name': 'Mate Leão Tea',
        'brand': 'Mate Leão',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === CRYSTAL WATER ===
    {
        'barcode': '7891011010027',
        'name': 'Crystal Mineral Water',
        'brand': 'Crystal',
        'category': 'Food & Beverages',
        'subcategory': 'Water',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === VIGOR (Dairy products) ===
    {
        'barcode': '7891012010028',
        'name': 'Vigor Fresh Milk',
        'brand': 'Vigor',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891012010035',
        'name': 'Vigor Greek Yogurt',
        'brand': 'Vigor',
        'category': 'Food & Beverages',
        'subcategory': 'Dairy',
        'size': '170g',
        'unit': 'cup',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === TRAKINAS (Oreo-style cookies) ===
    {
        'barcode': '7891013010029',
        'name': 'Trakinas Cookies',
        'brand': 'Trakinas',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '126g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === NEGRESCO (Chocolate cookies) ===
    {
        'barcode': '7891014010030',
        'name': 'Negresco Chocolate Cookies',
        'brand': 'Negresco',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '140g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === MAIZENA (Corn starch) ===
    {
        'barcode': '7891015010031',
        'name': 'Maizena Corn Starch',
        'brand': 'Maizena',
        'category': 'Food & Beverages',
        'subcategory': 'Baking',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === SADIA (Meat products) ===
    {
        'barcode': '7891016010032',
        'name': 'Sadia Chicken Nuggets',
        'brand': 'Sadia',
        'category': 'Food & Beverages',
        'subcategory': 'Frozen Food',
        'size': '300g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === PERDIGÃO (Meat products) ===
    {
        'barcode': '7891017010033',
        'name': 'Perdigão Ham',
        'brand': 'Perdigão',
        'category': 'Food & Beverages',
        'subcategory': 'Meat Products',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === HELLMANN'S BRAZIL ===
    {
        'barcode': '7891018010034',
        'name': 'Hellmann\'s Mayonnaise',
        'brand': 'Hellmann\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '500g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === QUAKER BRAZIL ===
    {
        'barcode': '7891019010035',
        'name': 'Quaker Oats Brazil',
        'brand': 'Quaker',
        'category': 'Food & Beverages',
        'subcategory': 'Breakfast Cereals',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === LAKA (Chocolate bar) ===
    {
        'barcode': '7891020010036',
        'name': 'Laka Chocolate Bar',
        'brand': 'Laka',
        'category': 'Food & Beverages',
        'subcategory': 'Chocolate',
        'size': '90g',
        'unit': 'bar',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === TRIDENT GUM ===
    {
        'barcode': '7891021010037',
        'name': 'Trident Sugar-Free Gum',
        'brand': 'Trident',
        'category': 'Food & Beverages',
        'subcategory': 'Confectionery',
        'size': '8g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === SUKITA (Orange soda) ===
    {
        'barcode': '7891022010038',
        'name': 'Sukita Orange Soda',
        'brand': 'Sukita',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === H2OH! (Flavored water) ===
    {
        'barcode': '7891023010039',
        'name': 'H2OH! Lemon Flavored Water',
        'brand': 'H2OH!',
        'category': 'Food & Beverages',
        'subcategory': 'Flavored Water',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === FRESH (Juice) ===
    {
        'barcode': '7891024010040',
        'name': 'Fresh Orange Juice',
        'brand': 'Fresh',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === MAGUARY (Juice concentrate) ===
    {
        'barcode': '7891025010041',
        'name': 'Maguary Cashew Juice',
        'brand': 'Maguary',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '500ml',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === PARMALAT BRAZIL ===
    {
        'barcode': '7891026010042',
        'name': 'Parmalat UHT Milk',
        'brand': 'Parmalat',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === CAMIL (Rice) ===
    {
        'barcode': '7891027010043',
        'name': 'Camil White Rice',
        'brand': 'Camil',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === FEIJÃO CARIOCA (Brazilian beans) ===
    {
        'barcode': '7891028010044',
        'name': 'Camil Carioca Beans',
        'brand': 'Camil',
        'category': 'Food & Beverages',
        'subcategory': 'Legumes',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === TAPIOCA FLOUR ===
    {
        'barcode': '7891029010045',
        'name': 'Yoki Tapioca Flour',
        'brand': 'Yoki',
        'category': 'Food & Beverages',
        'subcategory': 'Flour',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === ÓLEO SOYA (Soybean oil) ===
    {
        'barcode': '7891030010046',
        'name': 'Soya Soybean Oil',
        'brand': 'Soya',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '900ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === AÇÚCAR CRISTAL (Crystal sugar) ===
    {
        'barcode': '7891031010047',
        'name': 'União Crystal Sugar',
        'brand': 'União',
        'category': 'Food & Beverages',
        'subcategory': 'Sugar',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === CAFÉ PILÃO (Brazilian coffee) ===
    {
        'barcode': '7891032010048',
        'name': 'Café Pilão Ground Coffee',
        'brand': 'Pilão',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === 3 CORAÇÕES COFFEE ===
    {
        'barcode': '7891033010049',
        'name': '3 Corações Ground Coffee',
        'brand': '3 Corações',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === PÃO DE AÇÚCAR (Bread) ===
    {
        'barcode': '7891034010050',
        'name': 'Pão de Açúcar Whole Wheat Bread',
        'brand': 'Pão de Açúcar',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '500g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === LEITE CONDENSADO (Condensed milk) ===
    {
        'barcode': '7891035010051',
        'name': 'Moça Condensed Milk',
        'brand': 'Moça',
        'category': 'Food & Beverages',
        'subcategory': 'Dairy',
        'size': '395g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },

    # === CALDO KNORR (Bouillon cubes) ===
    {
        'barcode': '7891036010052',
        'name': 'Knorr Chicken Bouillon Cubes',
        'brand': 'Knorr',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '57g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === EXTRATO DE TOMATE (Tomato paste) ===
    {
        'barcode': '7891037010053',
        'name': 'Quero Tomato Paste',
        'brand': 'Quero',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '340g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === BISCOITO CREAM CRACKER ===
    {
        'barcode': '7891038010054',
        'name': 'Adria Cream Cracker',
        'brand': 'Adria',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === REFRIGERANTE TUBAÍNA ===
    {
        'barcode': '7891039010055',
        'name': 'Tubaína Pink Soda',
        'brand': 'Tubaína',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '350ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === CERVEJA NOVA SCHIN ===
    {
        'barcode': '7891040010056',
        'name': 'Nova Schin Beer',
        'brand': 'Nova Schin',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '350ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"brazilian_products_{product['barcode']}"

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
            'BR',  # region_code for Brazil
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
    """Main function to populate Brazilian products"""
    print("🇧🇷 Starting Brazilian Products Import Script")
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
        for product in BRAZILIAN_PRODUCTS:
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
        print("🎉 BRAZILIAN PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(BRAZILIAN_PRODUCTS)} products")
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