#!/usr/bin/env python
"""
Test Script: Advertising to Marketplace Flow
Tests the complete flow of creating an advertising campaign and publishing to marketplace
"""

import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from custom_auth.models import User
from users.models import UserProfile, Business
from advertising.models import AdvertisingCampaign
from marketplace.models import BusinessListing
from marketplace.services import BusinessListingService
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class AdvertisingMarketplaceTest:
    """Test the advertising to marketplace flow"""

    def __init__(self, user_email='test@example.com'):
        self.user_email = user_email
        self.user = None
        self.campaign = None
        self.listing = None

    def setup_test_user(self):
        """Setup or get test user with complete profile"""
        logger.info(f"Setting up test user: {self.user_email}")

        # Get or create user
        self.user, created = User.objects.get_or_create(
            email=self.user_email,
            defaults={'username': self.user_email.split('@')[0]}
        )

        if created:
            logger.info("Created new test user")
        else:
            logger.info("Using existing test user")

        # Setup UserProfile with currency fields
        profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'city': 'Juba',
                'country': 'SS',
                'phone_number': '+211912345678',
                'preferred_currency_code': 'USD',
                'preferred_currency_name': 'US Dollar',
                'preferred_currency_symbol': '$',
            }
        )

        # Create or get business
        if not profile.business:
            business = Business.objects.create(
                name='Test Business for Advertising',
                owner_id=self.user.id,
                business_type='RESTAURANT_CAFE',
                country='SS',
                preferred_currency_code='USD',
                preferred_currency_name='US Dollar',
                preferred_currency_symbol='$',
            )
            profile.business = business
            profile.save()
            logger.info(f"Created business: {business.name}")
        else:
            logger.info(f"Using existing business: {profile.business.name}")

        return self.user

    def create_campaign(self):
        """Create a test advertising campaign"""
        logger.info("Creating advertising campaign...")

        self.campaign = AdvertisingCampaign.objects.create(
            business=self.user,
            name='Featured Restaurant Campaign',
            description='Premium placement for our restaurant in the marketplace',
            type='featured',
            status='draft',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            total_budget=Decimal('500.00'),
            daily_budget=Decimal('20.00'),
            target_location='local',
            target_keywords=['restaurant', 'food', 'dining', 'cafe'],
            platforms=['marketplace', 'discovery'],
            banner_text='Best Restaurant in Juba - Order Now!',
            call_to_action='Order Now',
            auto_publish_to_marketplace=True,
            marketplace_visibility_boost=50,
            created_by=self.user,
        )

        logger.info(f"✅ Created campaign: {self.campaign.name} (ID: {self.campaign.id})")
        return self.campaign

    def add_campaign_images(self):
        """Simulate adding images to campaign"""
        logger.info("Adding images to campaign...")

        # Simulate Cloudinary upload results
        self.campaign.logo_url = 'https://res.cloudinary.com/dott/image/upload/campaigns/logo/test_logo.jpg'
        self.campaign.logo_public_id = 'campaigns/logo/test_logo'

        self.campaign.cover_image_url = 'https://res.cloudinary.com/dott/image/upload/campaigns/cover/test_cover.jpg'
        self.campaign.cover_image_public_id = 'campaigns/cover/test_cover'

        self.campaign.gallery_images = [
            {
                'url': 'https://res.cloudinary.com/dott/image/upload/campaigns/gallery/food1.jpg',
                'public_id': 'campaigns/gallery/food1',
                'uploaded_at': timezone.now().isoformat()
            },
            {
                'url': 'https://res.cloudinary.com/dott/image/upload/campaigns/gallery/food2.jpg',
                'public_id': 'campaigns/gallery/food2',
                'uploaded_at': timezone.now().isoformat()
            },
            {
                'url': 'https://res.cloudinary.com/dott/image/upload/campaigns/gallery/restaurant.jpg',
                'public_id': 'campaigns/gallery/restaurant',
                'uploaded_at': timezone.now().isoformat()
            }
        ]

        self.campaign.save()
        logger.info(f"✅ Added logo, cover image, and {len(self.campaign.gallery_images)} gallery images")

    def activate_campaign(self):
        """Activate the campaign (simulating payment completion)"""
        logger.info("Activating campaign...")

        # Simulate payment
        self.campaign.payment_status = 'paid'
        self.campaign.paid_amount = self.campaign.total_budget
        self.campaign.paid_at = timezone.now()

        # Activate campaign
        self.campaign.activate()

        logger.info(f"✅ Campaign activated with status: {self.campaign.status}")

    def publish_to_marketplace(self):
        """Publish campaign to marketplace"""
        logger.info("Publishing to marketplace...")

        self.listing = self.campaign.publish_to_marketplace()

        if self.listing:
            logger.info(f"✅ Successfully published to marketplace!")
            logger.info(f"   Listing ID: {self.listing.id}")
            logger.info(f"   Featured: {self.listing.is_featured}")
            logger.info(f"   Visible: {self.listing.is_visible_in_marketplace}")
        else:
            logger.error("❌ Failed to publish to marketplace")

        return self.listing

    def verify_marketplace_listing(self):
        """Verify the marketplace listing has correct data"""
        logger.info("Verifying marketplace listing...")

        if not self.listing:
            logger.error("No listing to verify")
            return False

        # Refresh from database
        self.listing.refresh_from_db()

        checks = {
            'Business Match': self.listing.business == self.user,
            'Is Featured': self.listing.is_featured == (self.campaign.type == 'featured'),
            'Is Visible': self.listing.is_visible_in_marketplace == True,
            'Has Logo': bool(self.listing.logo_url),
            'Has Cover': bool(self.listing.cover_image_url),
            'Has Gallery': len(self.listing.gallery_images) > 0,
            'Has Description': bool(self.listing.description),
            'City Match': self.listing.city == 'Juba',
            'Country Match': self.listing.country == 'SS',
        }

        all_passed = True
        for check, result in checks.items():
            status = "✅" if result else "❌"
            logger.info(f"   {status} {check}: {result}")
            if not result:
                all_passed = False

        # Display listing details
        logger.info("\n📋 Listing Details:")
        logger.info(f"   Business: {self.listing.business.email}")
        logger.info(f"   Type: {self.listing.business_type}")
        logger.info(f"   Location: {self.listing.city}, {self.listing.country}")
        logger.info(f"   Description: {self.listing.description[:100]}...")
        logger.info(f"   Logo URL: {self.listing.logo_url}")
        logger.info(f"   Cover URL: {self.listing.cover_image_url}")
        logger.info(f"   Gallery Images: {len(self.listing.gallery_images)}")
        logger.info(f"   Featured Until: {self.listing.featured_until}")
        logger.info(f"   Search Tags: {self.listing.search_tags}")

        return all_passed

    def test_marketplace_search(self):
        """Test if the listing appears in marketplace search"""
        logger.info("\nTesting marketplace search...")

        # Import the view to test search
        from marketplace.views import ConsumerSearchViewSet
        from rest_framework.test import APIRequestFactory
        from django.contrib.auth.models import AnonymousUser

        factory = APIRequestFactory()
        view = ConsumerSearchViewSet()

        # Create a mock request
        request = factory.get('/api/marketplace/consumer/businesses/', {
            'city': 'Juba',
            'country': 'South Sudan',
            'search': 'restaurant'
        })
        request.user = self.user

        # Manually call the marketplace_businesses method
        try:
            view.request = request
            response = view.marketplace_businesses(request)

            if response.status_code == 200:
                data = response.data
                logger.info(f"✅ Search returned {data.get('count', 0)} results")

                # Check if our listing is in results
                results = data.get('results', [])
                our_listing = None
                for result in results:
                    if str(result.get('id')) == str(self.listing.id):
                        our_listing = result
                        break

                if our_listing:
                    logger.info(f"✅ Our listing found in search results!")
                    logger.info(f"   Name: {our_listing.get('business_name')}")
                    logger.info(f"   Featured: {our_listing.get('is_featured')}")
                    logger.info(f"   Has Logo: {bool(our_listing.get('logo'))}")
                    logger.info(f"   Has Cover: {bool(our_listing.get('cover_image_url'))}")
                else:
                    logger.warning("⚠️ Our listing not found in search results")
            else:
                logger.error(f"❌ Search failed with status: {response.status_code}")

        except Exception as e:
            logger.error(f"❌ Error testing search: {e}")

    def cleanup(self):
        """Cleanup test data"""
        logger.info("\nCleaning up test data...")

        if self.campaign:
            self.campaign.delete()
            logger.info("✅ Deleted test campaign")

        if self.listing:
            self.listing.delete()
            logger.info("✅ Deleted test listing")

    def run_full_test(self):
        """Run the complete test flow"""
        logger.info("=" * 60)
        logger.info("ADVERTISING TO MARKETPLACE FLOW TEST")
        logger.info("=" * 60)

        try:
            # Step 1: Setup
            self.setup_test_user()

            # Step 2: Create Campaign
            self.create_campaign()

            # Step 3: Add Images
            self.add_campaign_images()

            # Step 4: Activate Campaign
            self.activate_campaign()

            # Step 5: Publish to Marketplace
            self.publish_to_marketplace()

            # Step 6: Verify Listing
            success = self.verify_marketplace_listing()

            # Step 7: Test Search
            self.test_marketplace_search()

            logger.info("\n" + "=" * 60)
            if success:
                logger.info("✅ ALL TESTS PASSED!")
            else:
                logger.info("⚠️ SOME TESTS FAILED - Review the output above")
            logger.info("=" * 60)

            return success

        except Exception as e:
            logger.error(f"❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            return False

        finally:
            # Optional: cleanup
            # self.cleanup()
            pass


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Test Advertising to Marketplace Flow')
    parser.add_argument('--email', default='test@example.com', help='Test user email')
    parser.add_argument('--cleanup', action='store_true', help='Cleanup test data after running')

    args = parser.parse_args()

    # Run test
    test = AdvertisingMarketplaceTest(user_email=args.email)
    success = test.run_full_test()

    if args.cleanup:
        test.cleanup()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()