#!/usr/bin/env python
"""
Manually create a user account for someone who authenticated via OAuth but account creation failed.
This recreates what should have happened during OAuth callback.
"""

import os
import sys
import django
import uuid

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from users.models import UserProfile
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from session_manager.services import session_service

User = get_user_model()

def create_oauth_user(email, name=None, create_session=False):
    """Create a user account that failed during OAuth"""
    
    print(f"\n{'='*60}")
    print(f"CREATING OAUTH USER: {email}")
    print(f"{'='*60}")
    
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        print(f"❌ User already exists with email: {email}")
        return None
    
    try:
        # Extract name from email if not provided
        if not name:
            name = email.split('@')[0]
        
        # Create user
        user = User.objects.create(
            email=email,
            username=email,  # Use email as username
            first_name=name.split()[0] if ' ' in name else name,
            last_name=name.split()[1] if ' ' in name and len(name.split()) > 1 else '',
            is_active=True,
            email_verified=True,  # OAuth users are pre-verified
            date_joined=timezone.now(),
            onboarding_completed=False,  # New users need onboarding
        )
        
        # Set unusable password (OAuth users don't have passwords)
        user.set_unusable_password()
        user.save()
        
        print(f"✅ User created successfully")
        print(f"  - User ID: {user.id}")
        print(f"  - Email: {user.email}")
        print(f"  - Name: {user.get_full_name() or user.first_name}")
        
        # Create UserProfile
        profile = UserProfile.objects.create(
            user=user,
            # Leave tenant_id and business_id empty for new users
        )
        print(f"✅ UserProfile created")
        
        # Create OnboardingProgress
        progress = OnboardingProgress.objects.create(
            user=user,
            onboarding_status='not_started',
            current_step='business_info',
            completed_steps=[],
            setup_completed=False,
            payment_completed=False,
        )
        print(f"✅ OnboardingProgress created (status: not_started)")
        
        # Optionally create a session
        if create_session:
            try:
                # Generate mock tokens (in production these come from Auth0)
                access_token = f"oauth_access_{uuid.uuid4().hex}"
                refresh_token = f"oauth_refresh_{uuid.uuid4().hex}"
                
                # Create session using session service
                session = session_service.create_session(
                    user=user,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_in=86400,  # 24 hours
                    auth_method='google-oauth2'
                )
                
                if session:
                    print(f"✅ Session created")
                    print(f"  - Session ID: {session.get('session_id')}")
                    print(f"  - Expires: {session.get('expires_at')}")
                else:
                    print(f"⚠️ Session creation returned None")
                    
            except Exception as e:
                print(f"⚠️ Could not create session: {str(e)}")
                print(f"  User can still log in normally via OAuth")
        
        print(f"\n✅ User account created successfully!")
        print(f"\n📋 Next steps for user:")
        print(f"  1. User should sign in again via Google")
        print(f"  2. They will be directed to onboarding")
        print(f"  3. Complete business setup")
        print(f"  4. Access dashboard normally")
        
        return user
        
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Create OAuth user account manually')
    parser.add_argument('--email', required=True, help='User email address')
    parser.add_argument('--name', help='User full name (optional)')
    parser.add_argument('--create-session', action='store_true', help='Also create an active session')
    
    args = parser.parse_args()
    
    create_oauth_user(args.email, args.name, args.create_session)

if __name__ == "__main__":
    main()