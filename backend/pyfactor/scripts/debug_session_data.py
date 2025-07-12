#!/usr/bin/env python
"""
Debug script to check session data for email/password users
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from django.utils import timezone

def debug_user_session(email):
    """Debug session data for a user"""
    try:
        # Get user
        user = User.objects.get(email=email)
        print(f"\n=== User Data for {email} ===")
        print(f"ID: {user.id}")
        print(f"First Name: '{user.first_name}'")
        print(f"Last Name: '{user.last_name}'")
        print(f"Name: '{getattr(user, 'name', 'N/A')}'")
        print(f"Auth0 Sub: '{getattr(user, 'auth0_sub', 'N/A')}'")
        print(f"Subscription Plan: '{getattr(user, 'subscription_plan', 'N/A')}'")
        print(f"Onboarding Completed: {getattr(user, 'onboarding_completed', 'N/A')}")
        
        # Check tenant
        if hasattr(user, 'tenant') and user.tenant:
            print(f"\n=== Tenant Data ===")
            print(f"Tenant ID: {user.tenant.id}")
            print(f"Tenant Name: '{user.tenant.name}'")
        else:
            print("\n=== No Tenant Found ===")
        
        # Check onboarding progress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            print(f"\n=== Onboarding Progress ===")
            print(f"Status: {progress.onboarding_status}")
            print(f"Current Step: {progress.current_step}")
            print(f"Subscription Plan: {progress.subscription_plan}")
            print(f"Has Business: {progress.business is not None}")
            if progress.business:
                print(f"Business Name: '{progress.business.name}'")
                print(f"Business Type: '{progress.business.business_type}'")
        else:
            print("\n=== No Onboarding Progress Found ===")
        
        # Check active sessions
        active_sessions = UserSession.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).order_by('-created_at')
        
        print(f"\n=== Active Sessions ({active_sessions.count()}) ===")
        for i, session in enumerate(active_sessions[:3]):  # Show first 3
            print(f"\nSession {i+1}:")
            print(f"  ID: {session.session_id}")
            print(f"  Created: {session.created_at}")
            print(f"  Subscription Plan: {session.subscription_plan}")
            print(f"  Needs Onboarding: {session.needs_onboarding}")
            print(f"  Has Tenant: {session.tenant is not None}")
            if session.tenant:
                print(f"  Tenant Name: '{session.tenant.name}'")
        
    except User.DoesNotExist:
        print(f"User with email {email} not found")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_session_data.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    debug_user_session(email)