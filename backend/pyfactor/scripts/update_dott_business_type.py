#!/usr/bin/env python3
"""
Script to update Dott Restaurant & Cafe business type to RESTAURANT_CAFE
"""
import os
import sys
import django

# Add the project directory to the path
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from marketplace.models import BusinessListing
from django.db import transaction

def update_business_type():
    """Update Dott Restaurant & Cafe business type to RESTAURANT_CAFE"""
    
    business_name = "Dott Restaurant & Cafe"
    new_business_type = "RESTAURANT_CAFE"
    
    print(f"🔍 Searching for business: {business_name}")
    
    try:
        # Find the business by name
        business = Business.objects.get(name=business_name)
        print(f"✅ Found business: {business.name} (ID: {business.id})")
        
        with transaction.atomic():
            # Update BusinessDetails if it exists
            business_details, created = BusinessDetails.objects.get_or_create(
                business=business,
                defaults={'business_type': new_business_type}
            )
            
            if not created:
                old_type = business_details.business_type
                business_details.business_type = new_business_type
                business_details.save()
                print(f"📝 Updated BusinessDetails: {old_type} → {new_business_type}")
            else:
                print(f"✨ Created new BusinessDetails with type: {new_business_type}")
            
            # Also update BusinessListing if it exists
            try:
                business_listing = BusinessListing.objects.get(business_name=business_name)
                old_listing_type = business_listing.business_type
                business_listing.business_type = new_business_type
                business_listing.save()
                print(f"📝 Updated BusinessListing: {old_listing_type} → {new_business_type}")
            except BusinessListing.DoesNotExist:
                print("ℹ️  No BusinessListing found - that's okay")
                
            print(f"🎉 Successfully updated {business_name} business type to {new_business_type}")
            
            # Verify the update
            business.refresh_from_db()
            business_details.refresh_from_db()
            print(f"✅ Verification: BusinessDetails.business_type = {business_details.business_type}")
            
    except Business.DoesNotExist:
        print(f"❌ Business '{business_name}' not found")
        
        # Let's check what businesses exist
        print("\n🔍 Available businesses:")
        businesses = Business.objects.all()[:10]
        for b in businesses:
            print(f"  - {b.name} (ID: {b.id})")
            
    except Exception as e:
        print(f"❌ Error updating business type: {str(e)}")
        raise

if __name__ == '__main__':
    update_business_type()