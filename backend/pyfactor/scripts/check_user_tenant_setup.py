#!/usr/bin/env python
"""
Check if user and tenant are properly set up for phone authentication
Run with: python manage.py shell < scripts/check_user_tenant_setup.py
"""

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from users.models import UserProfile

User = get_user_model()

# Test user email (phone auth creates this email format)
test_email = "phone_211925550100@dottapps.com"

print("\n" + "="*60)
print("CHECKING USER AND TENANT SETUP")
print("="*60)

# Check if user exists
try:
    user = User.objects.get(email=test_email)
    print(f"\n✅ User found: {user.email}")
    print(f"   - ID: {user.id}")
    print(f"   - Phone: {user.phone_number}")
    print(f"   - Tenant ID: {user.tenant_id if hasattr(user, 'tenant_id') else 'No tenant_id field'}")
    print(f"   - Tenant: {user.tenant if hasattr(user, 'tenant') else 'No tenant relation'}")
    print(f"   - Onboarding completed: {user.onboarding_completed}")
    
    # Check if tenant exists
    if hasattr(user, 'tenant') and user.tenant:
        tenant = user.tenant
        print(f"\n✅ Tenant found:")
        print(f"   - Tenant ID: {tenant.id}")
        print(f"   - Tenant Name: {tenant.name}")
        print(f"   - Owner ID: {tenant.owner_id}")
        print(f"   - Is Active: {tenant.is_active}")
    else:
        print(f"\n❌ No tenant assigned to user")
        
        # Check if tenant exists but not linked
        tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
        if tenant:
            print(f"   ⚠️ Found orphaned tenant with owner_id={user.id}")
            print(f"   - Tenant ID: {tenant.id}")
            print(f"   - You may need to link: user.tenant = tenant; user.save()")
    
    # Check UserProfile
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"\n✅ UserProfile found:")
        print(f"   - User Mode: {profile.user_mode if hasattr(profile, 'user_mode') else 'No user_mode field'}")
        print(f"   - Default Mode: {profile.default_mode if hasattr(profile, 'default_mode') else 'No default_mode field'}")
        print(f"   - Has Consumer Access: {profile.has_consumer_access if hasattr(profile, 'has_consumer_access') else 'No has_consumer_access field'}")
        print(f"   - Has Business Access: {profile.has_business_access if hasattr(profile, 'has_business_access') else 'No has_business_access field'}")
        print(f"   - Tenant ID: {profile.tenant_id if hasattr(profile, 'tenant_id') else 'No tenant_id field'}")
        print(f"   - Business ID: {profile.business_id if hasattr(profile, 'business_id') else 'No business_id field'}")
    except UserProfile.DoesNotExist:
        print(f"\n❌ UserProfile not found for user")
        
except User.DoesNotExist:
    print(f"\n❌ User not found: {test_email}")
    print("   The user may not have been created yet.")
    print("   Try logging in with phone +211925550100 first.")

print("\n" + "="*60)
print("QUICK FIX COMMANDS (if needed):")
print("="*60)
print("""
# If user exists but no tenant:
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
User = get_user_model()
user = User.objects.get(email='phone_211925550100@dottapps.com')
tenant = Tenant.objects.create(
    name=f'User {user.id}',
    owner_id=str(user.id),
    is_active=True
)
user.tenant = tenant
user.save()

# If UserProfile missing user_mode:
from users.models import UserProfile
profile = UserProfile.objects.get(user=user)
profile.user_mode = 'consumer'
profile.default_mode = 'consumer'
profile.has_consumer_access = True
profile.has_business_access = False
profile.tenant_id = tenant.id
profile.save()
""")
print("="*60 + "\n")