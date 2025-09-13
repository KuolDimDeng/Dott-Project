#!/usr/bin/env python3
"""
Test script to verify marketplace API fixes
This script tests the three endpoints that were causing issues
"""

import os
import sys
import django
import logging

# Add the project directory to Python path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from marketplace.views import ConsumerSearchViewSet
from marketplace.models import BusinessListing

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

def test_marketplace_api_endpoints():
    """Test the three problematic endpoints"""

    logger.info("=== MARKETPLACE API TEST ===")

    # Create a test user
    factory = RequestFactory()

    try:
        # Get or create a test user
        test_user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={'name': 'Test User'}
        )
        logger.info(f"Using test user: {test_user.email} (created: {created})")

        # Check what business listings exist in the database
        logger.info("\n=== DATABASE STATE ===")
        all_listings = BusinessListing.objects.all()
        logger.info(f"Total BusinessListings: {all_listings.count()}")

        visible_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True)
        logger.info(f"Visible BusinessListings: {visible_listings.count()}")

        for listing in visible_listings:
            logger.info(f"  - ID: {listing.id}")
            logger.info(f"    Business: {listing.business.email}")
            logger.info(f"    City: '{listing.city}' | Country: '{listing.country}'")
            logger.info(f"    Type: {listing.business_type}")
            logger.info(f"    Visible: {listing.is_visible_in_marketplace}")
            logger.info("    ---")

        # Create view instance
        view = ConsumerSearchViewSet()

        # Test 1: marketplace_businesses endpoint
        logger.info("\n=== TEST 1: marketplace_businesses endpoint ===")

        request = factory.get('/marketplace/consumer/businesses/', {
            'city': 'Juba',
            'country': 'South Sudan'
        })
        request.user = test_user

        try:
            response = view.marketplace_businesses(request)
            logger.info(f"marketplace_businesses response status: {response.status_code}")
            if hasattr(response, 'data'):
                data = response.data
                logger.info(f"Success: {data.get('success', 'N/A')}")
                logger.info(f"Count: {data.get('count', 'N/A')}")
                logger.info(f"Results length: {len(data.get('results', []))}")
                if data.get('debug_info'):
                    logger.info(f"Debug info: {data['debug_info']}")
        except Exception as e:
            logger.error(f"marketplace_businesses failed: {e}")

        # Test 2: categories endpoint
        logger.info("\n=== TEST 2: categories endpoint ===")

        request = factory.get('/marketplace/consumer/categories/', {
            'city': 'Juba'
        })
        request.user = test_user

        try:
            response = view.categories(request)
            logger.info(f"categories response status: {response.status_code}")
            if hasattr(response, 'data'):
                data = response.data
                logger.info(f"Success: {data.get('success', 'N/A')}")
                logger.info(f"Categories count: {len(data.get('categories', []))}")
        except Exception as e:
            logger.error(f"categories failed: {e}")

        # Test 3: featured endpoint
        logger.info("\n=== TEST 3: featured endpoint ===")

        request = factory.get('/marketplace/consumer/businesses/featured/', {
            'city': 'Juba',
            'country': 'South Sudan'
        })
        request.user = test_user

        try:
            response = view.featured(request)
            logger.info(f"featured response status: {response.status_code}")
            if hasattr(response, 'data'):
                data = response.data
                logger.info(f"Success: {data.get('success', 'N/A')}")
                logger.info(f"Results count: {len(data.get('results', []))}")
        except Exception as e:
            logger.error(f"featured failed: {e}")

        logger.info("\n=== TEST COMPLETE ===")

    except Exception as e:
        logger.error(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_marketplace_api_endpoints()