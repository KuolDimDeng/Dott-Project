#!/usr/bin/env python3
"""
Script to fix onboarding status for support@dottapps.com
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

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

def fix_support_user():
    """Fix onboarding status for support@dottapps.com"""
    
    try:
        # Find the user
        user = User.objects.get(email='support@dottapps.com')
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Check onboarding progress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\nCurrent onboarding progress:")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Current step: {progress.current_step}")
            print(f"  - Setup completed: {progress.setup_completed}")
            print(f"  - Payment completed: {progress.payment_completed}")
            print(f"  - Completed steps: {progress.completed_steps}")
            print(f"  - Subscription plan: {progress.subscription_plan}")
            print(f"  - Tenant ID: {progress.tenant_id}")
            
            # Fix the status
            print("\nUpdating onboarding status...")
            progress.onboarding_status = 'complete'
            progress.current_step = 'complete'
            progress.setup_completed = True
            progress.setup_timestamp = timezone.now()
            progress.completed_at = timezone.now()
            
            # Add complete to completed steps if not there
            if progress.completed_steps is None:
                progress.completed_steps = []
            if 'complete' not in progress.completed_steps:
                progress.completed_steps.append('complete')
            if 'setup' not in progress.completed_steps:
                progress.completed_steps.append('setup')
                
            progress.save()
            
            print(f"\nUpdated onboarding progress:")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Current step: {progress.current_step}")
            print(f"  - Setup completed: {progress.setup_completed}")
            print(f"  - Completed steps: {progress.completed_steps}")
            
            # Update user's needs_onboarding field if it exists
            if hasattr(user, 'needs_onboarding'):
                user.needs_onboarding = False
                user.save(update_fields=['needs_onboarding'])
                print(f"\nUpdated user.needs_onboarding to False")
                
            # Update any active sessions
            active_sessions = UserSession.objects.filter(
                user=user,
                expires_at__gt=timezone.now()
            )
            
            sessions_updated = 0
            for session in active_sessions:
                session.needs_onboarding = False
                session.onboarding_completed = True
                session.onboarding_step = 'completed'
                session.subscription_status = 'active'
                session.save()
                sessions_updated += 1
                
            print(f"\nUpdated {sessions_updated} active session(s)")
            
            print("\n✅ Successfully fixed onboarding status for support@dottapps.com")
            
        except OnboardingProgress.DoesNotExist:
            print(f"\n❌ No onboarding progress found for user {user.email}")
            
    except User.DoesNotExist:
        print("\n❌ User support@dottapps.com not found")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_support_user()