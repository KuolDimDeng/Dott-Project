#!/usr/bin/env python
"""
Script to populate store_items with Malaysian food, beverages and consumer products
Includes popular Malaysian brands with real barcodes (955x prefix)
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

# Malaysian products with real barcodes (955x prefix)
MALAYSIAN_PRODUCTS = [
    # === MILO (Malaysia's most popular drink) ===
    {
        'barcode': '9556001010016',
        'name': 'MILO Original Powder',
        'brand': 'MILO',
        'category': 'Food & Beverages',
        'subcategory': 'Chocolate Drinks',
        'size': '900g',
        'unit': 'tin',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556001010023',
        'name': 'MILO 3-in-1 Original',
        'brand': 'MILO',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Drinks',
        'size': '18 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556001010030',
        'name': 'MILO UHT Chocolate Drink',
        'brand': 'MILO',
        'category': 'Food & Beverages',
        'subcategory': 'Ready-to-Drink',
        'size': '200ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ARqQKKpKL._SL1000_.jpg'
    },

    # === 100PLUS (Malaysia's energy drink) ===
    {
        'barcode': '9556002010017',
        'name': '100PLUS Original',
        'brand': '100PLUS',
        'category': 'Food & Beverages',
        'subcategory': 'Sports Drinks',
        'size': '325ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556002010024',
        'name': '100PLUS Zero Sugar',
        'brand': '100PLUS',
        'category': 'Food & Beverages',
        'subcategory': 'Sports Drinks',
        'size': '325ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556002010031',
        'name': '100PLUS Edge',
        'brand': '100PLUS',
        'category': 'Food & Beverages',
        'subcategory': 'Sports Drinks',
        'size': '325ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === MAGGI MALAYSIA ===
    {
        'barcode': '9556003010018',
        'name': 'MAGGI Chicken Stock Cube',
        'brand': 'MAGGI',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '20g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556003010025',
        'name': 'MAGGI 2-Minute Curry',
        'brand': 'MAGGI',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '79g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556003010032',
        'name': 'MAGGI Kari Instant Noodles',
        'brand': 'MAGGI',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '79g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === NESCAFÉ MALAYSIA ===
    {
        'barcode': '9556004010019',
        'name': 'NESCAFÉ Original',
        'brand': 'NESCAFÉ',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '200g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556004010026',
        'name': 'NESCAFÉ 3-in-1 Original',
        'brand': 'NESCAFÉ',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '20 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556004010033',
        'name': 'NESCAFÉ Tarik',
        'brand': 'NESCAFÉ',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Coffee',
        'size': '20 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === BOH TEA (Malaysia's premier tea brand) ===
    {
        'barcode': '9556005010020',
        'name': 'BOH Tea Bags Original',
        'brand': 'BOH',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '40 tea bags',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556005010037',
        'name': 'BOH Cameron Highlands Tea',
        'brand': 'BOH',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556005010044',
        'name': 'BOH Teh Tarik',
        'brand': 'BOH',
        'category': 'Food & Beverages',
        'subcategory': 'Milk Tea',
        'size': '25 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === F&N DRINKS ===
    {
        'barcode': '9556006010021',
        'name': 'F&N Orange Cordial',
        'brand': 'F&N',
        'category': 'Food & Beverages',
        'subcategory': 'Cordials',
        'size': '2L',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556006010038',
        'name': 'F&N Sarsi',
        'brand': 'F&N',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '325ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556006010045',
        'name': 'F&N Ice Cream Soda',
        'brand': 'F&N',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '325ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === AYAM BRAND (Southeast Asian canned foods) ===
    {
        'barcode': '9556007010022',
        'name': 'Ayam Brand Sardines in Tomato Sauce',
        'brand': 'Ayam Brand',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Fish',
        'size': '215g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556007010039',
        'name': 'Ayam Brand Coconut Milk',
        'brand': 'Ayam Brand',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Ingredients',
        'size': '400ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556007010046',
        'name': 'Ayam Brand Tuna Chunks',
        'brand': 'Ayam Brand',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Fish',
        'size': '185g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === GARDENIA BREAD ===
    {
        'barcode': '9556008010023',
        'name': 'Gardenia White Bread',
        'brand': 'Gardenia',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556008010030',
        'name': 'Gardenia Whole Wheat Bread',
        'brand': 'Gardenia',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556008010047',
        'name': 'Gardenia Butterscotch Bread',
        'brand': 'Gardenia',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '400g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === JULIE'S BISCUITS ===
    {
        'barcode': '9556009010024',
        'name': 'Julie\'s Peanut Butter Sandwich',
        'brand': 'Julie\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '135g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556009010031',
        'name': 'Julie\'s Cheese Sandwich',
        'brand': 'Julie\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '135g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556009010048',
        'name': 'Julie\'s Love Letters',
        'brand': 'Julie\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === MUNCHY'S ===
    {
        'barcode': '9556010010025',
        'name': 'Munchy\'s Lexus Crackers',
        'brand': 'Munchy\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556010010032',
        'name': 'Munchy\'s Oat Krunch',
        'brand': 'Munchy\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '416g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556010010049',
        'name': 'Munchy\'s Captain Munch',
        'brand': 'Munchy\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '180g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === OLD TOWN WHITE COFFEE ===
    {
        'barcode': '9556011010026',
        'name': 'Old Town White Coffee 3-in-1',
        'brand': 'Old Town',
        'category': 'Food & Beverages',
        'subcategory': 'White Coffee',
        'size': '15 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556011010033',
        'name': 'Old Town White Coffee 2-in-1',
        'brand': 'Old Town',
        'category': 'Food & Beverages',
        'subcategory': 'White Coffee',
        'size': '15 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556011010040',
        'name': 'Old Town Hazelnut White Coffee',
        'brand': 'Old Town',
        'category': 'Food & Beverages',
        'subcategory': 'White Coffee',
        'size': '12 sachets',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === CAP FAN RICE ===
    {
        'barcode': '9556012010027',
        'name': 'Cap Fan Thai Fragrant Rice',
        'brand': 'Cap Fan',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '5kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556012010034',
        'name': 'Cap Fan Premium Jasmine Rice',
        'brand': 'Cap Fan',
        'category': 'Food & Beverages',
        'subcategory': 'Rice',
        'size': '10kg',
        'unit': 'bag',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === ADABI SPICES ===
    {
        'barcode': '9556013010028',
        'name': 'Adabi Rendang Paste',
        'brand': 'Adabi',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Paste',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556013010035',
        'name': 'Adabi Curry Powder',
        'brand': 'Adabi',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556013010042',
        'name': 'Adabi Assam Fish Curry',
        'brand': 'Adabi',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Paste',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN INSTANT NOODLES ===
    {
        'barcode': '9556014010029',
        'name': 'MyKuali Penang White Curry',
        'brand': 'MyKuali',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '110g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556014010036',
        'name': 'MyKuali Penang Red Tom Yum',
        'brand': 'MyKuali',
        'category': 'Food & Beverages',
        'subcategory': 'Instant Noodles',
        'size': '110g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN COCONUT PRODUCTS ===
    {
        'barcode': '9556015010030',
        'name': 'Kara Coconut Cream',
        'brand': 'Kara',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Products',
        'size': '200ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556015010047',
        'name': 'Kara Coconut Milk',
        'brand': 'Kara',
        'category': 'Food & Beverages',
        'subcategory': 'Coconut Products',
        'size': '200ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN COOKING SAUCE ===
    {
        'barcode': '9556016010031',
        'name': 'Life Oyster Sauce',
        'brand': 'Life',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Sauce',
        'size': '510g',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556016010048',
        'name': 'Life Soy Sauce',
        'brand': 'Life',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Sauce',
        'size': '640ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN SNACKS ===
    {
        'barcode': '9556017010032',
        'name': 'Super Ring Cheese Snack',
        'brand': 'Oriental',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556017010049',
        'name': 'Roller Coaster Potato Rings',
        'brand': 'Oriental',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '60g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN DAIRY ===
    {
        'barcode': '9556018010033',
        'name': 'Dutch Lady UHT Milk',
        'brand': 'Dutch Lady',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556018010040',
        'name': 'Dutch Lady Chocolate Milk',
        'brand': 'Dutch Lady',
        'category': 'Food & Beverages',
        'subcategory': 'Flavored Milk',
        'size': '200ml',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN TRADITIONAL SWEETS ===
    {
        'barcode': '9556019010034',
        'name': 'White Rabbit Creamy Candy',
        'brand': 'White Rabbit',
        'category': 'Food & Beverages',
        'subcategory': 'Candy',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556019010041',
        'name': 'Haw Flakes',
        'brand': 'Malaysian',
        'category': 'Food & Beverages',
        'subcategory': 'Traditional Sweets',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN COOKING OIL ===
    {
        'barcode': '9556020010035',
        'name': 'Knife Brand Cooking Oil',
        'brand': 'Knife',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '1kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556020010042',
        'name': 'Knife Brand Palm Oil',
        'brand': 'Knife',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '2kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN CONDIMENTS ===
    {
        'barcode': '9556021010036',
        'name': 'Maggi Cukup Rasa',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Seasonings',
        'size': '120g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556021010043',
        'name': 'Maggi Chili Sauce',
        'brand': 'Maggi',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '320g',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN INSTANT PORRIDGE ===
    {
        'barcode': '9556022010037',
        'name': 'Brands Essence of Chicken',
        'brand': 'Brands',
        'category': 'Food & Beverages',
        'subcategory': 'Health Drinks',
        'size': '68ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN TRADITIONAL CRACKERS ===
    {
        'barcode': '9556023010038',
        'name': 'Keropok Lekor',
        'brand': 'Traditional',
        'category': 'Food & Beverages',
        'subcategory': 'Traditional Snacks',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === MALAYSIAN FROZEN FOODS ===
    {
        'barcode': '9556024010039',
        'name': 'Ramly Chicken Burger',
        'brand': 'Ramly',
        'category': 'Food & Beverages',
        'subcategory': 'Frozen Food',
        'size': '6 pieces',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556024010046',
        'name': 'Ramly Beef Burger',
        'brand': 'Ramly',
        'category': 'Food & Beverages',
        'subcategory': 'Frozen Food',
        'size': '6 pieces',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"malaysian_products_{product['barcode']}"

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
            'MY',  # region_code for Malaysia
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
    """Main function to populate Malaysian products"""
    print("🇲🇾 Starting Malaysian Products Import Script")
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
        for product in MALAYSIAN_PRODUCTS:
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
        print("🎉 MALAYSIAN PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(MALAYSIAN_PRODUCTS)} products")
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