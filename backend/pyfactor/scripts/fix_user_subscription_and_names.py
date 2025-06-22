#!/usr/bin/env python
"""
Fix user subscription plans and names that were not saved during onboarding.
This script updates users who have completed onboarding but are missing:
- subscription_plan (showing as 'free' instead of actual plan)
- first_name/last_name (showing initials as '?' in DashAppBar)
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from custom_auth.models import User
from onboarding.models import OnboardingProgress
from accounting.models import Business

def fix_user_data():
    """Fix missing subscription plans and names for users who completed onboarding."""
    
    print("Finding users with completed onboarding but missing data...")
    
    # Find users who have completed onboarding
    users_to_fix = User.objects.filter(
        onboarding_completed=True
    ).select_related('tenant')
    
    fixed_count = 0
    
    for user in users_to_fix:
        fixes_made = []
        
        with transaction.atomic():
            # Check for OnboardingProgress to get subscription info
            try:
                progress = OnboardingProgress.objects.get(user=user)
                
                # Fix subscription plan if it's still 'free' but payment was completed
                if user.subscription_plan == 'free' and progress.payment_completed:
                    # Try to determine actual plan from business or other sources
                    if hasattr(progress, 'selected_plan') and progress.selected_plan and progress.selected_plan != 'free':
                        # Map from OnboardingProgress plan to User model plan
                        # OnboardingProgress only has 'free' and 'professional'
                        user.subscription_plan = progress.selected_plan
                        fixes_made.append(f"subscription_plan: free -> {progress.selected_plan}")
                    elif hasattr(progress, 'subscription_plan') and progress.subscription_plan and progress.subscription_plan != 'free':
                        user.subscription_plan = progress.subscription_plan
                        fixes_made.append(f"subscription_plan: free -> {progress.subscription_plan}")
                    elif hasattr(progress, 'subscription_id') and progress.subscription_id:
                        # If there's a subscription ID, they must have a paid plan
                        # Default to professional if we can't determine
                        user.subscription_plan = 'professional'
                        fixes_made.append("subscription_plan: free -> professional (has subscription_id)")
                
                # Fix missing names
                if not user.first_name and not user.last_name:
                    # Try to extract from Auth0 name field
                    if user.name:
                        name_parts = user.name.strip().split(' ', 1)
                        if len(name_parts) >= 1:
                            user.first_name = name_parts[0]
                            fixes_made.append(f"first_name: '' -> {name_parts[0]}")
                        if len(name_parts) >= 2:
                            user.last_name = name_parts[1]
                            fixes_made.append(f"last_name: '' -> {name_parts[1]}")
                    # If no name field, use email prefix as fallback
                    elif user.email:
                        email_prefix = user.email.split('@')[0]
                        user.first_name = email_prefix.capitalize()
                        fixes_made.append(f"first_name: '' -> {email_prefix.capitalize()} (from email)")
                
                # Save if any fixes were made
                if fixes_made:
                    user.save()
                    fixed_count += 1
                    print(f"\nFixed user {user.email}:")
                    for fix in fixes_made:
                        print(f"  - {fix}")
                    
            except OnboardingProgress.DoesNotExist:
                print(f"Warning: No OnboardingProgress found for user {user.email}")
    
    print(f"\n✓ Fixed {fixed_count} users")
    
    # Show summary of current state
    print("\nCurrent subscription distribution:")
    for plan in ['free', 'professional', 'enterprise']:
        count = User.objects.filter(subscription_plan=plan, onboarding_completed=True).count()
        print(f"  {plan}: {count} users")
    
    print("\nUsers still missing names:")
    missing_names = User.objects.filter(
        onboarding_completed=True,
        first_name='',
        last_name=''
    ).count()
    print(f"  {missing_names} users")

if __name__ == '__main__':
    fix_user_data()