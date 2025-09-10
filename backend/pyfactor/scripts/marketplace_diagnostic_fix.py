#!/usr/bin/env python3
"""
Marketplace Business Visibility Diagnostic and Fix Script
=========================================================

This script diagnoses why published businesses aren't showing in marketplace discovery
and provides fixes for common issues.

Usage:
    python marketplace_diagnostic_fix.py [--fix] [--user-email=email]

Options:
    --fix               Apply fixes for identified issues
    --user-email=email  Check specific user's business
    --city=name         Filter by specific city
"""

import os
import sys
import django
from decimal import Decimal

# Add project root to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from marketplace.models import BusinessListing, ConsumerProfile
from business.models import PlaceholderBusiness
from django.utils import timezone
from datetime import timedelta
import argparse

User = get_user_model()

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_subsection(title):
    """Print a formatted subsection header"""
    print(f"\n{'-'*40}")
    print(f" {title}")
    print(f"{'-'*40}")

def diagnose_business_listings():
    """Diagnose BusinessListing table issues"""
    print_section("BUSINESS LISTING DIAGNOSTICS")
    
    # Check total BusinessListing records
    total_listings = BusinessListing.objects.count()
    visible_listings = BusinessListing.objects.filter(is_visible_in_marketplace=True).count()
    active_business_listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        business__is_active=True
    ).count()
    
    print(f"📊 Total BusinessListing records: {total_listings}")
    print(f"👁️  Visible in marketplace: {visible_listings}")
    print(f"✅ Active businesses visible: {active_business_listings}")
    
    if total_listings == 0:
        print("❌ NO BUSINESS LISTINGS FOUND - This is likely the main issue!")
        return False
    
    # Check for missing location data
    print_subsection("Location Data Check")
    no_city = BusinessListing.objects.filter(city__isnull=True).count()
    empty_city = BusinessListing.objects.filter(city='').count()
    no_country = BusinessListing.objects.filter(country__isnull=True).count()
    empty_country = BusinessListing.objects.filter(country='').count()
    
    print(f"🏙️  Missing city (NULL): {no_city}")
    print(f"🏙️  Empty city: {empty_city}")
    print(f"🌍 Missing country (NULL): {no_country}")
    print(f"🌍 Empty country: {empty_country}")
    
    # Check business types
    print_subsection("Business Type Distribution")
    business_types = BusinessListing.objects.values('business_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    for bt in business_types[:10]:
        print(f"📋 {bt['business_type']}: {bt['count']} businesses")
    
    # Check delivery scopes
    print_subsection("Delivery Scope Distribution")
    delivery_scopes = BusinessListing.objects.values('delivery_scope').annotate(
        count=Count('id')
    ).order_by('-count')
    
    for ds in delivery_scopes:
        print(f"🚚 {ds['delivery_scope']}: {ds['count']} businesses")
    
    # Sample some business listings
    print_subsection("Sample Business Listings")
    sample_listings = BusinessListing.objects.select_related('business', 'business__userprofile').all()[:5]
    
    for listing in sample_listings:
        user = listing.business
        profile = getattr(user, 'userprofile', None)
        print(f"\n🏢 Business: {getattr(profile, 'business_name', user.email) if profile else user.email}")
        print(f"   📧 Email: {user.email}")
        print(f"   👁️  Visible: {listing.is_visible_in_marketplace}")
        print(f"   ✅ Active: {user.is_active}")
        print(f"   🏙️  City: {listing.city}")
        print(f"   🌍 Country: {listing.country}")
        print(f"   📋 Type: {listing.business_type}")
        print(f"   🚚 Delivery: {listing.delivery_scope}")
        if hasattr(user, 'tenant_id'):
            print(f"   🏢 Tenant ID: {user.tenant_id}")
    
    return True

def diagnose_placeholder_businesses():
    """Diagnose PlaceholderBusiness table"""
    print_section("PLACEHOLDER BUSINESS DIAGNOSTICS")
    
    total_placeholders = PlaceholderBusiness.objects.count()
    active_placeholders = PlaceholderBusiness.objects.filter(opted_out=False).count()
    
    print(f"📊 Total PlaceholderBusiness records: {total_placeholders}")
    print(f"✅ Active placeholders (not opted out): {active_placeholders}")
    
    if total_placeholders == 0:
        print("❌ NO PLACEHOLDER BUSINESSES FOUND")
        return False
    
    # Check cities
    print_subsection("Cities with Placeholder Businesses")
    cities = PlaceholderBusiness.objects.filter(opted_out=False).values('city').annotate(
        count=Count('id')
    ).order_by('-count')
    
    for city in cities[:10]:
        print(f"🏙️  {city['city']}: {city['count']} businesses")
    
    # Check specific city for testing
    juba_businesses = PlaceholderBusiness.objects.filter(
        city__iexact='Juba',
        opted_out=False
    ).count()
    print(f"\n🎯 Juba businesses (for testing): {juba_businesses}")
    
    # Sample some placeholder businesses
    print_subsection("Sample Placeholder Businesses")
    sample_placeholders = PlaceholderBusiness.objects.filter(opted_out=False).all()[:5]
    
    for business in sample_placeholders:
        print(f"\n🏢 Business: {business.name}")
        print(f"   📋 Category: {business.category}")
        print(f"   🏙️  City: {business.city}")
        print(f"   🌍 Country: {business.country}")
        print(f"   🚫 Opted out: {business.opted_out}")
        print(f"   ⭐ Rating: {business.rating}")
    
    return True

def diagnose_user_businesses(user_email=None):
    """Diagnose specific user's business setup"""
    print_section("USER BUSINESS DIAGNOSTICS")
    
    if user_email:
        try:
            user = User.objects.get(email=user_email)
            print(f"🔍 Checking user: {user.email}")
        except User.DoesNotExist:
            print(f"❌ User with email {user_email} not found")
            return False
    else:
        # Get a few recent business users
        business_users = User.objects.filter(
            userprofile__isnull=False,
            is_active=True
        ).exclude(userprofile__business_name__isnull=True).exclude(userprofile__business_name='')[:3]
        
        if not business_users.exists():
            print("❌ No business users found")
            return False
        
        print("📋 Checking recent business users:")
        for user in business_users:
            print(f"   - {user.email}")
        
        # Check first user in detail
        user = business_users.first()
    
    print_subsection(f"User Details: {user.email}")
    
    # Check user profile
    if hasattr(user, 'userprofile'):
        profile = user.userprofile
        print(f"✅ UserProfile exists")
        print(f"   🏢 Business name: {profile.business_name}")
        print(f"   📋 Business type: {profile.business_type}")
        print(f"   🏙️  City: {profile.city}")
        print(f"   🌍 Country: {profile.country}")
        print(f"   ✅ Active: {user.is_active}")
        if hasattr(user, 'tenant_id'):
            print(f"   🏢 Tenant ID: {user.tenant_id}")
    else:
        print("❌ No UserProfile found")
        return False
    
    # Check BusinessListing
    print_subsection("BusinessListing Status")
    try:
        listing = BusinessListing.objects.get(business=user)
        print(f"✅ BusinessListing exists")
        print(f"   👁️  Visible in marketplace: {listing.is_visible_in_marketplace}")
        print(f"   📋 Business type: {listing.business_type}")
        print(f"   🏙️  City: {listing.city}")
        print(f"   🌍 Country: {listing.country}")
        print(f"   🚚 Delivery scope: {listing.delivery_scope}")
        print(f"   📅 Created: {listing.created_at}")
        print(f"   📅 Updated: {listing.updated_at}")
    except BusinessListing.DoesNotExist:
        print("❌ No BusinessListing found - THIS IS LIKELY THE ISSUE!")
        return False
    
    return True

def diagnose_marketplace_api():
    """Test marketplace API filtering logic"""
    print_section("MARKETPLACE API DIAGNOSTICS")
    
    # Test the filtering logic used in the API
    print_subsection("API Filtering Test")
    
    # Test with Juba, South Sudan (common test location)
    test_city = "Juba"
    test_country = "SS"
    
    print(f"🧪 Testing marketplace API logic for: {test_city}, {test_country}")
    
    # Test PlaceholderBusiness filtering (what API actually uses)
    placeholder_query = PlaceholderBusiness.objects.filter(
        opted_out=False,
        city__iexact=test_city
    )
    
    if test_country:
        placeholder_query = placeholder_query.filter(country__iexact=test_country)
    
    placeholder_count = placeholder_query.count()
    print(f"📊 PlaceholderBusiness results: {placeholder_count}")
    
    if placeholder_count > 0:
        print("   Sample businesses:")
        for business in placeholder_query[:3]:
            print(f"   - {business.name} ({business.category})")
    
    # Test BusinessListing filtering (future functionality)
    listing_query = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        business__is_active=True,
        city__iexact=test_city
    )
    
    if test_country:
        listing_query = listing_query.filter(country__iexact=test_country)
    
    listing_count = listing_query.count()
    print(f"📊 BusinessListing results: {listing_count}")
    
    # Test different cities
    print_subsection("Testing Different Cities")
    test_cities = ['Juba', 'Nairobi', 'Kampala', 'Lagos', 'Accra']
    
    for city in test_cities:
        city_count = PlaceholderBusiness.objects.filter(
            opted_out=False,
            city__iexact=city
        ).count()
        print(f"🏙️  {city}: {city_count} businesses")

def fix_common_issues(dry_run=True):
    """Fix common marketplace visibility issues"""
    print_section("FIXING COMMON ISSUES")
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
    else:
        print("🔧 APPLYING FIXES")
    
    fixes_applied = 0
    
    # Fix 1: Create missing BusinessListings for business users
    print_subsection("Fix 1: Create Missing BusinessListings")
    
    business_users = User.objects.filter(
        userprofile__isnull=False,
        is_active=True
    ).exclude(userprofile__business_name__isnull=True).exclude(userprofile__business_name='')
    
    missing_listings = []
    for user in business_users:
        if not hasattr(user, 'marketplace_listing') or not BusinessListing.objects.filter(business=user).exists():
            missing_listings.append(user)
    
    print(f"📊 Users missing BusinessListing: {len(missing_listings)}")
    
    if missing_listings and not dry_run:
        for user in missing_listings:
            profile = user.userprofile
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
            fixes_applied += 1
    
    # Fix 2: Update empty location data
    print_subsection("Fix 2: Fix Empty Location Data")
    
    empty_location_listings = BusinessListing.objects.filter(
        Q(city__isnull=True) | Q(city='') | 
        Q(country__isnull=True) | Q(country='')
    )
    
    print(f"📊 Listings with empty location: {empty_location_listings.count()}")
    
    if not dry_run:
        for listing in empty_location_listings:
            profile = getattr(listing.business, 'userprofile', None)
            if profile:
                updated = False
                if not listing.city and profile.city:
                    listing.city = profile.city
                    updated = True
                if not listing.country and profile.country:
                    listing.country = profile.country
                    updated = True
                
                if updated:
                    listing.save()
                    print(f"✅ Updated location for {listing.business.email}")
                    fixes_applied += 1
    
    # Fix 3: Set default business types for listings with missing types
    print_subsection("Fix 3: Fix Missing Business Types")
    
    missing_type_listings = BusinessListing.objects.filter(
        Q(business_type__isnull=True) | Q(business_type='')
    )
    
    print(f"📊 Listings with missing business type: {missing_type_listings.count()}")
    
    if not dry_run:
        for listing in missing_type_listings:
            profile = getattr(listing.business, 'userprofile', None)
            if profile and profile.business_type:
                listing.business_type = profile.business_type
            else:
                listing.business_type = 'OTHER'
            
            listing.save()
            print(f"✅ Updated business type for {listing.business.email}")
            fixes_applied += 1
    
    # Fix 4: Enable marketplace visibility for published businesses
    print_subsection("Fix 4: Enable Marketplace Visibility")
    
    invisible_listings = BusinessListing.objects.filter(
        is_visible_in_marketplace=False,
        business__is_active=True
    )
    
    print(f"📊 Active businesses not visible in marketplace: {invisible_listings.count()}")
    
    if not dry_run:
        for listing in invisible_listings:
            listing.is_visible_in_marketplace = True
            listing.save()
            print(f"✅ Made {listing.business.email} visible in marketplace")
            fixes_applied += 1
    
    print(f"\n🎯 Total fixes applied: {fixes_applied}")
    
    return fixes_applied

def test_marketplace_search():
    """Test the actual marketplace search functionality"""
    print_section("MARKETPLACE SEARCH TEST")
    
    # Import the view logic
    from marketplace.views import ConsumerSearchViewSet
    from django.test import RequestFactory
    from django.contrib.auth.models import AnonymousUser
    
    # Create a test request
    factory = RequestFactory()
    
    # Test the marketplace_businesses endpoint
    print_subsection("Testing marketplace_businesses endpoint")
    
    request = factory.get('/api/marketplace/consumer/marketplace-businesses/', {
        'city': 'Juba',
        'country': 'SS',
        'page': 1,
        'page_size': 20
    })
    
    # Create test user
    test_user = User.objects.filter(is_active=True).first()
    if test_user:
        request.user = test_user
        
        view = ConsumerSearchViewSet()
        view.request = request
        
        try:
            response = view.marketplace_businesses(request)
            
            print(f"📊 API Response Status: {response.status_code}")
            print(f"📊 Response Data Keys: {list(response.data.keys())}")
            
            if 'results' in response.data:
                results_count = len(response.data['results'])
                print(f"📊 Results Count: {results_count}")
                
                if results_count > 0:
                    print("✅ Marketplace search is working!")
                    sample = response.data['results'][0]
                    print(f"   Sample business: {sample.get('name', 'Unknown')}")
                else:
                    print("❌ No results returned from marketplace search")
            else:
                print("❌ No 'results' key in response")
                print(f"Response data: {response.data}")
                
        except Exception as e:
            print(f"❌ Error testing marketplace API: {str(e)}")
    else:
        print("❌ No test user available")

def main():
    """Main diagnostic function"""
    parser = argparse.ArgumentParser(description='Marketplace Business Visibility Diagnostics')
    parser.add_argument('--fix', action='store_true', help='Apply fixes for identified issues')
    parser.add_argument('--user-email', help='Check specific user business')
    parser.add_argument('--city', help='Filter by specific city')
    
    args = parser.parse_args()
    
    print_section("MARKETPLACE BUSINESS VISIBILITY DIAGNOSTICS")
    print(f"🕐 Started at: {timezone.now()}")
    
    # Run all diagnostics
    print("\n🔍 Running comprehensive diagnostics...")
    
    # 1. Check BusinessListing table
    listing_ok = diagnose_business_listings()
    
    # 2. Check PlaceholderBusiness table  
    placeholder_ok = diagnose_placeholder_businesses()
    
    # 3. Check user business setup
    user_ok = diagnose_user_businesses(args.user_email)
    
    # 4. Test marketplace API
    diagnose_marketplace_api()
    
    # 5. Test actual search functionality
    test_marketplace_search()
    
    # 6. Apply fixes if requested
    if args.fix:
        fix_common_issues(dry_run=False)
    else:
        print_section("RECOMMENDED FIXES")
        print("🔧 Run with --fix flag to apply these fixes:")
        fix_common_issues(dry_run=True)
    
    # Summary
    print_section("DIAGNOSTIC SUMMARY")
    
    issues_found = []
    
    if not listing_ok:
        issues_found.append("BusinessListing table issues")
    
    if not placeholder_ok:
        issues_found.append("PlaceholderBusiness table issues")
    
    if not user_ok:
        issues_found.append("User business setup issues")
    
    if issues_found:
        print("❌ Issues found:")
        for issue in issues_found:
            print(f"   - {issue}")
        print(f"\n🔧 Run 'python {__file__} --fix' to resolve issues")
    else:
        print("✅ No major issues found!")
        print("💡 If businesses still don't appear, check:")
        print("   - City/country spelling and capitalization")
        print("   - User authentication and permissions")
        print("   - Frontend API integration")
    
    print(f"\n🕐 Completed at: {timezone.now()}")

if __name__ == "__main__":
    main()