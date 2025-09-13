#!/usr/bin/env python
"""
Script to debug marketplace image issues.
"""

import os
import sys
import django
from datetime import date

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

def debug_marketplace_images():
    """Debug marketplace image issues."""

    print("\n🖼️ Debugging Marketplace Images")
    print("=" * 60)

    # Get all visible business listings
    listings = BusinessListing.objects.filter(is_visible_in_marketplace=True).select_related('business')

    print(f"\n📊 Found {listings.count()} visible businesses")

    for listing in listings:
        user = listing.business
        profile = getattr(user, 'userprofile', None)

        print(f"\n🏢 Business: {user.email}")
        print(f"   Listing ID: {listing.id}")
        print(f"   Business Name: {user.name}")

        # Check BusinessListing image fields
        print(f"   BusinessListing Images:")
        print(f"     - logo_url: {bool(listing.logo_url)} ({listing.logo_url[:50] + '...' if listing.logo_url else 'None'})")
        print(f"     - cover_image_url: {bool(listing.cover_image_url)} ({listing.cover_image_url[:50] + '...' if listing.cover_image_url else 'None'})")
        print(f"     - gallery_images: {len(listing.gallery_images) if listing.gallery_images else 0} images")

        # Check UserProfile image fields
        if profile:
            print(f"   UserProfile Images:")
            print(f"     - logo_cloudinary_url: {bool(profile.logo_cloudinary_url if hasattr(profile, 'logo_cloudinary_url') else False)}")
            print(f"     - logo_data (base64): {bool(profile.logo_data if hasattr(profile, 'logo_data') else False)}")

            # Show first 100 chars of base64 data if available
            if hasattr(profile, 'logo_data') and profile.logo_data:
                print(f"     - logo_data preview: {profile.logo_data[:100]}...")
        else:
            print(f"   ❌ No UserProfile found")

        # What would our logic return?
        logo_url = getattr(listing, 'logo_url', '') or ''
        if not logo_url and profile and hasattr(profile, 'logo_data') and profile.logo_data:
            logo_url = profile.logo_data

        print(f"   🎯 Final logo_url would be: {bool(logo_url)} ({'base64' if logo_url.startswith('data:') else 'url' if logo_url else 'none'})")

    return True

if __name__ == '__main__':
    try:
        success = debug_marketplace_images()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Script failed")
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)