#!/usr/bin/env python3
"""
Simple Marketplace Business Check (Production Environment)
===========================================================

Run this script in Render shell to check marketplace business visibility issues.

Usage in Render shell:
    python scripts/simple_marketplace_check.py
"""

from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from marketplace.models import BusinessListing, ConsumerProfile
from business.models import PlaceholderBusiness

User = get_user_model()

def check_business_listings():
    """Check BusinessListing table"""
    print("=" * 50)
    print("BUSINESS LISTING CHECK")
    print("=" * 50)
    
    total_listings = BusinessListing.objects.count()
    visible_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True).count()
    active_business_listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        business__is_active=True
    ).count()
    
    print(f"Total BusinessListing records: {total_listings}")
    print(f"Visible in marketplace: {visible_listings}")
    print(f"Active businesses visible: {active_business_listings}")
    
    if total_listings == 0:
        print("❌ NO BUSINESS LISTINGS FOUND!")
        return False
    
    # Sample listings
    print("\nSample Business Listings:")
    sample_listings = BusinessListing.objects.select_related('business', 'business__userprofile').all()[:3]
    
    for listing in sample_listings:
        user = listing.business
        profile = getattr(user, 'userprofile', None)
        business_name = getattr(profile, 'business_name', user.email) if profile else user.email
        
        print(f"\nBusiness: {business_name}")
        print(f"  Email: {user.email}")
        print(f"  Visible: {listing.is_visible_in_marketplace}")
        print(f"  Active: {user.is_active}")
        print(f"  City: {listing.city}")
        print(f"  Country: {listing.country}")
        print(f"  Type: {listing.business_type}")
        print(f"  Delivery: {listing.delivery_scope}")
    
    return True

def check_placeholder_businesses():
    """Check PlaceholderBusiness table"""
    print("\n" + "=" * 50)
    print("PLACEHOLDER BUSINESS CHECK")
    print("=" * 50)
    
    total_placeholders = PlaceholderBusiness.objects.count()
    active_placeholders = PlaceholderBusiness.objects.filter(opted_out=False).count()
    
    print(f"Total PlaceholderBusiness records: {total_placeholders}")
    print(f"Active placeholders (not opted out): {active_placeholders}")
    
    # Check specific cities
    test_cities = ['Juba', 'Nairobi', 'Kampala', 'Lagos', 'Accra']
    print(f"\nBusinesses by city:")
    
    for city in test_cities:
        city_count = PlaceholderBusiness.objects.filter(
            opted_out=False,
            city__iexact=city
        ).count()
        print(f"  {city}: {city_count} businesses")
    
    # Sample placeholder businesses
    print("\nSample Placeholder Businesses:")
    sample_placeholders = PlaceholderBusiness.objects.filter(opted_out=False).all()[:3]
    
    for business in sample_placeholders:
        print(f"\nBusiness: {business.name}")
        print(f"  Category: {business.category}")
        print(f"  City: {business.city}")
        print(f"  Country: {business.country}")
        print(f"  Opted out: {business.opted_out}")
        print(f"  Rating: {business.rating}")
    
    return total_placeholders > 0

def check_recent_business_users():
    """Check recent business users"""
    print("\n" + "=" * 50)
    print("RECENT BUSINESS USERS CHECK")
    print("=" * 50)
    
    # Get recent business users
    business_users = User.objects.filter(
        userprofile__isnull=False,
        is_active=True
    ).exclude(
        userprofile__business_name__isnull=True
    ).exclude(
        userprofile__business_name=''
    ).order_by('-date_joined')[:5]
    
    print(f"Recent business users found: {business_users.count()}")
    
    for user in business_users:
        profile = user.userprofile
        print(f"\nUser: {user.email}")
        print(f"  Business name: {profile.business_name}")
        print(f"  Business type: {profile.business_type}")
        print(f"  City: {profile.city}")
        print(f"  Country: {profile.country}")
        print(f"  Active: {user.is_active}")
        print(f"  Joined: {user.date_joined}")
        
        # Check if they have a BusinessListing
        try:
            listing = BusinessListing.objects.get(business=user)
            print(f"  Has BusinessListing: ✅ (Visible: {listing.is_visible_in_marketplace})")
        except BusinessListing.DoesNotExist:
            print(f"  Has BusinessListing: ❌ MISSING!")
    
    return business_users.exists()

def test_marketplace_api_logic():
    """Test the marketplace API filtering logic"""
    print("\n" + "=" * 50)
    print("MARKETPLACE API LOGIC TEST")
    print("=" * 50)
    
    # Test with Juba, South Sudan (common test location)
    test_city = "Juba"
    test_country = "SS"
    
    print(f"Testing API logic for: {test_city}, {test_country}")
    
    # Test PlaceholderBusiness filtering (what API currently uses)
    placeholder_query = PlaceholderBusiness.objects.filter(
        opted_out=False,
        city__iexact=test_city
    )
    
    if test_country:
        placeholder_query = placeholder_query.filter(country__iexact=test_country)
    
    placeholder_count = placeholder_query.count()
    print(f"\nPlaceholderBusiness results: {placeholder_count}")
    
    if placeholder_count > 0:
        print("Sample businesses:")
        for business in placeholder_query[:3]:
            print(f"  - {business.name} ({business.category})")
    else:
        print("❌ No placeholder businesses found for Juba!")
        
        # Check what cities are available
        print("\nAvailable cities in PlaceholderBusiness:")
        cities = PlaceholderBusiness.objects.filter(opted_out=False).values_list('city', flat=True).distinct()
        for city in sorted(cities)[:10]:
            if city:
                count = PlaceholderBusiness.objects.filter(city__iexact=city, opted_out=False).count()
                print(f"  {city}: {count} businesses")
    
    # Test BusinessListing filtering
    listing_query = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        business__is_active=True,
        city__iexact=test_city
    )
    
    if test_country:
        listing_query = listing_query.filter(country__iexact=test_country)
    
    listing_count = listing_query.count()
    print(f"\nBusinessListing results: {listing_count}")
    
    return placeholder_count > 0 or listing_count > 0

def create_missing_business_listings():
    """Create BusinessListings for users who published but don't have listings"""
    print("\n" + "=" * 50)
    print("CREATE MISSING BUSINESS LISTINGS")
    print("=" * 50)
    
    # Find business users without BusinessListings
    business_users = User.objects.filter(
        userprofile__isnull=False,
        is_active=True
    ).exclude(
        userprofile__business_name__isnull=True
    ).exclude(
        userprofile__business_name=''
    )
    
    missing_listings = []
    for user in business_users:
        if not BusinessListing.objects.filter(business=user).exists():
            missing_listings.append(user)
    
    print(f"Users missing BusinessListing: {len(missing_listings)}")
    
    if missing_listings:
        print("Creating missing BusinessListings...")
        
        for user in missing_listings:
            profile = user.userprofile
            
            # Create BusinessListing
            listing = BusinessListing.objects.create(
                business=user,
                business_type=getattr(profile, 'business_type', 'OTHER'),
                country=getattr(profile, 'country', ''),
                city=getattr(profile, 'city', ''),
                description=getattr(profile, 'business_description', ''),
                is_visible_in_marketplace=True,  # Default to visible
                delivery_scope='local',  # Default to local delivery
                delivery_radius_km=10
            )
            
            print(f"✅ Created BusinessListing for {user.email}")
            print(f"   Business: {profile.business_name}")
            print(f"   City: {listing.city}")
            print(f"   Type: {listing.business_type}")
        
        return len(missing_listings)
    else:
        print("✅ All business users have BusinessListings")
        return 0

def main():
    """Main check function"""
    print("MARKETPLACE BUSINESS VISIBILITY CHECK")
    print("=" * 50)
    
    # 1. Check BusinessListing table
    listing_ok = check_business_listings()
    
    # 2. Check PlaceholderBusiness table  
    placeholder_ok = check_placeholder_businesses()
    
    # 3. Check recent business users
    users_ok = check_recent_business_users()
    
    # 4. Test marketplace API logic
    api_ok = test_marketplace_api_logic()
    
    # 5. Create missing business listings
    created_count = create_missing_business_listings()
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    print(f"BusinessListing table: {'✅' if listing_ok else '❌'}")
    print(f"PlaceholderBusiness table: {'✅' if placeholder_ok else '❌'}")
    print(f"Recent business users: {'✅' if users_ok else '❌'}")
    print(f"API logic test: {'✅' if api_ok else '❌'}")
    print(f"Created missing listings: {created_count}")
    
    if not listing_ok and created_count == 0:
        print("\n❌ MAIN ISSUE: No BusinessListings found and none were created")
        print("   Possible causes:")
        print("   - Users haven't published their businesses")
        print("   - BusinessListing creation is failing")
        print("   - User data is incomplete")
    elif created_count > 0:
        print(f"\n✅ FIXED: Created {created_count} missing BusinessListings")
        print("   Businesses should now appear in marketplace!")
    else:
        print("\n✅ BusinessListings exist - check other issues:")
        print("   - Location filtering (city/country matching)")
        print("   - Frontend API integration")
        print("   - User authentication")

if __name__ == "__main__":
    main()