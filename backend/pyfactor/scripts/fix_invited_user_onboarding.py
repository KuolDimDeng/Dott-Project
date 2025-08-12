#!/usr/bin/env python
"""
Fix onboarding status for users who were added/invited to existing businesses.
These users should not go through onboarding since they join an already-setup business.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from onboarding.models import OnboardingProgress
from users.models import UserProfile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

def fix_invited_user_onboarding(email=None):
    """
    Fix onboarding status for users who were added to existing businesses.
    If email is provided, fix only that user. Otherwise, fix all affected users.
    """
    
    if email:
        users = User.objects.filter(email=email)
        logger.info(f"Fixing onboarding for specific user: {email}")
    else:
        # Find all users who have a business but incomplete onboarding
        users = User.objects.filter(
            business_id__isnull=False
        ).exclude(
            onboardingprogress__onboarding_status='complete'
        )
        logger.info(f"Found {users.count()} users with businesses but incomplete onboarding")
    
    fixed_count = 0
    
    for user in users:
        try:
            # Check if user has a business
            if not user.business_id:
                logger.warning(f"User {user.email} has no business_id, skipping")
                continue
            
            # Get or create OnboardingProgress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'tenant_id': user.business_id,
                    'onboarding_status': 'complete',
                    'setup_completed': True,
                    'payment_completed': True,
                    'current_step': 'complete',
                    'completed_steps': ['business_info', 'subscription', 'payment', 'complete']
                }
            )
            
            if not created and progress.onboarding_status != 'complete':
                # Update existing progress
                progress.onboarding_status = 'complete'
                progress.setup_completed = True
                progress.payment_completed = True
                progress.current_step = 'complete'
                progress.tenant_id = user.business_id
                
                # Ensure completed_steps includes all steps
                if not progress.completed_steps:
                    progress.completed_steps = []
                
                required_steps = ['business_info', 'subscription', 'payment', 'complete']
                for step in required_steps:
                    if step not in progress.completed_steps:
                        progress.completed_steps.append(step)
                
                progress.save()
                logger.info(f"✅ Updated onboarding status for {user.email} (invited user)")
                fixed_count += 1
            elif created:
                logger.info(f"✅ Created complete onboarding record for {user.email} (invited user)")
                fixed_count += 1
            else:
                logger.info(f"ℹ️ User {user.email} already has complete onboarding status")
            
            # Also update the user's onboarding_completed field if it exists
            if hasattr(user, 'onboarding_completed') and not user.onboarding_completed:
                user.onboarding_completed = True
                user.save(update_fields=['onboarding_completed'])
                logger.info(f"  - Updated user.onboarding_completed flag")
            
            # Update UserProfile if exists
            try:
                profile = UserProfile.objects.get(user=user)
                if not profile.setup_complete:
                    profile.setup_complete = True
                    profile.save(update_fields=['setup_complete'])
                    logger.info(f"  - Updated UserProfile.setup_complete flag")
            except UserProfile.DoesNotExist:
                # Create UserProfile with setup_complete
                UserProfile.objects.create(
                    user=user,
                    business_id=user.business_id,
                    setup_complete=True
                )
                logger.info(f"  - Created UserProfile with setup_complete=True")
                
        except Exception as e:
            logger.error(f"Error fixing onboarding for {user.email}: {str(e)}")
            continue
    
    logger.info(f"\n🎉 Fixed onboarding status for {fixed_count} invited users")
    return fixed_count

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
        fix_invited_user_onboarding(email)
    else:
        # Fix all affected users
        fix_invited_user_onboarding()