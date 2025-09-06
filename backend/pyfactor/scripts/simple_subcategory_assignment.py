"""
Simple subcategory assignment script for running in Render shell
"""
from marketplace.models import BusinessListing
from business.models import PlaceholderBusiness
from marketplace.marketplace_categories import detect_subcategories

print("Starting subcategory assignment...")

# Process existing BusinessListings
listings = BusinessListing.objects.all()
print(f"Found {listings.count()} BusinessListing objects")

updated = 0
for listing in listings[:100]:  # Process first 100 for testing
    name = listing.business.business_name if listing.business else "Unknown"
    subcats = detect_subcategories(
        listing.business_type,
        name,
        listing.description or "",
        listing.search_tags or []
    )
    if subcats and subcats != listing.auto_subcategories:
        listing.auto_subcategories = subcats
        listing.save(update_fields=['auto_subcategories'])
        updated += 1
        print(f"✓ {name}: {subcats}")

print(f"\nUpdated {updated} listings")

# Process PlaceholderBusinesses without listings
placeholders = PlaceholderBusiness.objects.filter(
    user__marketplace_listing__isnull=True
)[:100]  # Process first 100
print(f"\nFound {placeholders.count()} PlaceholderBusinesses without listings")

created = 0
for ph in placeholders:
    subcats = detect_subcategories(
        ph.business_type,
        ph.business_name,
        ph.description or "",
        []
    )
    BusinessListing.objects.create(
        business=ph.user,
        business_type=ph.business_type,
        country=ph.country or 'SS',
        city=ph.city or 'Juba',
        description=ph.description or "",
        auto_subcategories=subcats or [],
        is_visible_in_marketplace=True
    )
    created += 1
    print(f"✓ Created: {ph.business_name}")

print(f"\nCreated {created} new listings")
print(f"Total listings now: {BusinessListing.objects.count()}")