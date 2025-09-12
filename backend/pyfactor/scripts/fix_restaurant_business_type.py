#!/usr/bin/env python3
"""
Fix Restaurant Business Type
=============================
Sets the simplified_business_type for restaurant businesses
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import Business, BusinessDetails
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()

def fix_restaurant_business_type(email='support@dottapps.com'):
    """Fix business type for restaurant user"""
    
    logger.info(f"🔍 Fixing business type for user: {email}")
    
    try:
        user = User.objects.get(email=email)
        logger.info(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Get user's business
        if hasattr(user, 'userprofile') and user.userprofile.business:
            business = user.userprofile.business
            logger.info(f"✅ Found business: {business.name}")
            
            # Check or create BusinessDetails
            try:
                details = business.details
                logger.info(f"✅ Found existing BusinessDetails")
            except BusinessDetails.DoesNotExist:
                logger.info(f"⚠️ Creating BusinessDetails...")
                details = BusinessDetails.objects.create(
                    business=business,
                    business_type='RESTAURANT',
                    simplified_business_type='RESTAURANT_CAFE'
                )
                logger.info(f"✅ Created BusinessDetails")
            
            # Update simplified_business_type
            if not details.simplified_business_type or details.simplified_business_type != 'RESTAURANT_CAFE':
                old_type = details.simplified_business_type
                details.simplified_business_type = 'RESTAURANT_CAFE'
                details.save()
                logger.info(f"✅ Updated simplified_business_type: {old_type} → RESTAURANT_CAFE")
            else:
                logger.info(f"ℹ️ simplified_business_type already set to: {details.simplified_business_type}")
            
            # Also update business_type if needed
            if not details.business_type:
                details.business_type = 'RESTAURANT'
                details.save()
                logger.info(f"✅ Set business_type to RESTAURANT")
            
            logger.info(f"\n✅ Business type has been fixed!")
            logger.info(f"   Business: {business.name}")
            logger.info(f"   Business Type: {details.business_type}")
            logger.info(f"   Simplified Type: {details.simplified_business_type}")
            logger.info(f"\n📌 The Menu Management option should now appear in the business menu.")
            
        else:
            logger.error(f"❌ User has no business associated")
            
    except User.DoesNotExist:
        logger.error(f"❌ User not found: {email}")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    fix_restaurant_business_type(email)