#!/usr/bin/env python
"""
Find and fix ALL users stuck in onboarding loop.
This finds users who:
- Own a tenant
- But have onboarding_completed = False
And fixes them automatically.
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
from django.utils import timezone
from django.db.models import Q
from users.models import UserProfile
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress

User = get_user_model()

def find_stuck_users():
    """Find all users who own tenants but have incomplete onboarding"""
    
    print("\n" + "="*60)
    print("SCANNING FOR STUCK USERS")
    print("="*60)
    
    stuck_users = []
    
    # Find all users with onboarding_completed = False
    incomplete_users = User.objects.filter(onboarding_completed=False)
    
    print(f"\nFound {incomplete_users.count()} users with incomplete onboarding")
    print("Checking which ones own tenants...")
    
    for user in incomplete_users:
        # Check if user owns a tenant
        owned_tenants = Tenant.objects.filter(owner_id=user.id)
        if owned_tenants.exists():
            tenant = owned_tenants.first()
            profile = UserProfile.objects.filter(user=user).first()
            
            stuck_users.append({
                'user': user,
                'email': user.email,
                'tenant': tenant,
                'has_profile_tenant': profile.tenant_id if profile else None
            })
            
            status = "✅ Has tenant in profile" if (profile and profile.tenant_id) else "⚠️ Missing tenant in profile"
            print(f"  - {user.email}: owns {tenant.name} [{status}]")
    
    print(f"\n📊 Summary: {len(stuck_users)} users are stuck")
    return stuck_users

def fix_user(user_data):
    """Fix a single stuck user"""
    
    user = user_data['user']
    tenant = user_data['tenant']
    
    try:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        # Fix 1: Ensure UserProfile has tenant_id
        if not profile.tenant_id:
            profile.tenant_id = tenant.id
            profile.save()
            print(f"    ✅ Fixed UserProfile.tenant_id")
        
        # Fix 2: Mark onboarding as complete
        user.onboarding_completed = True
        user.onboarding_completed_at = timezone.now()
        if not user.subscription_plan or user.subscription_plan == 'free':
            user.subscription_plan = 'professional'
        user.save()
        print(f"    ✅ Marked onboarding_completed = True")
        
        # Fix 3: Create/update OnboardingProgress
        progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'onboarding_status': 'complete',
                'setup_completed': True,
                'current_step': 'completed',
                'completed_steps': ['business_info', 'subscription', 'payment', 'setup'],
                'selected_plan': user.subscription_plan or 'professional',
                'payment_completed': True,
                'completed_at': timezone.now()
            }
        )
        
        if not created:
            progress.onboarding_status = 'complete'
            progress.setup_completed = True
            progress.current_step = 'completed'
            progress.completed_steps = ['business_info', 'subscription', 'payment', 'setup']
            progress.payment_completed = True
            progress.completed_at = timezone.now()
            progress.save()
            print(f"    ✅ Updated OnboardingProgress")
        else:
            print(f"    ✅ Created OnboardingProgress")
        
        return True
        
    except Exception as e:
        print(f"    ❌ Error: {str(e)}")
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix all users stuck in onboarding loop')
    parser.add_argument('--dry-run', action='store_true', help='Just find stuck users without fixing')
    parser.add_argument('--auto-fix', action='store_true', help='Automatically fix all stuck users')
    
    args = parser.parse_args()
    
    # Find stuck users
    stuck_users = find_stuck_users()
    
    if not stuck_users:
        print("\n✅ No stuck users found! All users are properly configured.")
        return
    
    if args.dry_run:
        print("\n[DRY RUN] Would fix these users:")
        for user_data in stuck_users:
            print(f"  - {user_data['email']}")
        print(f"\nRun with --auto-fix to fix them")
        return
    
    if args.auto_fix:
        print(f"\n🔧 Auto-fixing {len(stuck_users)} users...")
        fixed = 0
        failed = 0
        
        for user_data in stuck_users:
            print(f"\n  Fixing {user_data['email']}...")
            if fix_user(user_data):
                fixed += 1
            else:
                failed += 1
        
        print("\n" + "="*60)
        print("FIX COMPLETE")
        print("="*60)
        print(f"✅ Successfully fixed: {fixed} users")
        if failed > 0:
            print(f"❌ Failed to fix: {failed} users")
    else:
        print(f"\n🔧 Found {len(stuck_users)} stuck users")
        response = input("Fix them all? (yes/no): ")
        
        if response.lower() == 'yes':
            fixed = 0
            failed = 0
            
            for user_data in stuck_users:
                print(f"\n  Fixing {user_data['email']}...")
                if fix_user(user_data):
                    fixed += 1
                else:
                    failed += 1
            
            print("\n" + "="*60)
            print("FIX COMPLETE")
            print("="*60)
            print(f"✅ Successfully fixed: {fixed} users")
            if failed > 0:
                print(f"❌ Failed to fix: {failed} users")
        else:
            print("Aborted. Run with --auto-fix to fix automatically.")

if __name__ == "__main__":
    main()