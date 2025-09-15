"""
Management command to populate StoreItems database with products
Usage: python manage.py populate_storeitems --source openfoodfacts --limit 1000
"""
import requests
import json
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
# Import will be activated after models are integrated
try:
    from inventory.models_storeitems import StoreItem
    STOREITEMS_AVAILABLE = True
except ImportError:
    StoreItem = None
    STOREITEMS_AVAILABLE = False


class Command(BaseCommand):
    help = 'Populate StoreItems database from various sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            default='all',
            choices=['openfoodfacts', 'essential', 'african', 'all'],
            help='Data source to import from'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=1000,
            help='Maximum number of products to import'
        )
        parser.add_argument(
            '--country',
            type=str,
            default='south-africa',
            help='Country to focus on for regional products'
        )

    def handle(self, *args, **options):
        # Check if StoreItem model is available
        if not STOREITEMS_AVAILABLE:
            self.stdout.write(
                self.style.WARNING(
                    'StoreItem models not yet integrated. Please run migrations first:\n'
                    '1. Add "from .models_storeitems import StoreItem" to models.py\n'
                    '2. Run: python manage.py makemigrations\n'
                    '3. Run: python manage.py migrate'
                )
            )
            return

        source = options['source']
        limit = options['limit']
        country = options['country']

        self.stdout.write(f"Starting import from {source}...")

        if source == 'openfoodfacts' or source == 'all':
            self.import_from_openfoodfacts(limit, country)

        if source == 'essential' or source == 'all':
            self.import_essential_products()

        if source == 'african' or source == 'all':
            self.import_african_products()

        total_count = StoreItem.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully imported products. Total in database: {total_count}'
            )
        )

    def import_from_openfoodfacts(self, limit, country):
        """Import from Open Food Facts API - free and comprehensive"""
        self.stdout.write("Importing from Open Food Facts...")

        # Countries relevant for Africa
        countries = ['south-africa', 'kenya', 'nigeria', 'egypt', 'ghana', 'uganda', 'tanzania']

        imported = 0
        for country_code in countries:
            if imported >= limit:
                break

            try:
                # Open Food Facts API endpoint
                url = "https://world.openfoodfacts.org/cgi/search.pl"
                params = {
                    'countries_tags_en': country_code,
                    'page_size': min(100, limit - imported),
                    'json': 1,
                    'fields': 'code,product_name,brands,categories,image_url,quantity'
                }

                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()

                products = data.get('products', [])
                self.stdout.write(f"Found {len(products)} products from {country_code}")

                with transaction.atomic():
                    for product in products:
                        if imported >= limit:
                            break

                        barcode = product.get('code', '').strip()
                        name = product.get('product_name', '').strip()

                        if not barcode or not name:
                            continue

                        # Parse categories
                        categories = product.get('categories', '').split(',')
                        category = categories[0].strip() if categories else 'General'
                        subcategory = categories[1].strip() if len(categories) > 1 else None

                        # Extract size from quantity field
                        size = product.get('quantity', '')

                        StoreItem.objects.get_or_create(
                            barcode=barcode,
                            defaults={
                                'name': name[:255],
                                'brand': product.get('brands', '')[:100],
                                'category': category[:100],
                                'subcategory': subcategory[:100] if subcategory else None,
                                'image_url': product.get('image_url', ''),
                                'size': size[:50],
                                'region_code': country_code.upper()[:10],
                                'verified': False
                            }
                        )
                        imported += 1

                self.stdout.write(f"Imported {imported} products from {country_code}")

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"Error importing from {country_code}: {str(e)}")
                )

        self.stdout.write(f"Total imported from Open Food Facts: {imported}")

    def import_essential_products(self):
        """Import essential products common in African stores"""
        self.stdout.write("Importing essential products...")

        essential_products = [
            # Beverages
            ('5449000000996', 'Coca-Cola 500ml', 'Coca-Cola', 'Beverages', 'Soft Drinks', '500ml'),
            ('5449000131805', 'Sprite 500ml', 'Coca-Cola', 'Beverages', 'Soft Drinks', '500ml'),
            ('5449000011527', 'Fanta Orange 500ml', 'Coca-Cola', 'Beverages', 'Soft Drinks', '500ml'),
            ('54491472', 'Pepsi 500ml', 'PepsiCo', 'Beverages', 'Soft Drinks', '500ml'),
            ('5000112548259', 'Bottled Water 500ml', 'Generic', 'Beverages', 'Water', '500ml'),

            # Personal Care
            ('8901030865278', 'Lifebuoy Soap 100g', 'Unilever', 'Personal Care', 'Soap', '100g'),
            ('5000299223178', 'Vaseline Petroleum Jelly 100ml', 'Unilever', 'Personal Care', 'Skin Care', '100ml'),
            ('5410091728977', 'Colgate Toothpaste 100ml', 'Colgate', 'Personal Care', 'Oral Care', '100ml'),
            ('8901030729874', 'Dettol Antiseptic 100ml', 'Reckitt', 'Personal Care', 'Health', '100ml'),

            # Food - Staples
            ('6008553002221', 'Tastic Rice 2kg', 'Tiger Brands', 'Food', 'Rice', '2kg'),
            ('6001068013654', 'Simba Chips Original', 'PepsiCo', 'Food', 'Snacks', '125g'),
            ('089836187328', 'Indomie Noodles Chicken', 'IndoFood', 'Food', 'Instant Food', '70g'),
            ('6009510800104', 'White Star Maize Meal 5kg', 'Pioneer', 'Food', 'Staples', '5kg'),
            ('6001087001163', 'Jungle Oats 500g', 'Tiger Brands', 'Food', 'Breakfast', '500g'),

            # Dairy
            ('6009705520019', 'Clover Fresh Milk 1L', 'Clover', 'Dairy', 'Milk', '1L'),
            ('6001087352420', 'Albany Bread White', 'Tiger Brands', 'Food', 'Bakery', '700g'),

            # Household
            ('6001087004621', 'Sunlight Dishwashing Liquid 750ml', 'Unilever', 'Household', 'Cleaning', '750ml'),
            ('6009695880281', 'Omo Washing Powder 1kg', 'Unilever', 'Household', 'Laundry', '1kg'),
            ('6001085000986', 'Handy Andy Cleaner 750ml', 'Unilever', 'Household', 'Cleaning', '750ml'),

            # Mobile & Airtime (common in African stores)
            ('AIRTIME-MTN-5', 'MTN Airtime R5', 'MTN', 'Digital', 'Airtime', 'R5'),
            ('AIRTIME-VODACOM-10', 'Vodacom Airtime R10', 'Vodacom', 'Digital', 'Airtime', 'R10'),
            ('DATA-TELKOM-1GB', 'Telkom Data 1GB', 'Telkom', 'Digital', 'Data', '1GB'),
        ]

        imported = 0
        with transaction.atomic():
            for barcode, name, brand, category, subcategory, size in essential_products:
                StoreItem.objects.get_or_create(
                    barcode=barcode,
                    defaults={
                        'name': name,
                        'brand': brand,
                        'category': category,
                        'subcategory': subcategory,
                        'size': size,
                        'region_code': 'AFRICA',
                        'verified': True,  # These are verified products
                        'verification_count': 3
                    }
                )
                imported += 1

        self.stdout.write(f"Imported {imported} essential products")

    def import_african_products(self):
        """Import products specific to African markets"""
        self.stdout.write("Importing African-specific products...")

        african_products = [
            # South African Products
            ('6003827000018', 'Biltong Original 50g', 'Crown National', 'Food', 'Meat Snacks', '50g', 'ZA'),
            ('6009614861219', 'Boerewors 500g', 'Pick n Pay', 'Food', 'Meat', '500g', 'ZA'),
            ('6001240100035', 'Mrs Balls Chutney 470g', 'Mrs Balls', 'Food', 'Condiments', '470g', 'ZA'),
            ('6009510800135', 'Iwisa Maize Meal 5kg', 'Pioneer', 'Food', 'Staples', '5kg', 'ZA'),
            ('6001069600612', 'Rooibos Tea 80 bags', 'Five Roses', 'Beverages', 'Tea', '80 bags', 'ZA'),

            # Kenyan Products
            ('KE8996001256388', 'Ugali Flour 2kg', 'Unga', 'Food', 'Staples', '2kg', 'KE'),
            ('KE6161101130226', 'Tusker Lager 500ml', 'EABL', 'Beverages', 'Beer', '500ml', 'KE'),
            ('KE8720900903106', 'Ketepa Tea 100g', 'Ketepa', 'Beverages', 'Tea', '100g', 'KE'),
            ('KE5014378001131', 'Chapati Flour 2kg', 'Exe', 'Food', 'Staples', '2kg', 'KE'),

            # Nigerian Products
            ('NG6151000037633', 'Garri 1kg', 'Local', 'Food', 'Staples', '1kg', 'NG'),
            ('NG6008755100027', 'Palm Oil 1L', 'Local', 'Food', 'Cooking Oil', '1L', 'NG'),
            ('NG6154000011738', 'Milo 400g', 'Nestle', 'Beverages', 'Hot Drinks', '400g', 'NG'),
            ('NG8901030521065', 'Peak Milk Powder 400g', 'FrieslandCampina', 'Dairy', 'Milk Powder', '400g', 'NG'),

            # Common African Items
            ('AF0000000001', 'Cassava Flour 1kg', 'Local', 'Food', 'Staples', '1kg', 'AFRICA'),
            ('AF0000000002', 'Plantain Chips 150g', 'Local', 'Food', 'Snacks', '150g', 'AFRICA'),
            ('AF0000000003', 'Groundnuts Raw 500g', 'Local', 'Food', 'Nuts', '500g', 'AFRICA'),
            ('AF0000000004', 'Moringa Powder 100g', 'Local', 'Health', 'Supplements', '100g', 'AFRICA'),
            ('AF0000000005', 'Shea Butter 200g', 'Local', 'Personal Care', 'Skin Care', '200g', 'AFRICA'),
        ]

        imported = 0
        with transaction.atomic():
            for product_data in african_products:
                if len(product_data) == 7:
                    barcode, name, brand, category, subcategory, size, region = product_data
                else:
                    barcode, name, brand, category, subcategory, size = product_data
                    region = 'AFRICA'

                StoreItem.objects.get_or_create(
                    barcode=barcode,
                    defaults={
                        'name': name,
                        'brand': brand,
                        'category': category,
                        'subcategory': subcategory,
                        'size': size,
                        'region_code': region,
                        'verified': True,
                        'verification_count': 3
                    }
                )
                imported += 1

        self.stdout.write(f"Imported {imported} African products")