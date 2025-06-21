#!/usr/bin/env python
"""
Sync onboarding_completed status from OnboardingProgress to User model
This ensures all existing users have the correct onboarding_completed value
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from django.utils import timezone

User = get_user_model()

def sync_onboarding_status():
    """Sync onboarding status from OnboardingProgress to User.onboarding_completed"""
    
    print("🔄 Starting onboarding status sync...")
    
    # Get all users
    users = User.objects.all()
    total_users = users.count()
    
    print(f"📊 Total users to check: {total_users}")
    
    updated_count = 0
    already_synced = 0
    no_progress = 0
    
    for user in users:
        try:
            # Get user's onboarding progress
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            if not progress:
                # No progress record - user hasn't started onboarding
                if user.onboarding_completed:
                    print(f"⚠️  User {user.email} has onboarding_completed=True but no OnboardingProgress record")
                    user.onboarding_completed = False
                    user.save(update_fields=['onboarding_completed'])
                    updated_count += 1
                else:
                    no_progress += 1
                continue
            
            # Check if onboarding is complete according to OnboardingProgress
            is_complete = (
                progress.onboarding_status == 'complete' or 
                progress.setup_completed or
                (progress.completed_steps and 'complete' in progress.completed_steps)
            )
            
            # Check if needs sync
            if is_complete and not user.onboarding_completed:
                print(f"✅ Updating user {user.email}: onboarding_completed = True")
                user.onboarding_completed = True
                if progress.completed_at:
                    user.onboarding_completed_at = progress.completed_at
                else:
                    user.onboarding_completed_at = timezone.now()
                user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                updated_count += 1
            elif not is_complete and user.onboarding_completed:
                print(f"❌ Updating user {user.email}: onboarding_completed = False (progress says incomplete)")
                user.onboarding_completed = False
                user.onboarding_completed_at = None
                user.save(update_fields=['onboarding_completed', 'onboarding_completed_at'])
                updated_count += 1
            else:
                already_synced += 1
                
        except Exception as e:
            print(f"❌ Error processing user {user.email}: {str(e)}")
    
    print("\n📈 Sync Summary:")
    print(f"  - Total users: {total_users}")
    print(f"  - Updated: {updated_count}")
    print(f"  - Already synced: {already_synced}")
    print(f"  - No progress record: {no_progress}")
    print("✅ Sync complete!")

if __name__ == "__main__":
    sync_onboarding_status()