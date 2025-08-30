"""
MTN MoMo Country Configuration
Add new countries here as you get approved
"""

MTN_COUNTRY_CONFIG = {
    # Uganda
    '256': {
        'country': 'Uganda',
        'currency': 'UGX',
        'min_amount': 500,
        'max_amount': 5000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.ug',
        'phone_regex': r'^256[37]\d{8}$',
        'enabled': False  # Set to True when you have credentials
    },
    
    # Ghana
    '233': {
        'country': 'Ghana', 
        'currency': 'GHS',
        'min_amount': 1,
        'max_amount': 10000,
        'api_endpoint': 'https://proxy.momoapi.mtn.gh',
        'phone_regex': r'^233[235]\d{8}$',
        'enabled': False
    },
    
    # South Africa
    '27': {
        'country': 'South Africa',
        'currency': 'ZAR',
        'min_amount': 10,
        'max_amount': 50000,
        'api_endpoint': 'https://proxy.momoapi.mtn.za',
        'phone_regex': r'^27[67]\d{8}$',
        'enabled': False
    },
    
    # Cameroon
    '237': {
        'country': 'Cameroon',
        'currency': 'XAF',
        'min_amount': 100,
        'max_amount': 1000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.cm',
        'phone_regex': r'^237[26]\d{8}$',
        'enabled': False
    },
    
    # Ivory Coast
    '225': {
        'country': 'Ivory Coast',
        'currency': 'XOF',
        'min_amount': 100,
        'max_amount': 1000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.ci',
        'phone_regex': r'^225[0457]\d{8}$',
        'enabled': False
    },
    
    # Rwanda
    '250': {
        'country': 'Rwanda',
        'currency': 'RWF',
        'min_amount': 100,
        'max_amount': 1000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.rw',
        'phone_regex': r'^250[37]\d{8}$',
        'enabled': False
    },
    
    # Zambia
    '260': {
        'country': 'Zambia',
        'currency': 'ZMW',
        'min_amount': 1,
        'max_amount': 20000,
        'api_endpoint': 'https://proxy.momoapi.mtn.zm',
        'phone_regex': r'^260[79]\d{8}$',
        'enabled': False
    },
    
    # Nigeria
    '234': {
        'country': 'Nigeria',
        'currency': 'NGN',
        'min_amount': 50,
        'max_amount': 500000,
        'api_endpoint': 'https://proxy.momoapi.mtn.ng',
        'phone_regex': r'^234[789]\d{9}$',
        'enabled': False
    },
    
    # Benin
    '229': {
        'country': 'Benin',
        'currency': 'XOF',
        'min_amount': 100,
        'max_amount': 1000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.bj',
        'phone_regex': r'^229[69]\d{7}$',
        'enabled': False
    },
    
    # Guinea
    '224': {
        'country': 'Guinea',
        'currency': 'GNF',
        'min_amount': 1000,
        'max_amount': 10000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.gn',
        'phone_regex': r'^224[67]\d{8}$',
        'enabled': False
    },
    
    # Congo
    '242': {
        'country': 'Congo',
        'currency': 'XAF',
        'min_amount': 100,
        'max_amount': 1000000,
        'api_endpoint': 'https://proxy.momoapi.mtn.cg',
        'phone_regex': r'^242[05]\d{8}$',
        'enabled': False
    },
    
    # Liberia
    '231': {
        'country': 'Liberia',
        'currency': 'LRD',
        'min_amount': 10,
        'max_amount': 100000,
        'api_endpoint': 'https://proxy.momoapi.mtn.lr',
        'phone_regex': r'^231[7]\d{7}$',
        'enabled': False
    },
    
    # Sandbox (Testing)
    '467': {
        'country': 'Sandbox',
        'currency': 'EUR',
        'min_amount': 1,
        'max_amount': 100000,
        'api_endpoint': 'https://sandbox.momodeveloper.mtn.com',
        'phone_regex': r'^467\d{8}$',
        'enabled': True  # Always enabled for testing
    }
}

def get_country_config(phone_number: str):
    """Get country configuration based on phone number"""
    # Remove + and spaces
    phone = ''.join(filter(str.isdigit, phone_number))
    
    # Check each country code
    for code, config in MTN_COUNTRY_CONFIG.items():
        if phone.startswith(code):
            return config
    
    return None

def is_mtn_supported(phone_number: str) -> bool:
    """Check if phone number is from a supported MTN country"""
    config = get_country_config(phone_number)
    return config is not None and config['enabled']

def get_supported_countries():
    """Get list of countries where MTN MoMo is enabled"""
    return [
        config for config in MTN_COUNTRY_CONFIG.values() 
        if config['enabled']
    ]

def get_all_countries():
    """Get all MTN countries configuration"""
    return MTN_COUNTRY_CONFIG