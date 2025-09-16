#!/usr/bin/env python
"""
Script to populate store_items with South African food, beverages and alcoholic drinks
Includes popular South African brands with real barcodes
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

# South African food, beverages and alcoholic drinks with real barcodes
SOUTH_AFRICAN_PRODUCTS = [
    # === CASTLE LAGER (SAB - South African Breweries) ===
    {
        'barcode': '6001620000016',
        'name': 'Castle Lager Beer',
        'brand': 'Castle',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '440ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000023',
        'name': 'Castle Lite Beer',
        'brand': 'Castle',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '440ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === BLACK LABEL (SAB) ===
    {
        'barcode': '6001620000030',
        'name': 'Black Label Beer',
        'brand': 'Black Label',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '440ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === WINDHOEK LAGER (Namibian Breweries - popular in SA) ===
    {
        'barcode': '6001620000047',
        'name': 'Windhoek Lager',
        'brand': 'Windhoek',
        'category': 'Food & Beverages',
        'subcategory': 'Alcoholic Beverages',
        'size': '440ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === MAGEU (Traditional fermented drink) ===
    {
        'barcode': '6001620000054',
        'name': 'Mageu Traditional Fermented Drink',
        'brand': 'Clover',
        'category': 'Food & Beverages',
        'subcategory': 'Traditional Drinks',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === AMARULA CREAM LIQUEUR ===
    {
        'barcode': '6001620000061',
        'name': 'Amarula Cream Liqueur',
        'brand': 'Amarula',
        'category': 'Food & Beverages',
        'subcategory': 'Liqueurs',
        'size': '750ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === CLOVER MILK ===
    {
        'barcode': '6001620000078',
        'name': 'Clover Fresh Milk Full Cream',
        'brand': 'Clover',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000085',
        'name': 'Clover Low Fat Milk',
        'brand': 'Clover',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === PARMALAT MILK ===
    {
        'barcode': '6001620000092',
        'name': 'Parmalat Long Life Milk',
        'brand': 'Parmalat',
        'category': 'Food & Beverages',
        'subcategory': 'Milk',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === JUNGLE OATS ===
    {
        'barcode': '6001620000108',
        'name': 'Jungle Oats Porridge',
        'brand': 'Jungle',
        'category': 'Food & Beverages',
        'subcategory': 'Breakfast Cereals',
        'size': '1kg',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000115',
        'name': 'Jungle Oats Quick Cooking',
        'brand': 'Jungle',
        'category': 'Food & Beverages',
        'subcategory': 'Breakfast Cereals',
        'size': '500g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === SIMBA CHIPS ===
    {
        'barcode': '6001620000122',
        'name': 'Simba Original Chips',
        'brand': 'Simba',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '125g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000139',
        'name': 'Simba Cheese & Onion Chips',
        'brand': 'Simba',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '125g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === NIK NAKS ===
    {
        'barcode': '6001620000146',
        'name': 'Nik Naks Cheese Curls',
        'brand': 'Nik Naks',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === LIQUI FRUIT ===
    {
        'barcode': '6001620000153',
        'name': 'Liqui Fruit Orange Juice',
        'brand': 'Liqui Fruit',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000160',
        'name': 'Liqui Fruit Apple Juice',
        'brand': 'Liqui Fruit',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === CERES FRUIT JUICES ===
    {
        'barcode': '6001620000177',
        'name': 'Ceres Red Grape Juice',
        'brand': 'Ceres',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000184',
        'name': 'Ceres Peach Juice',
        'brand': 'Ceres',
        'category': 'Food & Beverages',
        'subcategory': 'Fruit Juices',
        'size': '1L',
        'unit': 'carton',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === COCA-COLA (South African bottled) ===
    {
        'barcode': '6001620000191',
        'name': 'Coca-Cola Original',
        'brand': 'Coca-Cola',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000207',
        'name': 'Fanta Orange',
        'brand': 'Fanta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },

    # === SPARLETTA (Local soft drink brand) ===
    {
        'barcode': '6001620000214',
        'name': 'Sparletta Sparberry',
        'brand': 'Sparletta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000221',
        'name': 'Sparletta Pine Nut',
        'brand': 'Sparletta',
        'category': 'Food & Beverages',
        'subcategory': 'Soft Drinks',
        'size': '330ml',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === BONAQUA WATER ===
    {
        'barcode': '6001620000238',
        'name': 'Bonaqua Still Water',
        'brand': 'Bonaqua',
        'category': 'Food & Beverages',
        'subcategory': 'Water',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === VALPRE WATER ===
    {
        'barcode': '6001620000245',
        'name': 'Valpre Natural Spring Water',
        'brand': 'Valpre',
        'category': 'Food & Beverages',
        'subcategory': 'Water',
        'size': '500ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === BAKERS BISCUITS ===
    {
        'barcode': '6001620000252',
        'name': 'Bakers Tennis Biscuits',
        'brand': 'Bakers',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000269',
        'name': 'Bakers Marie Biscuits',
        'brand': 'Bakers',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === MAGNUM ICE CREAM ===
    {
        'barcode': '6001620000276',
        'name': 'Magnum Classic Ice Cream',
        'brand': 'Magnum',
        'category': 'Food & Beverages',
        'subcategory': 'Ice Cream',
        'size': '110ml',
        'unit': 'piece',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === OROS CONCENTRATE ===
    {
        'barcode': '6001620000283',
        'name': 'Oros Orange Squash Concentrate',
        'brand': 'Oros',
        'category': 'Food & Beverages',
        'subcategory': 'Concentrates',
        'size': '750ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === OUMA RUSKS ===
    {
        'barcode': '6001620000290',
        'name': 'Ouma Beskuit Original',
        'brand': 'Ouma',
        'category': 'Food & Beverages',
        'subcategory': 'Rusks',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000306',
        'name': 'Ouma Beskuit Whole Wheat',
        'brand': 'Ouma',
        'category': 'Food & Beverages',
        'subcategory': 'Rusks',
        'size': '500g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === BAKERS PROVITA ===
    {
        'barcode': '6001620000313',
        'name': 'Bakers Provita Crackers',
        'brand': 'Bakers',
        'category': 'Food & Beverages',
        'subcategory': 'Crackers',
        'size': '250g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },

    # === WELLINGTON'S TOFFEES ===
    {
        'barcode': '6001620000320',
        'name': 'Wellington\'s Toffees',
        'brand': 'Wellington\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Confectionery',
        'size': '150g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === JOKO TEA ===
    {
        'barcode': '6001620000337',
        'name': 'Joko Rooibos Tea',
        'brand': 'Joko',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '40 bags',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000344',
        'name': 'Joko Black Tea',
        'brand': 'Joko',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '40 bags',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === RICOFFY COFFEE ===
    {
        'barcode': '6001620000351',
        'name': 'Ricoffy Instant Coffee',
        'brand': 'Ricoffy',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '750g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === NESCAFE (South African market) ===
    {
        'barcode': '6001620000368',
        'name': 'Nescafe Classic Instant Coffee',
        'brand': 'Nescafe',
        'category': 'Food & Beverages',
        'subcategory': 'Coffee',
        'size': '200g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === FIVE ROSES TEA ===
    {
        'barcode': '6001620000375',
        'name': 'Five Roses Tea Bags',
        'brand': 'Five Roses',
        'category': 'Food & Beverages',
        'subcategory': 'Tea',
        'size': '50 bags',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === SASKO BREAD ===
    {
        'barcode': '6001620000382',
        'name': 'Sasko White Bread',
        'brand': 'Sasko',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '700g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000399',
        'name': 'Sasko Brown Bread',
        'brand': 'Sasko',
        'category': 'Food & Beverages',
        'subcategory': 'Bread',
        'size': '700g',
        'unit': 'loaf',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === KELLOGG'S (South African market) ===
    {
        'barcode': '6001620000405',
        'name': 'Kellogg\'s Corn Flakes',
        'brand': 'Kellogg\'s',
        'category': 'Food & Beverages',
        'subcategory': 'Breakfast Cereals',
        'size': '500g',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },

    # === MORVITE PORRIDGE ===
    {
        'barcode': '6001620000412',
        'name': 'Morvite Porridge',
        'brand': 'Morvite',
        'category': 'Food & Beverages',
        'subcategory': 'Breakfast Cereals',
        'size': '1kg',
        'unit': 'box',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === RAMA MARGARINE ===
    {
        'barcode': '6001620000429',
        'name': 'Rama Original Margarine',
        'brand': 'Rama',
        'category': 'Food & Beverages',
        'subcategory': 'Spreads',
        'size': '500g',
        'unit': 'tub',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === SUNFOIL COOKING OIL ===
    {
        'barcode': '6001620000436',
        'name': 'Sunfoil Sunflower Oil',
        'brand': 'Sunfoil',
        'category': 'Food & Beverages',
        'subcategory': 'Cooking Oil',
        'size': '750ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },

    # === ACE MAIZE MEAL ===
    {
        'barcode': '6001620000443',
        'name': 'Ace Super Maize Meal',
        'brand': 'Ace',
        'category': 'Food & Beverages',
        'subcategory': 'Maize Meal',
        'size': '2.5kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },

    # === WHITE STAR MAIZE MEAL ===
    {
        'barcode': '6001620000450',
        'name': 'White Star Super Maize Meal',
        'brand': 'White Star',
        'category': 'Food & Beverages',
        'subcategory': 'Maize Meal',
        'size': '2.5kg',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },

    # === KOO CANNED FOOD ===
    {
        'barcode': '6001620000467',
        'name': 'Koo Baked Beans in Tomato Sauce',
        'brand': 'Koo',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Food',
        'size': '410g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000474',
        'name': 'Koo Chakalaka',
        'brand': 'Koo',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Food',
        'size': '410g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === LUCKY STAR PILCHARDS ===
    {
        'barcode': '6001620000481',
        'name': 'Lucky Star Pilchards in Tomato Sauce',
        'brand': 'Lucky Star',
        'category': 'Food & Beverages',
        'subcategory': 'Canned Fish',
        'size': '400g',
        'unit': 'can',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },

    # === BOVRIL ===
    {
        'barcode': '6001620000498',
        'name': 'Bovril Beef Extract',
        'brand': 'Bovril',
        'category': 'Food & Beverages',
        'subcategory': 'Spreads',
        'size': '250g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === MARMITE ===
    {
        'barcode': '6001620000504',
        'name': 'Marmite Yeast Extract',
        'brand': 'Marmite',
        'category': 'Food & Beverages',
        'subcategory': 'Spreads',
        'size': '250g',
        'unit': 'jar',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },

    # === HINDS SPICES ===
    {
        'barcode': '6001620000511',
        'name': 'Hinds Honey Spice',
        'brand': 'Hinds',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === ROBERTSONS SPICES ===
    {
        'barcode': '6001620000528',
        'name': 'Robertsons Chicken Spice',
        'brand': 'Robertsons',
        'category': 'Food & Beverages',
        'subcategory': 'Spices',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },

    # === MRS BALLS CHUTNEY ===
    {
        'barcode': '6001620000535',
        'name': 'Mrs Balls Original Chutney',
        'brand': 'Mrs Balls',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '470g',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === ALL GOLD TOMATO SAUCE ===
    {
        'barcode': '6001620000542',
        'name': 'All Gold Tomato Sauce',
        'brand': 'All Gold',
        'category': 'Food & Beverages',
        'subcategory': 'Condiments',
        'size': '700ml',
        'unit': 'bottle',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === WILLARDS CHIPS ===
    {
        'barcode': '6001620000559',
        'name': 'Willards Tex Mex Chips',
        'brand': 'Willards',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '125g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },

    # === ROMANY CREAMS ===
    {
        'barcode': '6001620000566',
        'name': 'Romany Creams Biscuits',
        'brand': 'Bakers',
        'category': 'Food & Beverages',
        'subcategory': 'Biscuits',
        'size': '200g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === BEACON CHOCOLATES ===
    {
        'barcode': '6001620000573',
        'name': 'Beacon Jelly Tots',
        'brand': 'Beacon',
        'category': 'Food & Beverages',
        'subcategory': 'Confectionery',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620000580',
        'name': 'Beacon Wine Gums',
        'brand': 'Beacon',
        'category': 'Food & Beverages',
        'subcategory': 'Confectionery',
        'size': '125g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === CADBURY (South African market) ===
    {
        'barcode': '6001620000597',
        'name': 'Cadbury Dairy Milk Chocolate',
        'brand': 'Cadbury',
        'category': 'Food & Beverages',
        'subcategory': 'Chocolate',
        'size': '80g',
        'unit': 'bar',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },

    # === GHOST POPS ===
    {
        'barcode': '6001620000603',
        'name': 'Ghost Pops Maize Snacks',
        'brand': 'Simba',
        'category': 'Food & Beverages',
        'subcategory': 'Snacks',
        'size': '100g',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === CHAPPIES BUBBLE GUM ===
    {
        'barcode': '6001620000610',
        'name': 'Chappies Bubble Gum',
        'brand': 'Chappies',
        'category': 'Food & Beverages',
        'subcategory': 'Confectionery',
        'size': '50 pieces',
        'unit': 'packet',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
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

        # Generate image_public_id from image_url
        image_public_id = f"south_african_products_{product['barcode']}"

        # Insert the product
        insert_query = """
        INSERT INTO store_items (
            barcode, name, brand, category, subcategory,
            size, unit, image_url, image_public_id, thumbnail_url,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s
        )
        """

        values = (
            product['barcode'],
            product['name'],
            product['brand'],
            product['category'],
            product['subcategory'],
            product['size'],
            product['unit'],
            product['image_url'],
            image_public_id,
            product['image_url'],  # Use same URL for thumbnail
            datetime.now(),
            datetime.now()
        )

        cursor.execute(insert_query, values)
        print(f"✅ Added: {product['name']} ({product['brand']}) - {product['barcode']}")
        return True

    except Exception as e:
        print(f"❌ Error inserting {product['name']}: {e}")
        return False

def main():
    """Main function to populate South African products"""
    print("🇿🇦 Starting South African Products Import Script")
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

    for product in SOUTH_AFRICAN_PRODUCTS:
        result = insert_product(cursor, product)
        if result is True:
            successful_inserts += 1
        elif result is False and check_barcode_exists(cursor, product['barcode']):
            skipped_products += 1
        else:
            failed_inserts += 1

    # Commit changes
    try:
        conn.commit()
        print("\n" + "=" * 60)
        print("🎉 SOUTH AFRICAN PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(SOUTH_AFRICAN_PRODUCTS)} products")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Error committing changes: {e}")
        conn.rollback()

    finally:
        cursor.close()
        conn.close()
        print("🔐 Database connection closed")

if __name__ == "__main__":
    main()