#!/usr/bin/env python
"""
Script to check what logo data exists for support@dottapps.com
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

def check_user_logo_data():
    """Check what logo data exists for the user."""

    print("\n🔍 Checking User Logo Data")
    print("=" * 60)

    try:
        # Get the user
        user = User.objects.get(email="support@dottapps.com")
        print(f"\n✅ Found User: {user.email}")
        print(f"   Name: {user.name}")

        # Check profile
        profile = getattr(user, 'profile', None)
        if profile:
            print(f"\n✅ Found UserProfile:")
            print(f"   Business Name: {getattr(profile, 'business_name', 'N/A')}")
            print(f"   Has logo_cloudinary_url: {bool(getattr(profile, 'logo_cloudinary_url', None))}")
            print(f"   Has logo_cloudinary_public_id: {bool(getattr(profile, 'logo_cloudinary_public_id', None))}")
            print(f"   Has logo_data: {bool(getattr(profile, 'logo_data', None))}")

            if hasattr(profile, 'logo_cloudinary_url') and profile.logo_cloudinary_url:
                print(f"   logo_cloudinary_url: {profile.logo_cloudinary_url[:100]}...")
            if hasattr(profile, 'logo_data') and profile.logo_data:
                print(f"   logo_data: {profile.logo_data[:100]}...")
        else:
            print(f"\n❌ No UserProfile found")

        # Check business listing
        try:
            listing = BusinessListing.objects.get(business=user)
            print(f"\n✅ Found BusinessListing:")
            print(f"   ID: {listing.id}")
            print(f"   Business Name: {listing.business_name}")
            print(f"   logo_url: {listing.logo_url}")
            print(f"   logo_public_id: {listing.logo_public_id}")
            print(f"   cover_image_url: {listing.cover_image_url}")
            print(f"   gallery_images: {len(listing.gallery_images) if listing.gallery_images else 0} images")
        except BusinessListing.DoesNotExist:
            print(f"\n❌ No BusinessListing found")

    except User.DoesNotExist:
        print(f"\n❌ User not found: support@dottapps.com")
        return False

    return True

if __name__ == '__main__':
    try:
        success = check_user_logo_data()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Script failed")
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)