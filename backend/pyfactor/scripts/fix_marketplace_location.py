#!/usr/bin/env python
"""
Fix marketplace business listings that have no city/country set.
This prevents them from appearing in location-based searches.
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from marketplace.models import BusinessListing
from django.contrib.auth import get_user_model

User = get_user_model()

def fix_marketplace_locations():
    """
    Update BusinessListing records that have missing city/country data
    """
    print("\n🔍 Checking marketplace listings for missing location data...")

    # Get all business listings
    listings = BusinessListing.objects.all()
    print(f"Found {listings.count()} total business listings")

    fixed_count = 0

    for listing in listings:
        needs_update = False

        # Check if city or country is missing
        if not listing.city or not listing.country:
            print(f"\n📍 Listing {listing.id} missing location data:")
            print(f"   Business: {listing.business.email}")
            print(f"   Current city: '{listing.city}'")
            print(f"   Current country: '{listing.country}'")

            # Try to get location from user profile
            if hasattr(listing.business, 'profile'):
                profile = listing.business.profile

                # Update city if missing
                if not listing.city and profile.city:
                    listing.city = profile.city
                    print(f"   ✅ Updated city to: {listing.city}")
                    needs_update = True
                elif not listing.city:
                    # Default to Juba for South Sudan businesses
                    if profile.country == 'SS' or listing.country == 'SS':
                        listing.city = 'Juba'
                        print(f"   ✅ Set default city: Juba")
                        needs_update = True

                # Update country if missing
                if not listing.country and profile.country:
                    listing.country = profile.country
                    print(f"   ✅ Updated country to: {listing.country}")
                    needs_update = True
                elif not listing.country:
                    # Default to South Sudan
                    listing.country = 'SS'
                    print(f"   ✅ Set default country: SS")
                    needs_update = True
            else:
                # No profile, set defaults
                if not listing.city:
                    listing.city = 'Juba'
                    needs_update = True
                    print(f"   ✅ Set default city: Juba (no profile)")

                if not listing.country:
                    listing.country = 'SS'
                    needs_update = True
                    print(f"   ✅ Set default country: SS (no profile)")

            if needs_update:
                listing.save()
                fixed_count += 1
                print(f"   💾 Saved listing updates")
        else:
            print(f"✓ Listing {listing.id} has location: {listing.city}, {listing.country}")

    print(f"\n✅ Fixed {fixed_count} listings with missing location data")

    # Show current state of all visible listings
    print("\n📊 Current visible marketplace listings:")
    visible_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True)

    for listing in visible_listings:
        print(f"\n   ID: {listing.id}")
        print(f"   Business: {listing.business.email}")
        print(f"   City: {listing.city}")
        print(f"   Country: {listing.country}")
        print(f"   Type: {listing.business_type}")
        print(f"   Visible: {listing.is_visible_in_marketplace}")

        # Show if it would match Juba search
        if listing.city and 'juba' in listing.city.lower():
            print(f"   ✅ Would match Juba search")
        else:
            print(f"   ❌ Would NOT match Juba search")

if __name__ == "__main__":
    fix_marketplace_locations()