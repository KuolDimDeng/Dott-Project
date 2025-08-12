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
            'PROFESSIONAL_SERVICES',  # Consulting, Accounting
            'CREATIVE_SERVICES',  # Design, Photography
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
    ('PROFESSIONAL_SERVICES', 'Professional Services (Consulting, Accounting)'),
    ('CREATIVE_SERVICES', 'Creative Services (Design, Photography)'),
    
    # Retail Businesses (POS)
    ('RETAIL_STORE', 'Retail Store'),
    ('RESTAURANT_CAFE', 'Restaurant/Cafe'),
    ('GROCERY_MARKET', 'Grocery/Market'),
    ('PHARMACY', 'Pharmacy'),
    ('ONLINE_STORE', 'Online Store'),
    
    # Mixed Businesses (Both)
    ('SALON_SPA', 'Salon/Spa'),
    ('MEDICAL_DENTAL', 'Medical/Dental Practice'),
    ('VETERINARY', 'Veterinary Clinic'),
    ('FITNESS_CENTER', 'Fitness Center'),
    ('AUTO_PARTS_REPAIR', 'Auto Parts & Repair'),
    ('WAREHOUSE_STORAGE', 'Warehouse/Storage'),
    ('MANUFACTURING', 'Manufacturing'),
    
    # Other (Both)
    ('LOGISTICS_FREIGHT', 'Logistics & Freight'),
    ('FINANCIAL_SERVICES', 'Financial Services'),
    ('REAL_ESTATE', 'Real Estate'),
    ('AGRICULTURE', 'Agriculture'),
    ('NON_PROFIT', 'Non-Profit'),
    ('OTHER', 'Other'),
]

def get_features_for_business_type(business_type):
    """Get enabled features for a business type"""
    if not business_type:
        return ['jobs', 'pos']  # Default to all features
    
    for category, config in BUSINESS_CATEGORIES.items():
        if business_type in config['types']:
            return config['features']
    
    return ['jobs', 'pos']  # Default to all features

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