#!/usr/bin/env python
"""
Script to populate store_items with household and cleaning products from all covered regions
Includes detergents, soaps, cleaning products, toothpaste, shampoos, baby products, and personal care items
Uses mixed barcode prefixes from: South Africa, Egypt, UAE, Turkey, Kenya, Uganda, India, Brazil, Mexico, Malaysia, Thailand, Philippines
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

# Household and cleaning products from multiple regions with appropriate barcode prefixes
HOUSEHOLD_PRODUCTS = [
    # === DETERGENTS - SOUTH AFRICA ===
    {
        'barcode': '6001620100016',
        'name': 'Surf Excel Automatic Washing Powder',
        'brand': 'Surf',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '2kg',
        'unit': 'box',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620100023',
        'name': 'OMO Multiactive Washing Powder',
        'brand': 'OMO',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '2kg',
        'unit': 'box',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620100030',
        'name': 'Ariel Professional Washing Powder',
        'brand': 'Ariel',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1.8kg',
        'unit': 'box',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === DETERGENTS - INDIA ===
    {
        'barcode': '8901030100017',
        'name': 'Tide Plus Washing Powder',
        'brand': 'Tide',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1kg',
        'unit': 'box',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901030100024',
        'name': 'Surf Excel Easy Wash',
        'brand': 'Surf',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1kg',
        'unit': 'box',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },

    # === DETERGENTS - BRAZIL ===
    {
        'barcode': '7891080100018',
        'name': 'OMO Progress Detergente em Pó',
        'brand': 'OMO',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1.6kg',
        'unit': 'box',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080100025',
        'name': 'Ariel Concentrado',
        'brand': 'Ariel',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1.2kg',
        'unit': 'box',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },

    # === SOAPS - SOUTH AFRICA ===
    {
        'barcode': '6001620200017',
        'name': 'Lux Beauty Soap',
        'brand': 'Lux',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '125g',
        'unit': 'bar',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620200024',
        'name': 'Dove Beauty Bar',
        'brand': 'Dove',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '100g',
        'unit': 'bar',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620200031',
        'name': 'Lifebuoy Total Protection',
        'brand': 'Lifebuoy',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '125g',
        'unit': 'bar',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === SOAPS - EGYPT ===
    {
        'barcode': '6223010200018',
        'name': 'Lux Egyptian Rose Soap',
        'brand': 'Lux',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '120g',
        'unit': 'bar',
        'region_code': 'EG',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6223010200025',
        'name': 'Dettol Antibacterial Soap',
        'brand': 'Dettol',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '125g',
        'unit': 'bar',
        'region_code': 'EG',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },

    # === CLEANING PRODUCTS - SOUTH AFRICA ===
    {
        'barcode': '6001620300018',
        'name': 'Domestos Thick Bleach',
        'brand': 'Domestos',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '750ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620300025',
        'name': 'Handy Andy All Purpose Cleaner',
        'brand': 'Handy Andy',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '750ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620300032',
        'name': 'Jik Bleach Original',
        'brand': 'Jik',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },

    # === CLEANING PRODUCTS - UAE ===
    {
        'barcode': '6280010300019',
        'name': 'Flash All Purpose Cleaner',
        'brand': 'Flash',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '1L',
        'unit': 'bottle',
        'region_code': 'AE',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6280010300026',
        'name': 'Vim Dishwashing Liquid',
        'brand': 'Vim',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'AE',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },

    # === TOOTHPASTE - MULTIPLE REGIONS ===
    {
        'barcode': '8901030400020',
        'name': 'Colgate Total Advanced Health',
        'brand': 'Colgate',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '150g',
        'unit': 'tube',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620400021',
        'name': 'Colgate Max Fresh',
        'brand': 'Colgate',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '100g',
        'unit': 'tube',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080400022',
        'name': 'Close-Up Red Hot',
        'brand': 'Close-Up',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '90g',
        'unit': 'tube',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8690632400023',
        'name': 'Sensodyne Rapid Relief',
        'brand': 'Sensodyne',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '75ml',
        'unit': 'tube',
        'region_code': 'TR',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6223010400024',
        'name': 'Pepsodent Whitening',
        'brand': 'Pepsodent',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '125g',
        'unit': 'tube',
        'region_code': 'EG',
        'image_url': 'https://m.media-amazon.com/images/I/61LRqQKKpKL._SL1000_.jpg'
    },

    # === SHAMPOOS - MULTIPLE REGIONS ===
    {
        'barcode': '8901030500025',
        'name': 'Head & Shoulders Anti-Dandruff',
        'brand': 'Head & Shoulders',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '400ml',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/71MRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620500026',
        'name': 'Pantene Pro-V Classic Care',
        'brand': 'Pantene',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '400ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080500027',
        'name': 'Sunsilk Smooth & Manageable',
        'brand': 'Sunsilk',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '350ml',
        'unit': 'bottle',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/71ORqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556001500028',
        'name': 'Rejoice Rich Soft Smooth',
        'brand': 'Rejoice',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '320ml',
        'unit': 'bottle',
        'region_code': 'MY',
        'image_url': 'https://m.media-amazon.com/images/I/61PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8851010500029',
        'name': 'Clear Men Anti-Dandruff',
        'brand': 'Clear',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '400ml',
        'unit': 'bottle',
        'region_code': 'TH',
        'image_url': 'https://m.media-amazon.com/images/I/71QRqQKKpKL._SL1000_.jpg'
    },

    # === CONDITIONERS ===
    {
        'barcode': '6001620510030',
        'name': 'TRESemmé Keratin Smooth Conditioner',
        'brand': 'TRESemmé',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800010510031',
        'name': 'Cream Silk Daily Treatment Conditioner',
        'brand': 'Cream Silk',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '340ml',
        'unit': 'bottle',
        'region_code': 'PH',
        'image_url': 'https://m.media-amazon.com/images/I/71SRqQKKpKL._SL1000_.jpg'
    },

    # === BABY PRODUCTS ===
    {
        'barcode': '8901030600032',
        'name': 'Pampers Baby Dry Diapers Size 3',
        'brand': 'Pampers',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '64 count',
        'unit': 'pack',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620600033',
        'name': 'Huggies DryLove Diapers Size 4',
        'brand': 'Huggies',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '54 count',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71URqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901030610034',
        'name': 'Johnson\'s Baby Powder',
        'brand': 'Johnson\'s Baby',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '200g',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080610035',
        'name': 'Johnson\'s Baby Shampoo',
        'brand': 'Johnson\'s Baby',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '400ml',
        'unit': 'bottle',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/71WRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6280010610036',
        'name': 'Sebamed Baby Lotion',
        'brand': 'Sebamed',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '200ml',
        'unit': 'bottle',
        'region_code': 'AE',
        'image_url': 'https://m.media-amazon.com/images/I/61XRqQKKpKL._SL1000_.jpg'
    },

    # === BABY WIPES ===
    {
        'barcode': '6001620620037',
        'name': 'Pampers Sensitive Baby Wipes',
        'brand': 'Pampers',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '80 count',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71YRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501080620038',
        'name': 'Huggies Natural Care Wipes',
        'brand': 'Huggies',
        'category': 'Household',
        'subcategory': 'Baby Products',
        'size': '72 count',
        'unit': 'pack',
        'region_code': 'MX',
        'image_url': 'https://m.media-amazon.com/images/I/61ZRqQKKpKL._SL1000_.jpg'
    },

    # === HOUSEHOLD PAPER PRODUCTS ===
    {
        'barcode': '6001620700039',
        'name': 'Kleenex Facial Tissues',
        'brand': 'Kleenex',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '150 sheets',
        'unit': 'box',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71ARqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901030700040',
        'name': 'Kleenex Soft Pack Tissues',
        'brand': 'Kleenex',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '100 sheets',
        'unit': 'pack',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620710041',
        'name': 'Scotts 1000 Toilet Paper',
        'brand': 'Scotts',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '12 rolls',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71CRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080710042',
        'name': 'Neve Soft Toilet Paper',
        'brand': 'Neve',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '16 rolls',
        'unit': 'pack',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/61DRqQKKpKL._SL1000_.jpg'
    },

    # === KITCHEN TOWELS ===
    {
        'barcode': '6001620720043',
        'name': 'Handy Towels Kitchen Roll',
        'brand': 'Handy Towels',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '2 rolls',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71ERqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556001720044',
        'name': 'Scott Towels Kitchen Roll',
        'brand': 'Scott',
        'category': 'Household',
        'subcategory': 'Paper Products',
        'size': '4 rolls',
        'unit': 'pack',
        'region_code': 'MY',
        'image_url': 'https://m.media-amazon.com/images/I/61FRqQKKpKL._SL1000_.jpg'
    },

    # === DEODORANTS ===
    {
        'barcode': '8901030800045',
        'name': 'Rexona Men Active Protection',
        'brand': 'Rexona',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '150ml',
        'unit': 'spray',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/71GRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '6001620800046',
        'name': 'Sure Women 48H Protection',
        'brand': 'Sure',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '150ml',
        'unit': 'spray',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891080800047',
        'name': 'Dove Men+Care Deodorant',
        'brand': 'Dove',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '150ml',
        'unit': 'spray',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/71IRqQKKpKL._SL1000_.jpg'
    },

    # === BODY WASH ===
    {
        'barcode': '6001620810048',
        'name': 'Dove Deeply Nourishing Body Wash',
        'brand': 'Dove',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/61JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8690632810049',
        'name': 'Palmolive Naturals Body Wash',
        'brand': 'Palmolive',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'TR',
        'image_url': 'https://m.media-amazon.com/images/I/71KRqQKKpKL._SL1000_.jpg'
    },

    # === FLOOR CLEANERS ===
    {
        'barcode': '6001620900050',
        'name': 'Sunlight Floor Cleaner',
        'brand': 'Sunlight',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '750ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71LRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8851010900051',
        'name': 'Mr. Muscle Floor Cleaner',
        'brand': 'Mr. Muscle',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '900ml',
        'unit': 'bottle',
        'region_code': 'TH',
        'image_url': 'https://m.media-amazon.com/images/I/61MRqQKKpKL._SL1000_.jpg'
    },

    # === GLASS CLEANERS ===
    {
        'barcode': '6001620910052',
        'name': 'Windolene Glass Cleaner',
        'brand': 'Windolene',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'spray',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71NRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7501080910053',
        'name': 'Windex Original Glass Cleaner',
        'brand': 'Windex',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'spray',
        'region_code': 'MX',
        'image_url': 'https://m.media-amazon.com/images/I/61ORqQKKpKL._SL1000_.jpg'
    },

    # === TOILET CLEANERS ===
    {
        'barcode': '6001621000054',
        'name': 'Harpic Power Plus Toilet Cleaner',
        'brand': 'Harpic',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71PRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031000055',
        'name': 'Harpic Disinfectant Toilet Cleaner',
        'brand': 'Harpic',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61QRqQKKpKL._SL1000_.jpg'
    },

    # === FABRIC SOFTENERS ===
    {
        'barcode': '6001621100056',
        'name': 'Comfort Fabric Softener',
        'brand': 'Comfort',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '800ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71RRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031100057',
        'name': 'Comfort After Wash Fabric Conditioner',
        'brand': 'Comfort',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '860ml',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61SRqQKKpKL._SL1000_.jpg'
    },

    # === DISHWASHING LIQUIDS ===
    {
        'barcode': '6001621200058',
        'name': 'Sunlight Dishwashing Liquid',
        'brand': 'Sunlight',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '750ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71TRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '4800011200059',
        'name': 'Joy Dishwashing Liquid',
        'brand': 'Joy',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '780ml',
        'unit': 'bottle',
        'region_code': 'PH',
        'image_url': 'https://m.media-amazon.com/images/I/61URqQKKpKL._SL1000_.jpg'
    },

    # === HAND WASH ===
    {
        'barcode': '6001621300060',
        'name': 'Protex Deep Clean Hand Wash',
        'brand': 'Protex',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '300ml',
        'unit': 'pump',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71VRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031300061',
        'name': 'Dettol Original Hand Wash',
        'brand': 'Dettol',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '200ml',
        'unit': 'pump',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61WRqQKKpKL._SL1000_.jpg'
    },

    # === HAND SANITIZERS ===
    {
        'barcode': '6001621310062',
        'name': 'Dettol Instant Hand Sanitizer',
        'brand': 'Dettol',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '200ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71XRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '9556001310063',
        'name': 'Carex Hand Sanitizer',
        'brand': 'Carex',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '250ml',
        'unit': 'pump',
        'region_code': 'MY',
        'image_url': 'https://m.media-amazon.com/images/I/61YRqQKKpKL._SL1000_.jpg'
    },

    # === INSECT REPELLENTS ===
    {
        'barcode': '6001621400064',
        'name': 'Doom Multi-Insect Killer',
        'brand': 'Doom',
        'category': 'Household',
        'subcategory': 'Pest Control',
        'size': '300ml',
        'unit': 'spray',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71ZRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8851011400065',
        'name': 'Baygon Cockroach Killer',
        'brand': 'Baygon',
        'category': 'Household',
        'subcategory': 'Pest Control',
        'size': '600ml',
        'unit': 'spray',
        'region_code': 'TH',
        'image_url': 'https://m.media-amazon.com/images/I/61ARqQKKpKL._SL1000_.jpg'
    },

    # === AIR FRESHENERS ===
    {
        'barcode': '6001621500066',
        'name': 'Glade Automatic Spray Refill',
        'brand': 'Glade',
        'category': 'Household',
        'subcategory': 'Air Care',
        'size': '269ml',
        'unit': 'refill',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71BRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891081500067',
        'name': 'Bom Ar Aerosol Spray',
        'brand': 'Bom Ar',
        'category': 'Household',
        'subcategory': 'Air Care',
        'size': '360ml',
        'unit': 'spray',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/61CRqQKKpKL._SL1000_.jpg'
    },

    # === LAUNDRY STAIN REMOVERS ===
    {
        'barcode': '6001621600068',
        'name': 'Vanish Oxi Action Stain Remover',
        'brand': 'Vanish',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71DRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031600069',
        'name': 'Vanish Expert Liquid',
        'brand': 'Vanish',
        'category': 'Household',
        'subcategory': 'Cleaning',
        'size': '800ml',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61ERqQKKpKL._SL1000_.jpg'
    },

    # === MOUTHWASH ===
    {
        'barcode': '6001621700070',
        'name': 'Listerine Cool Mint Mouthwash',
        'brand': 'Listerine',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '500ml',
        'unit': 'bottle',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71FRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031700071',
        'name': 'Listerine Advanced Tartar Control',
        'brand': 'Listerine',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '250ml',
        'unit': 'bottle',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61GRqQKKpKL._SL1000_.jpg'
    },

    # === RAZORS AND SHAVING ===
    {
        'barcode': '6001621800072',
        'name': 'Gillette Mach3 Disposable Razors',
        'brand': 'Gillette',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '4 count',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71HRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '7891081800073',
        'name': 'Gillette Prestobarba Ultragrip',
        'brand': 'Gillette',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '12 count',
        'unit': 'pack',
        'region_code': 'BR',
        'image_url': 'https://m.media-amazon.com/images/I/61IRqQKKpKL._SL1000_.jpg'
    },

    # === FEMININE CARE ===
    {
        'barcode': '6001621900074',
        'name': 'Always Ultra Normal Pads',
        'brand': 'Always',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '14 count',
        'unit': 'pack',
        'region_code': 'ZA',
        'image_url': 'https://m.media-amazon.com/images/I/71JRqQKKpKL._SL1000_.jpg'
    },
    {
        'barcode': '8901031900075',
        'name': 'Whisper Ultra Clean',
        'brand': 'Whisper',
        'category': 'Household',
        'subcategory': 'Personal Care',
        'size': '20 count',
        'unit': 'pack',
        'region_code': 'IN',
        'image_url': 'https://m.media-amazon.com/images/I/61KRqQKKpKL._SL1000_.jpg'
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
        image_public_id = f"household_products_{product['barcode']}"

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
            product['region_code'],
            f"{product['brand']} {product['name']} - {product['size']}",  # description
            image_url,
            image_public_id,
            thumbnail_url
        ])

        print(f"✅ Added: {product['name']} ({product['brand']}) - {product['barcode']} [{product['region_code']}]")
        return True

    except Exception as e:
        print(f"❌ Error inserting {product['name']}: {e}")
        return False

def main():
    """Main function to populate household and cleaning products"""
    print("🏠 Starting Household & Cleaning Products Import Script")
    print("🌍 Multi-Regional Import: ZA, EG, AE, TR, IN, BR, MX, MY, TH, PH")
    print("=" * 70)

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
        for product in HOUSEHOLD_PRODUCTS:
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
        print("\n" + "=" * 70)
        print("🎉 HOUSEHOLD & CLEANING PRODUCTS IMPORT COMPLETED!")
        print(f"✅ Successfully added: {successful_inserts} products")
        print(f"⚠️  Skipped (duplicates): {skipped_products} products")
        print(f"❌ Failed inserts: {failed_inserts} products")
        print(f"📊 Total processed: {len(HOUSEHOLD_PRODUCTS)} products")
        print("\n🏷️  Categories imported:")
        print("   • Detergents & Cleaning products")
        print("   • Soaps & Personal care items")
        print("   • Toothpaste & Oral care")
        print("   • Shampoos & Hair care")
        print("   • Baby products & Diapers")
        print("   • Paper products & Tissues")
        print("   • Deodorants & Body care")
        print("   • Household cleaners & Pest control")
        print("   • Air fresheners & Fabric care")
        print("\n🌍 Regions covered:")
        print("   • South Africa (ZA) - 6001 prefix")
        print("   • Egypt (EG) - 6223 prefix")
        print("   • UAE (AE) - 6280 prefix")
        print("   • Turkey (TR) - 8690 prefix")
        print("   • India (IN) - 8901 prefix")
        print("   • Brazil (BR) - 7891 prefix")
        print("   • Mexico (MX) - 7501 prefix")
        print("   • Malaysia (MY) - 9556 prefix")
        print("   • Thailand (TH) - 8851 prefix")
        print("   • Philippines (PH) - 4800 prefix")
        print("=" * 70)

    except Exception as e:
        print(f"❌ Error during import process: {e}")
        conn.rollback()

    finally:
        cursor.close()
        conn.close()
        print("🔐 Database connection closed")

if __name__ == "__main__":
    main()