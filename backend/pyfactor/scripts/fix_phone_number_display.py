#!/usr/bin/env python
"""
Script to fix phone number display for users who signed up with phone numbers.
This ensures phone numbers are properly stored in both User and UserProfile models.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from users.models import User, UserProfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_phone_numbers():
    """
    Fix phone numbers for all users, especially those who signed up via phone.
    """
    try:
        with transaction.atomic():
            # Find all users with phone numbers
            users_with_phones = User.objects.exclude(phone_number__isnull=True).exclude(phone_number='')
            
            logger.info(f"Found {users_with_phones.count()} users with phone numbers")
            
            fixed_count = 0
            for user in users_with_phones:
                logger.info(f"Checking user: {user.email} with phone: {user.phone_number}")
                
                # Get or create UserProfile
                profile, created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
                )
                
                # Check if profile needs updating
                if not profile.phone_number or profile.phone_number != user.phone_number:
                    old_phone = profile.phone_number
                    profile.phone_number = user.phone_number
                    profile.save()
                    fixed_count += 1
                    logger.info(f"✅ Updated profile for {user.email}: {old_phone} -> {user.phone_number}")
                else:
                    logger.info(f"✔️ Profile already has correct phone: {profile.phone_number}")
            
            logger.info(f"\n🎉 Fixed {fixed_count} user profiles")
            
            # Special check for the specific user
            specific_phone = "+211925550100"
            try:
                specific_user = User.objects.filter(phone_number=specific_phone).first()
                if specific_user:
                    logger.info(f"\n📱 Special check for {specific_phone}:")
                    logger.info(f"  - User ID: {specific_user.id}")
                    logger.info(f"  - Email: {specific_user.email}")
                    logger.info(f"  - Phone in User model: {specific_user.phone_number}")
                    
                    if hasattr(specific_user, 'profile'):
                        logger.info(f"  - Phone in UserProfile: {specific_user.profile.phone_number}")
                        logger.info(f"  - Has business: {specific_user.profile.is_business_owner}")
                        logger.info(f"  - City: {specific_user.profile.city}")
                    else:
                        logger.info("  - No UserProfile found!")
                else:
                    logger.warning(f"❌ No user found with phone {specific_phone}")
            except Exception as e:
                logger.error(f"Error checking specific user: {e}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error fixing phone numbers: {e}")
        return False


def check_user_by_email(email):
    """
    Check a specific user by email and ensure phone number is set.
    """
    try:
        user = User.objects.filter(email=email).first()
        if user:
            logger.info(f"\n📧 Checking user with email: {email}")
            logger.info(f"  - User ID: {user.id}")
            logger.info(f"  - Phone in User model: {user.phone_number}")
            
            # Get or create profile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None}
            )
            
            if created:
                logger.info("  - Created new UserProfile")
            
            # Sync phone number if needed
            if user.phone_number and (not profile.phone_number or profile.phone_number != user.phone_number):
                profile.phone_number = user.phone_number
                profile.save()
                logger.info(f"  - ✅ Synced phone to profile: {profile.phone_number}")
            else:
                logger.info(f"  - Phone in profile: {profile.phone_number}")
                
        else:
            logger.warning(f"❌ No user found with email {email}")
            
    except Exception as e:
        logger.error(f"Error checking user by email: {e}")


if __name__ == "__main__":
    logger.info("🔧 Starting phone number fix script...")
    
    # Fix all phone numbers
    success = fix_phone_numbers()
    
    # Also check Steve Majak's account specifically
    check_user_by_email("stevemajak16@gmail.com")
    
    if success:
        logger.info("\n✅ Phone number fix completed successfully!")
    else:
        logger.error("\n❌ Phone number fix failed!")
        sys.exit(1)