#!/usr/bin/env python3
"""
Check User Menu Features
========================
Debug script to check why menu is not showing for a user
"""

import os
import sys
import django
from datetime import datetime

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserProfile
from users.business_categories import get_features_for_business_type, should_show_menu
from users.api.business_features_views import get_menu_items_for_business_type
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()
SIMPLIFIED_TYPES_LAUNCH_DATE = datetime(2025, 7, 26)

def check_user_menu(email='support@dottapps.com'):
    """Check why menu is not showing for a user"""
    
    logger.info(f"🔍 Checking menu features for user: {email}")
    
    try:
        user = User.objects.get(email=email)
        logger.info(f"✅ Found user: {user.email} (ID: {user.id})")
        logger.info(f"   Created: {user.date_joined}")
        
        # Check if user is legacy (before simplified types)
        is_legacy = user.date_joined.replace(tzinfo=None) < SIMPLIFIED_TYPES_LAUNCH_DATE
        logger.info(f"   Legacy user: {is_legacy}")
        
        # Get user profile
        try:
            profile = UserProfile.objects.get(user=user)
            logger.info(f"\n📋 User Profile:")
            
            # Get business name if business exists
            business_name = profile.business.name if profile.business else "No business"
            logger.info(f"   Business name: {business_name}")
            
            # Get business type - this might be in BusinessDetails
            simplified_type = None
            if profile.business and hasattr(profile.business, 'details') and profile.business.details:
                simplified_type = profile.business.details.simplified_business_type
            
            logger.info(f"   Simplified business type: {simplified_type}")
            
            # Get features
            business_type = simplified_type  # Use the simplified_type we just found
            features = get_features_for_business_type(business_type)
            logger.info(f"\n🎯 Features for business type '{business_type}':")
            logger.info(f"   Features: {features}")
            
            # Check if menu should show
            should_show = should_show_menu(business_type)
            logger.info(f"\n📱 Menu Management:")
            logger.info(f"   Should show menu: {should_show}")
            logger.info(f"   Business type in menu list: {business_type in ['RESTAURANT_CAFE', 'HOTEL_HOSPITALITY', 'GROCERY_MARKET', 'EVENT_PLANNING']}")
            
            # Get all menu items
            menu_items = get_menu_items_for_business_type(business_type, features)
            logger.info(f"\n📱 All Menu Items ({len(menu_items)} items):")
            for item in menu_items:
                if item.get('requiresFeature'):
                    logger.info(f"   - {item['label']} (requires: {item['requiresFeature']})")
                else:
                    logger.info(f"   - {item['label']}")
            
            # Check specifically for menu item
            menu_item = next((item for item in menu_items if item['id'] == 'menu'), None)
            if menu_item:
                logger.info(f"\n✅ Menu Management IS in the menu items!")
                logger.info(f"   Details: {menu_item}")
            else:
                logger.info(f"\n❌ Menu Management NOT FOUND in menu items!")
                
            # Debug: Check exact conditions
            logger.info(f"\n🔍 Debug conditions:")
            logger.info(f"   1. Business type: {business_type}")
            logger.info(f"   2. Is in restaurant types: {business_type in ['RESTAURANT_CAFE', 'GROCERY_MARKET', 'HOTEL_HOSPITALITY']}")
            logger.info(f"   3. should_show_menu returns: {should_show_menu(business_type)}")
            logger.info(f"   4. 'menu' in features: {'menu' in features}")
            
            # Add menu to features if it should be there
            if business_type == 'RESTAURANT_CAFE' and 'menu' not in features:
                logger.info(f"\n⚠️ WARNING: 'menu' feature missing for RESTAURANT_CAFE!")
                logger.info(f"   This needs to be added to the features list")
                
        except UserProfile.DoesNotExist:
            logger.error(f"❌ No UserProfile found for user {email}")
            
    except User.DoesNotExist:
        logger.error(f"❌ User not found: {email}")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    check_user_menu(email)