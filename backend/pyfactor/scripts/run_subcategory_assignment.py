#!/usr/bin/env python3
"""
Script to run subcategory assignment directly on staging database
"""
import os
import sys
import django
from pathlib import Path

# Add the project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
os.environ['DATABASE_URL'] = 'postgresql://pyfactor_user:mfBJHRiqRD3yOiZQJzP3ybBSYlPk3TkT@dpg-cm1eqv821fec738op9r0-a.oregon-postgres.render.com/pyfactor_db'

# Initialize Django
django.setup()

# Now we can import Django models
from marketplace.models import BusinessListing
from business.models import PlaceholderBusiness
from marketplace.marketplace_categories import detect_subcategories

def main():
    print("Starting subcategory assignment for staging database...")
    
    # Process BusinessListing objects
    print("\n=== Processing BusinessListing objects ===")
    listings = BusinessListing.objects.all()
    total = listings.count()
    print(f"Found {total} BusinessListing objects")
    
    updated_count = 0
    for listing in listings:
        business_name = listing.business.business_name if listing.business else "Unknown"
        description = listing.description or ""
        tags = listing.search_tags or []
        
        # Detect subcategories
        subcategories = detect_subcategories(
            business_type=listing.business_type,
            business_name=business_name,
            description=description,
            tags=tags
        )
        
        if subcategories and subcategories != listing.auto_subcategories:
            listing.auto_subcategories = subcategories
            listing.save(update_fields=['auto_subcategories'])
            updated_count += 1
            print(f"✓ Updated {business_name}: {subcategories}")
    
    print(f"\nUpdated {updated_count} BusinessListing objects")
    
    # Process PlaceholderBusiness objects
    print("\n=== Processing PlaceholderBusiness objects ===")
    placeholders = PlaceholderBusiness.objects.all()
    total_placeholder = placeholders.count()
    print(f"Found {total_placeholder} PlaceholderBusiness objects")
    
    created_count = 0
    for placeholder in placeholders:
        # Check if BusinessListing already exists
        if hasattr(placeholder.user, 'marketplace_listing'):
            continue
            
        # Detect subcategories for placeholder
        subcategories = detect_subcategories(
            business_type=placeholder.business_type,
            business_name=placeholder.business_name,
            description=placeholder.description or "",
            tags=[]
        )
        
        # Create BusinessListing
        BusinessListing.objects.create(
            business=placeholder.user,
            business_type=placeholder.business_type,
            country=placeholder.country or 'SS',
            city=placeholder.city or 'Juba',
            description=placeholder.description or "",
            auto_subcategories=subcategories or [],
            is_visible_in_marketplace=True
        )
        created_count += 1
        print(f"✓ Created listing for {placeholder.business_name}: {subcategories}")
    
    print(f"\nCreated {created_count} new BusinessListing objects")
    print(f"\n=== Summary ===")
    print(f"Total BusinessListings updated: {updated_count}")
    print(f"Total BusinessListings created: {created_count}")
    print(f"Total BusinessListings now: {BusinessListing.objects.count()}")

if __name__ == '__main__':
    main()