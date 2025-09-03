#!/usr/bin/env python
"""
Update all PlaceholderBusiness entries to use correct business types
Maps current categories to new SIMPLIFIED_BUSINESS_TYPES
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
from users.business_categories import SIMPLIFIED_BUSINESS_TYPES

# Create mapping from old categories to new business types
CATEGORY_MAPPING = {
    # Healthcare related
    'healthcare': 'MEDICAL_DENTAL',
    'hospital': 'MEDICAL_DENTAL',
    'clinic': 'MEDICAL_DENTAL',
    'medical': 'MEDICAL_DENTAL',
    'pharmacy': 'PHARMACY',
    
    # Financial services
    'banking': 'FINANCIAL_SERVICES',
    'bank': 'FINANCIAL_SERVICES',
    'financial_services': 'FINANCIAL_SERVICES',
    'insurance': 'FINANCIAL_SERVICES',
    'microfinance': 'FINANCIAL_SERVICES',
    
    # Transportation
    'transportation': 'TRANSPORT_SERVICE',
    'transport': 'TRANSPORT_SERVICE',
    'airline': 'TRANSPORT_SERVICE',
    'logistics': 'LOGISTICS_FREIGHT',
    'freight': 'LOGISTICS_FREIGHT',
    'shipping': 'LOGISTICS_FREIGHT',
    
    # Hospitality
    'hotel': 'HOTEL_HOSPITALITY',
    'hospitality': 'HOTEL_HOSPITALITY',
    'lodge': 'HOTEL_HOSPITALITY',
    'guest_house': 'HOTEL_HOSPITALITY',
    
    # Food & Beverage
    'restaurant': 'RESTAURANT_CAFE',
    'cafe': 'RESTAURANT_CAFE',
    'food': 'RESTAURANT_CAFE',
    'food_delivery': 'RESTAURANT_CAFE',
    'beverage': 'RESTAURANT_CAFE',
    
    # Retail
    'retail': 'RETAIL_STORE',
    'store': 'RETAIL_STORE',
    'shop': 'RETAIL_STORE',
    'supermarket': 'GROCERY_MARKET',
    'grocery': 'GROCERY_MARKET',
    'market': 'GROCERY_MARKET',
    
    # Technology
    'technology': 'TECH_SERVICES',
    'tech': 'TECH_SERVICES',
    'it': 'TECH_SERVICES',
    'software': 'TECH_SERVICES',
    'e_commerce': 'ONLINE_STORE',
    'telecom': 'TELECOM',
    'telecommunications': 'TELECOM',
    
    # Real Estate & Construction
    'real_estate': 'REAL_ESTATE',
    'property': 'REAL_ESTATE',
    'construction': 'CONSTRUCTION',
    'building': 'CONSTRUCTION',
    
    # Manufacturing & Industry
    'manufacturing': 'MANUFACTURING',
    'industrial': 'MANUFACTURING',
    'factory': 'MANUFACTURING',
    'production': 'MANUFACTURING',
    
    # Energy & Mining
    'mining': 'MINING_ENERGY',
    'energy': 'MINING_ENERGY',
    'oil': 'MINING_ENERGY',
    'gas': 'MINING_ENERGY',
    'petroleum': 'MINING_ENERGY',
    'solar': 'MINING_ENERGY',
    'utilities': 'MINING_ENERGY',
    
    # Agriculture
    'agriculture': 'AGRICULTURE',
    'farming': 'AGRICULTURE',
    'agribusiness': 'AGRICULTURE',
    
    # Beauty & Personal Care
    'beauty_salon': 'SALON_SPA',
    'salon': 'SALON_SPA',
    'spa': 'SALON_SPA',
    'barber': 'SALON_SPA',
    'cosmetics': 'SALON_SPA',
    
    # Fashion
    'fashion': 'FASHION_CLOTHING',
    'clothing': 'FASHION_CLOTHING',
    'apparel': 'FASHION_CLOTHING',
    'textiles': 'FASHION_CLOTHING',
    
    # Automotive
    'automotive': 'AUTO_PARTS_REPAIR',
    'auto': 'AUTO_PARTS_REPAIR',
    'car': 'AUTO_PARTS_REPAIR',
    'vehicle': 'AUTO_PARTS_REPAIR',
    
    # Professional Services
    'consulting': 'PROFESSIONAL_SERVICES',
    'legal': 'PROFESSIONAL_SERVICES',
    'accounting': 'PROFESSIONAL_SERVICES',
    'professional': 'PROFESSIONAL_SERVICES',
    
    # Education
    'education': 'EDUCATION_TRAINING',
    'school': 'EDUCATION_TRAINING',
    'training': 'EDUCATION_TRAINING',
    'university': 'EDUCATION_TRAINING',
    
    # Media & Entertainment
    'media': 'PRINT_MEDIA',
    'printing': 'PRINT_MEDIA',
    'publishing': 'PRINT_MEDIA',
    'advertising': 'CREATIVE_SERVICES',
    'marketing': 'CREATIVE_SERVICES',
    
    # Tourism
    'tourism': 'TOURISM_TRAVEL',
    'travel': 'TOURISM_TRAVEL',
    'tour': 'TOURISM_TRAVEL',
    
    # Import/Export
    'import': 'IMPORT_EXPORT',
    'export': 'IMPORT_EXPORT',
    'trading': 'IMPORT_EXPORT',
    'wholesale': 'IMPORT_EXPORT',
    
    # Fitness
    'fitness': 'FITNESS_CENTER',
    'gym': 'FITNESS_CENTER',
    'sports': 'FITNESS_CENTER',
    
    # Conglomerate/Mixed
    'conglomerate': 'OTHER',
    'diversified': 'OTHER',
    'holding': 'OTHER',
    
    # Aerospace
    'aerospace': 'MANUFACTURING',
    
    # Event Planning
    'event': 'EVENT_PLANNING',
    'catering': 'EVENT_PLANNING',
    
    # Security
    'security': 'SECURITY_SERVICES',
    
    # Fuel stations
    'fuel': 'FUEL_STATION',
    'petrol': 'FUEL_STATION',
    'gas_station': 'FUEL_STATION',
    
    # Electronics
    'electronics': 'ELECTRONICS_TECH',
    'computers': 'ELECTRONICS_TECH',
    'phones': 'ELECTRONICS_TECH',
    
    # Hardware
    'hardware': 'HARDWARE_BUILDING',
    'building_supplies': 'HARDWARE_BUILDING',
    
    # Books
    'bookstore': 'BOOKSTORE_STATIONERY',
    'stationery': 'BOOKSTORE_STATIONERY',
    
    # Mobile Money
    'mobile_money': 'MOBILE_MONEY',
    'money_transfer': 'MOBILE_MONEY',
    'mpesa': 'MOBILE_MONEY',
    
    # Warehouse
    'warehouse': 'WAREHOUSE_STORAGE',
    'storage': 'WAREHOUSE_STORAGE',
    
    # Veterinary
    'veterinary': 'VETERINARY',
    'animal': 'VETERINARY',
    
    # Non-profit
    'non_profit': 'NON_PROFIT',
    'ngo': 'NON_PROFIT',
    'charity': 'NON_PROFIT',
    
    # Home Services
    'plumbing': 'HOME_SERVICES',
    'electrical': 'HOME_SERVICES',
    'hvac': 'HOME_SERVICES',
    'maintenance': 'HOME_SERVICES',
    
    # Cleaning
    'cleaning': 'CLEANING',
    'laundry': 'CLEANING',
    'dry_cleaning': 'CLEANING',
}

def update_business_types():
    """Update all businesses to use correct business types"""
    print("\n" + "="*80)
    print("UPDATING BUSINESS TYPES FOR ALL BUSINESSES")
    print("="*80)
    
    # Get all businesses
    all_businesses = PlaceholderBusiness.objects.all()
    total = all_businesses.count()
    print(f"\nTotal businesses to update: {total:,}")
    
    # Track statistics
    updated = 0
    already_correct = 0
    defaulted = 0
    category_stats = {}
    
    # Get valid business type codes
    valid_types = [choice[0] for choice in SIMPLIFIED_BUSINESS_TYPES]
    
    print("\nProcessing businesses...")
    
    for business in all_businesses:
        current_category = business.category.lower() if business.category else ''
        
        # Check if already a valid business type
        if business.category in valid_types:
            already_correct += 1
            category_stats[business.category] = category_stats.get(business.category, 0) + 1
            continue
        
        # Map to new business type
        new_type = None
        
        # Try direct mapping
        if current_category in CATEGORY_MAPPING:
            new_type = CATEGORY_MAPPING[current_category]
        else:
            # Try partial matching for compound categories
            for key, value in CATEGORY_MAPPING.items():
                if key in current_category or current_category in key:
                    new_type = value
                    break
        
        # Default to OTHER if no mapping found
        if not new_type:
            new_type = 'OTHER'
            defaulted += 1
        
        # Update the business
        business.category = new_type
        business.save(update_fields=['category'])
        updated += 1
        
        # Track statistics
        category_stats[new_type] = category_stats.get(new_type, 0) + 1
        
        # Show progress every 100 businesses
        if (updated + already_correct) % 100 == 0:
            print(f"  Processed {updated + already_correct:,} / {total:,} businesses...")
    
    # Show results
    print("\n" + "="*80)
    print("UPDATE COMPLETE")
    print("="*80)
    print(f"Total businesses: {total:,}")
    print(f"Updated: {updated:,}")
    print(f"Already correct: {already_correct:,}")
    print(f"Defaulted to OTHER: {defaulted:,}")
    
    print("\n" + "="*80)
    print("BUSINESS TYPE DISTRIBUTION")
    print("="*80)
    
    # Sort by count
    sorted_stats = sorted(category_stats.items(), key=lambda x: x[1], reverse=True)
    
    # Get type labels
    type_labels = dict(SIMPLIFIED_BUSINESS_TYPES)
    
    for business_type, count in sorted_stats:
        label = type_labels.get(business_type, business_type)
        percentage = (count / total) * 100
        print(f"{business_type:25} {label:45} {count:5,} ({percentage:.1f}%)")
    
    print("\n" + "="*80)
    print("SAMPLE OF UPDATED BUSINESSES")
    print("="*80)
    
    # Show a sample of updated businesses
    sample = PlaceholderBusiness.objects.all()[:10]
    for business in sample:
        print(f"  {business.name:40} -> {business.category}")

def main():
    print("\n" + "="*80)
    print("BUSINESS TYPE UPDATE SCRIPT")
    print("="*80)
    update_business_types()
    print("\n" + "="*80)
    print("COMPLETED")
    print("="*80)

if __name__ == '__main__':
    main()