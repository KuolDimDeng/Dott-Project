#!/usr/bin/env python3
"""
Fix user subscription plans and names that were not saved during onboarding.
This script updates users who have completed onboarding but are missing:
- subscription_plan (showing as 'free' instead of actual plan)
- first_name/last_name (showing initials as '?' in DashAppBar)
- Also adds missing business_type column to users_business table
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction, connection
from custom_auth.models import User
from onboarding.models import OnboardingProgress
from users.models import Business, BusinessDetails
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_fix_business_type_column():
    """Check if business_type column exists in users_business table and add if missing"""
    with connection.cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business' 
            AND column_name = 'business_type'
        """)
        result = cursor.fetchone()
        
        if not result:
            logger.info("Adding business_type column to users_business table...")
            try:
                cursor.execute("""
                    ALTER TABLE users_business 
                    ADD COLUMN business_type VARCHAR(50) NULL
                """)
                logger.info("✅ Successfully added business_type column")
            except Exception as e:
                if 'already exists' in str(e).lower():
                    logger.info("✅ business_type column already exists")
                else:
                    logger.error(f"❌ Error adding business_type column: {e}")
                    raise
        else:
            logger.info("✅ business_type column already exists in users_business table")

def fix_user_data(specific_email=None):
    """Fix missing subscription plans and names for users who completed onboarding."""
    
    logger.info("Finding users with completed onboarding but missing data...")
    
    # First fix the database schema
    check_and_fix_business_type_column()
    
    # Find users who have completed onboarding
    if specific_email:
        users_to_fix = User.objects.filter(
            email=specific_email,
            onboarding_completed=True
        ).select_related('tenant')
    else:
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
                
                # Fix subscription plan - check OnboardingProgress for actual plan
                actual_plan = progress.subscription_plan or progress.selected_plan or 'free'
                
                # Log current state
                logger.info(f"\nChecking user: {user.email}")
                logger.info(f"  Current User.subscription_plan: {user.subscription_plan}")
                logger.info(f"  OnboardingProgress.subscription_plan: {progress.subscription_plan}")
                logger.info(f"  OnboardingProgress.selected_plan: {progress.selected_plan}")
                
                if user.subscription_plan != actual_plan:
                    user.subscription_plan = actual_plan
                    fixes_made.append(f"subscription_plan: {user.subscription_plan} -> {actual_plan}")
                    
                # Also check if user has subscription_plan but it's not reflected in User model
                if user.subscription_plan == 'free' and (progress.subscription_plan == 'enterprise' or progress.selected_plan == 'enterprise'):
                    user.subscription_plan = 'enterprise'
                    fixes_made.append("subscription_plan: free -> enterprise")
                
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
                    # Explicitly save the specific fields
                    update_fields = []
                    if any('subscription_plan' in fix for fix in fixes_made):
                        update_fields.append('subscription_plan')
                    if any('first_name' in fix for fix in fixes_made):
                        update_fields.append('first_name')
                    if any('last_name' in fix for fix in fixes_made):
                        update_fields.append('last_name')
                    
                    user.save(update_fields=update_fields)
                    fixed_count += 1
                    logger.info(f"\n✅ Fixed user {user.email}:")
                    for fix in fixes_made:
                        logger.info(f"  - {fix}")
                    
            except OnboardingProgress.DoesNotExist:
                logger.warning(f"⚠️  No OnboardingProgress found for user {user.email}")
    
    logger.info(f"\n✅ Fixed {fixed_count} users")
    
    # Show summary of current state
    logger.info("\n📊 Current subscription distribution:")
    for plan in ['free', 'professional', 'enterprise']:
        count = User.objects.filter(subscription_plan=plan, onboarding_completed=True).count()
        logger.info(f"  {plan}: {count} users")
    
    logger.info("\n👤 Users still missing names:")
    missing_names = User.objects.filter(
        onboarding_completed=True,
        first_name='',
        last_name=''
    ).count()
    logger.info(f"  {missing_names} users")

if __name__ == '__main__':
    # Check if specific email provided
    if len(sys.argv) > 1:
        email = sys.argv[1]
        logger.info(f"\n🎯 Fixing specific user: {email}")
        fix_user_data(specific_email=email)
    else:
        fix_user_data()