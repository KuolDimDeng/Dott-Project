#!/usr/bin/env python3
"""
Convert test user to courier business
Run this on Render shell: python manage.py shell < scripts/convert_to_courier_business.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from users.models import UserProfile, Business

User = get_user_model()

# Test user email
TEST_EMAIL = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CONVERTING TO COURIER BUSINESS")
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
        
        # Update to courier type
        business.business_type = 'courier'
        business.simplified_business_type = 'SERVICE'
        business.marketplace_category = 'Transport'
        business.name = "Steve's Courier Service"
        business.delivery_scope = 'local'
        business.save()
        
        print(f"✅ Updated business to courier type")
        print(f"  New name: {business.name}")
        print(f"  New type: {business.business_type}")
    else:
        print(f"\n⚠️ No business found, creating courier business...")
        
        # Create courier business
        business = Business.objects.create(
            owner_id=user.id,
            name="Steve's Courier Service",
            business_type='courier',
            simplified_business_type='SERVICE',
            marketplace_category='Transport',
            delivery_scope='local',
            country='SS',
            city='Juba',
            tenant_id=user.tenant_id if user.tenant else None
        )
        print(f"✅ Created courier business: {business.name}")
    
    # Update UserProfile
    profile = UserProfile.objects.filter(user=user).first()
    if profile:
        profile.business_id = str(business.id)
        profile.business_name = business.name
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