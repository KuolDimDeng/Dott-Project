#!/usr/bin/env python
"""
Fix edge case where users have a session and tenant but onboarding is not marked as complete.
This handles users who got stuck between onboarding and dashboard.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, Business, BusinessDetails
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.utils import timezone
from datetime import datetime, timedelta

User = get_user_model()

def fix_user_onboarding_edge_case(email):
    """Fix onboarding for a specific user who has tenant but incomplete onboarding"""
    
    print(f"\n🔍 Checking user: {email}")
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return False
    
    # Check UserProfile
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✅ UserProfile found:")
        print(f"   - Business ID: {profile.business_id}")
        print(f"   - Tenant ID: {profile.tenant_id}")
        print(f"   - Onboarding Completed: {profile.onboarding_completed}")
        print(f"   - User Subscription: {profile.user_subscription}")
    except UserProfile.DoesNotExist:
        print(f"❌ No UserProfile found for user")
        profile = None
    
    # Check Tenant
    tenant = None
    if profile and profile.tenant_id:
        try:
            tenant = Tenant.objects.get(id=profile.tenant_id)
            print(f"✅ Tenant found: {tenant.name} (ID: {tenant.id})")
        except Tenant.DoesNotExist:
            print(f"⚠️ Tenant ID exists but Tenant not found: {profile.tenant_id}")
    
    # Check Business
    business = None
    if profile and profile.business_id:
        try:
            business = Business.objects.get(id=profile.business_id)
            print(f"✅ Business found: {business.name} (ID: {business.id})")
        except Business.DoesNotExist:
            print(f"⚠️ Business ID exists but Business not found: {profile.business_id}")
    
    # Check OnboardingProgress
    try:
        onboarding = OnboardingProgress.objects.get(user=user)
        print(f"✅ OnboardingProgress found:")
        print(f"   - Status: {onboarding.onboarding_status}")
        print(f"   - Current Step: {onboarding.current_step}")
        print(f"   - Completed Steps: {onboarding.completed_steps}")
        print(f"   - Setup Completed: {onboarding.setup_completed}")
    except OnboardingProgress.DoesNotExist:
        print(f"⚠️ No OnboardingProgress record found")
        onboarding = None
    
    # Detect the edge case
    has_edge_case = False
    if profile and (profile.tenant_id or profile.business_id):
        if not profile.onboarding_completed:
            has_edge_case = True
            print(f"\n⚠️ EDGE CASE DETECTED: User has tenant/business but onboarding not completed")
        elif onboarding and onboarding.onboarding_status != 'complete':
            has_edge_case = True
            print(f"\n⚠️ EDGE CASE DETECTED: UserProfile says complete but OnboardingProgress says {onboarding.onboarding_status}")
    
    if not has_edge_case:
        print(f"\n✅ No edge case detected - user appears to be in correct state")
        return True
    
    # Fix the edge case
    print(f"\n🔧 Fixing edge case...")
    
    # Ensure tenant exists or create one
    if not tenant and profile and profile.tenant_id:
        print(f"Creating missing tenant with ID: {profile.tenant_id}")
        tenant = Tenant.objects.create(
            id=profile.tenant_id,
            name=f"{user.email.split('@')[0]}'s Organization",
            owner=user,
            is_active=True,
            created_at=timezone.now()
        )
        print(f"✅ Created tenant: {tenant.name}")
    elif not tenant and not profile.tenant_id:
        print(f"Creating new tenant for user")
        tenant = Tenant.objects.create(
            name=f"{user.email.split('@')[0]}'s Organization",
            owner=user,
            is_active=True,
            created_at=timezone.now()
        )
        if profile:
            profile.tenant_id = tenant.id
            profile.save()
        print(f"✅ Created tenant: {tenant.name} (ID: {tenant.id})")
    
    # Ensure business exists or create one
    if not business and profile and profile.business_id:
        print(f"Creating missing business with ID: {profile.business_id}")
        business = Business.objects.create(
            id=profile.business_id,
            name=f"{user.email.split('@')[0]}'s Business",
            owner=user,
            tenant=tenant,
            is_active=True
        )
        print(f"✅ Created business: {business.name}")
    elif not business and tenant:
        print(f"Creating new business for user")
        business = Business.objects.create(
            name=f"{user.email.split('@')[0]}'s Business",
            owner=user,
            tenant=tenant,
            is_active=True
        )
        if profile:
            profile.business_id = business.id
            profile.save()
        print(f"✅ Created business: {business.name} (ID: {business.id})")
    
    # Update UserProfile
    if profile:
        profile.onboarding_completed = True
        if tenant:
            profile.tenant_id = tenant.id
        if business:
            profile.business_id = business.id
        if not profile.user_subscription:
            profile.user_subscription = 'professional'  # Default to professional
        profile.save()
        print(f"✅ Updated UserProfile - onboarding_completed = True")
    else:
        # Create UserProfile if missing
        profile = UserProfile.objects.create(
            user=user,
            onboarding_completed=True,
            tenant_id=tenant.id if tenant else None,
            business_id=business.id if business else None,
            user_subscription='professional'
        )
        print(f"✅ Created UserProfile with onboarding_completed = True")
    
    # Update or create OnboardingProgress
    if onboarding:
        onboarding.onboarding_status = 'complete'
        onboarding.setup_completed = True
        onboarding.current_step = 'completed'
        onboarding.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
        if not onboarding.selected_plan:
            onboarding.selected_plan = 'professional'
        onboarding.completed_at = timezone.now()
        onboarding.save()
        print(f"✅ Updated OnboardingProgress - status = complete")
    else:
        onboarding = OnboardingProgress.objects.create(
            user=user,
            onboarding_status='complete',
            setup_completed=True,
            current_step='completed',
            completed_steps=['business_info', 'subscription', 'payment', 'setup'],
            selected_plan='professional',
            payment_completed=True,
            completed_at=timezone.now()
        )
        print(f"✅ Created OnboardingProgress with status = complete")
    
    # Ensure BusinessDetails exists
    if business:
        try:
            business_details = BusinessDetails.objects.get(business=business)
            print(f"✅ BusinessDetails already exists")
        except BusinessDetails.DoesNotExist:
            business_details = BusinessDetails.objects.create(
                business=business,
                preferred_currency_code='USD',
                preferred_currency_name='US Dollar',
                preferred_currency_symbol='$'
            )
            print(f"✅ Created BusinessDetails with default currency")
    
    print(f"\n✅ Edge case fixed successfully for {email}")
    print(f"   - Tenant: {tenant.name if tenant else 'None'}")
    print(f"   - Business: {business.name if business else 'None'}")
    print(f"   - Onboarding: Complete")
    
    return True

def check_all_users_with_edge_case():
    """Find all users with the edge case"""
    
    print("\n🔍 Searching for all users with onboarding edge case...")
    
    # Find users with tenant/business but incomplete onboarding
    profiles_with_issue = UserProfile.objects.filter(
        tenant_id__isnull=False,
        onboarding_completed=False
    ) | UserProfile.objects.filter(
        business_id__isnull=False,
        onboarding_completed=False
    )
    
    if profiles_with_issue.exists():
        print(f"\n⚠️ Found {profiles_with_issue.count()} users with edge case:")
        for profile in profiles_with_issue:
            print(f"   - {profile.user.email}")
    else:
        print(f"✅ No users found with edge case")
    
    # Also check for OnboardingProgress mismatches
    onboarding_issues = OnboardingProgress.objects.exclude(onboarding_status='complete').filter(
        user__userprofile__onboarding_completed=True
    )
    
    if onboarding_issues.exists():
        print(f"\n⚠️ Found {onboarding_issues.count()} users with OnboardingProgress mismatch:")
        for onboarding in onboarding_issues:
            print(f"   - {onboarding.user.email}")
    
    return profiles_with_issue, onboarding_issues

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix onboarding edge case for users')
    parser.add_argument('--email', help='Email of specific user to fix')
    parser.add_argument('--check-all', action='store_true', help='Check all users for edge case')
    parser.add_argument('--fix-all', action='store_true', help='Fix all users with edge case')
    
    args = parser.parse_args()
    
    if args.email:
        fix_user_onboarding_edge_case(args.email)
    elif args.check_all:
        check_all_users_with_edge_case()
    elif args.fix_all:
        profiles_with_issue, onboarding_issues = check_all_users_with_edge_case()
        
        if profiles_with_issue.exists() or onboarding_issues.exists():
            response = input("\nDo you want to fix all these users? (yes/no): ")
            if response.lower() == 'yes':
                all_users = set()
                for profile in profiles_with_issue:
                    all_users.add(profile.user.email)
                for onboarding in onboarding_issues:
                    all_users.add(onboarding.user.email)
                
                for email in all_users:
                    print(f"\n{'='*60}")
                    fix_user_onboarding_edge_case(email)
    else:
        print("Usage:")
        print("  python fix_onboarding_edge_case.py --email user@example.com")
        print("  python fix_onboarding_edge_case.py --check-all")
        print("  python fix_onboarding_edge_case.py --fix-all")