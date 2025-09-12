#!/usr/bin/env python3
"""
Enable Marketplace Visibility
==============================
Makes a business visible in the marketplace
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from marketplace.models import BusinessListing
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()

def enable_visibility(email='support@dottapps.com'):
    """Enable marketplace visibility for a business"""
    
    logger.info(f"🔍 Looking for user: {email}")
    
    try:
        user = User.objects.get(email=email)
        logger.info(f"✅ Found user: {user.email} (ID: {user.id})")
        
        # Get or create business listing
        listing, created = BusinessListing.objects.get_or_create(
            business=user,
            defaults={
                'business_type': 'RESTAURANT_CAFE',
                'city': 'Juba',
                'country': 'SS',
                'description': 'Dott Restaurant & Cafe - Great food and service!',
                'is_visible_in_marketplace': True,
                'is_verified': True,
                'delivery_scope': 'local',
            }
        )
        
        if not created:
            # Update existing listing
            listing.is_visible_in_marketplace = True
            listing.is_verified = True
            if not listing.description:
                listing.description = 'Dott Restaurant & Cafe - Great food and service!'
            if not listing.city:
                listing.city = 'Juba'
            if not listing.country:
                listing.country = 'SS'
            listing.save()
            logger.info("✅ Updated existing listing")
        else:
            logger.info("✅ Created new listing")
        
        logger.info(f"""
📋 Business Listing Status:
   - ID: {listing.id}
   - Business: {user.email}
   - Type: {listing.business_type}
   - City: {listing.city}
   - Country: {listing.country}
   - Visible: {listing.is_visible_in_marketplace}
   - Verified: {listing.is_verified}
   - Featured: {listing.is_featured}
   - Description: {listing.description[:50]}...
        """)
        
        logger.info("\n✅ Business is now visible in the marketplace!")
        logger.info("🎯 Check Discovery/Marketplace in your app to see it")
        
    except User.DoesNotExist:
        logger.error(f"❌ User not found: {email}")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    enable_visibility(email)