#!/usr/bin/env python3
"""
Verify that user data fixes were applied correctly
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from custom_auth.models import User
from onboarding.models import OnboardingProgress
from users.models import Business
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_fixes(email=None):
    """Verify that fixes were applied correctly"""
    
    logger.info("🔍 Verifying user data fixes...\n")
    
    # 1. Check business_type column
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users_business' 
            AND column_name = 'business_type'
        """)
        result = cursor.fetchone()
        
        if result:
            logger.info("✅ business_type column exists in users_business table")
            logger.info(f"   Data type: {result[1]}, Nullable: {result[2]}")
        else:
            logger.error("❌ business_type column NOT FOUND in users_business table")
    
    # 2. Check specific user or all users
    if email:
        users = User.objects.filter(email=email)
    else:
        users = User.objects.filter(onboarding_completed=True)[:10]  # Sample first 10
    
    logger.info(f"\n👤 Checking {users.count()} users:\n")
    
    for user in users:
        logger.info(f"User: {user.email}")
        logger.info(f"  ✓ subscription_plan: {user.subscription_plan}")
        logger.info(f"  ✓ first_name: '{user.first_name}'")
        logger.info(f"  ✓ last_name: '{user.last_name}'")
        logger.info(f"  ✓ Initials: {user.first_name[:1] if user.first_name else '?'}{user.last_name[:1] if user.last_name else '?'}")
        
        # Check OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            logger.info(f"  ✓ OnboardingProgress.subscription_plan: {progress.subscription_plan}")
            logger.info(f"  ✓ OnboardingProgress.selected_plan: {progress.selected_plan}")
            
            # Check if they match
            actual_plan = progress.subscription_plan or progress.selected_plan or 'free'
            if user.subscription_plan != actual_plan:
                logger.warning(f"  ⚠️  MISMATCH: User has '{user.subscription_plan}' but OnboardingProgress has '{actual_plan}'")
        
        # Check business data
        if user.tenant:
            try:
                business = Business.objects.filter(owner_id=str(user.id)).first()
                if business:
                    logger.info(f"  ✓ Business: {business.name}")
                    # Check if business_type is accessible
                    try:
                        if hasattr(business, 'business_type'):
                            logger.info(f"  ✓ Business type: {business.business_type or 'Not set'}")
                        else:
                            logger.info(f"  ℹ️  Business type: Accessed via BusinessDetails")
                    except Exception as e:
                        logger.error(f"  ❌ Error accessing business_type: {e}")
            except Exception as e:
                logger.error(f"  ❌ Error checking business: {e}")
        
        logger.info("")  # Blank line between users
    
    # 3. Summary statistics
    logger.info("\n📊 SUMMARY STATISTICS:")
    
    # Subscription distribution
    logger.info("\nSubscription Plans:")
    for plan in ['free', 'professional', 'enterprise']:
        count = User.objects.filter(
            subscription_plan=plan, 
            onboarding_completed=True
        ).count()
        logger.info(f"  {plan}: {count} users")
    
    # Users with missing names
    missing_names = User.objects.filter(
        onboarding_completed=True
    ).filter(
        models.Q(first_name='') | models.Q(last_name='')
    ).count()
    logger.info(f"\nUsers with missing names: {missing_names}")
    
    # Users with mismatched subscription plans
    mismatched_count = 0
    for user in User.objects.filter(onboarding_completed=True):
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            actual_plan = progress.subscription_plan or progress.selected_plan or 'free'
            if user.subscription_plan != actual_plan:
                mismatched_count += 1
    
    logger.info(f"Users with mismatched subscription plans: {mismatched_count}")
    
    logger.info("\n✅ Verification complete!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        verify_fixes(sys.argv[1])
    else:
        verify_fixes()