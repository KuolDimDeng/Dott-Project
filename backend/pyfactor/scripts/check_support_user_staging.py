#!/usr/bin/env python
"""
Quick diagnostic script to check support@dottapps.com user on staging
Run in Django shell: python manage.py shell < scripts/check_support_user_staging.py
"""

from custom_auth.models import User
from users.models import Business, UserProfile

def check_support_user():
    print("\n" + "="*60)
    print("CHECKING SUPPORT USER ON STAGING")
    print("="*60 + "\n")
    
    # Find the user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ User found: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Role: {user.role}")
        print(f"   Has tenant: {bool(user.tenant)}")
        if user.tenant:
            print(f"   Tenant ID: {user.tenant.id}")
            print(f"   Tenant name: {user.tenant.name}")
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found!")
        return
    
    # Check for business ownership
    print("\n📊 Business Ownership Check:")
    businesses = Business.objects.filter(owner_id=user.id)
    if businesses.exists():
        print(f"✅ User owns {businesses.count()} business(es):")
        for business in businesses:
            print(f"   - {business.name} (ID: {business.id})")
    else:
        print("❌ No businesses found for this user")
    
    # Check UserProfile
    print("\n👤 UserProfile Check:")
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✅ UserProfile found")
        print(f"   Onboarding completed: {profile.onboarding_completed}")
        print(f"   Business ID: {profile.business_id}")
        print(f"   Tenant ID: {profile.tenant_id}")
    except UserProfile.DoesNotExist:
        print("❌ No UserProfile found")
    
    # Test the has_business logic (as implemented in session_v2.py)
    print("\n🎯 Testing has_business Logic:")
    print(f"   Old logic (bool(user.tenant)): {bool(user.tenant)}")
    has_business = Business.objects.filter(owner_id=user.id).exists()
    print(f"   New logic (Business ownership): {has_business}")
    
    if has_business:
        print("\n✅ EXPECTED RESULT: Business menu should appear in mobile app")
    else:
        print("\n❌ PROBLEM: Business menu will NOT appear in mobile app")
        print("   The user needs to have a Business record with owner_id = user.id")

if __name__ == '__main__':
    check_support_user()