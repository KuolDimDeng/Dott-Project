#!/usr/bin/env python
"""
Properly handle users with partial onboarding data
- If they have tenant but didn't complete, let them continue from where they left off
- Only mark complete if they actually finished all steps
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, Business, BusinessDetails
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.utils import timezone

User = get_user_model()

def analyze_user_status(email):
    """Analyze a user's onboarding status and determine the right action"""
    
    try:
        user = User.objects.get(email=email)
        profile = UserProfile.objects.filter(user=user).first()
        progress = OnboardingProgress.objects.filter(user=user).first()
        
        print(f"\n{'='*60}")
        print(f"USER ANALYSIS: {email}")
        print(f"{'='*60}")
        
        # Basic info
        print(f"\n📊 Current Status:")
        print(f"  - User.onboarding_completed: {user.onboarding_completed}")
        print(f"  - Has UserProfile: {bool(profile)}")
        if profile:
            print(f"  - Tenant ID: {profile.tenant_id}")
            print(f"  - Business ID: {profile.business_id}")
        
        # OnboardingProgress details
        if progress:
            print(f"\n📝 OnboardingProgress:")
            print(f"  - Status: {progress.onboarding_status}")
            print(f"  - Current Step: {progress.current_step}")
            print(f"  - Completed Steps: {progress.completed_steps}")
            print(f"  - Payment Completed: {progress.payment_completed}")
            print(f"  - Setup Completed: {progress.setup_completed}")
        else:
            print(f"\n📝 No OnboardingProgress record")
        
        # Determine the right action
        print(f"\n🎯 Recommended Action:")
        
        if not profile or (not profile.tenant_id and not profile.business_id):
            print("  ➡️ User needs to complete onboarding from the beginning")
            return 'start_onboarding'
            
        elif progress and len(progress.completed_steps) >= 4:
            # They completed all major steps
            print("  ✅ User completed all steps - mark as complete")
            return 'mark_complete'
            
        elif progress and progress.completed_steps:
            # They started but didn't finish
            remaining_steps = ['business_info', 'subscription', 'payment', 'setup']
            for step in progress.completed_steps:
                if step in remaining_steps:
                    remaining_steps.remove(step)
            print(f"  🔄 User should continue onboarding from step: {progress.current_step}")
            print(f"     Remaining steps: {remaining_steps}")
            return 'continue_onboarding'
            
        elif profile.tenant_id and profile.business_id:
            # They have data but no progress record - likely completed
            print("  ⚠️ Has tenant/business but no progress - creating complete record")
            return 'mark_complete_missing_progress'
            
        else:
            print("  ❓ Unclear status - needs manual review")
            return 'needs_review'
            
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return None

def fix_user_properly(email, force_complete=False):
    """Fix user based on their actual status"""
    
    action = analyze_user_status(email)
    
    if not action:
        return False
    
    user = User.objects.get(email=email)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    print(f"\n🔧 Applying Fix...")
    
    if action == 'mark_complete' or action == 'mark_complete_missing_progress' or force_complete:
        # Mark as complete
        user.onboarding_completed = True
        user.onboarding_completed_at = timezone.now()
        if not user.user_subscription:
            user.user_subscription = 'professional'
        user.save()
        
        # Ensure OnboardingProgress is complete
        progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'onboarding_status': 'complete',
                'setup_completed': True,
                'current_step': 'completed',
                'completed_steps': ['business_info', 'subscription', 'payment', 'setup'],
                'selected_plan': user.user_subscription or 'professional',
                'payment_completed': True,
                'completed_at': timezone.now()
            }
        )
        
        if not created:
            progress.onboarding_status = 'complete'
            progress.setup_completed = True
            progress.current_step = 'completed'
            progress.payment_completed = True
            progress.completed_at = timezone.now()
            if len(progress.completed_steps) < 4:
                progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
            progress.save()
        
        print(f"  ✅ Marked as complete and can access dashboard")
        
    elif action == 'continue_onboarding':
        # Keep them in onboarding but ensure progress record exists
        progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'onboarding_status': 'in_progress',
                'current_step': 'business_info',
                'completed_steps': []
            }
        )
        
        # Ensure they stay in onboarding
        user.onboarding_completed = False
        user.save()
        
        # But preserve their tenant/business IDs
        print(f"  🔄 User will continue onboarding from: {progress.current_step}")
        print(f"     Preserved tenant_id: {profile.tenant_id}")
        print(f"     Preserved business_id: {profile.business_id}")
        
    elif action == 'start_onboarding':
        # Clear any partial data and start fresh
        user.onboarding_completed = False
        user.save()
        
        OnboardingProgress.objects.filter(user=user).delete()
        OnboardingProgress.objects.create(
            user=user,
            onboarding_status='not_started',
            current_step='business_info',
            completed_steps=[]
        )
        
        print(f"  🆕 User will start onboarding from beginning")
    
    return True

def scan_all_users():
    """Scan all users and categorize them"""
    
    print("\n" + "="*60)
    print("SCANNING ALL USERS")
    print("="*60)
    
    categories = {
        'complete': [],
        'in_progress': [],
        'stuck': [],
        'not_started': []
    }
    
    all_users = User.objects.all()
    
    for user in all_users:
        profile = UserProfile.objects.filter(user=user).first()
        progress = OnboardingProgress.objects.filter(user=user).first()
        
        if user.onboarding_completed:
            categories['complete'].append(user.email)
        elif profile and (profile.tenant_id or profile.business_id):
            # Has data but not marked complete - STUCK
            categories['stuck'].append(user.email)
        elif progress and progress.completed_steps:
            # Started but not finished
            categories['in_progress'].append(user.email)
        else:
            categories['not_started'].append(user.email)
    
    print(f"\n📊 User Categories:")
    print(f"  ✅ Complete: {len(categories['complete'])} users")
    print(f"  🔄 In Progress: {len(categories['in_progress'])} users")
    print(f"  ⚠️ Stuck (has data but not complete): {len(categories['stuck'])} users")
    print(f"  🆕 Not Started: {len(categories['not_started'])} users")
    
    if categories['stuck']:
        print(f"\n⚠️ Stuck Users (need attention):")
        for email in categories['stuck'][:10]:  # Show first 10
            print(f"  - {email}")
        if len(categories['stuck']) > 10:
            print(f"  ... and {len(categories['stuck']) - 10} more")
    
    return categories

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Properly fix onboarding issues')
    parser.add_argument('--email', help='Analyze/fix specific user')
    parser.add_argument('--scan', action='store_true', help='Scan all users')
    parser.add_argument('--fix-stuck', action='store_true', help='Fix all stuck users')
    parser.add_argument('--force-complete', action='store_true', help='Force mark as complete (use with --email)')
    
    args = parser.parse_args()
    
    if args.email:
        if args.force_complete:
            fix_user_properly(args.email, force_complete=True)
        else:
            fix_user_properly(args.email)
            
    elif args.scan:
        scan_all_users()
        
    elif args.fix_stuck:
        categories = scan_all_users()
        
        if categories['stuck']:
            print(f"\n🔧 Found {len(categories['stuck'])} stuck users")
            response = input("Fix them all? (yes/no): ")
            
            if response.lower() == 'yes':
                for email in categories['stuck']:
                    print(f"\nFixing {email}...")
                    try:
                        # For stuck users, we mark them complete since they have tenant/business
                        fix_user_properly(email, force_complete=True)
                    except Exception as e:
                        print(f"  ❌ Error: {str(e)}")
    else:
        print("Usage:")
        print("  python fix_onboarding_properly.py --email user@example.com")
        print("  python fix_onboarding_properly.py --email user@example.com --force-complete")
        print("  python fix_onboarding_properly.py --scan")
        print("  python fix_onboarding_properly.py --fix-stuck")

if __name__ == "__main__":
    main()