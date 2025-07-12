#!/usr/bin/env python3
"""
Check current user data to diagnose the issue.
Run this on Render backend shell:
python manage.py shell < scripts/check_user_data.py
"""

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from user_sessions.models import UserSession

email = 'kdeng@dottapps.com'

print("\n" + "="*60)
print(f"CHECKING USER DATA FOR: {email}")
print("="*60 + "\n")

try:
    # Check User model
    user = User.objects.get(email=email)
    print("USER MODEL DATA:")
    print(f"  ID: {user.id}")
    print(f"  Email: {user.email}")
    print(f"  Subscription Plan: {user.subscription_plan}")
    print(f"  First Name: '{user.first_name}'")
    print(f"  Last Name: '{user.last_name}'")
    print(f"  Name: '{user.name}'")
    print(f"  Auth0 Sub: {user.auth0_sub}")
    print(f"  Onboarding Completed: {user.onboarding_completed}")
    print(f"  Tenant ID: {user.tenant.id if user.tenant else 'None'}")
    
    # Check OnboardingProgress
    print("\nONBOARDING PROGRESS DATA:")
    progress = OnboardingProgress.objects.filter(user=user).first()
    if progress:
        print(f"  Subscription Plan: {progress.subscription_plan}")
        print(f"  Selected Plan: {progress.selected_plan}")
        print(f"  Business Info: {progress.business_info}")
        print(f"  Payment Completed: {progress.payment_completed}")
        print(f"  Setup Completed: {progress.setup_completed}")
        print(f"  Current Step: {progress.current_step}")
        print(f"  Onboarding Status: {progress.onboarding_status}")
    else:
        print("  No OnboardingProgress record found")
    
    # Check active sessions
    print("\nACTIVE SESSIONS:")
    sessions = UserSession.objects.filter(user=user, is_active=True)
    for i, session in enumerate(sessions[:3]):  # Show max 3 sessions
        print(f"  Session {i+1}:")
        print(f"    Token: {session.session_token[:20]}...")
        print(f"    Needs Onboarding: {session.needs_onboarding}")
        print(f"    Onboarding Completed: {session.onboarding_completed}")
        print(f"    Created: {session.created_at}")
    
    if sessions.count() > 3:
        print(f"  ... and {sessions.count() - 3} more sessions")
    
except User.DoesNotExist:
    print(f"ERROR: User {email} not found in database")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60 + "\n")