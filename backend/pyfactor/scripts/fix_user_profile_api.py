#!/usr/bin/env python3
"""
Fix user profile API to return business details for courier users
Run this on Render shell: python manage.py shell < scripts/fix_user_profile_api.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, Business

User = get_user_model()

# Test user email
TEST_EMAIL = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CHECKING USER PROFILE API DATA")
print("="*60)

# Get user
user = User.objects.filter(email=TEST_EMAIL).first()

if not user:
    print(f"❌ User not found: {TEST_EMAIL}")
    exit(1)

print(f"✅ Found user: {user.email} (ID: {user.id})")

# Check UserProfile
profile = UserProfile.objects.filter(user=user).first()
if profile:
    print(f"\n📱 UserProfile Details:")
    print(f"  - user_mode: {profile.user_mode}")
    print(f"  - has_business_access: {profile.has_business_access}")
    print(f"  - business_id: {profile.business_id}")
    
    # Check Business
    if profile.business_id:
        business = Business.objects.filter(id=profile.business_id).first()
        if business:
            print(f"\n🏢 Business Details:")
            print(f"  - name: {business.name}")
            print(f"  - business_type: {business.business_type}")
            print(f"  - simplified_business_type: {business.simplified_business_type}")
            print(f"  - marketplace_category: {business.marketplace_category}")
            print(f"  - owner_id: {business.owner_id}")
            
            # Check if owner_id matches user ID (as UUID)
            owner_uuid = f"00000000-0000-0000-0000-{user.id:012x}"
            if str(business.owner_id) == owner_uuid:
                print(f"  ✅ Owner ID matches user")
            else:
                print(f"  ❌ Owner ID mismatch!")
                print(f"    Expected: {owner_uuid}")
                print(f"    Actual: {business.owner_id}")
        else:
            print(f"  ❌ Business not found with ID: {profile.business_id}")
    else:
        print(f"  ❌ No business_id in profile")
else:
    print(f"❌ UserProfile not found")

print("\n" + "="*60)
print("API RESPONSE STRUCTURE")
print("="*60)

# What the API should return
print("\nThe /users/me/ API should return:")
print("""
{
    "user": {
        "id": 302,
        "email": "phone_211925550100@dottapps.com",
        "has_business": true,
        "business_name": "Steve's Courier Service",
        "business_type": "courier",
        "user_mode": "business"
    },
    ...
}
""")

print("\nTo fix menu display, the mobile app needs:")
print("1. business_type: 'courier' (currently null)")
print("2. business_name: 'Steve's Courier Service' (currently 'User 302')")
print("3. user_mode: 'business' (to show business features)")

print("="*60 + "\n")