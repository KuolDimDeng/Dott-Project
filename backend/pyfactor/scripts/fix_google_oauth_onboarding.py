"""
Fix Google OAuth Onboarding Status Script

This script fixes the issue where Google OAuth users are always marked as
needs_onboarding=true even after completing onboarding.

The issue occurs because:
1. Session creation always sets needs_onboarding=True without checking OnboardingProgress
2. The backend has database type mismatches when querying user profiles
3. OnboardingProgress.status attribute doesn't exist

This script:
1. Finds all users who signed up with Google OAuth
2. Checks their actual OnboardingProgress status
3. Updates their session to reflect the correct onboarding status
"""

from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from custom_auth.models import Session
from django.db import transaction
from datetime import datetime, timedelta
import pytz

User = get_user_model()

def fix_google_oauth_users():
    """Fix onboarding status for Google OAuth users"""
    
    print("Starting Google OAuth onboarding fix...")
    
    # Find users who likely signed up with Google OAuth
    # These users typically have auth0 provider in their email or metadata
    google_users = User.objects.filter(
        email__icontains='@gmail.com'
    ).order_by('-date_joined')[:100]  # Process last 100 Gmail users
    
    fixed_count = 0
    error_count = 0
    
    for user in google_users:
        try:
            # Check if user has OnboardingProgress
            try:
                progress = OnboardingProgress.objects.get(user=user)
                has_completed = progress.setup_completed
                tenant_id = progress.tenant_id if hasattr(progress, 'tenant_id') else None
                
                print(f"\nUser: {user.email}")
                print(f"  - OnboardingProgress found: setup_completed={has_completed}")
                print(f"  - Tenant ID: {tenant_id}")
                
            except OnboardingProgress.DoesNotExist:
                print(f"\nUser: {user.email}")
                print(f"  - No OnboardingProgress record (new user)")
                has_completed = False
                tenant_id = None
            
            # Check active sessions for this user
            active_sessions = Session.objects.filter(
                user=user,
                expires_at__gt=datetime.now(pytz.UTC)
            )
            
            for session in active_sessions:
                if has_completed and session.data.get('needs_onboarding', True):
                    # Fix the session
                    print(f"  - FIXING session {session.session_id[:8]}...")
                    
                    with transaction.atomic():
                        session.data['needs_onboarding'] = False
                        session.data['onboarding_completed'] = True
                        if tenant_id:
                            session.data['tenant_id'] = str(tenant_id)
                        session.save()
                    
                    fixed_count += 1
                    print(f"  - ✅ Session fixed!")
                    
        except Exception as e:
            print(f"  - ❌ Error processing user {user.email}: {str(e)}")
            error_count += 1
    
    print(f"\n✅ Fixed {fixed_count} sessions")
    print(f"❌ Errors: {error_count}")
    
    return fixed_count, error_count


def check_specific_user(email):
    """Check and fix a specific user's onboarding status"""
    
    try:
        user = User.objects.get(email=email)
        print(f"\nChecking user: {email}")
        
        # Check OnboardingProgress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"OnboardingProgress:")
            print(f"  - setup_completed: {progress.setup_completed}")
            print(f"  - business_name: {progress.business_name}")
            print(f"  - tenant_id: {getattr(progress, 'tenant_id', 'N/A')}")
            print(f"  - created_at: {progress.created_at}")
            print(f"  - updated_at: {progress.updated_at}")
        except OnboardingProgress.DoesNotExist:
            print("  - No OnboardingProgress record found")
        
        # Check active sessions
        sessions = Session.objects.filter(
            user=user,
            expires_at__gt=datetime.now(pytz.UTC)
        )
        
        print(f"\nActive sessions: {sessions.count()}")
        for session in sessions:
            print(f"\nSession {session.session_id[:8]}:")
            print(f"  - needs_onboarding: {session.data.get('needs_onboarding', 'N/A')}")
            print(f"  - onboarding_completed: {session.data.get('onboarding_completed', 'N/A')}")
            print(f"  - tenant_id: {session.data.get('tenant_id', 'N/A')}")
            print(f"  - created_at: {session.created_at}")
            
    except User.DoesNotExist:
        print(f"User {email} not found")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Check specific user
        email = sys.argv[1]
        check_specific_user(email)
    else:
        # Fix all Google OAuth users
        fix_google_oauth_users()