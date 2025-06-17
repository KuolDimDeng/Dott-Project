#!/usr/bin/env python3
"""
Script to fix specific user's onboarding status
Run this directly on the production server to fix users stuck in onboarding
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession


def fix_user_by_email(email):
    """Fix a specific user's onboarding status by email"""
    
    try:
        # Find the user
        user = User.objects.get(email=email)
        print(f"\n✅ Found user: {user.email} (ID: {user.id})")
        print(f"   - Tenant: {user.tenant.name if user.tenant else 'No tenant'}")
        print(f"   - Tenant ID: {user.tenant.id if user.tenant else 'None'}")
        
        # Check OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        
        if not progress:
            print("\n❌ No OnboardingProgress record found!")
            if user.tenant:
                print("   Creating OnboardingProgress record as complete...")
                progress = OnboardingProgress.objects.create(
                    user=user,
                    tenant_id=user.tenant.id,
                    onboarding_status='complete',
                    current_step='complete',
                    setup_completed=True,
                    completed_at=timezone.now(),
                    completed_steps=['business_info', 'subscription', 'payment', 'setup', 'complete']
                )
                print("   ✅ Created OnboardingProgress as complete")
        else:
            print(f"\n📋 Current OnboardingProgress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Current step: {progress.current_step}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Completed steps: {progress.completed_steps}")
            print(f"   - Subscription plan: {progress.subscription_plan}")
            
            # Fix the status
            if progress.onboarding_status != 'complete' or not progress.setup_completed:
                print("\n🔧 Fixing OnboardingProgress...")
                
                with transaction.atomic():
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.setup_completed = True
                    progress.completed_at = timezone.now()
                    
                    # Ensure all steps are marked complete
                    if not progress.completed_steps:
                        progress.completed_steps = []
                    
                    required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
                    for step in required_steps:
                        if step not in progress.completed_steps:
                            progress.completed_steps.append(step)
                    
                    progress.save()
                    
                    print("   ✅ OnboardingProgress updated to complete")
            else:
                print("   ℹ️  OnboardingProgress already shows as complete")
        
        # Update user.needs_onboarding if it exists
        if hasattr(user, 'needs_onboarding'):
            if user.needs_onboarding:
                user.needs_onboarding = False
                user.save(update_fields=['needs_onboarding'])
                print("\n✅ Updated user.needs_onboarding to False")
            else:
                print("\n✅ user.needs_onboarding already False")
        
        # Update all sessions
        print("\n🔄 Updating sessions...")
        sessions = UserSession.objects.filter(user=user)
        active_sessions = sessions.filter(is_active=True, expires_at__gt=timezone.now())
        
        sessions_updated = 0
        for session in sessions:
            updates_made = []
            
            if session.needs_onboarding:
                session.needs_onboarding = False
                updates_made.append('needs_onboarding=False')
                
            if not session.onboarding_completed:
                session.onboarding_completed = True
                updates_made.append('onboarding_completed=True')
                
            if session.onboarding_step != 'completed':
                session.onboarding_step = 'completed'
                updates_made.append('onboarding_step=completed')
            
            if updates_made:
                session.save()
                sessions_updated += 1
                print(f"   - Session {session.session_id}: {', '.join(updates_made)}")
        
        print(f"\n✅ Updated {sessions_updated} session(s)")
        print(f"   - Total sessions: {sessions.count()}")
        print(f"   - Active sessions: {active_sessions.count()}")
        
        # Final verification
        print("\n🔍 Final verification:")
        progress = OnboardingProgress.objects.get(user=user)
        print(f"   - OnboardingProgress status: {progress.onboarding_status}")
        print(f"   - Setup completed: {progress.setup_completed}")
        
        # Check what a new session would return
        print("\n🔮 New session would have:")
        print(f"   - needs_onboarding: False (based on status={progress.onboarding_status})")
        print(f"   - User has tenant: {user.tenant is not None}")
        
        print(f"\n✅ Fix completed for {user.email}")
        
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    """Main function"""
    import argparse
    parser = argparse.ArgumentParser(description='Fix user onboarding status')
    parser.add_argument('email', help='Email address of the user to fix')
    
    args = parser.parse_args()
    
    fix_user_by_email(args.email)


if __name__ == "__main__":
    # If no arguments provided, fix the known problematic users
    if len(sys.argv) == 1:
        print("Fixing known users with onboarding issues...")
        
        users_to_fix = [
            'kuoldimdeng@outlook.com',
            'admin@dottapps.com',
            'support@dottapps.com'
        ]
        
        for email in users_to_fix:
            print(f"\n{'='*60}")
            fix_user_by_email(email)
            
    else:
        main()