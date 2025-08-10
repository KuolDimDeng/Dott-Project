#!/usr/bin/env python
"""
Update user profile for jubacargovillage@outlook.com
"""
import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile, BusinessDetails
from custom_auth.models import Tenant
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_user_profile():
    """Update Monica Deng's profile and business details."""
    
    User = get_user_model()
    
    try:
        # Find the user
        user = User.objects.get(email='jubacargovillage@outlook.com')
        logger.info(f"✅ Found user: {user.email}")
        
        # Update user's first and last name
        user.first_name = 'Monica'
        user.last_name = 'Deng'
        user.save()
        logger.info(f"✅ Updated name to: {user.first_name} {user.last_name}")
        
        # Update or create UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            logger.info("✅ Created new UserProfile")
        
        # Update profile fields
        profile.first_name = 'Monica'
        profile.last_name = 'Deng'
        profile.save()
        logger.info("✅ Updated UserProfile")
        
        # Update BusinessDetails with South Sudan
        # First check if user has business_id
        if hasattr(user, 'business_id') and user.business_id:
            business_details, created = BusinessDetails.objects.get_or_create(
                business_id=user.business_id,
                defaults={
                    'country': 'South Sudan',
                    'preferred_currency_code': 'SSP',  # South Sudanese Pound
                    'preferred_currency_name': 'South Sudanese Pound',
                    'preferred_currency_symbol': 'SSP',
                }
            )
            
            if not created:
                # Update existing business details
                business_details.country = 'South Sudan'
                business_details.preferred_currency_code = 'SSP'
                business_details.preferred_currency_name = 'South Sudanese Pound'
                business_details.preferred_currency_symbol = 'SSP'
                business_details.save()
                logger.info("✅ Updated existing BusinessDetails")
            else:
                logger.info("✅ Created new BusinessDetails")
        else:
            logger.info("⚠️ User doesn't have business_id, skipping BusinessDetails")
        
        # Update Tenant if exists
        if hasattr(user, 'tenant_id') and user.tenant_id:
            try:
                tenant = Tenant.objects.get(id=user.tenant_id)
                tenant.name = 'Juba Cargo Village'
                tenant.country = 'SS'
                tenant.save()
                logger.info(f"✅ Updated Tenant: {tenant.name}")
            except Tenant.DoesNotExist:
                logger.warning("⚠️ Tenant not found")
        
        # Log final state
        logger.info("\n📊 Final User Profile:")
        logger.info(f"  Name: {user.first_name} {user.last_name}")
        logger.info(f"  Email: {user.email}")
        if hasattr(user, 'business_id') and user.business_id:
            logger.info(f"  Business ID: {user.business_id}")
            try:
                bd = BusinessDetails.objects.get(business_id=user.business_id)
                logger.info(f"  Country: {bd.country}")
                logger.info(f"  Currency: {bd.preferred_currency_code}")
            except:
                pass
        
        return True
        
    except User.DoesNotExist:
        logger.error("❌ User jubacargovillage@outlook.com not found")
        return False
    except Exception as e:
        logger.error(f"❌ Error updating profile: {str(e)}", exc_info=True)
        return False

if __name__ == "__main__":
    success = update_user_profile()
    if success:
        print("\n✅ Successfully updated Monica Deng's profile with South Sudan as the country")
    else:
        print("\n❌ Failed to update profile")
        exit(1)