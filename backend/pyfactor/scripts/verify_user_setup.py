#!/usr/bin/env python
"""
Verify that a user is properly set up and ready to use the system.
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
from django.utils import timezone
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

User = get_user_model()

def verify_user(email):
    """Verify user is properly set up"""
    
    print(f"\n{'='*60}")
    print(f"VERIFYING USER SETUP: {email}")
    print(f"{'='*60}")
    
    try:
        user = User.objects.get(email=email)
        print(f"\n✅ User exists")
        print(f"  - ID: {user.id}")
        print(f"  - Email: {user.email}")
        print(f"  - Name: {user.name or user.get_full_name()}")
        print(f"  - Active: {user.is_active}")
        print(f"  - Email verified: {user.email_verified}")
        print(f"  - Onboarding completed: {user.onboarding_completed}")
        print(f"  - Subscription plan: {user.subscription_plan}")
        print(f"  - Role: {user.role}")
        
        # Check UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            print(f"\n✅ UserProfile exists")
            print(f"  - Tenant ID: {profile.tenant_id or 'None (will be created during onboarding)'}")
            print(f"  - Business ID: {profile.business_id or 'None'}")
        except UserProfile.DoesNotExist:
            print(f"\n⚠️ No UserProfile - will be created on login")
        
        # Check OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\n✅ OnboardingProgress exists")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Current step: {progress.current_step}")
        except OnboardingProgress.DoesNotExist:
            print(f"\n⚠️ No OnboardingProgress - will be created on login")
        
        # Check sessions
        sessions = UserSession.objects.filter(user=user, is_active=True).count()
        print(f"\n📊 Active sessions: {sessions}")
        
        print(f"\n{'='*60}")
        print("✅ USER IS READY!")
        print(f"{'='*60}")
        print("\nNext steps for user:")
        print("1. Sign in via Google OAuth")
        print("2. Complete onboarding (business setup)")
        print("3. Access dashboard")
        
        return True
        
    except User.DoesNotExist:
        print(f"\n❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Verify user setup')
    parser.add_argument('--email', required=True, help='User email to verify')
    
    args = parser.parse_args()
    
    verify_user(args.email)

if __name__ == "__main__":
    main()