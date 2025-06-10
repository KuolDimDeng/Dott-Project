#!/usr/bin/env python
"""
Debug script to check tenant lookup issue for user kdeng@dottapps.com
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

def debug_tenant_issue():
    print("🔍 DEBUGGING TENANT LOOKUP ISSUE")
    print("=" * 50)
    
    # Find user
    email = "kdeng@dottapps.com"
    try:
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email}")
        print(f"   - User ID: {user.id} (type: {type(user.id).__name__})")
        print(f"   - User tenant: {user.tenant}")
        print(f"   - Auth0 sub: {getattr(user, 'auth0_sub', 'N/A')}")
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return
    
    # Check tenants
    print("\n🏢 CHECKING TENANTS:")
    print("-" * 50)
    
    # Method 1: By owner_id as string
    user_id_str = str(user.id)
    tenant_by_str = Tenant.objects.filter(owner_id=user_id_str).first()
    print(f"1. Lookup by owner_id='{user_id_str}' (string): {tenant_by_str}")
    
    # Method 2: By owner_id as integer
    tenant_by_int = Tenant.objects.filter(owner_id=user.id).first()
    print(f"2. Lookup by owner_id={user.id} (integer): {tenant_by_int}")
    
    # Method 3: All tenants with this user's ID in owner_id (partial match)
    all_matching = Tenant.objects.filter(owner_id__contains=str(user.id))
    print(f"3. Tenants with '{user.id}' in owner_id: {all_matching.count()} found")
    for t in all_matching:
        print(f"   - Tenant {t.id}: owner_id='{t.owner_id}' (type in DB: {type(t.owner_id).__name__})")
    
    # Method 4: Check user.tenant relationship
    if hasattr(user, 'tenant') and user.tenant:
        print(f"4. User.tenant relationship: {user.tenant.id}")
        print(f"   - Tenant name: {user.tenant.name}")
        print(f"   - Tenant owner_id: '{user.tenant.owner_id}'")
    else:
        print("4. User.tenant relationship: None")
    
    # Check all tenants to see what's in the database
    print("\n📊 ALL TENANTS IN DATABASE:")
    print("-" * 50)
    all_tenants = Tenant.objects.all()
    print(f"Total tenants: {all_tenants.count()}")
    for t in all_tenants[:10]:  # Show first 10
        print(f"   - ID: {t.id}, Name: {t.name}, Owner ID: '{t.owner_id}' (len: {len(str(t.owner_id))})")
    
    # Check onboarding progress
    print("\n📝 ONBOARDING PROGRESS:")
    print("-" * 50)
    try:
        progress = OnboardingProgress.objects.get(user=user)
        print(f"✅ Found progress: {progress.id}")
        print(f"   - Status: {progress.onboarding_status}")
        print(f"   - Tenant ID: {progress.tenant_id}")
        print(f"   - Setup completed: {progress.setup_completed}")
        print(f"   - Current step: {progress.current_step}")
        print(f"   - Completed steps: {progress.completed_steps}")
        
        # Check if progress tenant exists
        if progress.tenant_id:
            prog_tenant = Tenant.objects.filter(id=progress.tenant_id).first()
            print(f"   - Progress tenant exists: {prog_tenant is not None}")
            if prog_tenant:
                print(f"   - Progress tenant owner: '{prog_tenant.owner_id}'")
    except OnboardingProgress.DoesNotExist:
        print("❌ No onboarding progress found")
    
    print("\n💡 DIAGNOSIS:")
    print("-" * 50)
    if not tenant_by_str and not tenant_by_int:
        print("❌ NO TENANT FOUND - This is why user is redirected to onboarding!")
        print("   The user exists but has no associated tenant.")
        print("   Need to create a tenant for this user or fix the association.")
    elif tenant_by_int and not tenant_by_str:
        print("⚠️  TENANT EXISTS but with integer owner_id - need to convert to string!")
        print(f"   Run: UPDATE tenant SET owner_id = '{user_id_str}' WHERE owner_id = {user.id};")
    elif tenant_by_str:
        print("✅ TENANT EXISTS with correct string owner_id")
        print("   The backend fix is working correctly.")
        print("   Check if user.tenant relationship needs updating.")

if __name__ == "__main__":
    debug_tenant_issue()