#!/usr/bin/env python
"""
Diagnostic script to analyze why support@dottapps.com business is not showing as "Dott Restaurant and Cafe"
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from users.models import UserProfile, Business

def diagnose_support_user():
    """Comprehensive diagnosis of support@dottapps.com business name issue"""
    
    print("🔍 DIAGNOSING SUPPORT@DOTTAPPS.COM BUSINESS NAME ISSUE")
    print("=" * 60)
    
    # 1. Find the user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        print(f"   - First Name: {user.first_name}")
        print(f"   - Last Name: {user.last_name}")
        print(f"   - Business ID: {user.business_id}")
        print(f"   - Tenant ID: {user.tenant_id}")
        print(f"   - Onboarding Completed: {user.onboarding_completed}")
        print(f"   - Role: {user.role}")
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found!")
        return False
    
    # 2. Check UserProfile
    print("\n📋 CHECKING USER PROFILE")
    print("-" * 30)
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✅ Found UserProfile: {profile.id}")
        print(f"   - Business ID: {profile.business_id}")
        print(f"   - Tenant ID: {profile.tenant_id}")
        print(f"   - Country: {profile.country}")
        print(f"   - Phone: {profile.phone_number}")
        print(f"   - Is Business Owner: {profile.is_business_owner}")
        
        # Check if profile has business relationship
        business = profile.business
        if business:
            print(f"✅ Profile has business relationship:")
            print(f"   - Business Name: {business.name}")
            print(f"   - Business Type: {business.business_type}")
            print(f"   - Simplified Type: {business.simplified_business_type}")
        else:
            print("❌ Profile has no business relationship")
            
        # Test the business_name property access that fails in session API
        try:
            if hasattr(profile, 'business_name'):
                business_name_from_profile = profile.business_name
                print(f"   - profile.business_name: {business_name_from_profile}")
            else:
                print("❌ profile.business_name attribute does not exist")
        except Exception as e:
            print(f"❌ Error accessing profile.business_name: {e}")
            
    except UserProfile.DoesNotExist:
        print("❌ UserProfile not found for support@dottapps.com")
        profile = None
    
    # 3. Check Business records
    print("\n🏢 CHECKING BUSINESS RECORDS")
    print("-" * 30)
    
    # Check businesses linked to user
    businesses = Business.objects.filter(owner_id=user.id)
    if businesses.exists():
        print(f"✅ Found {businesses.count()} business(es) owned by user:")
        for business in businesses:
            print(f"   - ID: {business.id}")
            print(f"   - Name: {business.name}")
            print(f"   - Business Name (property): {business.business_name}")
            print(f"   - Type: {business.business_type}")
            print(f"   - Simplified Type: {business.simplified_business_type}")
            print(f"   - Tenant ID: {business.tenant_id}")
            print(f"   - Owner ID: {business.owner_id}")
            print(f"   - Is Active: {business.is_active}")
    else:
        print("❌ No businesses found owned by user")
    
    # Search for "Dott Restaurant" businesses
    restaurant_businesses = Business.objects.filter(name__icontains="Dott Restaurant")
    if restaurant_businesses.exists():
        print(f"\n✅ Found {restaurant_businesses.count()} 'Dott Restaurant' business(es):")
        for business in restaurant_businesses:
            print(f"   - ID: {business.id}")
            print(f"   - Name: {business.name}")
            print(f"   - Owner ID: {business.owner_id}")
            print(f"   - Tenant ID: {business.tenant_id}")
            print(f"   - Type: {business.business_type}")
    else:
        print("❌ No 'Dott Restaurant' businesses found in database")
    
    # 4. Check Tenant records
    print("\n🏬 CHECKING TENANT RECORDS")
    print("-" * 30)
    
    if user.tenant_id:
        try:
            tenant = Tenant.objects.get(id=user.tenant_id)
            print(f"✅ Found tenant: {tenant.name} (ID: {tenant.id})")
            print(f"   - Owner ID: {tenant.owner_id}")
            print(f"   - Schema Name: {tenant.schema_name}")
            print(f"   - Is Active: {tenant.is_active}")
        except Tenant.DoesNotExist:
            print(f"❌ Tenant with ID {user.tenant_id} not found")
    else:
        print("❌ User has no tenant_id")
    
    # 5. Test Session API Logic
    print("\n🔐 TESTING SESSION API LOGIC")
    print("-" * 30)
    
    if profile:
        # This is what the session API tries to do
        try:
            business_name = getattr(profile, 'business_name', None)
            print(f"profile.business_name (session API logic): {business_name}")
        except Exception as e:
            print(f"❌ Error with session API logic: {e}")
        
        # Better approach would be:
        try:
            if profile.business:
                correct_business_name = profile.business.business_name
                print(f"profile.business.business_name (correct): {correct_business_name}")
            else:
                print("❌ No business linked to profile")
        except Exception as e:
            print(f"❌ Error accessing business name through relationship: {e}")
    
    # 6. Check API response data format
    print("\n📊 TESTING API RESPONSE FORMAT")
    print("-" * 30)
    
    if profile:
        # Test to_dict method
        try:
            profile_dict = profile.to_dict()
            print(f"profile.to_dict()['business_name']: {profile_dict.get('business_name', 'NOT SET')}")
        except Exception as e:
            print(f"❌ Error with to_dict method: {e}")
    
    # 7. Summary and recommendations
    print("\n📝 DIAGNOSIS SUMMARY")
    print("-" * 30)
    
    issues_found = []
    
    # Check if user has business
    if not Business.objects.filter(owner_id=user.id).exists():
        issues_found.append("User has no Business record")
    
    # Check if profile exists
    if not profile:
        issues_found.append("User has no UserProfile")
    elif not profile.business:
        issues_found.append("UserProfile has no business relationship")
    
    # Check if "Dott Restaurant" exists but not linked
    if restaurant_businesses.exists() and profile:
        restaurant_business = restaurant_businesses.first()
        if profile.business_id != restaurant_business.id:
            issues_found.append(f"'Dott Restaurant' business exists but not linked to profile")
    
    if issues_found:
        print("❌ Issues found:")
        for issue in issues_found:
            print(f"   - {issue}")
    else:
        print("✅ No obvious issues found with data relationships")
    
    print("\n🔧 RECOMMENDED FIXES")
    print("-" * 30)
    
    if not profile:
        print("1. Create UserProfile for support@dottapps.com")
    
    if not Business.objects.filter(owner_id=user.id).exists():
        print("2. Create or link Business record with name 'Dott Restaurant & Cafe'")
    
    if profile and not profile.business:
        print("3. Link existing Business to UserProfile")
    
    # Check the session API bug
    print("4. Fix session API to use profile.business.business_name instead of profile.business_name")
    
    return True

if __name__ == '__main__':
    diagnose_support_user()