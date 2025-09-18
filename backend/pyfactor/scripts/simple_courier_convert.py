#!/usr/bin/env python3
"""
Simple script to convert test user to courier business
Run this on Render shell: python manage.py shell < scripts/simple_courier_convert.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction, connection
from users.models import UserProfile, Business

User = get_user_model()

# Test user email
TEST_EMAIL = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CONVERTING TO COURIER BUSINESS (SIMPLE)")
print("="*60)

with transaction.atomic():
    # Get user
    user = User.objects.filter(email=TEST_EMAIL).first()
    
    if not user:
        print(f"❌ User not found: {TEST_EMAIL}")
        exit(1)
    
    print(f"✅ Found user: {user.email}")
    
    # Check if business exists
    business = Business.objects.filter(owner_id=user.id).first()
    
    if business:
        print(f"\n✅ Business exists: {business.name}")
        print(f"  Current type: {business.business_type}")
        
        # Update using raw SQL to avoid field issues
        with connection.cursor() as cursor:
            # Check if primary_interaction_type column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users_business' 
                AND column_name='primary_interaction_type'
            """)
            has_interaction_field = cursor.fetchone() is not None
            
            if has_interaction_field:
                cursor.execute("""
                    UPDATE users_business 
                    SET business_type = 'courier',
                        simplified_business_type = 'SERVICE',
                        marketplace_category = 'Transport',
                        name = 'Steve''s Courier Service',
                        delivery_scope = 'local',
                        primary_interaction_type = 'order'
                    WHERE id = %s
                """, [str(business.id)])
            else:
                cursor.execute("""
                    UPDATE users_business 
                    SET business_type = 'courier',
                        simplified_business_type = 'SERVICE',
                        marketplace_category = 'Transport',
                        name = 'Steve''s Courier Service',
                        delivery_scope = 'local'
                    WHERE id = %s
                """, [str(business.id)])
        
        print(f"✅ Updated business to courier type using SQL")
    else:
        print(f"\n⚠️ No business found, creating courier business...")
        
        # Check if primary_interaction_type exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users_business' 
                AND column_name='primary_interaction_type'
            """)
            has_interaction_field = cursor.fetchone() is not None
        
        # Create with raw SQL to handle field differences
        with connection.cursor() as cursor:
            import uuid
            business_id = str(uuid.uuid4())
            
            # Convert user.id to UUID format (00000000-0000-0000-0000-0000000000XX)
            owner_uuid = f"00000000-0000-0000-0000-{user.id:012x}"
            
            if has_interaction_field:
                cursor.execute("""
                    INSERT INTO users_business (
                        id, owner_id, name, business_type, simplified_business_type,
                        marketplace_category, delivery_scope, country, city,
                        primary_interaction_type, tenant_id, created_at, updated_at
                    ) VALUES (
                        %s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, [
                    business_id, owner_uuid, "Steve's Courier Service", 'courier', 'SERVICE',
                    'Transport', 'local', 'SS', 'Juba', 'order',
                    str(user.tenant_id) if user.tenant else None
                ])
            else:
                cursor.execute("""
                    INSERT INTO users_business (
                        id, owner_id, name, business_type, simplified_business_type,
                        marketplace_category, delivery_scope, country, city,
                        tenant_id, created_at, updated_at
                    ) VALUES (
                        %s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, [
                    business_id, owner_uuid, "Steve's Courier Service", 'courier', 'SERVICE',
                    'Transport', 'local', 'SS', 'Juba',
                    str(user.tenant_id) if user.tenant else None
                ])
        
        print(f"✅ Created courier business with ID: {business_id}")
        
        # Get the created business
        business = Business.objects.get(id=business_id)
    
    # Update UserProfile
    profile = UserProfile.objects.filter(user=user).first()
    if profile:
        profile.business_id = str(business.id)
        profile.business_name = "Steve's Courier Service"
        profile.business_type = 'courier'
        profile.user_mode = 'business'  # Switch to business mode
        profile.has_business_access = True
        profile.save()
        print(f"✅ Updated UserProfile to business mode")

print("\n" + "="*60)
print("CONVERSION COMPLETE")
print("="*60)
print(f"Business Name: Steve's Courier Service")
print(f"Business Type: courier")
print(f"Category: Transport")
print(f"Mode: Business")
print("\nThe user should now see:")
print("  - Deliveries menu option")
print("  - NO POS or Inventory options")
print("  - Courier-specific features")
print("="*60 + "\n")