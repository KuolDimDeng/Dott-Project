#!/usr/bin/env python
"""
Fix business names for all users - ensures tenant names match business names
and OnboardingProgress has correct business references.

Usage:
    python manage.py shell < scripts/fix_business_names.py
"""

import logging
from django.contrib.auth import get_user_model
from django.core.cache import cache
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from users.models import Business

User = get_user_model()
logger = logging.getLogger(__name__)

def fix_business_names():
    """Fix business names for all users"""
    print("\n=== Fixing Business Names for All Users ===\n")
    
    users_fixed = 0
    users_skipped = 0
    errors = 0
    
    # Get all users
    users = User.objects.all()
    total_users = users.count()
    
    print(f"Processing {total_users} users...\n")
    
    for user in users:
        try:
            # Check if user has a business
            business = Business.objects.filter(owner=user).first()
            if not business:
                users_skipped += 1
                continue
                
            # Get the tenant
            tenant = Tenant.objects.filter(owner=user).first()
            if not tenant:
                print(f"⚠️  No tenant found for user {user.email}")
                users_skipped += 1
                continue
            
            # Update tenant name to match business name
            if business.name and tenant.name != business.name:
                old_name = tenant.name
                tenant.name = business.name
                tenant.save()
                print(f"✅ Updated tenant name for {user.email}: '{old_name}' → '{business.name}'")
                
                # Clear cache for this user
                cache_key = f"business_name_{user.id}"
                cache.delete(cache_key)
                cache_key = f"session_data_{user.id}"
                cache.delete(cache_key)
                
                users_fixed += 1
            else:
                print(f"⏭️  Tenant name already correct for {user.email}: '{tenant.name}'")
            
            # Update OnboardingProgress with business reference
            onboarding_progress = OnboardingProgress.objects.filter(user=user).first()
            if onboarding_progress:
                if not onboarding_progress.business_id:
                    onboarding_progress.business = business
                    onboarding_progress.save()
                    print(f"✅ Updated OnboardingProgress with business reference for {user.email}")
                else:
                    print(f"⏭️  OnboardingProgress already has business reference for {user.email}")
            else:
                # Create OnboardingProgress if it doesn't exist
                OnboardingProgress.objects.create(
                    user=user,
                    tenant_id=tenant.id,
                    business=business,
                    onboarding_status='complete',
                    current_step='complete',
                    business_info_completed=True,
                    payment_completed=True,
                    setup_completed=True
                )
                print(f"✅ Created OnboardingProgress for {user.email}")
                
        except Exception as e:
            print(f"❌ Error processing user {user.email}: {str(e)}")
            errors += 1
    
    print("\n=== Summary ===")
    print(f"Total users: {total_users}")
    print(f"Users fixed: {users_fixed}")
    print(f"Users skipped (no business): {users_skipped}")
    print(f"Errors: {errors}")
    print("\n✅ Business name fix completed!")

if __name__ == "__main__":
    fix_business_names()