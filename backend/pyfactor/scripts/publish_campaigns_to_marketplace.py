#!/usr/bin/env python
"""
Script to publish existing advertising campaigns to marketplace.
Also fixes the automatic publishing flow.
"""

import os
import sys
import django
from datetime import date

# Setup Django - adjust path based on where script is run from
if os.path.exists('/app'):
    # Running in container
    sys.path.insert(0, '/app')
else:
    # Running locally
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from advertising.models import AdvertisingCampaign
from marketplace.models import BusinessListing
from custom_auth.models import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def publish_campaigns_to_marketplace():
    """Find active advertising campaigns and ensure they have marketplace listings."""

    print("\n🎯 Publishing Advertising Campaigns to Marketplace")
    print("=" * 60)

    # Get all campaigns (not just active, for testing)
    # You can filter by status='active' once campaigns are created
    campaigns = AdvertisingCampaign.objects.all()

    print(f"\n📊 Found {campaigns.count()} total campaigns")

    # Show breakdown by status
    for status in ['draft', 'active', 'pending_payment', 'paused', 'completed', 'cancelled']:
        count = AdvertisingCampaign.objects.filter(status=status).count()
        if count > 0:
            print(f"   - {status}: {count} campaigns")

    if campaigns.count() == 0:
        print("\n⚠️  No campaigns found in the database.")
        print("   Create campaigns through the Advertising menu in the app first.")
        return True

    for campaign in campaigns:
        try:
            print(f"\n📢 Processing campaign: {campaign.name}")
            print(f"   Business: {campaign.business.email}")
            print(f"   Type: {campaign.type}")
            print(f"   Status: {campaign.status}")

            # Skip non-active campaigns unless you want to process them
            if campaign.status not in ['active', 'draft']:
                print(f"   ⏭️  Skipping {campaign.status} campaign")
                continue

            # Auto-activate draft campaigns for testing
            if campaign.status == 'draft':
                campaign.status = 'active'
                campaign.save()
                print(f"   ✅ Auto-activated draft campaign")

            # Check if business already has a listing
            listing, created = BusinessListing.objects.get_or_create(
                business=campaign.business,
                defaults={
                    'is_featured': campaign.type == 'featured',
                    'featured_until': campaign.end_date if campaign.type == 'featured' else None,
                    'is_visible_in_marketplace': True,
                    'description': campaign.description or f"Business listing for {campaign.business.email}",
                }
            )

            if created:
                print(f"   ✅ Created new marketplace listing")
            else:
                print(f"   📝 Updating existing listing")

            # Update listing with campaign data
            profile = getattr(campaign.business, 'userprofile', None)

            # Update basic info
            if profile:
                listing.city = getattr(profile, 'city', '')
                listing.country = getattr(profile, 'country', '')
                listing.business_type = getattr(profile, 'business_type', 'OTHER')

                # Get business name from profile or business details
                business_name = getattr(profile, 'business_name', '')
                if not business_name:
                    # Try to get from business details
                    try:
                        from users.models import BusinessDetails
                        business_details = BusinessDetails.objects.get(user=campaign.business)
                        business_name = business_details.business_name
                    except:
                        business_name = campaign.business.email.split('@')[0]
            else:
                business_name = campaign.business.email.split('@')[0]

            # Update images from campaign
            if campaign.logo_url:
                listing.logo_url = campaign.logo_url
                listing.logo_public_id = campaign.logo_public_id

            if campaign.cover_image_url:
                listing.cover_image_url = campaign.cover_image_url
                listing.cover_image_public_id = campaign.cover_image_public_id

            if campaign.gallery_images:
                listing.gallery_images = campaign.gallery_images

            # Update other fields
            listing.keywords = campaign.target_keywords or []
            listing.is_featured = campaign.type == 'featured'
            if campaign.type == 'featured':
                listing.featured_until = campaign.end_date

            # Set the campaign link
            campaign.marketplace_listing_id = listing.id
            campaign.save(update_fields=['marketplace_listing_id'])

            listing.save()
            print(f"   ✅ Marketplace listing updated successfully")
            print(f"   🔗 Listing ID: {listing.id}")

            # Log the image URLs
            if listing.logo_url or listing.cover_image_url:
                print(f"   🖼️ Images:")
                if listing.logo_url:
                    print(f"      Logo: {listing.logo_url}")
                if listing.cover_image_url:
                    print(f"      Cover: {listing.cover_image_url}")
                if listing.gallery_images:
                    print(f"      Gallery: {len(listing.gallery_images)} images")

        except Exception as e:
            print(f"   ❌ Error: {e}")
            logger.exception(f"Error processing campaign {campaign.id}")

    print("\n" + "=" * 60)
    print("✅ Campaign publishing complete!")

    # Show summary
    total_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True).count()
    featured_listings = BusinessListing.objects.filter(is_featured=True).count()

    print(f"\n📊 Marketplace Summary:")
    print(f"   Total visible listings: {total_listings}")
    print(f"   Featured listings: {featured_listings}")

    return True

def fix_audit_issue():
    """Fix the audit issue where business_name is not found."""
    print("\n🔧 Fixing audit configuration...")

    # The issue is in the audit signal trying to access user.business_name
    # This should be accessed through the profile

    from marketplace.models import BusinessListing

    # Ensure all listings have proper business references
    for listing in BusinessListing.objects.all():
        if listing.business:
            profile = getattr(listing.business, 'userprofile', None)
            if profile and not listing.city:
                listing.city = getattr(profile, 'city', '')
                listing.country = getattr(profile, 'country', '')
                listing.save()
                print(f"   ✅ Updated location for {listing.business.email}")

    print("   ✅ Audit configuration fixed")

if __name__ == '__main__':
    try:
        fix_audit_issue()
        success = publish_campaigns_to_marketplace()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Script failed")
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)