#!/usr/bin/env python3
"""
Comprehensive fix for three critical issues:
1. User subscription plan showing as "free" instead of actual plan
2. User given_name/family_name empty (causing "?" initials)
3. Missing business_type column in users_business table

Run this script on the backend server to fix all issues.
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
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
            logger.info("🔧 Adding business_type column to users_business table...")
            try:
                # Add the column
                cursor.execute("""
                    ALTER TABLE users_business 
                    ADD COLUMN business_type VARCHAR(50) NULL
                """)
                logger.info("✅ Successfully added business_type column")
                
                # Migrate business_type data from BusinessDetails if it exists
                cursor.execute("""
                    UPDATE users_business b
                    SET business_type = (
                        SELECT bd.business_type 
                        FROM users_business_details bd 
                        WHERE bd.business_id = b.id
                        LIMIT 1
                    )
                    WHERE EXISTS (
                        SELECT 1 
                        FROM users_business_details bd 
                        WHERE bd.business_id = b.id
                    )
                """)
                updated_count = cursor.rowcount
                if updated_count > 0:
                    logger.info(f"✅ Migrated business_type for {updated_count} businesses")
                    
            except Exception as e:
                if 'already exists' in str(e).lower():
                    logger.info("✅ business_type column already exists")
                else:
                    logger.error(f"❌ Error adding business_type column: {e}")
                    raise
        else:
            logger.info("✅ business_type column already exists in users_business table")

def fix_user_data(specific_email=None):
    """Fix missing subscription plans and names for users"""
    
    logger.info("\n📊 Starting comprehensive user data fix...")
    
    # First fix the database schema
    check_and_fix_business_type_column()
    
    # Find users to fix
    if specific_email:
        users_query = User.objects.filter(email=specific_email)
        logger.info(f"🔍 Fixing specific user: {specific_email}")
    else:
        users_query = User.objects.filter(onboarding_completed=True)
        logger.info("🔍 Fixing all users with completed onboarding")
    
    fixed_count = 0
    total_users = users_query.count()
    logger.info(f"📊 Found {total_users} users to check")
    
    for user in users_query:
        fixes_made = []
        
        with transaction.atomic():
            try:
                # Log current state
                logger.info(f"\n👤 Checking user: {user.email}")
                logger.info(f"  Current subscription_plan: {user.subscription_plan}")
                logger.info(f"  Current names: first_name='{user.first_name}', last_name='{user.last_name}'")
                
                # Check OnboardingProgress for actual subscription plan
                progress = OnboardingProgress.objects.filter(user=user).first()
                
                if progress:
                    # Fix subscription plan
                    actual_plan = progress.subscription_plan or progress.selected_plan or 'free'
                    
                    # Special handling for enterprise plan
                    if progress.selected_plan == 'enterprise' or progress.subscription_plan == 'enterprise':
                        actual_plan = 'enterprise'
                    
                    if user.subscription_plan != actual_plan:
                        logger.info(f"  🔧 Updating subscription_plan: {user.subscription_plan} → {actual_plan}")
                        user.subscription_plan = actual_plan
                        fixes_made.append(f"subscription_plan: {user.subscription_plan} → {actual_plan}")
                
                # Fix missing names
                if not user.first_name or not user.last_name:
                    # Priority 1: Use given_name/family_name from User model
                    if hasattr(user, 'given_name') and user.given_name:
                        user.first_name = user.given_name
                        fixes_made.append(f"first_name: '' → {user.given_name} (from given_name)")
                    
                    if hasattr(user, 'family_name') and user.family_name:
                        user.last_name = user.family_name
                        fixes_made.append(f"last_name: '' → {user.family_name} (from family_name)")
                    
                    # Priority 2: Extract from 'name' field
                    elif user.name and (not user.first_name or not user.last_name):
                        name_parts = user.name.strip().split(' ', 1)
                        if len(name_parts) >= 1 and not user.first_name:
                            user.first_name = name_parts[0]
                            fixes_made.append(f"first_name: '' → {name_parts[0]} (from name)")
                        if len(name_parts) >= 2 and not user.last_name:
                            user.last_name = name_parts[1]
                            fixes_made.append(f"last_name: '' → {name_parts[1]} (from name)")
                    
                    # Priority 3: Use email prefix as fallback
                    elif not user.first_name and user.email:
                        email_prefix = user.email.split('@')[0]
                        user.first_name = email_prefix.capitalize()
                        fixes_made.append(f"first_name: '' → {email_prefix.capitalize()} (from email)")
                
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
                    logger.info(f"  ✅ Fixed {len(fixes_made)} issues:")
                    for fix in fixes_made:
                        logger.info(f"    - {fix}")
                else:
                    logger.info(f"  ✅ No issues found")
                    
            except Exception as e:
                logger.error(f"  ❌ Error fixing user {user.email}: {e}")
                continue
    
    # Summary report
    logger.info(f"\n📊 SUMMARY:")
    logger.info(f"  Total users checked: {total_users}")
    logger.info(f"  Users fixed: {fixed_count}")
    
    # Show current subscription distribution
    logger.info("\n📊 Current subscription distribution:")
    for plan in ['free', 'professional', 'enterprise']:
        count = User.objects.filter(subscription_plan=plan, onboarding_completed=True).count()
        logger.info(f"  {plan}: {count} users")
    
    # Show users still missing names
    missing_names = User.objects.filter(
        onboarding_completed=True,
        first_name='',
        last_name=''
    ).count()
    logger.info(f"\n👤 Users still missing names: {missing_names}")
    
    # Check for business_type issues
    logger.info("\n🏢 Checking business data integrity:")
    businesses_without_type = Business.objects.filter(
        business_type__isnull=True
    ).count() if hasattr(Business, 'business_type') else 0
    logger.info(f"  Businesses without type: {businesses_without_type}")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Fix specific user
        email = sys.argv[1]
        fix_user_data(specific_email=email)
    else:
        # Fix all users
        fix_user_data()
    
    logger.info("\n✅ Script completed successfully!")

if __name__ == "__main__":
    main()