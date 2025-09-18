# Business Categories Configuration
# This defines simplified business types for feature access control
# Only applies to users who onboard after 2025-07-26

BUSINESS_CATEGORIES = {
    'SERVICE': {
        'label': 'Service Businesses',
        'features': ['jobs'],
        'types': [
            'HOME_SERVICES',  # Plumbing, Electrical, HVAC
            'CONSTRUCTION',
            'CLEANING',
            'AUTOMOTIVE_REPAIR',
            'PROFESSIONAL_SERVICES',  # Consulting, Accounting, Legal
            'CREATIVE_SERVICES',  # Design, Photography
            'EDUCATION_TRAINING',  # Schools, Tutoring, Training Centers
            'EVENT_PLANNING',  # Event Planning, Catering
            'SECURITY_SERVICES',  # Security Companies
        ]
    },
    'RETAIL': {
        'label': 'Retail Businesses',
        'features': ['pos'],  # Menu feature added dynamically for restaurants
        'types': [
            'RETAIL_STORE',
            'RESTAURANT_CAFE',
            'GROCERY_MARKET',
            'PHARMACY',
            'ONLINE_STORE',
            'FASHION_CLOTHING',  # Clothing, Fashion, Accessories
            'ELECTRONICS_TECH',  # Electronics, Computers, Phones
            'HARDWARE_BUILDING',  # Hardware, Building Supplies
            'BOOKSTORE_STATIONERY',  # Books, Stationery
            'FUEL_STATION',  # Petrol/Gas Stations
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
            'HOTEL_HOSPITALITY',  # Hotels, Lodges, Guest Houses
            'TECH_SERVICES',  # IT Services, Internet Cafes, Phone Repair
            'PRINT_MEDIA',  # Printing, Media, Publishing
            'MOBILE_MONEY',  # Mobile Money, Money Transfer
        ]
    },
    'OTHER': {
        'label': 'Other',
        'features': ['jobs', 'pos'],
        'types': [
            'LOGISTICS_FREIGHT',
            'FINANCIAL_SERVICES',  # Banks, Insurance, Microfinance
            'REAL_ESTATE',
            'AGRICULTURE',
            'NON_PROFIT',
            'TRANSPORT_SERVICE',  # Taxi, Bus, Matatu, Airlines
            'courier',  # Courier delivery services
            'MINING_ENERGY',  # Mining, Oil & Gas, Solar
            'TOURISM_TRAVEL',  # Tour Operators, Travel Agencies
            'IMPORT_EXPORT',  # Import/Export, Trading
            'TELECOM',  # Telecommunications, ISPs
            'OTHER',
        ]
    }
}

# Simplified business type choices for the model
SIMPLIFIED_BUSINESS_TYPES = [
    # Service Businesses (Jobs)
    ('HOME_SERVICES', 'Home Services (Plumbing, Electrical, HVAC)'),
    ('CONSTRUCTION', 'Construction & Contracting'),
    ('CLEANING', 'Cleaning & Maintenance'),
    ('AUTOMOTIVE_REPAIR', 'Automotive Repair'),
    ('PROFESSIONAL_SERVICES', 'Professional Services (Consulting, Accounting, Legal)'),
    ('CREATIVE_SERVICES', 'Creative Services (Design, Photography)'),
    ('EDUCATION_TRAINING', 'Education & Training Centers'),
    ('EVENT_PLANNING', 'Event Planning & Catering'),
    ('SECURITY_SERVICES', 'Security Services'),
    
    # Retail Businesses (POS)
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
    
    # Mixed Businesses (Both)
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
    
    # Other (Both)
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

def get_features_for_business_type(business_type):
    """Get enabled features for a business type"""
    if not business_type:
        return ['jobs', 'pos']  # Default to all features
    
    features = []
    for category, config in BUSINESS_CATEGORIES.items():
        if business_type in config['types']:
            features = config['features'].copy()
            break
    else:
        features = ['jobs', 'pos']  # Default to all features
    
    # Add menu feature for restaurant-type businesses
    if should_show_menu(business_type) and 'menu' not in features:
        features.append('menu')
    
    return features

def get_category_for_business_type(business_type):
    """Get category for a business type"""
    if not business_type:
        return 'OTHER'
    
    for category, config in BUSINESS_CATEGORIES.items():
        if business_type in config['types']:
            return category
    
    return 'OTHER'

def get_simplified_business_type(business_type):
    """Get the simplified business type value for the given business type"""
    # For the simplified types, they map directly to themselves
    # This is used when saving BusinessDetails
    return business_type if business_type in [choice[0] for choice in SIMPLIFIED_BUSINESS_TYPES] else 'OTHER'

def should_show_menu(business_type):
    """
    Determine if Menu feature should be shown for this business type
    Returns True for food service businesses that need menu management
    """
    menu_enabled_types = [
        'RESTAURANT_CAFE',      # Primary target
        'HOTEL_HOSPITALITY',    # Hotels often have restaurants
        'GROCERY_MARKET',       # May have deli/prepared foods
        'EVENT_PLANNING',       # Catering services need menus
        # Future types can be added here:
        # 'BAKERY', 'FOOD_TRUCK', 'BAR_NIGHTCLUB', 'COFFEE_SHOP'
    ]
    return business_type in menu_enabled_types