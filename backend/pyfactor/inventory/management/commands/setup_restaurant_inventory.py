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
        
        # Restaurant inventory includes both ingredients AND prepared food for sale
        restaurant_items = [
            # === PREPARED FOOD FOR SALE (Menu Items) ===
            {
                'name': 'Grilled Chicken Sandwich',
                'sku': 'MENU-001',
                'price': 15.00,
                'cost': 5.00,
                'quantity': 0,  # Made to order
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',  # This is a product for sale
                'description': 'Grilled chicken breast with lettuce, tomato on artisan bread',
            },
            {
                'name': 'Caesar Salad',
                'sku': 'MENU-002',
                'price': 12.00,
                'cost': 3.50,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Fresh romaine lettuce with parmesan, croutons and Caesar dressing',
            },
            {
                'name': 'Margherita Pizza',
                'sku': 'MENU-003',
                'price': 18.00,
                'cost': 6.00,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Fresh mozzarella, tomato sauce, basil on thin crust',
            },
            {
                'name': 'Beef Burger',
                'sku': 'MENU-004',
                'price': 16.50,
                'cost': 5.50,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Angus beef patty with cheese, lettuce, tomato, pickles',
            },
            {
                'name': 'Fish and Chips',
                'sku': 'MENU-005',
                'price': 14.00,
                'cost': 4.50,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Beer-battered cod with crispy fries and tartar sauce',
            },
            {
                'name': 'Pasta Carbonara',
                'sku': 'MENU-006',
                'price': 13.50,
                'cost': 4.00,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Spaghetti with bacon, egg, parmesan in creamy sauce',
            },
            {
                'name': 'Vegetable Stir Fry',
                'sku': 'MENU-007',
                'price': 11.00,
                'cost': 3.00,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'item',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Mixed vegetables wok-fried with garlic and ginger sauce',
            },
            {
                'name': 'Chocolate Cake',
                'sku': 'MENU-008',
                'price': 8.00,
                'cost': 2.50,
                'quantity': 5,  # Pre-made desserts
                'reorder_level': 3,
                'unit': 'slice',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Rich chocolate cake with chocolate ganache',
            },
            {
                'name': 'Cappuccino',
                'sku': 'BEV-010',
                'price': 4.50,
                'cost': 1.00,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'cup',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Espresso with steamed milk and foam',
            },
            {
                'name': 'Fresh Orange Juice',
                'sku': 'BEV-011',
                'price': 5.00,
                'cost': 1.50,
                'quantity': 0,
                'reorder_level': 0,
                'unit': 'glass',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Freshly squeezed orange juice',
            },
            # === RAW INGREDIENTS & SUPPLIES ===
            {
                'name': 'Fresh Tomatoes',
                'sku': 'VEG-001',
                'price': 5.00,
                'cost': 3.00,
                'quantity': 50,
                'reorder_level': 20,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'supply',  # Using 'supply' as 'ingredient' doesn't exist
                'description': 'Fresh ripe tomatoes for salads and cooking',
            },
            {
                'name': 'Coffee Beans - Arabica',
                'sku': 'BEV-001',
                'price': 25.00,
                'cost': 18.00,
                'quantity': 30,
                'reorder_level': 10,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'Premium arabica coffee beans',
            },
            {
                'name': 'Chicken Breast',
                'sku': 'MEAT-001',
                'price': 12.00,
                'cost': 8.00,
                'quantity': 25,
                'reorder_level': 15,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'Fresh chicken breast for main dishes',
            },
            {
                'name': 'Olive Oil - Extra Virgin',
                'sku': 'OIL-001',
                'price': 15.00,
                'cost': 10.00,
                'quantity': 20,
                'reorder_level': 5,
                'unit': 'liters',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'Premium extra virgin olive oil for cooking',
            },
            {
                'name': 'Paper Napkins',
                'sku': 'PKG-001',
                'price': 2.00,
                'cost': 1.00,
                'quantity': 500,
                'reorder_level': 200,
                'unit': 'pack',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Disposable paper napkins for customers',
            },
            {
                'name': 'Take-out Containers - Large',
                'sku': 'PKG-002',
                'price': 0.50,
                'cost': 0.30,
                'quantity': 200,
                'reorder_level': 100,
                'unit': 'piece',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Biodegradable take-out containers',
            },
            {
                'name': 'All-Purpose Flour',
                'sku': 'BAKE-001',
                'price': 3.00,
                'cost': 2.00,
                'quantity': 100,
                'reorder_level': 30,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'All-purpose flour for baking and cooking',
            },
            {
                'name': 'Fresh Milk',
                'sku': 'DAIRY-001',
                'price': 4.00,
                'cost': 2.50,
                'quantity': 40,
                'reorder_level': 20,
                'unit': 'liters',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'Fresh whole milk',
            },
            {
                'name': 'Dish Soap',
                'sku': 'CLEAN-001',
                'price': 5.00,
                'cost': 3.00,
                'quantity': 20,
                'reorder_level': 10,
                'unit': 'bottle',
                'material_type': 'consumable',
                'inventory_type': 'product',
                'description': 'Commercial grade dish soap',
            },
            {
                'name': 'Fresh Lettuce',
                'sku': 'VEG-002',
                'price': 3.00,
                'cost': 1.50,
                'quantity': 30,
                'reorder_level': 15,
                'unit': 'kg',
                'material_type': 'consumable',
                'inventory_type': 'supply',
                'description': 'Fresh lettuce for salads',
            },
        ]

        # Add restaurant items
        created_count = 0
        updated_count = 0
        
        # First, let's check what columns actually exist in the database
        from django.db import connection
        import uuid
        
        with connection.cursor() as cursor:
            # Get column information
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            self.stdout.write("\n📊 Database schema for inventory_product:")
            for col in columns:
                nullable = "NULL" if col[2] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col[3]}" if col[3] else ""
                self.stdout.write(f"   - {col[0]}: {col[1]} {nullable}{default}")
        
        self.stdout.write("\n")
        
        for item_data in restaurant_items:
            try:
                # Copy the item data and add tenant_id
                cleaned_data = item_data.copy()
                cleaned_data['tenant_id'] = user.tenant.id
                
                # TEMPORARY: Add fields that exist in DB but not in model
                # These fields exist in DB with NOT NULL constraints but not in model yet
                cleaned_data['storage_temperature'] = 'Room Temperature'
                cleaned_data['allergen_info'] = '[]'  # Empty JSON array for allergen_info
                cleaned_data['batch_number'] = ''  # Empty string for batch_number
                cleaned_data['manufacturer'] = ''  # Empty string for manufacturer
                cleaned_data['controlled_substance_schedule'] = ''  # Empty string for controlled_substance_schedule
                cleaned_data['prescription_required'] = False  # Boolean default
                
                # Use raw SQL to insert since the field doesn't exist in the model
                from django.db import connection
                import uuid
                
                with connection.cursor() as cursor:
                    # First check if product with this SKU exists
                    cursor.execute("""
                        SELECT id FROM inventory_product 
                        WHERE tenant_id = %s AND sku = %s
                    """, [user.tenant.id, cleaned_data['sku']])
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing product
                        cursor.execute("""
                            UPDATE inventory_product SET
                                name = %s,
                                description = %s,
                                price = %s,
                                cost = %s,
                                quantity = %s,
                                reorder_level = %s,
                                unit = %s,
                                storage_temperature = %s,
                                updated_at = NOW()
                            WHERE tenant_id = %s AND sku = %s
                        """, [
                            cleaned_data['name'],
                            cleaned_data['description'],
                            cleaned_data['price'],
                            cleaned_data['cost'],
                            cleaned_data['quantity'],
                            cleaned_data['reorder_level'],
                            cleaned_data['unit'],
                            cleaned_data['storage_temperature'],
                            user.tenant.id,
                            cleaned_data['sku']
                        ])
                        updated_count += 1
                        self.stdout.write(f"  ↻ Updated: {item_data['name']}")
                    else:
                        # Insert new product
                        cursor.execute("""
                            INSERT INTO inventory_product (
                                tenant_id, id, name, description, sku, 
                                inventory_type, material_type, price, cost, 
                                quantity, reorder_level, unit, storage_temperature,
                                allergen_info, batch_number, manufacturer,
                                prescription_required, controlled_substance_schedule,
                                created_at, updated_at, is_active, 
                                markup_percentage, is_billable, pricing_model,
                                weight_unit, is_tax_exempt, tax_category
                            ) VALUES (
                                %s, %s, %s, %s, %s,
                                %s, %s, %s, %s,
                                %s, %s, %s, %s,
                                %s, %s, %s,
                                %s, %s,
                                NOW(), NOW(), true,
                                0, true, 'direct',
                                'kg', false, 'standard'
                            )
                        """, [
                            user.tenant.id,
                            str(uuid.uuid4()),
                            cleaned_data['name'],
                            cleaned_data['description'],
                            cleaned_data['sku'],
                            cleaned_data['inventory_type'],
                            cleaned_data['material_type'],
                            cleaned_data['price'],
                            cleaned_data['cost'],
                            cleaned_data['quantity'],
                            cleaned_data['reorder_level'],
                            cleaned_data['unit'],
                            cleaned_data['storage_temperature'],
                            cleaned_data['allergen_info'],
                            cleaned_data['batch_number'],
                            cleaned_data['manufacturer'],
                            cleaned_data['prescription_required'],
                            cleaned_data['controlled_substance_schedule']
                        ])
                        created_count += 1
                        self.stdout.write(f"  ✅ Added: {item_data['name']}")
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
        self.stdout.write("   - Includes both menu items (products) and raw ingredients (supplies)")
        self.stdout.write("\n✅ Script completed successfully!")