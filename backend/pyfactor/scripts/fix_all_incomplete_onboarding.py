#!/usr/bin/env python
"""
Fix all users who completed onboarding but still have needs_onboarding = True
This script identifies and fixes all affected users in one batch operation.

Usage:
    python manage.py shell < scripts/fix_all_incomplete_onboarding.py
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

from custom_auth.models import CustomUser, OnboardingProgress
from tenant.models import Tenant


def fix_all_incomplete_onboarding():
    """Fix all users who have completed onboarding but still marked as needs_onboarding = True"""
    
    print("\n🔍 Searching for users with incomplete onboarding status...\n")
    
    # Find all users who have completed onboarding but still marked as needs_onboarding
    affected_users = CustomUser.objects.filter(
        needs_onboarding=True,
        tenant__isnull=False  # Has a tenant assigned
    ).select_related('tenant', 'onboardingprogress')
    
    print(f"Found {affected_users.count()} users with potential issues\n")
    
    fixed_count = 0
    error_count = 0
    
    for user in affected_users:
        try:
            # Check if user has completed onboarding based on multiple criteria
            has_tenant = user.tenant is not None
            has_onboarding_progress = hasattr(user, 'onboardingprogress')
            
            # Check onboarding progress if exists
            if has_onboarding_progress:
                progress = user.onboardingprogress
                payment_completed = progress.payment_completed or progress.selected_plan == 'free'
                all_steps_complete = (
                    progress.business_info_completed and 
                    progress.subscription_selected and
                    (payment_completed or progress.selected_plan == 'free')
                )
            else:
                # If no progress record but has tenant, assume completed
                all_steps_complete = has_tenant
                payment_completed = True
            
            # Fix users who have completed all steps but still marked as needs_onboarding
            if has_tenant and (all_steps_complete or payment_completed):
                print(f"✅ Fixing user: {user.email}")
                print(f"   - Tenant: {user.tenant.business_name if user.tenant else 'None'}")
                print(f"   - Current needs_onboarding: {user.needs_onboarding}")
                
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
                    if has_onboarding_progress:
                        progress.onboarding_status = 'complete'
                        progress.setup_completed = True
                        progress.current_step = 'completed'
                        if not progress.completed_at:
                            progress.completed_at = datetime.now()
                        progress.save()
                    
                    # Clear any active sessions to force refresh
                    if hasattr(user, 'sessions'):
                        user.sessions.all().delete()
                
                print(f"   ✅ Fixed - needs_onboarding now: {user.needs_onboarding}\n")
                fixed_count += 1
            else:
                print(f"⏭️  Skipping {user.email} - not all criteria met")
                print(f"   - Has tenant: {has_tenant}")
                print(f"   - All steps complete: {all_steps_complete if has_onboarding_progress else 'N/A'}")
                print(f"   - Payment completed: {payment_completed if has_onboarding_progress else 'N/A'}\n")
                
        except Exception as e:
            print(f"❌ Error fixing user {user.email}: {str(e)}\n")
            error_count += 1
            continue
    
    print("\n" + "="*60)
    print(f"📊 Summary:")
    print(f"   - Total users checked: {affected_users.count()}")
    print(f"   - Users fixed: {fixed_count}")
    print(f"   - Errors: {error_count}")
    print("="*60 + "\n")
    
    # Also check for users without onboarding progress but with tenants
    orphaned_users = CustomUser.objects.filter(
        tenant__isnull=False,
        onboardingprogress__isnull=True,
        needs_onboarding=True
    )
    
    if orphaned_users.exists():
        print(f"\n⚠️  Found {orphaned_users.count()} users with tenants but no onboarding progress records")
        print("Fixing these users too...\n")
        
        for user in orphaned_users:
            try:
                with transaction.atomic():
                    user.needs_onboarding = False
                    user.onboarding_completed = True
                    user.setup_done = True
                    user.current_onboarding_step = 'completed'
                    user.onboarding_status = 'complete'
                    user.save()
                    
                    print(f"✅ Fixed orphaned user: {user.email}")
                    fixed_count += 1
            except Exception as e:
                print(f"❌ Error fixing orphaned user {user.email}: {str(e)}")
                error_count += 1
    
    print(f"\n✅ Total users fixed: {fixed_count}")
    if error_count > 0:
        print(f"⚠️  Total errors: {error_count}")
    
    return fixed_count, error_count


if __name__ == "__main__":
    fix_all_incomplete_onboarding()