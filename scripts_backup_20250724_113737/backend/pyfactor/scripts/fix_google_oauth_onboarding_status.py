#!/usr/bin/env python
"""
Fix Google OAuth users onboarding status
This script ensures that Google OAuth users who have completed onboarding
have their OnboardingProgress records properly created with correct status.

Usage:
    python manage.py shell < scripts/fix_google_oauth_onboarding_status.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

print("=" * 70)
print("🔧 FIXING GOOGLE OAUTH ONBOARDING STATUS")
print("=" * 70)

email = "jubacargovillage@gmail.com"

try:
    user = User.objects.get(email=email)
    print(f"\n✅ Found user: {email}")
    print(f"   - User ID: {user.id}")
    print(f"   - Has tenant: {user.tenant is not None}")
    if user.tenant:
        print(f"   - Tenant: {user.tenant.name}")
    
    # Check if OnboardingProgress exists
    progress = OnboardingProgress.objects.filter(user=user).first()
    
    if not progress:
        print(f"\n⚠️  No OnboardingProgress record found - creating one")
        
        # Create OnboardingProgress record marked as complete
        progress = OnboardingProgress.objects.create(
            user=user,
            current_step='complete',
            next_step=None,
            progress_percentage=100,
            completed_steps=['business_info', 'subscription', 'payment'],
            onboarding_status='complete',
            setup_completed=True,
            payment_completed=True,
            metadata={
                'completed_via': 'google_oauth_fix',
                'subscription_plan': 'free'
            }
        )
        print(f"✅ Created OnboardingProgress marked as complete")
    else:
        print(f"\n📋 Found existing OnboardingProgress:")
        print(f"   - Status: {progress.onboarding_status}")
        print(f"   - Setup completed: {progress.setup_completed}")
        print(f"   - Current step: {progress.current_step}")
        
        # Update to complete if not already
        if not progress.setup_completed or progress.onboarding_status != 'complete':
            progress.onboarding_status = 'complete'
            progress.setup_completed = True
            progress.payment_completed = True
            progress.current_step = 'complete'
            progress.next_step = None
            progress.progress_percentage = 100
            progress.completed_steps = ['business_info', 'subscription', 'payment']
            progress.save()
            print(f"✅ Updated OnboardingProgress to complete")
    
    # Update all user sessions to reflect correct onboarding status
    sessions = UserSession.objects.filter(user=user, is_active=True)
    print(f"\n📋 Found {sessions.count()} active sessions")
    
    updated = sessions.update(
        needs_onboarding=False,
        onboarding_completed=True,
        onboarding_step='complete'
    )
    
    print(f"✅ Updated {updated} sessions to mark onboarding as complete")
    
    # Verify the fix
    print(f"\n🔍 Verification:")
    progress = OnboardingProgress.objects.get(user=user)
    print(f"   - OnboardingProgress.setup_completed: {progress.setup_completed}")
    print(f"   - OnboardingProgress.onboarding_status: {progress.onboarding_status}")
    
    active_session = UserSession.objects.filter(user=user, is_active=True).first()
    if active_session:
        print(f"   - Session.needs_onboarding: {active_session.needs_onboarding}")
        print(f"   - Session.onboarding_completed: {active_session.onboarding_completed}")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("✅ Done. User should now be able to log in without being redirected to onboarding.")
print("=" * 70)