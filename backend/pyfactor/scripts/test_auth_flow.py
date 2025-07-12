#!/usr/bin/env python3
"""
Test Auth0 authentication flow and session creation
"""

import os
import sys
import django
import requests
from django.utils import timezone

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

def test_user_status(email):
    """Test user status and authentication readiness"""
    
    print(f"\n=== Testing Auth Flow for {email} ===\n")
    
    try:
        # Check user exists
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email} (ID: {user.id})")
        print(f"   - Active: {user.is_active}")
        print(f"   - Auth0 Sub: {getattr(user, 'auth0_sub', 'N/A')}")
        
        # Check onboarding status
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\n📋 Onboarding Progress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Current step: {progress.current_step}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Payment completed: {progress.payment_completed}")
            print(f"   - Subscription plan: {progress.subscription_plan}")
            print(f"   - Tenant ID: {progress.tenant_id}")
        except OnboardingProgress.DoesNotExist:
            print(f"\n❌ No onboarding progress found")
            
        # Check active sessions
        active_sessions = UserSession.objects.filter(
            user=user,
            expires_at__gt=timezone.now()
        )
        
        print(f"\n🔐 Active Sessions: {active_sessions.count()}")
        for session in active_sessions:
            print(f"   - Session {session.session_id[:8]}...")
            print(f"     Created: {session.created_at}")
            print(f"     Expires: {session.expires_at}")
            print(f"     Needs onboarding: {session.needs_onboarding}")
            
        # Check tenant
        if hasattr(user, 'tenant'):
            print(f"\n🏢 Tenant: {user.tenant.name if user.tenant else 'None'}")
            if user.tenant:
                print(f"   - ID: {user.tenant.id}")
                print(f"   - Active: {getattr(user.tenant, 'is_active', True)}")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        
        if active_sessions.count() == 0:
            print("   - No active sessions. User needs to authenticate.")
            
        if hasattr(progress, 'onboarding_status') and progress.onboarding_status == 'complete':
            print("   - Onboarding is complete. User should be able to access dashboard.")
        else:
            print("   - Onboarding may need completion.")
            
        # Check for potential issues
        print(f"\n⚠️  Potential Issues:")
        
        # Check if user has multiple tenants
        from custom_auth.models import Tenant
        user_tenants = Tenant.objects.filter(owner_id=str(user.id))
        if user_tenants.count() > 1:
            print(f"   - User has multiple tenants ({user_tenants.count()}). This might cause issues.")
            for tenant in user_tenants:
                print(f"     * {tenant.id}: {tenant.name}")
                
        # Check Auth0 rate limiting
        print("\n📊 Auth0 Rate Limit Status:")
        print("   - Auth0 has rate limits: 5 requests per minute for authentication")
        print("   - If seeing 429 errors, wait 1 minute before retrying")
        
        return True
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def clear_expired_sessions():
    """Clear all expired sessions"""
    expired = UserSession.objects.filter(expires_at__lt=timezone.now())
    count = expired.count()
    expired.delete()
    print(f"\n🧹 Cleared {count} expired sessions")

if __name__ == "__main__":
    # Test support@dottapps.com
    test_user_status('support@dottapps.com')
    
    # Also test the Google user
    print("\n" + "="*50)
    test_user_status('jubacargovillage@gmail.com')
    
    # Clear expired sessions
    clear_expired_sessions()
    
    print("\n✅ Test complete")