#!/usr/bin/env python
"""
Test script for verifying featuring endpoints
Can be run in Django shell or as a standalone script
"""
import os
import sys
import django

# Setup Django
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()

import json
import requests
from django.conf import settings

def test_featuring_endpoints():
    """Test the featuring endpoints"""

    # Base URL for API
    base_url = 'https://staging.dottapps.com/api/marketplace/consumer-search'
    if 'localhost' in str(settings.ALLOWED_HOSTS):
        base_url = 'http://localhost:8000/api/marketplace/consumer-search'

    print("\n" + "="*80)
    print("🧪 TESTING FEATURING ENDPOINTS")
    print("="*80)

    # Test parameters
    params = {
        'city': 'Juba',
        'country': 'SS'
    }

    # Test 1: Featured businesses endpoint
    print("\n📊 Testing /featured/ endpoint...")
    try:
        url = f"{base_url}/featured/"
        print(f"  URL: {url}")
        print(f"  Params: {params}")

        # Using direct database query for internal testing
        from marketplace.featuring_service import FeaturingService
        featured_businesses, metadata = FeaturingService.get_featured_businesses(
            city=params['city'],
            country=params['country'],
            limit=20
        )

        print(f"\n  ✅ Response successful!")
        print(f"  📦 Found {len(featured_businesses)} featured businesses")
        print(f"  🏷️ Tiers used: {metadata.get('tiers_used', [])}")
        print(f"  📍 Search level: {metadata.get('search_level', 'unknown')}")

        if featured_businesses:
            print("\n  Sample businesses:")
            for i, biz in enumerate(featured_businesses[:3], 1):
                print(f"    {i}. {biz.get('business_name', 'Unknown')}")
                print(f"       - Tier: {biz.get('featuring_tier_name', 'N/A')}")
                print(f"       - Trust Score: {biz.get('trust_score', 0)}")
                print(f"       - Rating: {biz.get('rating_display', 'No ratings')}")
                print(f"       - Image URL: {'✓' if biz.get('logo_url') else '✗ Missing'}")

    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Test 2: Featured items endpoint
    print("\n📦 Testing /featured_items/ endpoint...")
    try:
        from marketplace.featuring_service import FeaturingService
        featured_items, metadata = FeaturingService.get_featured_items(
            city=params['city'],
            country=params['country'],
            item_type='all',
            limit=20
        )

        print(f"\n  ✅ Response successful!")
        print(f"  📦 Found {len(featured_items)} featured items")
        print(f"  🏷️ Item types: {metadata.get('item_type', 'unknown')}")

        if featured_items:
            print("\n  Sample items:")
            products = [i for i in featured_items if i.get('type') == 'product']
            menu_items = [i for i in featured_items if i.get('type') == 'menu_item']

            print(f"    - Products: {len(products)}")
            print(f"    - Menu Items: {len(menu_items)}")

            for i, item in enumerate(featured_items[:3], 1):
                print(f"\n    {i}. {item.get('name', 'Unknown')}")
                print(f"       - Type: {item.get('type', 'unknown')}")
                print(f"       - Price: ${item.get('price', 0):.2f}")
                print(f"       - Business: {item.get('business_name', 'Unknown')}")
                print(f"       - Image URL: {'✓' if item.get('image_url') else '✗ Missing'}")

    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Test 3: Location fallback
    print("\n🗺️ Testing Location Fallback...")
    try:
        from marketplace.location_service import LocationService

        # Test with a city that likely has few businesses
        businesses, location_meta = LocationService.get_businesses_with_fallback(
            city='Wau',  # Less likely to have businesses
            country='SS',
            min_results=10
        )

        print(f"  ✅ Fallback successful!")
        print(f"  📦 Found {len(businesses)} businesses")
        print(f"  📍 Search level: {location_meta.get('search_level')}")
        print(f"  🏙️ Included cities: {', '.join(location_meta.get('included_cities', []))}")
        print(f"  🚚 Delivery scopes: {', '.join(location_meta.get('included_delivery_scopes', []))}")
        print(f"  📝 Fallback reason: {location_meta.get('fallback_reason', 'None')}")

    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Test 4: Image service
    print("\n🖼️ Testing Image Service...")
    try:
        from marketplace.image_service import ImageService
        from marketplace.models import BusinessListing

        listing = BusinessListing.objects.filter(is_visible_in_marketplace=True).first()
        if listing:
            logo = ImageService.get_logo_url(listing)
            cover = ImageService.get_cover_image_url(listing)
            gallery = ImageService.get_gallery_images(listing)

            print(f"  ✅ Image service working!")
            print(f"  Business: {listing.business.business_name if listing.business else 'Unknown'}")
            print(f"  Logo URL: {'✓ ' + logo[:50] + '...' if logo else '✗ Using placeholder'}")
            print(f"  Cover URL: {'✓ ' + cover[:50] + '...' if cover else '✗ Using placeholder'}")
            print(f"  Gallery: {len(gallery)} images")

    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Test 5: Rating service
    print("\n⭐ Testing Rating Service...")
    try:
        from marketplace.rating_service import RatingService
        from marketplace.models import BusinessListing

        listing = BusinessListing.objects.filter(is_visible_in_marketplace=True).first()
        if listing:
            rating_summary = RatingService.get_rating_summary(listing)
            trust_score = RatingService.calculate_trust_score(listing)

            print(f"  ✅ Rating service working!")
            print(f"  Business: {listing.business.business_name if listing.business else 'Unknown'}")
            print(f"  Average Rating: {rating_summary.get('average_rating')}")
            print(f"  Rating Display: {rating_summary.get('rating_display')}")
            print(f"  Total Reviews: {rating_summary.get('total_reviews')}")
            print(f"  Trust Score: {trust_score}/100")
            print(f"  Trust Badge: {rating_summary.get('trust_badge')}")
            print(f"  Response Time: {rating_summary.get('response_time')}")

    except Exception as e:
        print(f"  ❌ Error: {e}")

    print("\n" + "="*80)
    print("✅ TESTING COMPLETE")
    print("="*80)

if __name__ == '__main__':
    test_featuring_endpoints()