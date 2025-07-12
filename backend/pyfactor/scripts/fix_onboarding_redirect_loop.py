#!/usr/bin/env python3
"""
Script to fix onboarding redirect loop issue

The issue: Users who have completed onboarding and payment are being redirected back to onboarding
after clearing browser cache because the backend returns needs_onboarding=true.

This script:
1. Identifies users with subscription_plan != 'free' but needs_onboarding = true
2. Updates their OnboardingProgress to show complete
3. Updates their UserSession records
4. Ensures backend returns correct onboarding status on sign-in
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
from users.models import Subscription


def find_affected_users():
    """Find users who have a paid subscription but are marked as needing onboarding"""
    
    # Find users with OnboardingProgress that indicates incomplete but have subscriptions
    affected_users = []
    
    # Check through OnboardingProgress records
    progress_records = OnboardingProgress.objects.exclude(
        onboarding_status='complete'
    ).select_related('user')
    
    for progress in progress_records:
        user = progress.user
        
        # Check if user has a subscription
        has_subscription = False
        subscription_plan = 'free'
        
        # Check subscription model
        try:
            subscription = Subscription.objects.filter(
                business__tenant__owner=user,
                is_active=True
            ).first()
            if subscription:
                has_subscription = True
                subscription_plan = subscription.selected_plan
        except:
            pass
            
        # Also check the progress record itself
        if progress.subscription_plan and progress.subscription_plan != 'free':
            has_subscription = True
            subscription_plan = progress.subscription_plan
            
        # Check if user has tenant
        has_tenant = user.tenant_id is not None
        
        if has_subscription or has_tenant:
            affected_users.append({
                'user': user,
                'progress': progress,
                'subscription_plan': subscription_plan,
                'has_tenant': has_tenant,
                'current_status': progress.onboarding_status
            })
            
    return affected_users


def fix_user_onboarding(user_data):
    """Fix onboarding status for a single user"""
    
    user = user_data['user']
    progress = user_data['progress']
    subscription_plan = user_data['subscription_plan']
    
    print(f"\nFixing user: {user.email}")
    print(f"  Current status: {progress.onboarding_status}")
    print(f"  Subscription plan: {subscription_plan}")
    print(f"  Has tenant: {user_data['has_tenant']}")
    
    with transaction.atomic():
        # Update OnboardingProgress
        progress.onboarding_status = 'complete'
        progress.current_step = 'complete'
        progress.setup_completed = True
        progress.payment_completed = True
        progress.completed_at = timezone.now()
        
        # Ensure completed steps includes all steps
        if not progress.completed_steps:
            progress.completed_steps = []
        
        required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
        for step in required_steps:
            if step not in progress.completed_steps:
                progress.completed_steps.append(step)
                
        # Update subscription info
        if subscription_plan != 'free':
            progress.subscription_plan = subscription_plan
            progress.selected_plan = subscription_plan
            
        progress.save()
        
        # Update user needs_onboarding if field exists
        if hasattr(user, 'needs_onboarding'):
            user.needs_onboarding = False
            user.save(update_fields=['needs_onboarding'])
            
        # Update all user sessions
        sessions = UserSession.objects.filter(user=user)
        sessions_updated = 0
        
        for session in sessions:
            session.needs_onboarding = False
            session.onboarding_completed = True
            session.onboarding_step = 'completed'
            session.subscription_plan = subscription_plan
            if subscription_plan != 'free':
                session.subscription_status = 'active'
            session.save()
            sessions_updated += 1
            
        print(f"  ✅ Updated OnboardingProgress to complete")
        print(f"  ✅ Updated {sessions_updated} session(s)")
        
    return True


def verify_fix(user_email):
    """Verify that the fix worked by checking what the session creation would return"""
    
    try:
        user = User.objects.get(email=user_email)
        
        # Check OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            print(f"\nVerifying fix for {user_email}:")
            print(f"  OnboardingProgress status: {progress.onboarding_status}")
            print(f"  Setup completed: {progress.setup_completed}")
            print(f"  Completed steps: {progress.completed_steps}")
            
            # Simulate what SessionService would return
            needs_onboarding = True
            if progress.onboarding_status == 'complete' or progress.setup_completed:
                needs_onboarding = False
                
            print(f"  Session would return needs_onboarding: {needs_onboarding}")
            
            if needs_onboarding:
                print("  ❌ Fix not working - user would still be redirected")
                return False
            else:
                print("  ✅ Fix verified - user should go to dashboard")
                return True
        else:
            print(f"  ❌ No OnboardingProgress found")
            return False
            
    except User.DoesNotExist:
        print(f"  ❌ User not found")
        return False


def main():
    """Main function"""
    
    import argparse
    parser = argparse.ArgumentParser(description='Fix onboarding redirect loop issue')
    parser.add_argument('--email', help='Fix specific user by email')
    parser.add_argument('--all', action='store_true', help='Fix all affected users')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--verify', help='Verify fix for specific user email')
    
    args = parser.parse_args()
    
    if args.verify:
        verify_fix(args.verify)
        return
        
    if args.email:
        # Fix specific user
        try:
            user = User.objects.get(email=args.email)
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            if not progress:
                print(f"No OnboardingProgress found for {args.email}")
                return
                
            user_data = {
                'user': user,
                'progress': progress,
                'subscription_plan': progress.subscription_plan or 'free',
                'has_tenant': user.tenant_id is not None,
                'current_status': progress.onboarding_status
            }
            
            if args.dry_run:
                print(f"Would fix user: {user.email}")
                print(f"  Current status: {progress.onboarding_status}")
                print(f"  Would set to: complete")
            else:
                fix_user_onboarding(user_data)
                verify_fix(args.email)
                
        except User.DoesNotExist:
            print(f"User {args.email} not found")
            
    elif args.all:
        # Fix all affected users
        affected_users = find_affected_users()
        
        print(f"Found {len(affected_users)} affected users")
        
        if args.dry_run:
            print("\nDry run - would fix the following users:")
            for user_data in affected_users:
                print(f"  - {user_data['user'].email} (status: {user_data['current_status']}, plan: {user_data['subscription_plan']})")
        else:
            print("\nFixing all affected users...")
            fixed_count = 0
            
            for user_data in affected_users:
                try:
                    if fix_user_onboarding(user_data):
                        fixed_count += 1
                except Exception as e:
                    print(f"  ❌ Error fixing {user_data['user'].email}: {str(e)}")
                    
            print(f"\n✅ Fixed {fixed_count} users")
            
    else:
        # Default: fix support@dottapps.com
        print("Fixing support@dottapps.com by default...")
        try:
            user = User.objects.get(email='support@dottapps.com')
            progress = OnboardingProgress.objects.filter(user=user).first()
            
            if progress:
                user_data = {
                    'user': user,
                    'progress': progress,
                    'subscription_plan': progress.subscription_plan or 'professional',
                    'has_tenant': user.tenant_id is not None,
                    'current_status': progress.onboarding_status
                }
                
                fix_user_onboarding(user_data)
                verify_fix('support@dottapps.com')
            else:
                print("No OnboardingProgress found for support@dottapps.com")
                
        except User.DoesNotExist:
            print("User support@dottapps.com not found")


if __name__ == "__main__":
    main()