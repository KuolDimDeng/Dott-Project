"""
Unified Business Types Configuration
This is the single source of truth for all business types across the application.
Used by: PlaceholderBusiness, BusinessListing, UserProfile, BusinessDetails
"""

# Comprehensive business type choices - used everywhere
BUSINESS_TYPE_CHOICES = [
    # Service Businesses (Jobs only)
    ('HOME_SERVICES', 'Home Services (Plumbing, Electrical, HVAC)'),
    ('CONSTRUCTION', 'Construction & Contracting'),
    ('CLEANING', 'Cleaning & Maintenance'),
    ('AUTOMOTIVE_REPAIR', 'Automotive Repair'),
    ('PROFESSIONAL_SERVICES', 'Professional Services (Consulting, Accounting, Legal)'),
    ('CREATIVE_SERVICES', 'Creative Services (Design, Photography)'),
    ('EDUCATION_TRAINING', 'Education & Training Centers'),
    ('EVENT_PLANNING', 'Event Planning & Catering'),
    ('SECURITY_SERVICES', 'Security Services'),
    
    # Retail Businesses (POS only)
    ('RETAIL_STORE', 'Retail Store'),
    ('RESTAURANT_CAFE', 'Restaurant/Cafe'),
    ('GROCERY_MARKET', 'Grocery/Market'),
    ('PHARMACY', 'Pharmacy'),
    ('ONLINE_STORE', 'Online Store'),
    ('FASHION_CLOTHING', 'Fashion & Clothing'),
    ('ELECTRONICS_TECH', 'Electronics & Technology'),
    ('HARDWARE_BUILDING', 'Hardware & Building Supplies'),
    ('BOOKSTORE_STATIONERY', 'Bookstore & Stationery'),
    ('FUEL_STATION', 'Fuel/Petrol Station'),
    
    # Mixed Businesses (Both Jobs & POS)
    ('SALON_SPA', 'Salon/Spa'),
    ('MEDICAL_DENTAL', 'Medical/Dental Practice'),
    ('VETERINARY', 'Veterinary Clinic'),
    ('FITNESS_CENTER', 'Fitness Center'),
    ('AUTO_PARTS_REPAIR', 'Auto Parts & Repair'),
    ('WAREHOUSE_STORAGE', 'Warehouse/Storage'),
    ('MANUFACTURING', 'Manufacturing'),
    ('HOTEL_HOSPITALITY', 'Hotel & Hospitality'),
    ('TECH_SERVICES', 'Technology Services & Repair'),
    ('PRINT_MEDIA', 'Printing & Media Services'),
    ('MOBILE_MONEY', 'Mobile Money & Transfers'),
    
    # Other (Both features)
    ('LOGISTICS_FREIGHT', 'Logistics & Freight'),
    ('FINANCIAL_SERVICES', 'Financial Services (Banks, Insurance)'),
    ('REAL_ESTATE', 'Real Estate'),
    ('AGRICULTURE', 'Agriculture'),
    ('NON_PROFIT', 'Non-Profit'),
    ('TRANSPORT_SERVICE', 'Transport Services (Taxi, Bus, Airlines)'),
    ('MINING_ENERGY', 'Mining & Energy'),
    ('TOURISM_TRAVEL', 'Tourism & Travel Agencies'),
    ('IMPORT_EXPORT', 'Import/Export & Trading'),
    ('TELECOM', 'Telecommunications'),
    ('OTHER', 'Other'),
]

# Business categories for feature access control
BUSINESS_CATEGORIES = {
    'SERVICE': {
        'label': 'Service Businesses',
        'features': ['jobs'],
        'types': [
            'HOME_SERVICES',
            'CONSTRUCTION',
            'CLEANING',
            'AUTOMOTIVE_REPAIR',
            'PROFESSIONAL_SERVICES',
            'CREATIVE_SERVICES',
            'EDUCATION_TRAINING',
            'EVENT_PLANNING',
            'SECURITY_SERVICES',
        ]
    },
    'RETAIL': {
        'label': 'Retail Businesses',
        'features': ['pos'],
        'types': [
            'RETAIL_STORE',
            'RESTAURANT_CAFE',
            'GROCERY_MARKET',
            'PHARMACY',
            'ONLINE_STORE',
            'FASHION_CLOTHING',
            'ELECTRONICS_TECH',
            'HARDWARE_BUILDING',
            'BOOKSTORE_STATIONERY',
            'FUEL_STATION',
        ]
    },
    'MIXED': {
        'label': 'Mixed Businesses',
        'features': ['jobs', 'pos'],
        'types': [
            'SALON_SPA',
            'MEDICAL_DENTAL',
            'VETERINARY',
            'FITNESS_CENTER',
            'AUTO_PARTS_REPAIR',
            'WAREHOUSE_STORAGE',
            'MANUFACTURING',
            'HOTEL_HOSPITALITY',
            'TECH_SERVICES',
            'PRINT_MEDIA',
            'MOBILE_MONEY',
        ]
    },
    'OTHER': {
        'label': 'Other',
        'features': ['jobs', 'pos'],
        'types': [
            'LOGISTICS_FREIGHT',
            'FINANCIAL_SERVICES',
            'REAL_ESTATE',
            'AGRICULTURE',
            'NON_PROFIT',
            'TRANSPORT_SERVICE',
            'MINING_ENERGY',
            'TOURISM_TRAVEL',
            'IMPORT_EXPORT',
            'TELECOM',
            'OTHER',
        ]
    }
}

def get_features_for_business_type(business_type):
    """Get enabled features for a business type"""
    if not business_type:
        return ['jobs', 'pos']  # Default to all features
    
    for category, config in BUSINESS_CATEGORIES.items():
        if business_type in config['types']:
            return config['features']
    
    return ['jobs', 'pos']  # Default to all features

def get_category_for_business_type(business_type):
    """Get category (SERVICE/RETAIL/MIXED/OTHER) for a business type"""
    if not business_type:
        return 'OTHER'
    
    for category, config in BUSINESS_CATEGORIES.items():
        if business_type in config['types']:
            return category
    
    return 'OTHER'

def get_simplified_business_type(business_type):
    """Compatibility function - returns the business type itself"""
    valid_types = [choice[0] for choice in BUSINESS_TYPE_CHOICES]
    return business_type if business_type in valid_types else 'OTHER'

# Mapping from old categories to new business types
# Used for migrating existing data
OLD_CATEGORY_MAPPING = {
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
    
    # Old BusinessListing categories mapping
    'RESTAURANT': 'RESTAURANT_CAFE',
    'CAFE': 'RESTAURANT_CAFE',
    'GROCERY': 'GROCERY_MARKET',
    'PHARMACY': 'PHARMACY',
    'RETAIL': 'RETAIL_STORE',
    'FASHION': 'FASHION_CLOTHING',
    'ELECTRONICS': 'ELECTRONICS_TECH',
    'HOME_GARDEN': 'RETAIL_STORE',
    'BEAUTY': 'SALON_SPA',
    'HEALTH': 'MEDICAL_DENTAL',
    'FITNESS': 'FITNESS_CENTER',
    'AUTOMOTIVE': 'AUTO_PARTS_REPAIR',
    'SERVICES': 'PROFESSIONAL_SERVICES',
    'EDUCATION': 'EDUCATION_TRAINING',
    'ENTERTAINMENT': 'EVENT_PLANNING',
    'OTHER': 'OTHER',
}

def migrate_old_category(old_category):
    """
    Convert old category names to new business type
    Returns the new business type or 'OTHER' if no mapping found
    """
    if not old_category:
        return 'OTHER'
    
    # Check if already a valid business type
    valid_types = [choice[0] for choice in BUSINESS_TYPE_CHOICES]
    if old_category in valid_types:
        return old_category
    
    # Try direct mapping
    old_category_lower = old_category.lower() if isinstance(old_category, str) else ''
    if old_category_lower in OLD_CATEGORY_MAPPING:
        return OLD_CATEGORY_MAPPING[old_category_lower]
    
    # Try uppercase version (for BusinessListing categories)
    if old_category in OLD_CATEGORY_MAPPING:
        return OLD_CATEGORY_MAPPING[old_category]
    
    # Try partial matching
    for key, value in OLD_CATEGORY_MAPPING.items():
        if key in old_category_lower or old_category_lower in key:
            return value
    
    return 'OTHER'