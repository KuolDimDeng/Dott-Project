#!/usr/bin/env python
"""
Script to fix the issue with business_id in the UserProfile model.
This script ensures that the business_id field in the UserProfile model is properly handled.
"""

import os
import sys
import django
import logging
import uuid
from django.db import connection, transaction

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def fix_business_id_in_userprofile():
    """
    Fix the issue with business_id in the UserProfile model.
    """
    try:
        # Import the models
        from users.models import UserProfile, Business
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        logger.info("Checking for UserProfile records with invalid business_id...")
        
        # Get all UserProfile records
        profiles = UserProfile.objects.all()
        logger.info(f"Found {len(profiles)} UserProfile records")
        
        # Check if there are any profiles with invalid business_id
        invalid_profiles = []
        for profile in profiles:
            if profile.business_id and not isinstance(profile.business_id, uuid.UUID):
                invalid_profiles.append(profile)
        
        logger.info(f"Found {len(invalid_profiles)} UserProfile records with invalid business_id")
        
        # Fix the invalid profiles
        if invalid_profiles:
            with transaction.atomic():
                for profile in invalid_profiles:
                    # Try to find a business for this user
                    user = profile.user
                    businesses = Business.objects.filter(owner=user)
                    
                    if businesses.exists():
                        # Use the first business found
                        business = businesses.first()
                        logger.info(f"Setting business_id for user {user.id} to {business.id}")
                        profile.business_id = business.id
                        profile.save()
                    else:
                        # Create a new business for this user
                        logger.info(f"Creating new business for user {user.id}")
                        business = Business.objects.create(
                            owner=user,
                            name=f"{user.first_name}'s Business",
                            status="ACTIVE"
                        )
                        profile.business_id = business.id
                        profile.save()
            
            logger.info("Fixed all UserProfile records with invalid business_id")
        else:
            logger.info("No UserProfile records with invalid business_id found")
        
        return True
    except Exception as e:
        logger.error(f"Error fixing business_id in UserProfile: {str(e)}")
        return False

if __name__ == "__main__":
    success = fix_business_id_in_userprofile()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)