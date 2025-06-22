#!/usr/bin/env python
"""
Fix script to create missing businesses for users who completed onboarding
but don't have a business record due to the recent code changes.
"""

import django
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from users.models import Business, UserProfile
from onboarding.models import OnboardingProgress
from django.db import transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_businesses():
    """Create businesses for users who have tenants but no business."""
    
    # Find users with tenants but no business
    users_with_issues = User.objects.filter(
        tenant_id__isnull=False
    ).exclude(
        id__in=Business.objects.values_list('owner_id', flat=True)
    )
    
    logger.info(f"Found {users_with_issues.count()} users with tenants but no business")
    
    fixed_count = 0
    for user in users_with_issues:
        try:
            with transaction.atomic():
                # Get the tenant
                tenant = Tenant.objects.filter(id=user.tenant_id).first()
                if not tenant:
                    logger.warning(f"User {user.email} has tenant_id but tenant not found")
                    continue
                
                # Check if user has onboarding progress with business info
                onboarding = OnboardingProgress.objects.filter(user=user).first()
                
                # Create business with tenant name
                business_name = tenant.name or f"{user.email.split('@')[0]}'s Business"
                business_type = 'default'
                
                if onboarding and onboarding.business_name:
                    business_name = onboarding.business_name
                    business_type = onboarding.business_type or 'default'
                
                # Create the business
                business = Business.objects.create(
                    owner=user,
                    name=business_name,
                    business_type=business_type
                )
                
                # Update or create user profile
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={'business': business}
                )
                if not profile.business:
                    profile.business = business
                    profile.save()
                
                logger.info(f"Created business '{business_name}' for user {user.email}")
                fixed_count += 1
                
        except Exception as e:
            logger.error(f"Error fixing user {user.email}: {str(e)}")
    
    logger.info(f"Fixed {fixed_count} users")
    
    # Also check for users who completed onboarding but have no tenant
    users_completed_no_tenant = User.objects.filter(
        onboarding_completed=True,
        tenant_id__isnull=True
    )
    
    logger.info(f"Found {users_completed_no_tenant.count()} users who completed onboarding but have no tenant")
    
    for user in users_completed_no_tenant:
        logger.info(f"User {user.email} marked as onboarding_completed but has no tenant")
    
    return fixed_count

if __name__ == "__main__":
    logger.info("Starting fix for missing businesses...")
    fixed = fix_missing_businesses()
    logger.info(f"Fix completed. Fixed {fixed} users.")