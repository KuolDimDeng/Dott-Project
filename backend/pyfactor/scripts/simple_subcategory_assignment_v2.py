"""
Subcategory assignment script that works with existing fields
"""
from marketplace.models import BusinessListing
from business.models import PlaceholderBusiness
from marketplace.marketplace_categories import detect_subcategories, MARKETPLACE_CATEGORIES

print("Starting subcategory assignment (v2 - using primary_category)...")

# Process existing BusinessListings
listings = BusinessListing.objects.all()
print(f"Found {listings.count()} BusinessListing objects")

# Map primary_category to business_type
CATEGORY_TO_TYPE_MAP = {
    'food': 'RESTAURANT_CAFE',
    'restaurant': 'RESTAURANT_CAFE',
    'cafe': 'RESTAURANT_CAFE',
    'shopping': 'RETAIL_SHOP',
    'shop': 'RETAIL_SHOP',
    'retail': 'RETAIL_SHOP',
    'grocery': 'GROCERY_STORE',
    'supermarket': 'GROCERY_STORE',
    'pharmacy': 'PHARMACY',
    'beauty': 'BEAUTY_SALON',
    'salon': 'BEAUTY_SALON',
    'barber': 'BARBER_SHOP',
    'gym': 'FITNESS_CENTER',
    'fitness': 'FITNESS_CENTER',
    'medical': 'MEDICAL_CLINIC',
    'clinic': 'MEDICAL_CLINIC',
    'hospital': 'MEDICAL_CLINIC',
    'dental': 'DENTAL_CLINIC',
    'vet': 'VETERINARY',
    'veterinary': 'VETERINARY',
    'auto': 'AUTO_SERVICE',
    'mechanic': 'AUTO_SERVICE',
    'car': 'AUTO_SERVICE',
    'laundry': 'LAUNDRY',
    'hotel': 'HOTEL',
    'school': 'EDUCATION',
    'education': 'EDUCATION',
    'professional': 'PROFESSIONAL_SERVICE',
    'service': 'PROFESSIONAL_SERVICE',
}

updated = 0
for listing in listings[:100]:  # Process first 100 for testing
    name = listing.business.business_name if listing.business else "Unknown"
    
    # Get business_type from primary_category if business_type doesn't exist
    primary_cat = getattr(listing, 'primary_category', '').lower()
    business_type = CATEGORY_TO_TYPE_MAP.get(primary_cat, 'OTHER')
    
    # Detect subcategories
    subcats = detect_subcategories(
        business_type,
        name,
        listing.description or "",
        listing.search_tags or []
    )
    
    if subcats:
        # Update auto_subcategories if they exist
        if hasattr(listing, 'auto_subcategories'):
            if subcats != listing.auto_subcategories:
                listing.auto_subcategories = subcats
                listing.save(update_fields=['auto_subcategories'])
                updated += 1
                print(f"✓ {name}: {subcats}")
        else:
            print(f"⚠️ {name}: auto_subcategories field doesn't exist yet")

print(f"\nUpdated {updated} listings")

# Process PlaceholderBusinesses
try:
    placeholders = PlaceholderBusiness.objects.filter(
        user__marketplace_listing__isnull=True
    )[:100]
    print(f"\nFound {placeholders.count()} PlaceholderBusinesses without listings")
    
    created = 0
    for ph in placeholders:
        # Map business type to primary category for now
        business_type = ph.business_type if hasattr(ph, 'business_type') else 'OTHER'
        primary_cat = 'other'
        
        # Map business_type to primary_category
        for cat_key, cat_data in MARKETPLACE_CATEGORIES.items():
            for subcat_key, subcat_data in cat_data['subcategories'].items():
                if business_type in subcat_data.get('business_types', []):
                    primary_cat = cat_key
                    break
            if primary_cat != 'other':
                break
        
        # Detect subcategories
        subcats = detect_subcategories(
            business_type,
            ph.business_name,
            ph.description or "",
            []
        )
        
        # Create listing with available fields
        listing_data = {
            'business': ph.user,
            'primary_category': primary_cat,
            'country': ph.country or 'SS',
            'city': ph.city or 'Juba',
            'description': ph.description or "",
            'is_visible_in_marketplace': True,
        }
        
        # Add subcategories if field exists
        if hasattr(BusinessListing, 'auto_subcategories'):
            listing_data['auto_subcategories'] = subcats or []
            
        BusinessListing.objects.create(**listing_data)
        created += 1
        print(f"✓ Created: {ph.business_name}")
    
    print(f"\nCreated {created} new listings")
except Exception as e:
    print(f"Error processing PlaceholderBusinesses: {e}")

print(f"Total listings now: {BusinessListing.objects.count()}")