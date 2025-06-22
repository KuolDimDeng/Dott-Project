#!/usr/bin/env python
"""
Fix session tenant synchronization issue

This script ensures that:
1. When a user completes onboarding and gets a tenant, all their sessions are updated
2. The tenant_id is properly included in session responses
3. Session creation after onboarding includes the tenant

Run this script after deploying the signal changes.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User, Tenant
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress


def fix_sessions_missing_tenant():
    """
    Find and fix sessions that are missing tenant information
    """
    print("=" * 80)
    print("Fixing sessions missing tenant information...")
    print("=" * 80)
    
    # Find users with tenants but sessions without tenants
    users_with_tenant = User.objects.filter(
        tenant__isnull=False,
        onboarding_completed=True
    ).select_related('tenant')
    
    total_fixed = 0
    
    for user in users_with_tenant:
        # Find sessions without tenant
        sessions_to_fix = UserSession.objects.filter(
            user=user,
            tenant__isnull=True,
            is_active=True
        )
        
        if sessions_to_fix.exists():
            count = sessions_to_fix.count()
            print(f"\nUser: {user.email} (ID: {user.id})")
            print(f"  Tenant: {user.tenant.name} (ID: {user.tenant.id})")
            print(f"  Sessions to fix: {count}")
            
            # Update sessions with tenant
            with transaction.atomic():
                sessions_to_fix.update(
                    tenant=user.tenant,
                    needs_onboarding=False,
                    onboarding_completed=True
                )
                total_fixed += count
                print(f"  ✓ Fixed {count} sessions")
    
    print(f"\n{'-' * 40}")
    print(f"Total sessions fixed: {total_fixed}")
    
    return total_fixed


def verify_onboarding_completion():
    """
    Verify that completed onboarding users have proper session state
    """
    print("\n" + "=" * 80)
    print("Verifying onboarding completion state...")
    print("=" * 80)
    
    # Find users marked as onboarding complete
    completed_users = User.objects.filter(
        onboarding_completed=True
    ).select_related('tenant')
    
    issues_found = 0
    
    for user in completed_users:
        issues = []
        
        # Check if user has tenant
        if not user.tenant:
            issues.append("No tenant assigned")
        
        # Check if sessions have correct state
        bad_sessions = UserSession.objects.filter(
            user=user,
            is_active=True
        ).filter(
            models.Q(needs_onboarding=True) |
            models.Q(onboarding_completed=False) |
            models.Q(tenant__isnull=True)
        )
        
        if bad_sessions.exists():
            issues.append(f"{bad_sessions.count()} sessions with incorrect state")
        
        # Check OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            if progress.onboarding_status != 'complete':
                issues.append(f"OnboardingProgress status: {progress.onboarding_status}")
        except OnboardingProgress.DoesNotExist:
            issues.append("No OnboardingProgress record")
        
        if issues:
            issues_found += 1
            print(f"\nUser: {user.email}")
            for issue in issues:
                print(f"  ⚠️  {issue}")
    
    if issues_found == 0:
        print("\n✅ All completed users have correct state!")
    else:
        print(f"\n⚠️  Found {issues_found} users with issues")
    
    return issues_found


def test_session_creation():
    """
    Test that new sessions get tenant properly
    """
    print("\n" + "=" * 80)
    print("Testing session creation with tenant...")
    print("=" * 80)
    
    # Find a test user with tenant
    test_user = User.objects.filter(
        tenant__isnull=False,
        email__icontains='test'
    ).first()
    
    if not test_user:
        test_user = User.objects.filter(tenant__isnull=False).first()
    
    if test_user:
        print(f"Test user: {test_user.email}")
        print(f"Tenant: {test_user.tenant.name}")
        
        # Create a test session
        from session_manager.services import session_service
        
        try:
            session = session_service.create_session(
                user=test_user,
                access_token="test_token_" + str(test_user.id),
                request_meta={'ip_address': '127.0.0.1', 'user_agent': 'Test'}
            )
            
            print(f"\nCreated session: {session.session_id}")
            print(f"  Has tenant: {'✅' if session.tenant else '❌'}")
            print(f"  Tenant ID: {session.tenant.id if session.tenant else 'None'}")
            print(f"  Needs onboarding: {session.needs_onboarding}")
            print(f"  Onboarding completed: {session.onboarding_completed}")
            
            # Clean up test session
            session.delete()
            print("\n✅ Test session created and deleted successfully")
            
        except Exception as e:
            print(f"\n❌ Error creating test session: {e}")
    else:
        print("⚠️  No users with tenants found for testing")


from django.db import models

def main():
    """
    Main function to run all fixes
    """
    print("\n🔧 Starting session tenant sync fix...\n")
    
    # Fix existing sessions
    fixed_count = fix_sessions_missing_tenant()
    
    # Verify state
    issues = verify_onboarding_completion()
    
    # Test new session creation
    test_session_creation()
    
    print("\n" + "=" * 80)
    print("🎉 Session tenant sync fix completed!")
    print(f"   Sessions fixed: {fixed_count}")
    print(f"   Users with issues: {issues}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()