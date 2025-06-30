"""
PDF Generation System Configuration
"""
from django.conf import settings
import os

# PDF Generation Settings
PDF_GENERATION_CONFIG = {
    # Output settings
    'DEFAULT_PAGE_SIZE': 'letter',  # letter, A4, legal
    'DEFAULT_MARGINS': {
        'top': 0.75,    # inches
        'bottom': 0.5,  # inches
        'left': 0.5,    # inches
        'right': 0.5    # inches
    },
    
    # Font settings
    'DEFAULT_FONT': 'Helvetica',
    'DEFAULT_FONT_SIZE': 10,
    'TITLE_FONT_SIZE': 16,
    'HEADER_FONT_SIZE': 12,
    'FIELD_LABEL_FONT_SIZE': 9,
    'INSTRUCTION_FONT_SIZE': 8,
    
    # Colors (hex codes)
    'COLORS': {
        'BLACK': '#000000',
        'DARK_GRAY': '#666666',
        'LIGHT_GRAY': '#CCCCCC',
        'RED': '#FF0000',
        'BLUE': '#0000FF',
        'GREEN': '#008000',
        'DRAFT_WATERMARK': '#FF6666'
    },
    
    # Watermark settings
    'WATERMARK': {
        'DRAFT_TEXT': 'DRAFT',
        'DRAFT_FONT_SIZE': 72,
        'DRAFT_OPACITY': 0.3,
        'DRAFT_ROTATION': 45,
        'CONFIDENTIAL_TEXT': 'CONFIDENTIAL',
        'CONFIDENTIAL_FONT_SIZE': 48,
        'CONFIDENTIAL_OPACITY': 0.2
    },
    
    # Barcode/QR code settings
    'BARCODE': {
        'QR_CODE_SIZE': 1.5,  # inches
        'BARCODE_HEIGHT': 0.5,  # inches
        'BARCODE_WIDTH': 3.0,   # inches
        'ERROR_CORRECTION': 'M'  # L, M, Q, H
    },
    
    # Field settings
    'FIELDS': {
        'TEXT_FIELD_HEIGHT': 20,    # points
        'TEXT_FIELD_WIDTH': 200,    # points
        'CURRENCY_FIELD_WIDTH': 150, # points
        'CHECKBOX_SIZE': 12,        # points
        'SIGNATURE_WIDTH': 216,     # points (3 inches)
        'SIGNATURE_HEIGHT': 54,     # points (0.75 inches)
        'MAX_TEXT_LENGTH': 100,
        'MAX_CURRENCY_LENGTH': 20
    },
    
    # Security settings
    'SECURITY': {
        'ENABLE_PASSWORD_PROTECTION': False,
        'DEFAULT_USER_PASSWORD': None,
        'DEFAULT_OWNER_PASSWORD': None,
        'ENABLE_DIGITAL_SIGNATURES': True,
        'CALCULATE_CHECKSUMS': True
    },
    
    # Form-specific settings
    'FORMS': {
        '941': {
            'TITLE': "Employer's Quarterly Federal Tax Return",
            'QUARTERS': [1, 2, 3, 4],
            'FILING_FREQUENCY': 'quarterly',
            'REQUIRED_SCHEDULES': [],
            'OPTIONAL_SCHEDULES': ['schedule_b', 'schedule_r']
        },
        '940': {
            'TITLE': "Employer's Annual Federal Unemployment (FUTA) Tax Return",
            'FILING_FREQUENCY': 'annual',
            'REQUIRED_SCHEDULES': [],
            'OPTIONAL_SCHEDULES': ['schedule_a']
        },
        'STATE_SALES': {
            'TITLE': 'Sales and Use Tax Return',
            'FILING_FREQUENCY': 'varies',
            'STATE_SPECIFIC': True,
            'REQUIRED_FIELDS': ['gross_sales', 'taxable_sales', 'tax_rate']
        }
    },
    
    # State tax rates (fallback values)
    'STATE_TAX_RATES': {
        'AL': 4.0, 'AK': 0.0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25,
        'CO': 2.9, 'CT': 6.35, 'DE': 0.0, 'FL': 6.0, 'GA': 4.0,
        'HI': 4.0, 'ID': 6.0, 'IL': 6.25, 'IN': 7.0, 'IA': 6.0,
        'KS': 6.5, 'KY': 6.0, 'LA': 4.45, 'ME': 5.5, 'MD': 6.0,
        'MA': 6.25, 'MI': 6.0, 'MN': 6.875, 'MS': 7.0, 'MO': 4.225,
        'MT': 0.0, 'NE': 5.5, 'NV': 6.85, 'NH': 0.0, 'NJ': 6.625,
        'NM': 5.125, 'NY': 4.0, 'NC': 4.75, 'ND': 5.0, 'OH': 5.75,
        'OK': 4.5, 'OR': 0.0, 'PA': 6.0, 'RI': 7.0, 'SC': 6.0,
        'SD': 4.5, 'TN': 7.0, 'TX': 6.25, 'UT': 6.1, 'VT': 6.0,
        'VA': 5.3, 'WA': 6.5, 'WV': 6.0, 'WI': 5.0, 'WY': 4.0
    },
    
    # Tax calculation constants
    'TAX_RATES': {
        'SOCIAL_SECURITY': {
            'RATE': 0.124,  # 6.2% employee + 6.2% employer
            'WAGE_BASE_2023': 160200,
            'WAGE_BASE_2024': 168600
        },
        'MEDICARE': {
            'RATE': 0.029,  # 1.45% employee + 1.45% employer
            'ADDITIONAL_RATE': 0.009,  # 0.9% additional on high earners
            'ADDITIONAL_THRESHOLD_SINGLE': 200000,
            'ADDITIONAL_THRESHOLD_MARRIED_JOINT': 250000,
            'ADDITIONAL_THRESHOLD_MARRIED_SEPARATE': 125000
        },
        'FUTA': {
            'RATE': 0.006,  # 0.6% (6.0% - 5.4% credit)
            'WAGE_BASE': 7000,  # per employee
            'CREDIT_RATE': 0.054  # 5.4% credit for state unemployment taxes
        }
    },
    
    # File storage settings
    'STORAGE': {
        'TEMP_DIR': getattr(settings, 'TEMP_ROOT', '/tmp'),
        'OUTPUT_DIR': getattr(settings, 'PDF_OUTPUT_DIR', '/tmp/tax_forms'),
        'MAX_FILE_SIZE': 50 * 1024 * 1024,  # 50MB
        'CLEANUP_AGE_HOURS': 24,
        'ALLOWED_EXTENSIONS': ['.pdf'],
        'FILENAME_FORMAT': '{form_type}_{period}_{timestamp}'
    },
    
    # Performance settings
    'PERFORMANCE': {
        'MAX_PAGES_PER_FORM': 50,
        'MAX_FORMS_PER_BATCH': 100,
        'GENERATION_TIMEOUT': 300,  # seconds
        'CACHE_TEMPLATES': True,
        'OPTIMIZE_IMAGES': True
    },
    
    # Validation settings
    'VALIDATION': {
        'STRICT_MODE': False,
        'REQUIRE_ALL_OPTIONAL_FIELDS': False,
        'VALIDATE_CALCULATIONS': True,
        'TOLERANCE': 0.01,  # cents
        'MAX_VALIDATION_ERRORS': 50
    },
    
    # API settings
    'API': {
        'MAX_REQUEST_SIZE': 10 * 1024 * 1024,  # 10MB
        'RATE_LIMIT_PER_MINUTE': 60,
        'ENABLE_BULK_GENERATION': True,
        'MAX_BULK_FORMS': 25,
        'ASYNC_GENERATION_THRESHOLD': 5,  # forms
        'RESPONSE_FORMAT': 'pdf'  # pdf, base64, url
    },
    
    # Debug settings
    'DEBUG': {
        'SAVE_INTERMEDIATE_FILES': getattr(settings, 'DEBUG', False),
        'LOG_GENERATION_TIME': True,
        'INCLUDE_DEBUG_INFO': getattr(settings, 'DEBUG', False),
        'VERBOSE_ERRORS': getattr(settings, 'DEBUG', False)
    }
}

# Environment-specific overrides
if hasattr(settings, 'PDF_GENERATION_SETTINGS'):
    PDF_GENERATION_CONFIG.update(settings.PDF_GENERATION_SETTINGS)

# Create output directory if it doesn't exist
output_dir = PDF_GENERATION_CONFIG['STORAGE']['OUTPUT_DIR']
if not os.path.exists(output_dir):
    try:
        os.makedirs(output_dir, exist_ok=True)
    except OSError:
        # Fall back to temp directory
        PDF_GENERATION_CONFIG['STORAGE']['OUTPUT_DIR'] = PDF_GENERATION_CONFIG['STORAGE']['TEMP_DIR']


def get_config(key_path: str, default=None):
    """
    Get configuration value using dot notation
    Example: get_config('COLORS.BLACK') returns '#000000'
    """
    keys = key_path.split('.')
    value = PDF_GENERATION_CONFIG
    
    try:
        for key in keys:
            value = value[key]
        return value
    except (KeyError, TypeError):
        return default


def get_form_config(form_type: str, key: str = None, default=None):
    """
    Get form-specific configuration
    """
    form_config = PDF_GENERATION_CONFIG['FORMS'].get(form_type, {})
    
    if key is None:
        return form_config
    
    return form_config.get(key, default)


def get_state_tax_rate(state_code: str) -> float:
    """
    Get state tax rate by state code
    """
    return PDF_GENERATION_CONFIG['STATE_TAX_RATES'].get(state_code.upper(), 0.0)


def is_debug_mode() -> bool:
    """
    Check if debug mode is enabled
    """
    return PDF_GENERATION_CONFIG['DEBUG'].get('SAVE_INTERMEDIATE_FILES', False)


def get_tax_rate(tax_type: str, year: int = None) -> dict:
    """
    Get tax rates for specific tax type and year
    """
    tax_rates = PDF_GENERATION_CONFIG['TAX_RATES']
    
    if tax_type.upper() not in tax_rates:
        return {}
    
    rates = tax_rates[tax_type.upper()].copy()
    
    # Apply year-specific adjustments if needed
    if year and tax_type.upper() == 'SOCIAL_SECURITY':
        if year == 2024:
            rates['WAGE_BASE'] = rates['WAGE_BASE_2024']
        else:
            rates['WAGE_BASE'] = rates['WAGE_BASE_2023']
    
    return rates