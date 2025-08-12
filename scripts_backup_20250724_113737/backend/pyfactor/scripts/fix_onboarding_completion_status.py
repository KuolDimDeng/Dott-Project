#!/usr/bin/env python
"""
Fix onboarding completion status for users who have completed onboarding
but are still marked as needs_onboarding=True in the backend.
"""

import os
import sys
import django
from django.db import transaction
from datetime import datetime, timezone

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import CustomUser
from onboarding.models import OnboardingProgress
from tenant.models import Tenant


def fix_user_onboarding_status(email):
    """Fix onboarding status for a specific user"""
    
    try:
        user = CustomUser.objects.get(email=email)
        print(f"\n📋 Checking user: {email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Tenant ID: {user.tenant_id}")
        
        # Check if user has a tenant
        if not user.tenant_id:
            print(f"   ❌ No tenant assigned - cannot fix")
            return False
            
        # Get tenant
        try:
            tenant = Tenant.objects.get(id=user.tenant_id)
            print(f"   - Tenant: {tenant.business_name}")
        except Tenant.DoesNotExist:
            print(f"   ❌ Tenant not found")
            return False
        
        # Check onboarding progress
        try:
            progress = OnboardingProgress.objects.get(user=user)
            print(f"\n📊 Current OnboardingProgress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Payment completed: {progress.payment_completed}")
            print(f"   - Selected plan: {progress.selected_plan}")
            print(f"   - Completed steps: {progress.completed_steps}")
            
            # Fix boolean field corruption
            if isinstance(progress.setup_completed, str):
                progress.setup_completed = progress.setup_completed.lower() == 'true'
            if isinstance(progress.payment_completed, str):
                progress.payment_completed = progress.payment_completed.lower() == 'true'
                
        except OnboardingProgress.DoesNotExist:
            print(f"\n⚠️  No OnboardingProgress record - creating one")
            progress = OnboardingProgress(
                user=user,
                tenant_id=user.tenant_id
            )
        
        # Update progress to completion
        with transaction.atomic():
            progress.onboarding_status = 'complete'
            progress.current_step = 'complete'
            progress.setup_completed = True
            progress.business_info_completed = True
            progress.subscription_selected = True
            
            # For free tier or if payment was completed
            if progress.selected_plan == 'free' or progress.payment_completed:
                progress.payment_completed = True
                
            # Ensure completed_steps is a list
            if not isinstance(progress.completed_steps, list):
                progress.completed_steps = []
                
            # Add all required steps
            required_steps = ['business_info', 'subscription', 'payment', 'setup', 'complete']
            for step in required_steps:
                if step not in progress.completed_steps:
                    progress.completed_steps.append(step)
                    
            # Set timestamps
            if not progress.completed_at:
                progress.completed_at = datetime.now(timezone.utc)
            
            # Ensure tenant_id is set
            if not progress.tenant_id:
                progress.tenant_id = user.tenant_id
                
            progress.save()
            
            print(f"\n✅ Fixed OnboardingProgress:")
            print(f"   - Status: {progress.onboarding_status}")
            print(f"   - Setup completed: {progress.setup_completed}")
            print(f"   - Completed steps: {progress.completed_steps}")
            
        # Clear any active sessions to force refresh
        if hasattr(user, 'sessions'):
            count = user.sessions.all().delete()[0]
            if count > 0:
                print(f"   - Cleared {count} active sessions")
                
        print(f"\n✅ Successfully fixed onboarding status for {email}")
        return True
        
    except CustomUser.DoesNotExist:
        print(f"\n❌ User {email} not found")
        return False
    except Exception as e:
        print(f"\n❌ Error fixing {email}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def fix_all_users_with_tenants():
    """Fix all users who have tenants but incorrect onboarding status"""
    
    print("\n🔍 Finding all users with tenants...")
    
    # Find users with tenants
    users_with_tenants = CustomUser.objects.filter(tenant_id__isnull=False)
    
    print(f"Found {users_with_tenants.count()} users with tenants")
    
    fixed_count = 0
    error_count = 0
    
    for user in users_with_tenants:
        try:
            # Check if onboarding progress exists and is incomplete
            try:
                progress = OnboardingProgress.objects.get(user=user)
                if progress.onboarding_status == 'complete' and progress.setup_completed:
                    continue  # Already complete, skip
            except OnboardingProgress.DoesNotExist:
                pass  # Will be created by fix function
                
            print(f"\nProcessing {user.email}...")
            if fix_user_onboarding_status(user.email):
                fixed_count += 1
            else:
                error_count += 1
                
        except Exception as e:
            print(f"Error processing {user.email}: {str(e)}")
            error_count += 1
            
    print(f"\n📊 Summary:")
    print(f"   - Total users processed: {users_with_tenants.count()}")
    print(f"   - Fixed: {fixed_count}")
    print(f"   - Errors: {error_count}")
    
    return fixed_count, error_count


def check_data_integrity():
    """Check for common data integrity issues"""
    
    print("\n🔍 Checking data integrity...")
    
    # Check for users with tenants but no onboarding progress
    users_with_tenants = CustomUser.objects.filter(tenant_id__isnull=False)
    users_without_progress = 0
    
    for user in users_with_tenants:
        if not OnboardingProgress.objects.filter(user=user).exists():
            users_without_progress += 1
            print(f"   - {user.email}: Has tenant but no OnboardingProgress")
            
    print(f"\n📊 Users with tenants but no OnboardingProgress: {users_without_progress}")
    
    # Check for boolean field corruption
    corrupted_booleans = OnboardingProgress.objects.filter(
        setup_completed__in=['true', 'false', 'True', 'False']
    ).count()
    
    print(f"📊 OnboardingProgress records with string booleans: {corrupted_booleans}")
    
    # Check for missing tenant_id in OnboardingProgress
    missing_tenant_id = OnboardingProgress.objects.filter(
        tenant_id__isnull=True,
        user__tenant_id__isnull=False
    ).count()
    
    print(f"📊 OnboardingProgress records missing tenant_id: {missing_tenant_id}")
    

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
        fix_user_onboarding_status(email)
    else:
        print("Usage: python fix_onboarding_completion_status.py <email>")
        print("\nRunning data integrity check instead...")
        check_data_integrity()
        print("\nTo fix all users, run:")
        print("  from scripts.fix_onboarding_completion_status import fix_all_users_with_tenants")
        print("  fix_all_users_with_tenants()")