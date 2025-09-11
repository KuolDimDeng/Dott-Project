#!/usr/bin/env python
"""
Script to fix support@dottapps.com user's business
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import User, UserProfile

def fix_support_business():
    """Fix support user business"""
    
    try:
        # Find the user
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Convert integer ID to UUID format (padded with zeros)
        # Format: 00000000-0000-0000-0000-0000000000fa (where fa = 250 in hex)
        import uuid
        business_uuid = uuid.UUID(f'00000000-0000-0000-0000-{user.id:012x}')
        print(f"📦 Business UUID: {business_uuid}")
        
        # Use raw SQL to update or create the business
        with connection.cursor() as cursor:
            # Check if business exists
            cursor.execute("SELECT id FROM users_business WHERE id = %s", [str(business_uuid)])
            business_exists = cursor.fetchone()
            
            if business_exists:
                # Update existing business
                cursor.execute("""
                    UPDATE users_business 
                    SET name = %s,
                        business_type = %s,
                        simplified_business_type = %s,
                        entity_type = %s,
                        registration_status = %s,
                        legal_structure = %s,
                        phone = %s,
                        email = %s,
                        address = %s,
                        city = %s,
                        country = %s
                    WHERE id = %s
                """, [
                    'Dott Restaurant & Cafe',
                    'RESTAURANT_CAFE',
                    'RESTAURANT',
                    'SMALL_BUSINESS',
                    'REGISTERED',
                    'SOLE_PROPRIETORSHIP',
                    '+211912345678',
                    'restaurant@dottapps.com',
                    '123 Restaurant Street',
                    'Juba',
                    'SS',
                    str(business_uuid)
                ])
                print(f"✅ Updated existing business to RESTAURANT_CAFE")
            else:
                # Create new business with all required fields
                cursor.execute("""
                    INSERT INTO users_business (
                        id, name, business_type, simplified_business_type,
                        entity_type, registration_status, legal_structure,
                        phone, email, address, city, country,
                        primary_interaction_type, tenant_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        NOW(), NOW()
                    )
                """, [
                    str(business_uuid),  # id
                    'Dott Restaurant & Cafe',  # name
                    'RESTAURANT_CAFE',  # business_type
                    'RESTAURANT',  # simplified_business_type
                    'SMALL_BUSINESS',  # entity_type
                    'REGISTERED',  # registration_status
                    'SOLE_PROPRIETORSHIP',  # legal_structure
                    '+211912345678',  # phone
                    'restaurant@dottapps.com',  # email
                    '123 Restaurant Street',  # address
                    'Juba',  # city
                    'SS',  # country
                    'local',  # primary_interaction_type (using 'local' as a safe default)
                    str(business_uuid)  # tenant_id should match business id
                ])
                print(f"✅ Created new business as RESTAURANT_CAFE")
        
        # Update or create user profile
        user_profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={'business_id': business_uuid}
        )
        if not profile_created:
            user_profile.business_id = business_uuid
            user_profile.save()
            print(f"✅ Updated existing user profile - business_id: {business_uuid}")
        else:
            print(f"✅ Created user profile with business_id: {business_uuid}")
        
        print(f"\n✅ Successfully updated support@dottapps.com to RESTAURANT_CAFE business type")
        print(f"📍 Business Name: Dott Restaurant & Cafe")
        print(f"🍽️ Business Type: RESTAURANT_CAFE")
        print(f"🎯 Simplified Type: RESTAURANT (gets free POS, Inventory, Menu features)")
        
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
    print("🍴 Fixing support@dottapps.com Business...")
    print("=" * 60)
    success = fix_support_business()
    if success:
        print("\n✅ Script completed successfully!")
    else:
        print("\n❌ Script failed. Please check the errors above.")