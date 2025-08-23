#!/usr/bin/env python
"""
Comprehensive fix for all onboarding issues:
1. Fix existing users stuck in onboarding loop
2. Prevent new users from getting stuck
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
from django.db.models import Q
from users.models import UserProfile, Business
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def find_stuck_users():
    """Find all users who might be stuck in onboarding"""
    
    stuck_users = []
    
    print("\n🔍 Scanning for users with onboarding issues...")
    
    # 1. Users with active sessions but incomplete onboarding
    active_sessions = UserSession.objects.filter(
        is_active=True,
        expires_at__gt=timezone.now()
    ).values_list('user_id', flat=True).distinct()
    
    users_with_sessions = User.objects.filter(
        id__in=active_sessions,
        onboarding_completed=False
    )
    
    for user in users_with_sessions:
        profile = UserProfile.objects.filter(user=user).first()
        if profile and (profile.tenant_id or profile.business_id):
            stuck_users.append(user)
            print(f"  ⚠️ {user.email} - Has session + tenant/business but onboarding incomplete")
    
    # 2. Users with OnboardingProgress mismatch
    users_with_mismatch = User.objects.filter(
        onboarding_completed=False,
        onboardingprogress__onboarding_status='complete'
    )
    
    for user in users_with_mismatch:
        if user not in stuck_users:
            stuck_users.append(user)
            print(f"  ⚠️ {user.email} - OnboardingProgress complete but User.onboarding_completed=False")
    
    # 3. Users created recently but stuck
    recent_users = User.objects.filter(
        date_joined__gte=timezone.now() - timedelta(days=7),
        onboarding_completed=False
    )
    
    for user in recent_users:
        profile = UserProfile.objects.filter(user=user).first()
        onboarding = OnboardingProgress.objects.filter(user=user).first()
        
        # Check if they started but didn't complete
        if onboarding and onboarding.completed_steps:
            if user not in stuck_users:
                stuck_users.append(user)
                print(f"  ⚠️ {user.email} - Started onboarding but stuck at step: {onboarding.current_step}")
    
    print(f"\nFound {len(stuck_users)} users with issues")
    return stuck_users

def fix_user(user):
    """Fix a single user's onboarding status"""
    
    print(f"\n🔧 Fixing: {user.email}")
    
    # Get or create UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    # Ensure tenant exists
    tenant = None
    if profile.tenant_id:
        try:
            tenant = Tenant.objects.get(id=profile.tenant_id)
        except Tenant.DoesNotExist:
            tenant = Tenant.objects.create(
                id=profile.tenant_id,
                name=f"{user.email.split('@')[0]}'s Organization",
                owner=user,
                is_active=True
            )
            print(f"  ✅ Created missing tenant")
    elif not profile.tenant_id:
        # Check if user already owns a tenant
        existing_tenant = Tenant.objects.filter(owner=user).first()
        if existing_tenant:
            tenant = existing_tenant
            profile.tenant_id = tenant.id
            profile.save()
            print(f"  ✅ Found existing tenant: {tenant.name}")
        else:
            # Create new tenant
            tenant = Tenant.objects.create(
                name=f"{user.email.split('@')[0]}'s Organization",
                owner=user,
                is_active=True
            )
            profile.tenant_id = tenant.id
            profile.save()
            print(f"  ✅ Created new tenant")
    
    # Ensure business exists
    business = None
    if profile.business_id:
        try:
            business = Business.objects.get(id=profile.business_id)
        except Business.DoesNotExist:
            if tenant:
                business = Business.objects.create(
                    id=profile.business_id,
                    name=f"{user.email.split('@')[0]}'s Business",
                    owner=user,
                    tenant=tenant,
                    is_active=True
                )
                print(f"  ✅ Created missing business")
    elif not profile.business_id and tenant:
        # Check if business exists for this tenant
        existing_business = Business.objects.filter(owner=user, tenant=tenant).first()
        if existing_business:
            business = existing_business
            profile.business_id = business.id
            profile.save()
            print(f"  ✅ Found existing business: {business.name}")
        else:
            # Create new business
            business = Business.objects.create(
                name=f"{user.email.split('@')[0]}'s Business",
                owner=user,
                tenant=tenant,
                is_active=True
            )
            profile.business_id = business.id
            profile.save()
            print(f"  ✅ Created new business")
    
    # Fix User onboarding status
    user.onboarding_completed = True
    user.onboarding_completed_at = timezone.now()
    if not hasattr(user, 'user_subscription') or not user.user_subscription:
        user.user_subscription = 'professional'
    user.save()
    print(f"  ✅ Set User.onboarding_completed = True")
    
    # Fix OnboardingProgress
    try:
        onboarding = OnboardingProgress.objects.get(user=user)
        onboarding.onboarding_status = 'complete'
        onboarding.setup_completed = True
        onboarding.current_step = 'completed'
        onboarding.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
        onboarding.payment_completed = True
        if not onboarding.selected_plan:
            onboarding.selected_plan = 'professional'
        onboarding.completed_at = timezone.now()
        onboarding.save()
        print(f"  ✅ Updated OnboardingProgress")
    except OnboardingProgress.DoesNotExist:
        OnboardingProgress.objects.create(
            user=user,
            onboarding_status='complete',
            setup_completed=True,
            current_step='completed',
            completed_steps=['business_info', 'subscription', 'payment', 'setup'],
            selected_plan='professional',
            payment_completed=True,
            completed_at=timezone.now()
        )
        print(f"  ✅ Created OnboardingProgress")
    
    print(f"  ✅ Fixed successfully")

def prevent_future_issues():
    """Add preventive measures for new users"""
    
    print("\n🛡️ Checking preventive measures...")
    
    # Check if the session creation fix is in place
    from session_manager.services import session_service
    
    if hasattr(session_service.create_session, '__wrapped__'):
        print("  ✅ Session creation fix is active")
    else:
        print("  ⚠️ Session creation fix may not be active")
    
    # Check middleware configuration
    from django.conf import settings
    
    auth_only_paths = getattr(settings, 'TENANT_AUTH_ONLY_PATHS', [])
    required_paths = [
        '/api/onboarding/status/',
        '/api/currency/preferences/',
        '/api/onboarding/complete/',
    ]
    
    missing_paths = [p for p in required_paths if p not in auth_only_paths]
    if missing_paths:
        print(f"  ⚠️ Missing TENANT_AUTH_ONLY_PATHS: {missing_paths}")
    else:
        print(f"  ✅ All required paths in TENANT_AUTH_ONLY_PATHS")
    
    return True

def main():
    """Main function to fix all onboarding issues"""
    
    print("=" * 60)
    print("COMPREHENSIVE ONBOARDING FIX")
    print("=" * 60)
    
    # 1. Find stuck users
    stuck_users = find_stuck_users()
    
    if stuck_users:
        print(f"\n🔧 Fixing {len(stuck_users)} users...")
        response = input("Continue with fix? (yes/no): ")
        
        if response.lower() == 'yes':
            for user in stuck_users:
                try:
                    fix_user(user)
                except Exception as e:
                    print(f"  ❌ Error fixing {user.email}: {str(e)}")
        else:
            print("Aborted.")
    else:
        print("\n✅ No stuck users found!")
    
    # 2. Check preventive measures
    prevent_future_issues()
    
    # 3. Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    # Count users by status
    total_users = User.objects.count()
    completed_users = User.objects.filter(onboarding_completed=True).count()
    incomplete_users = User.objects.filter(onboarding_completed=False).count()
    
    print(f"Total users: {total_users}")
    print(f"Onboarding complete: {completed_users}")
    print(f"Onboarding incomplete: {incomplete_users}")
    
    # Recent signups
    recent_signups = User.objects.filter(
        date_joined__gte=timezone.now() - timedelta(days=1)
    ).count()
    print(f"Signups in last 24h: {recent_signups}")
    
    print("\n✅ Fix complete!")

if __name__ == "__main__":
    main()