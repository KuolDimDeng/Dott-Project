#!/usr/bin/env python
"""
Script to fix marketplace images by copying from UserProfile to BusinessListing.
"""

import os
import sys
import django

# Setup Django
if os.path.exists('/app'):
    sys.path.insert(0, '/app')
else:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing
from custom_auth.models import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_marketplace_images():
    """Fix marketplace images by copying from UserProfile."""

    print("\n🔧 Fixing Marketplace Images")
    print("=" * 60)

    # Get all visible business listings that don't have logo_url
    listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        logo_url__isnull=True
    ).select_related('business')

    print(f"\n📊 Found {listings.count()} businesses without logo_url")

    updated_count = 0

    for listing in listings:
        user = listing.business
        profile = getattr(user, 'profile', None)

        if not profile:
            print(f"❌ No profile for {user.email}")
            continue

        updated = False

        # Copy Cloudinary logo if available
        if hasattr(profile, 'logo_cloudinary_url') and profile.logo_cloudinary_url:
            listing.logo_url = profile.logo_cloudinary_url
            updated = True
            print(f"✅ Copied Cloudinary logo for {user.email}")

        # Copy Cloudinary public ID if available
        if hasattr(profile, 'logo_cloudinary_public_id') and profile.logo_cloudinary_public_id:
            listing.logo_public_id = profile.logo_cloudinary_public_id
            updated = True

        # If no Cloudinary, but has base64 logo_data, that will be handled by the API fallback
        if not updated and hasattr(profile, 'logo_data') and profile.logo_data:
            print(f"📝 {user.email} has base64 logo_data (will use as fallback in API)")

        if updated:
            listing.save(update_fields=['logo_url', 'logo_public_id'])
            updated_count += 1

    print(f"\n✅ Updated {updated_count} businesses with Cloudinary images")
    print(f"📝 Other businesses with base64 logo_data will use API fallback")

    return True

if __name__ == '__main__':
    try:
        success = fix_marketplace_images()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Script failed")
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)