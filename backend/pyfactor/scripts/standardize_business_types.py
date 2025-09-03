#!/usr/bin/env python
"""
Standardize all business types across the system
- Updates PlaceholderBusiness.category to use new business types
- Updates BusinessListing.primary_category to business_type with new types
- Updates UserProfile/BusinessDetails business types
"""

import os
import sys
from decimal import Decimal

# Setup Django path
backend_path = '/app' if os.path.exists('/app') else '/Users/kuoldeng/projectx/backend/pyfactor'
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Try to import Django and set it up only if not already done
try:
    import django
    if not hasattr(django, '_initialized') or not django._initialized:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
        django.setup()
        django._initialized = True
except ImportError:
    pass

from business.models import PlaceholderBusiness
from marketplace.models import BusinessListing
from users.models import UserProfile, BusinessDetails
from core.business_types import BUSINESS_TYPE_CHOICES, migrate_old_category

def update_placeholder_businesses():
    """Update all PlaceholderBusiness category fields"""
    print("\n" + "="*80)
    print("UPDATING PLACEHOLDER BUSINESSES")
    print("="*80)
    
    businesses = PlaceholderBusiness.objects.all()
    total = businesses.count()
    updated = 0
    
    print(f"Total PlaceholderBusinesses to update: {total:,}")
    
    for business in businesses:
        old_category = business.category
        new_type = migrate_old_category(old_category)
        
        if old_category != new_type:
            business.category = new_type
            business.save(update_fields=['category'])
            updated += 1
            
            if updated % 100 == 0:
                print(f"  Updated {updated:,} businesses...")
    
    print(f"✅ Updated {updated:,} PlaceholderBusinesses")
    return updated

def update_business_listings():
    """Update BusinessListing to use business_type instead of primary_category"""
    print("\n" + "="*80)
    print("UPDATING BUSINESS LISTINGS")
    print("="*80)
    
    # Check if the field has already been renamed
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'marketplace_business_listings'
            AND column_name IN ('primary_category', 'business_type')
        """)
        columns = [row[0] for row in cursor.fetchall()]
    
    if 'primary_category' in columns and 'business_type' not in columns:
        print("Renaming primary_category to business_type...")
        with connection.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE marketplace_business_listings 
                RENAME COLUMN primary_category TO business_type
            """)
        print("✅ Column renamed")
    elif 'business_type' in columns:
        print("✅ business_type column already exists")
    
    # Now update the values
    listings = BusinessListing.objects.all()
    total = listings.count()
    updated = 0
    
    print(f"Total BusinessListings to update: {total:,}")
    
    for listing in listings:
        # Get the current value (might be in business_type or might have old category value)
        try:
            current_value = listing.business_type
        except AttributeError:
            # Field doesn't exist yet in model, read directly from DB
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT business_type FROM marketplace_business_listings WHERE id = %s",
                    [str(listing.id)]
                )
                result = cursor.fetchone()
                current_value = result[0] if result else None
        
        if current_value:
            new_type = migrate_old_category(current_value)
            
            if current_value != new_type:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE marketplace_business_listings SET business_type = %s WHERE id = %s",
                        [new_type, str(listing.id)]
                    )
                updated += 1
    
    print(f"✅ Updated {updated:,} BusinessListings")
    return updated

def update_user_business_types():
    """Update UserProfile and BusinessDetails business types"""
    print("\n" + "="*80)
    print("UPDATING USER BUSINESS TYPES")
    print("="*80)
    
    # Update UserProfile
    profiles = UserProfile.objects.exclude(business_type__isnull=True)
    profile_total = profiles.count()
    profile_updated = 0
    
    print(f"Total UserProfiles to check: {profile_total:,}")
    
    for profile in profiles:
        old_type = profile.business_type
        new_type = migrate_old_category(old_type)
        
        if old_type != new_type:
            profile.business_type = new_type
            profile.simplified_business_type = new_type  # Also update simplified
            profile.save(update_fields=['business_type', 'simplified_business_type'])
            profile_updated += 1
    
    print(f"✅ Updated {profile_updated:,} UserProfiles")
    
    # Update BusinessDetails
    try:
        details = BusinessDetails.objects.exclude(business_type__isnull=True)
        detail_total = details.count()
        detail_updated = 0
        
        print(f"Total BusinessDetails to check: {detail_total:,}")
        
        for detail in details:
            old_type = detail.business_type
            new_type = migrate_old_category(old_type)
            
            if old_type != new_type:
                detail.business_type = new_type
                detail.simplified_business_type = new_type
                detail.save(update_fields=['business_type', 'simplified_business_type'])
                detail_updated += 1
        
        print(f"✅ Updated {detail_updated:,} BusinessDetails")
    except Exception as e:
        print(f"⚠️  BusinessDetails table might not exist: {e}")
    
    return profile_updated

def show_statistics():
    """Show statistics of business types after update"""
    print("\n" + "="*80)
    print("BUSINESS TYPE STATISTICS")
    print("="*80)
    
    # Get valid types and labels
    type_labels = dict(BUSINESS_TYPE_CHOICES)
    
    # PlaceholderBusiness statistics
    print("\nPlaceholderBusiness Distribution:")
    from django.db.models import Count
    placeholder_stats = PlaceholderBusiness.objects.values('category').annotate(
        count=Count('category')
    ).order_by('-count')
    
    for stat in placeholder_stats[:20]:  # Top 20
        category = stat['category']
        count = stat['count']
        label = type_labels.get(category, category)
        print(f"  {category:25} {label:45} {count:5,}")
    
    # BusinessListing statistics
    try:
        print("\nBusinessListing Distribution:")
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT business_type, COUNT(*) as count 
                FROM marketplace_business_listings 
                GROUP BY business_type 
                ORDER BY count DESC
            """)
            listing_stats = cursor.fetchall()
        
        for business_type, count in listing_stats[:20]:  # Top 20
            label = type_labels.get(business_type, business_type)
            print(f"  {business_type:25} {label:45} {count:5,}")
    except Exception as e:
        print(f"  Could not get BusinessListing stats: {e}")
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total PlaceholderBusinesses: {PlaceholderBusiness.objects.count():,}")
    
    try:
        print(f"Total BusinessListings: {BusinessListing.objects.count():,}")
    except:
        pass
    
    try:
        print(f"Total UserProfiles with business_type: {UserProfile.objects.exclude(business_type__isnull=True).count():,}")
    except:
        pass

def main():
    print("\n" + "="*80)
    print("BUSINESS TYPE STANDARDIZATION SCRIPT")
    print("="*80)
    print("This will update all business types to use the comprehensive standardized list")
    
    # Update all models
    placeholder_updated = update_placeholder_businesses()
    listing_updated = update_business_listings()
    user_updated = update_user_business_types()
    
    # Show statistics
    show_statistics()
    
    print("\n" + "="*80)
    print("STANDARDIZATION COMPLETE")
    print("="*80)
    print(f"Total records updated: {placeholder_updated + listing_updated + user_updated:,}")
    print("\nNOTE: You may need to run Django migrations after this script")
    print("Run: python manage.py makemigrations && python manage.py migrate")

if __name__ == '__main__':
    main()