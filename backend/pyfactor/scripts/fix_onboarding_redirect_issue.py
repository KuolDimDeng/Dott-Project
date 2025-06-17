#!/usr/bin/env python3
"""
Fix for onboarding redirect issue - users being redirected to onboarding after clearing cache
even though they have completed onboarding and have a paid subscription.

Root cause: UserSession model has default values needs_onboarding=True, onboarding_completed=False
and session creation is not checking OnboardingProgress model.

This script:
1. Fixes the specific user (support@dottapps.com)
2. Fixes all users who have completed onboarding but have incorrect session data
3. Updates all active sessions to reflect correct onboarding status
"""

import os
import sys
import django
from django.utils import timezone
from datetime import datetime, timedelta

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from accounts.models import Subscription
from django.db import transaction

def fix_specific_user(email):
    """Fix onboarding status for a specific user"""
    
    try:
        user = User.objects.get(email=email)
        print(f"\n{'='*60}")
        print(f"Fixing user: {user.email} (ID: {user.id})")
        print(f"{'='*60}")
        
        # Check onboarding progress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\nOnboarding Progress Found:")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Current step: {progress.current_step}")
            print(f"  - Setup completed: {progress.setup_completed}")
            print(f"  - Payment completed: {progress.payment_completed}")
            print(f"  - Completed steps: {progress.completed_steps}")
            print(f"  - Subscription plan: {progress.subscription_plan}")
            print(f"  - Tenant ID: {progress.tenant_id}")
            
            # Check for active Stripe subscription
            has_active_subscription = False
            try:
                active_sub = Subscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing']
                ).first()
                if active_sub:
                    has_active_subscription = True
                    print(f"\nActive Stripe Subscription Found:")
                    print(f"  - Plan: {active_sub.plan_name}")
                    print(f"  - Status: {active_sub.status}")
                    print(f"  - Stripe ID: {active_sub.stripe_subscription_id}")
            except Exception as e:
                print(f"\nNo Stripe subscription model or error checking: {e}")
            
            # Determine if user should have completed onboarding
            should_be_complete = False
            if progress.subscription_plan and progress.subscription_plan != 'free':
                print(f"\n✅ User has paid plan: {progress.subscription_plan}")
                should_be_complete = True
            elif has_active_subscription:
                print(f"\n✅ User has active Stripe subscription")
                should_be_complete = True
            elif progress.payment_completed:
                print(f"\n✅ User has payment_completed flag set")
                should_be_complete = True
            elif progress.setup_completed:
                print(f"\n✅ User has setup_completed flag set")
                should_be_complete = True
            elif progress.onboarding_status == 'complete':
                print(f"\n✅ User onboarding_status is already 'complete'")
                should_be_complete = True
            
            if should_be_complete:
                # Fix the onboarding progress
                with transaction.atomic():
                    print("\n🔧 Updating onboarding progress...")
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.setup_completed = True
                    progress.payment_completed = True
                    progress.completed_at = progress.completed_at or timezone.now()
                    
                    # Ensure complete is in completed steps
                    if progress.completed_steps is None:
                        progress.completed_steps = []
                    for step in ['business_info', 'subscription', 'payment', 'setup', 'complete']:
                        if step not in progress.completed_steps:
                            progress.completed_steps.append(step)
                    
                    progress.save()
                    print("✅ Onboarding progress updated")
                
                # Update all sessions for this user
                sessions_updated = 0
                active_sessions = UserSession.objects.filter(
                    user=user,
                    expires_at__gt=timezone.now()
                )
                
                for session in active_sessions:
                    session.needs_onboarding = False
                    session.onboarding_completed = True
                    session.onboarding_step = 'complete'
                    session.subscription_plan = progress.subscription_plan or 'professional'
                    session.subscription_status = 'active'
                    session.save()
                    sessions_updated += 1
                
                print(f"\n✅ Updated {sessions_updated} active session(s)")
                return True
            else:
                print(f"\n⚠️  User has not completed payment or setup - no changes made")
                return False
                
        except OnboardingProgress.DoesNotExist:
            print(f"\n❌ No onboarding progress found for user {user.email}")
            return False
            
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
        return False
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def fix_all_affected_users():
    """Fix all users who have completed onboarding but have incorrect session data"""
    
    print(f"\n\n{'='*60}")
    print("FIXING ALL AFFECTED USERS")
    print(f"{'='*60}")
    
    # Find all users with completed onboarding or paid plans
    affected_users = []
    
    # Query 1: Users with completed onboarding
    completed_progress = OnboardingProgress.objects.filter(
        onboarding_status='complete'
    ).select_related('user')
    
    for progress in completed_progress:
        affected_users.append(progress.user)
    
    # Query 2: Users with paid subscription plans
    paid_progress = OnboardingProgress.objects.filter(
        subscription_plan__in=['professional', 'enterprise', 'premium', 'starter']
    ).select_related('user')
    
    for progress in paid_progress:
        if progress.user not in affected_users:
            affected_users.append(progress.user)
    
    # Query 3: Users with payment or setup completed
    completed_setup = OnboardingProgress.objects.filter(
        setup_completed=True
    ).select_related('user') | OnboardingProgress.objects.filter(
        payment_completed=True
    ).select_related('user')
    
    for progress in completed_setup:
        if progress.user not in affected_users:
            affected_users.append(progress.user)
    
    print(f"\nFound {len(affected_users)} users to check")
    
    fixed_count = 0
    for user in affected_users:
        print(f"\nChecking user: {user.email}")
        
        # Check if they have active sessions with wrong status
        wrong_sessions = UserSession.objects.filter(
            user=user,
            expires_at__gt=timezone.now(),
            needs_onboarding=True
        ).count()
        
        if wrong_sessions > 0:
            print(f"  - Found {wrong_sessions} session(s) with needs_onboarding=True")
            if fix_specific_user(user.email):
                fixed_count += 1
    
    print(f"\n\n{'='*60}")
    print(f"SUMMARY: Fixed {fixed_count} users")
    print(f"{'='*60}")


def verify_fix(email):
    """Verify the fix worked for a specific user"""
    
    try:
        user = User.objects.get(email=email)
        print(f"\n\n{'='*60}")
        print(f"VERIFICATION FOR: {user.email}")
        print(f"{'='*60}")
        
        # Check onboarding progress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\nOnboarding Progress:")
            print(f"  ✓ Status: {progress.onboarding_status} {'✅' if progress.onboarding_status == 'complete' else '❌'}")
            print(f"  ✓ Setup completed: {progress.setup_completed} {'✅' if progress.setup_completed else '❌'}")
            print(f"  ✓ Subscription plan: {progress.subscription_plan}")
        except OnboardingProgress.DoesNotExist:
            print(f"\n❌ No onboarding progress found")
        
        # Check active sessions
        active_sessions = UserSession.objects.filter(
            user=user,
            expires_at__gt=timezone.now()
        )
        
        print(f"\nActive Sessions ({active_sessions.count()}):")
        for i, session in enumerate(active_sessions[:5]):  # Show first 5
            print(f"  Session {i+1}:")
            print(f"    - needs_onboarding: {session.needs_onboarding} {'❌' if session.needs_onboarding else '✅'}")
            print(f"    - onboarding_completed: {session.onboarding_completed} {'✅' if session.onboarding_completed else '❌'}")
            print(f"    - onboarding_step: {session.onboarding_step}")
            print(f"    - subscription_plan: {session.subscription_plan}")
            print(f"    - expires at: {session.expires_at}")
        
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix onboarding redirect issue')
    parser.add_argument('--email', help='Fix specific user by email', default='support@dottapps.com')
    parser.add_argument('--all', action='store_true', help='Fix all affected users')
    parser.add_argument('--verify', help='Verify fix for specific user')
    
    args = parser.parse_args()
    
    if args.verify:
        verify_fix(args.verify)
    elif args.all:
        fix_all_affected_users()
    else:
        # Fix specific user (default: support@dottapps.com)
        fix_specific_user(args.email)
        # Then verify
        verify_fix(args.email)