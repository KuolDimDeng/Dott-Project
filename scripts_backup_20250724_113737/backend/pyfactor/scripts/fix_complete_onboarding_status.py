#!/usr/bin/env python
"""
Fix individual user's onboarding status who completed onboarding but still has needs_onboarding = True

Usage:
    python manage.py shell
    >>> from scripts.fix_complete_onboarding_status import fix_user_onboarding
    >>> fix_user_onboarding('kdeng@dottapps.com')
"""

import os
import sys
import django
from django.db import transaction
from datetime import datetime

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import User
from onboarding.models import OnboardingProgress
from tenant.models import Tenant


def fix_user_onboarding(email):
    """Fix onboarding status for a specific user"""
    
    try:
        user = User.objects.get(email=email)
        print(f"\n🔍 Checking user: {email}")
        print(f"   - Current needs_onboarding: {user.needs_onboarding}")
        print(f"   - Current onboarding_completed: {user.onboarding_completed}")
        print(f"   - Has tenant: {user.tenant is not None}")
        
        if user.tenant:
            print(f"   - Tenant: {user.tenant.name}")
            print(f"   - Tenant ID: {user.tenant.id}")
        
        # Check onboarding progress
        has_progress = hasattr(user, 'onboardingprogress')
        if has_progress:
            progress = user.onboardingprogress
            print(f"\n📋 Onboarding Progress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Current step: {progress.current_step}")
            print(f"   - Business info completed: {progress.business_info_completed}")
            print(f"   - Subscription selected: {progress.subscription_selected}")
            print(f"   - Payment completed: {progress.payment_completed}")
            print(f"   - Selected plan: {progress.selected_plan}")
        
        # Fix if user has tenant but still marked as needs_onboarding
        if user.tenant and user.needs_onboarding:
            print(f"\n⚠️  User has tenant but needs_onboarding is True - fixing...")
            
            with transaction.atomic():
                # Update user status
                user.needs_onboarding = False
                user.onboarding_completed = True
                user.setup_done = True
                user.current_onboarding_step = 'completed'
                user.onboarding_status = 'complete'
                user.save(update_fields=[
                    'needs_onboarding', 
                    'onboarding_completed', 
                    'setup_done',
                    'current_onboarding_step',
                    'onboarding_status'
                ])
                
                # Update onboarding progress if exists
                if has_progress:
                    progress.onboarding_status = 'complete'
                    progress.setup_completed = True
                    progress.current_step = 'completed'
                    if not progress.completed_at:
                        progress.completed_at = datetime.now()
                    progress.save()
                
                # Clear any active sessions to force refresh
                if hasattr(user, 'sessions'):
                    user.sessions.all().delete()
                    print(f"   ✅ Cleared active sessions")
            
            print(f"\n✅ Fixed onboarding status for {email}")
            print(f"   - needs_onboarding: {user.needs_onboarding}")
            print(f"   - onboarding_completed: {user.onboarding_completed}")
            print(f"   - setup_done: {user.setup_done}")
            
            return True
        
        elif not user.tenant:
            print(f"\n❌ User has no tenant assigned - onboarding not complete")
            return False
        
        else:
            print(f"\n✅ User onboarding status is already correct")
            return True
            
    except User.DoesNotExist:
        print(f"\n❌ User {email} not found")
        return False
    except Exception as e:
        print(f"\n❌ Error fixing user: {str(e)}")
        return False


def check_and_fix_multiple_users(emails):
    """Check and fix multiple users"""
    
    print(f"\n🔍 Checking {len(emails)} users...")
    
    fixed = 0
    already_ok = 0
    errors = 0
    
    for email in emails:
        result = fix_user_onboarding(email)
        if result is True:
            fixed += 1
        elif result is False:
            errors += 1
        else:
            already_ok += 1
    
    print(f"\n📊 Summary:")
    print(f"   - Fixed: {fixed}")
    print(f"   - Already OK: {already_ok}")
    print(f"   - Errors: {errors}")


if __name__ == "__main__":
    # Fix specific user
    import sys
    if len(sys.argv) > 1:
        email = sys.argv[1]
        fix_user_onboarding(email)
    else:
        print("Usage: python fix_complete_onboarding_status.py <email>")
        print("Or use in Django shell:")
        print("  from scripts.fix_complete_onboarding_status import fix_user_onboarding")
        print("  fix_user_onboarding('user@example.com')")