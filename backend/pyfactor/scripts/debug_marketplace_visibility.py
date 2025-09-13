#!/usr/bin/env python
"""
Script to debug why a business listing is not appearing in the Discovery/marketplace.
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

def debug_marketplace_visibility():
    """Debug marketplace visibility issues."""

    print("\n🔍 Debugging Marketplace Visibility")
    print("=" * 60)

    # Find the business listing we're working with
    listing_id = "ba8d366c-9b29-41bc-a770-031d975aab77"

    try:
        listing = BusinessListing.objects.get(id=listing_id)
        print(f"\n✅ Found Business Listing: {listing.id}")
        print(f"   Business: {listing.business.email}")
        print(f"   Business Name: {getattr(listing.business, 'business_name', 'N/A')}")
        print(f"   Business Type: {listing.business_type}")
        print(f"   City: {listing.city}")
        print(f"   Country: {listing.country}")
        print(f"   Is Visible: {listing.is_visible_in_marketplace}")
        print(f"   Is Featured: {listing.is_featured}")
        print(f"   Description: {listing.description}")
        print(f"   Total Products: {listing.total_products}")

    except BusinessListing.DoesNotExist:
        print(f"\n❌ Business Listing not found: {listing_id}")
        return

    # Check all marketplace listings
    print(f"\n📊 All Marketplace Listings:")
    all_listings = BusinessListing.objects.all().order_by('-updated_at')

    for i, listing in enumerate(all_listings[:10]):  # Show first 10
        status = "✅ VISIBLE" if listing.is_visible_in_marketplace else "❌ HIDDEN"
        print(f"   {i+1}. {listing.business.email} - {status}")
        print(f"      ID: {listing.id}")
        print(f"      City: {listing.city}, Country: {listing.country}")
        print(f"      Type: {listing.business_type}")
        print(f"      Products: {listing.total_products}")

    # Check visible listings specifically
    visible_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True)
    print(f"\n🌟 Visible Listings Count: {visible_listings.count()}")

    # Check Juba listings specifically
    juba_listings = BusinessListing.objects.filter(
        city__iexact='juba',
        is_visible_in_marketplace=True
    )
    print(f"📍 Visible Juba Listings: {juba_listings.count()}")

    for listing in juba_listings:
        print(f"   - {listing.business.email}: {listing.business_type}")

    # Check South Sudan listings
    ss_listings = BusinessListing.objects.filter(
        country__iexact='ss',
        is_visible_in_marketplace=True
    )
    print(f"🇸🇸 Visible South Sudan Listings: {ss_listings.count()}")

    # Test the actual query used by the mobile app
    print(f"\n🔍 Testing Mobile App Query:")
    print(f"   Query: city='Juba', country='South Sudan'")

    # This is what the mobile app sends
    mobile_query_listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=True
    )

    # Filter by city (case insensitive)
    mobile_query_listings = mobile_query_listings.filter(city__iexact='juba')

    print(f"   Results: {mobile_query_listings.count()}")

    for listing in mobile_query_listings:
        print(f"   - {listing.business.email}")
        print(f"     Business Type: {listing.business_type}")
        print(f"     Description: '{listing.description}'")
        print(f"     Products: {listing.total_products}")
        print(f"     City: '{listing.city}' (exact match: {listing.city.lower() == 'juba'})")

    return True

if __name__ == '__main__':
    try:
        success = debug_marketplace_visibility()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Script failed")
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)