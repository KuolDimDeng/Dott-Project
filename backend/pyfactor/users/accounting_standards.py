# Accounting Standards by Country
# Based on official adoption as of 2025

# Countries that use US GAAP
GAAP_COUNTRIES = {
    'US',  # United States
    'PR',  # Puerto Rico
    'GU',  # Guam
    'VI',  # US Virgin Islands
    'AS',  # American Samoa
    'MP',  # Northern Mariana Islands
    'UM',  # US Minor Outlying Islands
}

# Countries that allow both IFRS and local GAAP (user can choose)
DUAL_STANDARD_COUNTRIES = {
    'JP',  # Japan (J-GAAP or IFRS)
    'IN',  # India (Ind AS based on IFRS or local)
    'CN',  # China (CAS or IFRS for some companies)
    'CH',  # Switzerland (Swiss GAAP FER or IFRS)
    'BM',  # Bermuda (allows both)
    'KY',  # Cayman Islands (allows both)
}

def get_default_accounting_standard(country_code):
    """
    Determine the default accounting standard based on country.
    
    Args:
        country_code: ISO 2-letter country code (e.g., 'US', 'KE', 'NG')
    
    Returns:
        'GAAP' for US and territories
        'IFRS' for all other countries (166+ countries)
    """
    if not country_code:
        return 'IFRS'  # Default to IFRS if no country
    
    # US and territories use GAAP
    if country_code.upper() in GAAP_COUNTRIES:
        return 'GAAP'
    
    # Everyone else uses IFRS (including dual-standard countries default to IFRS)
    return 'IFRS'

def is_dual_standard_country(country_code):
    """Check if country allows both standards"""
    return country_code and country_code.upper() in DUAL_STANDARD_COUNTRIES

def get_accounting_standard_display(standard, country_code=None):
    """Get display text for accounting standard"""
    if standard == 'GAAP':
        return 'US GAAP'
    elif standard == 'IFRS':
        # Show regional variation if applicable
        if country_code == 'IN':
            return 'IFRS (Ind AS)'
        elif country_code == 'CN':
            return 'IFRS (CAS)'
        return 'IFRS (International)'
    return standard

# Accounting standard descriptions for UI
ACCOUNTING_STANDARD_INFO = {
    'IFRS': {
        'name': 'IFRS (International Financial Reporting Standards)',
        'description': 'Used in 166+ countries worldwide',
        'regions': 'Europe, Africa, Asia, Middle East, Oceania, Latin America',
        'key_differences': [
            'Inventory: FIFO and weighted average only (no LIFO)',
            'Development costs: Can be capitalized if criteria met',
            'Asset revaluation: Allowed for property, plant & equipment',
            'Component depreciation: Required',
            'Statement names: Common names like "Balance Sheet" are permitted'
        ]
    },
    'GAAP': {
        'name': 'US GAAP (Generally Accepted Accounting Principles)',
        'description': 'Required for US companies',
        'regions': 'United States and territories',
        'key_differences': [
            'Inventory: LIFO, FIFO, and weighted average allowed',
            'Development costs: Must be expensed (except software)',
            'Asset revaluation: Not allowed (historical cost only)',
            'Component depreciation: Permitted but not required',
            'Statement names: Standard US naming conventions'
        ]
    }
}