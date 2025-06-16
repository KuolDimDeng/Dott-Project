#!/usr/bin/env python3
"""
Test script to verify support@dottapps.com can sign in successfully
"""

import os
import sys
import django
from django.utils import timezone

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from users.models import Business

def test_user_signin(email):
    """Test if user can sign in successfully"""
    
    print(f"\n=== Testing sign-in for {email} ===\n")
    
    try:
        # Find the user
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email} (ID: {user.id})")
        print(f"   - Auth0 Sub: {user.auth0_sub}")
        print(f"   - Active: {user.is_active}")
        
        # Check tenant
        tenant = None
        if hasattr(user, 'tenant') and user.tenant:
            tenant = user.tenant
            print(f"\n✅ User has tenant: {tenant.id}")
            print(f"   - Name: {tenant.name}")
        else:
            print(f"\n❌ No tenant found for user")
            
        # Check OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\n📋 Onboarding progress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Current step: {progress.current_step}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Payment completed: {progress.payment_completed}")
            print(f"   - Subscription plan: {progress.subscription_plan}")
            print(f"   - Tenant ID: {progress.tenant_id}")
            print(f"   - Completed steps: {progress.completed_steps}")
            
            # Check for issues
            issues = []
            if progress.onboarding_status != 'complete':
                issues.append(f"Onboarding status is '{progress.onboarding_status}', not 'complete'")
            if not progress.setup_completed:
                issues.append("Setup not marked as completed")
            if progress.subscription_plan in ['professional', 'enterprise'] and not progress.payment_completed:
                issues.append(f"Payment not completed for {progress.subscription_plan} plan")
            if not progress.tenant_id:
                issues.append("No tenant_id in onboarding progress")
                
            if issues:
                print("\n⚠️  Issues found:")
                for issue in issues:
                    print(f"   - {issue}")
            else:
                print("\n✅ No issues found in onboarding progress")
                
        except OnboardingProgress.DoesNotExist:
            print(f"\n❌ No onboarding progress found")
            
        # Check sessions
        active_sessions = UserSession.objects.filter(
            user=user,
            expires_at__gt=timezone.now()
        ).count()
        print(f"\n📊 Active sessions: {active_sessions}")
        
        # Check if user can create new session
        print("\n🔍 Checking session creation requirements:")
        print(f"   - User active: {user.is_active}")
        print(f"   - Has tenant: {tenant is not None}")
        print(f"   - Onboarding complete: {progress.onboarding_status == 'complete' if 'progress' in locals() else 'N/A'}")
        
        # Summary
        print("\n📊 Summary:")
        if user.is_active and tenant and progress.onboarding_status == 'complete':
            print("   ✅ User should be able to sign in successfully")
            print("   ✅ Session creation should work")
            print("   ✅ Should redirect to dashboard after sign-in")
        else:
            print("   ❌ User will have issues signing in")
            if not user.is_active:
                print("   - User is not active")
            if not tenant:
                print("   - User has no tenant")
            if progress.onboarding_status != 'complete':
                print("   - Onboarding not complete")
                
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test support@dottapps.com
    test_user_signin('support@dottapps.com')