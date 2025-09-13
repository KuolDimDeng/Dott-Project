#!/usr/bin/env python3
"""
Check marketplace listing images for a user
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
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def check_marketplace_images(email='support@dottapps.com'):
    """Check marketplace listing images for a user"""

    print(f"\n🔍 Checking marketplace images for: {email}")
    print("=" * 60)

    try:
        # Get user
        user = User.objects.get(email=email)
        print(f"✅ Found user: {user.email}")
        print(f"   User ID: {user.id}")
        print(f"   User name: {getattr(user, 'name', 'N/A')}")

        # Get business listing
        try:
            listing = BusinessListing.objects.get(business=user)
            print(f"\n✅ Found BusinessListing:")
            print(f"   ID: {listing.id}")
            print(f"   Business Type: {listing.business_type}")
            print(f"   Is Visible: {listing.is_visible_in_marketplace}")
            print(f"   Is Featured: {listing.is_featured}")

            print(f"\n📸 Image Fields:")
            print(f"   Logo URL: {listing.logo_url if listing.logo_url else '❌ None'}")
            if listing.logo_url:
                print(f"      - Length: {len(listing.logo_url)} characters")
                if listing.logo_url.startswith('data:'):
                    print(f"      - Type: Base64 Data URL")
                elif listing.logo_url.startswith('http'):
                    print(f"      - Type: HTTP URL")
                else:
                    print(f"      - Type: Local path")

            print(f"   Cover Image URL: {listing.cover_image_url if listing.cover_image_url else '❌ None'}")
            if listing.cover_image_url:
                print(f"      - Length: {len(listing.cover_image_url)} characters")
                if listing.cover_image_url.startswith('data:'):
                    print(f"      - Type: Base64 Data URL")
                elif listing.cover_image_url.startswith('http'):
                    print(f"      - Type: HTTP URL")
                else:
                    print(f"      - Type: Local path")

            print(f"   Gallery Images: {len(listing.gallery_images) if listing.gallery_images else 0} images")
            if listing.gallery_images:
                for i, img in enumerate(listing.gallery_images[:3]):  # Show first 3
                    if isinstance(img, str):
                        print(f"      - Image {i+1}: {img[:100]}...")
                    else:
                        print(f"      - Image {i+1}: {str(img)[:100]}...")

            # Check profile for logo_data as fallback
            if hasattr(user, 'profile'):
                profile = user.profile
                if hasattr(profile, 'logo_data') and profile.logo_data:
                    print(f"\n📌 Profile has logo_data (base64): {len(profile.logo_data)} characters")
                    print(f"   Preview: {profile.logo_data[:100]}...")

            # Show when it was last updated
            print(f"\n⏰ Last Updated: {listing.updated_at}")

        except BusinessListing.DoesNotExist:
            print(f"\n❌ No BusinessListing found for user")

    except User.DoesNotExist:
        print(f"\n❌ User not found: {email}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    check_marketplace_images(email)