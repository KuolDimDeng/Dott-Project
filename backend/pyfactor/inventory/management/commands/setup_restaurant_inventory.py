from django.core.management.base import BaseCommand
from django.db import connection
from users.models import User, Business, UserProfile
from inventory.models import Product
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Sets up restaurant inventory configuration for support@dottapps.com user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='support@dottapps.com',
            help='Email of user to update (default: support@dottapps.com)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing products before adding restaurant items'
        )

    def handle(self, *args, **options):
        email = options['email']
        clear_existing = options['clear_existing']

        self.stdout.write(f"🍴 Setting up restaurant configuration for {email}...")
        self.stdout.write("=" * 60)

        # Find the user
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"✅ Found user: {user.email} (ID: {user.id})"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User {email} not found"))
            return

        # Get or create business
        try:
            business, created = Business.objects.get_or_create(
                tenant_id=user.tenant.id,
                defaults={
                    'business_name': 'Dott Restaurant & Cafe',
                    'business_type': 'RESTAURANT_CAFE',
                    'simplified_business_type': 'RETAIL',
                    'entity_type': 'SMALL_BUSINESS',
                    'registration_status': 'REGISTERED',
                    'phone': '+211912345678',
                    'email': 'restaurant@dottapps.com',
                    'address': '123 Restaurant Street',
                    'city': 'Juba',
                    'state': 'Central Equatoria',
                    'country': 'SS',
                }
            )

            if not created:
                # Update existing business
                business.business_name = 'Dott Restaurant & Cafe'
                business.business_type = 'RESTAURANT_CAFE'
                business.simplified_business_type = 'RETAIL'
                business.entity_type = 'SMALL_BUSINESS'
                business.save()
                self.stdout.write(self.style.SUCCESS("✅ Updated existing business to RESTAURANT_CAFE"))
            else:
                self.stdout.write(self.style.SUCCESS("✅ Created new business as RESTAURANT_CAFE"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Business update error (continuing): {str(e)}"))
            # Try to get existing business
            try:
                business = Business.objects.filter(tenant_id=user.tenant.id).first()
                if business:
                    business.business_type = 'RESTAURANT_CAFE'
                    business.simplified_business_type = 'RETAIL'
                    business.save()
                    self.stdout.write(self.style.SUCCESS("✅ Updated existing business type"))
            except:
                pass

        # Update user profile if needed
        try:
            user_profile = UserProfile.objects.filter(user=user).first()
            if user_profile:
                user_profile.has_business = True
                user_profile.save()
                self.stdout.write(self.style.SUCCESS("✅ Updated user profile - has_business: True"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ UserProfile update skipped: {str(e)}"))

        # Clear existing products if requested
        if clear_existing:
            try:
                deleted_count = Product.objects.filter(tenant=user.tenant).delete()[0]
                self.stdout.write(self.style.WARNING(f"🗑️ Cleared {deleted_count} existing products"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️ Could not clear products: {str(e)}"))

        # Add restaurant-specific inventory items
        self.stdout.write("\n📦 Adding restaurant-specific inventory items...")
        
        restaurant_items = [
            {
                'name': 'Fresh Tomatoes',
                'sku': 'VEG-001',
                'category': 'Food Items',
                'price': 5.00,
                'cost': 3.00,
                'quantity': 50,
                'reorder_level': 20,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh ripe tomatoes for salads and cooking',
            },
            {
                'name': 'Coffee Beans - Arabica',
                'sku': 'BEV-001',
                'category': 'Beverages',
                'price': 25.00,
                'cost': 18.00,
                'quantity_on_hand': 30,
                'reorder_level': 10,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Premium arabica coffee beans',
            },
            {
                'name': 'Chicken Breast',
                'sku': 'MEAT-001',
                'category': 'Food Items',
                'price': 12.00,
                'cost': 8.00,
                'quantity_on_hand': 25,
                'reorder_level': 15,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh chicken breast for main dishes',
            },
            {
                'name': 'Olive Oil - Extra Virgin',
                'sku': 'OIL-001',
                'category': 'Food Items',
                'price': 15.00,
                'cost': 10.00,
                'quantity_on_hand': 20,
                'reorder_level': 5,
                'unit': 'liters',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Premium extra virgin olive oil for cooking',
            },
            {
                'name': 'Paper Napkins',
                'sku': 'PKG-001',
                'category': 'Packaging',
                'price': 2.00,
                'cost': 1.00,
                'quantity_on_hand': 500,
                'reorder_level': 200,
                'unit': 'pack',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Disposable paper napkins for customers',
            },
            {
                'name': 'Take-out Containers - Large',
                'sku': 'PKG-002',
                'category': 'Packaging',
                'price': 0.50,
                'cost': 0.30,
                'quantity_on_hand': 200,
                'reorder_level': 100,
                'unit': 'piece',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Biodegradable take-out containers',
            },
            {
                'name': 'All-Purpose Flour',
                'sku': 'BAKE-001',
                'category': 'Food Items',
                'price': 3.00,
                'cost': 2.00,
                'quantity_on_hand': 100,
                'reorder_level': 30,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'All-purpose flour for baking and cooking',
            },
            {
                'name': 'Fresh Milk',
                'sku': 'DAIRY-001',
                'category': 'Beverages',
                'price': 4.00,
                'cost': 2.50,
                'quantity_on_hand': 40,
                'reorder_level': 20,
                'unit': 'liters',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh whole milk',
            },
            {
                'name': 'Dish Soap',
                'sku': 'CLEAN-001',
                'category': 'Cleaning Supplies',
                'price': 5.00,
                'cost': 3.00,
                'quantity_on_hand': 20,
                'reorder_level': 10,
                'unit': 'bottle',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Commercial grade dish soap',
            },
            {
                'name': 'Fresh Lettuce',
                'sku': 'VEG-002',
                'category': 'Food Items',
                'price': 3.00,
                'cost': 1.50,
                'quantity_on_hand': 30,
                'reorder_level': 15,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh lettuce for salads',
            },
        ]

        # Add restaurant items
        created_count = 0
        updated_count = 0
        for item_data in restaurant_items:
            try:
                # Remove fields that might not exist yet
                cleaned_data = {k: v for k, v in item_data.items() 
                              if k not in ['expiry_date', 'storage_temperature', 'allergen_info', 'tenant']}
                
                # Add tenant_id instead of tenant
                cleaned_data['tenant_id'] = user.tenant.id
                
                product, created = Product.objects.update_or_create(
                    tenant_id=user.tenant.id,
                    sku=item_data['sku'],
                    defaults=cleaned_data
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"  ✅ Added: {item_data['name']}")
                else:
                    updated_count += 1
                    self.stdout.write(f"  ↻ Updated: {item_data['name']}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠️ Skipped {item_data['name']}: {str(e)}"))
                continue

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"✅ Successfully updated {email} to RESTAURANT_CAFE business type"))
        if business:
            self.stdout.write(f"📍 Business Name: {business.business_name}")
            self.stdout.write(f"🍽️ Business Type: {business.business_type}")
        self.stdout.write(f"📦 Inventory: {created_count} items added, {updated_count} items updated")
        self.stdout.write("\n🎉 Restaurant-specific features now available in mobile app!")
        self.stdout.write("   - Menu shows 'Ingredients & Supplies' instead of 'Inventory'")
        self.stdout.write("   - Restaurant-specific categories and fields")
        self.stdout.write("\n✅ Script completed successfully!")