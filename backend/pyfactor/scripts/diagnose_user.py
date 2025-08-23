#!/usr/bin/env python
"""
Comprehensive diagnosis script for user issues.
Checks all aspects of a user's account to identify problems.
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from users.models import UserProfile, Business
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

User = get_user_model()

def diagnose_user(email):
    """Comprehensive diagnosis of user account issues"""
    
    print(f"\n{'='*70}")
    print(f"COMPREHENSIVE USER DIAGNOSIS: {email}")
    print(f"{'='*70}")
    
    # 1. Check if user exists
    try:
        user = User.objects.get(email=email)
        print(f"\n✅ User found in database")
        print(f"  - User ID: {user.id}")
        print(f"  - Date joined: {user.date_joined}")
        print(f"  - Last login: {user.last_login}")
        print(f"  - Is active: {user.is_active}")
        print(f"  - Is staff: {user.is_staff}")
        print(f"  - Email verified: {user.email_verified if hasattr(user, 'email_verified') else 'N/A'}")
        
    except User.DoesNotExist:
        print(f"\n❌ User not found: {email}")
        print("  User may not have completed registration or account creation failed")
        return None
    
    # 2. Check UserProfile
    print(f"\n📋 UserProfile Status:")
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"  ✅ UserProfile exists")
        print(f"  - Tenant ID: {profile.tenant_id or 'None'}")
        print(f"  - Business ID: {profile.business_id or 'None'}")
        print(f"  - Phone: {profile.phone or 'None'}")
        print(f"  - Country: {profile.country or 'None'}")
    except UserProfile.DoesNotExist:
        print(f"  ⚠️ No UserProfile found - will be created on first login")
        profile = None
    
    # 3. Check Onboarding Status
    print(f"\n🎯 Onboarding Status:")
    print(f"  - User.onboarding_completed: {user.onboarding_completed}")
    print(f"  - User.onboarding_completed_at: {user.onboarding_completed_at if hasattr(user, 'onboarding_completed_at') else 'N/A'}")
    print(f"  - User.user_subscription: {user.user_subscription if hasattr(user, 'user_subscription') else 'N/A'}")
    
    # Check OnboardingProgress
    try:
        progress = OnboardingProgress.objects.get(user=user)
        print(f"\n  📊 OnboardingProgress:")
        print(f"    - Status: {progress.onboarding_status}")
        print(f"    - Current step: {progress.current_step}")
        print(f"    - Completed steps: {progress.completed_steps}")
        print(f"    - Setup completed: {progress.setup_completed}")
        print(f"    - Payment completed: {progress.payment_completed}")
        print(f"    - Selected plan: {progress.selected_plan or 'None'}")
    except OnboardingProgress.DoesNotExist:
        print(f"  ⚠️ No OnboardingProgress record")
        progress = None
    
    # 4. Check Tenant Ownership
    print(f"\n🏢 Tenant Status:")
    owned_tenants = Tenant.objects.filter(owner_id=user.id)
    if owned_tenants.exists():
        print(f"  ✅ User owns {owned_tenants.count()} tenant(s):")
        for tenant in owned_tenants:
            print(f"    - {tenant.id}: {tenant.name}")
            print(f"      Active: {tenant.is_active}")
            print(f"      Created: {tenant.created_at}")
    else:
        print(f"  ℹ️ User doesn't own any tenants")
    
    # 5. Check Business Association
    print(f"\n💼 Business Status:")
    if profile and profile.business_id:
        try:
            business = Business.objects.get(id=profile.business_id)
            print(f"  ✅ Associated with business: {business.name}")
            print(f"    - Business ID: {business.id}")
            print(f"    - Active: {business.is_active}")
        except Business.DoesNotExist:
            print(f"  ❌ Business ID {profile.business_id} in profile but business not found!")
    else:
        print(f"  ℹ️ No business association")
    
    # 6. Check Active Sessions
    print(f"\n🔐 Session Status:")
    active_sessions = UserSession.objects.filter(
        user=user,
        is_active=True,
        expires_at__gt=timezone.now()
    ).order_by('-created_at')
    
    if active_sessions.exists():
        print(f"  ✅ {active_sessions.count()} active session(s):")
        for session in active_sessions[:3]:  # Show last 3 sessions
            print(f"    - Session ID: {session.session_id}")
            print(f"      Created: {session.created_at}")
            print(f"      Expires: {session.expires_at}")
            print(f"      Tenant: {session.tenant_id if session.tenant_id else 'None'}")
            if session.session_data:
                print(f"      Has session data: Yes")
    else:
        print(f"  ⚠️ No active sessions found")
    
    # 7. Check for Recent Sessions (including expired)
    recent_sessions = UserSession.objects.filter(
        user=user
    ).order_by('-created_at')[:5]
    
    if recent_sessions.exists():
        print(f"\n  📝 Recent session history:")
        for session in recent_sessions:
            status = "Active" if session.is_active and session.expires_at > timezone.now() else "Expired/Inactive"
            print(f"    - {session.created_at}: {status}")
    
    # 8. Diagnosis and Recommendations
    print(f"\n{'='*70}")
    print("🔍 DIAGNOSIS & RECOMMENDATIONS:")
    print(f"{'='*70}")
    
    issues = []
    recommendations = []
    
    # Check for common issues
    if not user.is_active:
        issues.append("User account is not active")
        recommendations.append("Activate user account")
    
    if hasattr(user, 'email_verified') and not user.email_verified:
        issues.append("Email not verified")
        recommendations.append("User needs to verify email")
    
    if not profile:
        issues.append("No UserProfile exists")
        recommendations.append("UserProfile will be created on next successful login")
    
    if profile and not profile.tenant_id and not user.onboarding_completed:
        issues.append("No tenant assigned and onboarding not complete")
        recommendations.append("User needs to complete onboarding")
    
    if profile and profile.tenant_id and not user.onboarding_completed:
        issues.append("Has tenant but onboarding marked incomplete (EDGE CASE)")
        recommendations.append("Run: python scripts/complete_onboarding_fix.py --email " + email)
    
    if not active_sessions.exists():
        issues.append("No active sessions - user may be stuck at login")
        recommendations.append("Check Auth0 logs for authentication issues")
    
    if owned_tenants.exists() and profile and not profile.tenant_id:
        issues.append("User owns tenant but profile doesn't have tenant_id")
        recommendations.append("Run: python scripts/fix_onboarding_edge_case.py --email " + email)
    
    # Print diagnosis
    if issues:
        print("\n❌ Issues Found:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        
        print("\n💡 Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
    else:
        print("\n✅ No obvious issues found")
        print("  - User account appears to be properly configured")
        print("  - If user is stuck on loading screen, check:")
        print("    1. Browser console for JavaScript errors")
        print("    2. Network tab for failed API calls")
        print("    3. Auth0 logs for authentication issues")
    
    # Check if this is likely a Google OAuth issue
    if not active_sessions.exists() and user.date_joined > timezone.now() - timedelta(days=1):
        print("\n⚠️ LIKELY GOOGLE OAUTH ISSUE:")
        print("  User created recently but has no active sessions")
        print("  This suggests session creation failed after OAuth")
        print("  Check session_manager logs for errors during session creation")
    
    return user

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Diagnose user account issues')
    parser.add_argument('--email', required=True, help='User email to diagnose')
    
    args = parser.parse_args()
    
    diagnose_user(args.email)

if __name__ == "__main__":
    main()