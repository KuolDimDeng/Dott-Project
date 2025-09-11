#!/usr/bin/env python
"""
Script to update support@dottapps.com user's business to restaurant type
This will allow testing of the restaurant-specific inventory features
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from users.models import User, Business, UserProfile
from inventory.models import Product
from datetime import datetime, timedelta
import random

def update_user_to_restaurant():
    """Update support user to restaurant business type"""
    
    try:
        # Find the user
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Get or create business
        business, created = Business.objects.get_or_create(
            id=user.id,  # Business ID matches User ID in this system
            defaults={
                'name': 'Dott Restaurant & Cafe',
                'business_type': 'RESTAURANT_CAFE',
                'simplified_business_type': 'RESTAURANT',
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
            business.name = 'Dott Restaurant & Cafe'
            business.business_type = 'RESTAURANT_CAFE'
            business.simplified_business_type = 'RESTAURANT'
            business.entity_type = 'SMALL_BUSINESS'
            business.save()
            print(f"✅ Updated existing business to RESTAURANT_CAFE")
        else:
            print(f"✅ Created new business as RESTAURANT_CAFE")
        
        # Update user profile if needed
        user_profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'business_id': business.id}
        )
        if not profile_created:
            user_profile.business_id = business.id
            user_profile.save()
            print(f"✅ Updated existing user profile - business_id: {business.id}")
        else:
            print(f"✅ Created user profile with business_id: {business.id}")
        
        # Add some restaurant-specific sample inventory items
        print("\n📦 Adding restaurant-specific inventory items...")
        
        restaurant_items = [
            {
                'name': 'Fresh Tomatoes',
                'sku': 'VEG-001',
                'category': 'Food Items',
                'price': 5.00,
                'cost': 3.00,
                'quantity_on_hand': 50,
                'reorder_point': 20,
                'unit': 'kg',
                'expiry_date': datetime.now() + timedelta(days=7),
                'storage_temperature': '4-8°C',
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
                'reorder_point': 10,
                'unit': 'kg',
                'expiry_date': datetime.now() + timedelta(days=90),
                'storage_temperature': 'Room temperature',
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
                'reorder_point': 15,
                'unit': 'kg',
                'expiry_date': datetime.now() + timedelta(days=3),
                'storage_temperature': '-18°C',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh chicken breast for main dishes',
                'allergen_info': ['None'],
            },
            {
                'name': 'Olive Oil - Extra Virgin',
                'sku': 'OIL-001',
                'category': 'Food Items',
                'price': 15.00,
                'cost': 10.00,
                'quantity_on_hand': 20,
                'reorder_point': 5,
                'unit': 'liters',
                'expiry_date': datetime.now() + timedelta(days=365),
                'storage_temperature': 'Cool, dark place',
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
                'reorder_point': 200,
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
                'reorder_point': 100,
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
                'reorder_point': 30,
                'unit': 'kg',
                'expiry_date': datetime.now() + timedelta(days=180),
                'storage_temperature': 'Cool, dry place',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'All-purpose flour for baking and cooking',
                'allergen_info': ['Gluten'],
            },
            {
                'name': 'Fresh Milk',
                'sku': 'DAIRY-001',
                'category': 'Beverages',
                'price': 4.00,
                'cost': 2.50,
                'quantity_on_hand': 40,
                'reorder_point': 20,
                'unit': 'liters',
                'expiry_date': datetime.now() + timedelta(days=5),
                'storage_temperature': '2-4°C',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh whole milk',
                'allergen_info': ['Dairy'],
            },
            {
                'name': 'Dish Soap',
                'sku': 'CLEAN-001',
                'category': 'Cleaning Supplies',
                'price': 5.00,
                'cost': 3.00,
                'quantity_on_hand': 20,
                'reorder_point': 10,
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
                'reorder_point': 15,
                'unit': 'kg',
                'expiry_date': datetime.now() + timedelta(days=4),
                'storage_temperature': '4-8°C',
                'material_type': 'consumable',
                'inventory_type': 'ingredient',
                'description': 'Fresh lettuce for salads',
            },
        ]
        
        # Clear existing products for this business (optional)
        # Product.objects.filter(business=business).delete()
        # print("✅ Cleared existing products")
        
        # Add restaurant items
        with transaction.atomic():
            for item_data in restaurant_items:
                # Add business reference to item data
                item_data['business'] = business
                product, created = Product.objects.update_or_create(
                    business=business,
                    sku=item_data['sku'],
                    defaults=item_data
                )
                if created:
                    print(f"  ✅ Added: {item_data['name']}")
                else:
                    print(f"  ↻ Updated: {item_data['name']}")
        
        print(f"\n✅ Successfully updated support@dottapps.com to RESTAURANT_CAFE business type")
        print(f"📍 Business Name: {business.name}")
        print(f"🍽️ Business Type: {business.business_type}")
        print(f"📦 Added {len(restaurant_items)} restaurant-specific inventory items")
        print("\n🎉 You can now test the restaurant-specific inventory features!")
        print("   - Expiry date tracking")
        print("   - Storage temperature requirements")
        print("   - Allergen information")
        print("   - Recipe costing features")
        print("   - Waste tracking options")
        
    except User.DoesNotExist:
        print(f"❌ User support@dottapps.com not found")
        return False
    except Exception as e:
        print(f"❌ Error updating user: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    print("🍴 Updating support@dottapps.com to Restaurant Business Type...")
    print("=" * 60)
    success = update_user_to_restaurant()
    if success:
        print("\n✅ Script completed successfully!")
    else:
        print("\n❌ Script failed. Please check the errors above.")