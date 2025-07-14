/**
 * WhatsApp Business Country Detection Utility
 * Determines if WhatsApp Business should be shown based on country
 */

// Countries where WhatsApp is NOT primarily used for business
// These countries will have WhatsApp Business hidden by default with settings toggle
const NON_WHATSAPP_BUSINESS_COUNTRIES = [
  // North America
  'US', 'CA',
  
  // Europe (Major Markets)
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'IE', 'PT',
  'DK', 'SE', 'NO', 'FI', 'IS', 'LU', 'MT', 'CY',
  
  // Eastern Europe
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'LT', 'LV', 'EE',
  'GR', 'RS', 'BA', 'MK', 'AL', 'ME', 'MD', 'UA', 'BY', 'RU',
  
  // East Asia
  'CN', 'JP', 'KR', 'TW', 'HK', 'MO', 'MN',
  
  // Oceania
  'AU', 'NZ', 'PG', 'FJ', 'NC', 'PF', 'GU', 'AS', 'WS', 'TO', 'VU',
  'SB', 'FM', 'MH', 'KI', 'TV', 'NR', 'PW'
];

// Countries where WhatsApp is primarily used for business
// These countries will show WhatsApp Business by default in main menu
const WHATSAPP_BUSINESS_COUNTRIES = [
  // Africa
  'NG', 'ZA', 'KE', 'GH', 'EG', 'MA', 'TN', 'DZ', 'ET', 'UG', 'TZ', 'ZW',
  'ZM', 'BW', 'MW', 'MZ', 'AO', 'CM', 'CI', 'SN', 'ML', 'BF', 'NE', 'TD',
  'GN', 'RW', 'BI', 'TG', 'BJ', 'LR', 'SL', 'GW', 'GM', 'CV', 'ST', 'GQ',
  'DJ', 'ER', 'SO', 'SS', 'SD', 'LY', 'MR', 'MG', 'KM', 'SC', 'MU', 'LS',
  'SZ', 'NA', 'CF', 'CG', 'CD', 'GA',
  
  // Latin America
  'BR', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'NI', 'CR', 'PA', 'UY', 'JM', 'TT', 'GY', 'SR', 'BZ', 'BB',
  'BS', 'BM', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'HT', 'SV',
  
  // Middle East
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ', 'YE', 'PS',
  'IL', 'TR', 'IR', 'AF', 'PK',
  
  // South Asia
  'IN', 'BD', 'LK', 'NP', 'BT', 'MV',
  
  // Southeast Asia
  'ID', 'MY', 'TH', 'PH', 'VN', 'SG', 'MM', 'KH', 'LA', 'BN', 'TL',
  
  // Other regions with high WhatsApp business usage
  'RU', 'UA', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AM', 'AZ', 'GE'
];

/**
 * Check if a country primarily uses WhatsApp for business
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {boolean} - True if country uses WhatsApp for business
 */
export function isWhatsAppBusinessCountry(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  
  const upperCountryCode = countryCode.toUpperCase();
  return WHATSAPP_BUSINESS_COUNTRIES.includes(upperCountryCode);
}

/**
 * Check if a country does NOT primarily use WhatsApp for business
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {boolean} - True if country does not use WhatsApp for business
 */
export function isNonWhatsAppBusinessCountry(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  
  const upperCountryCode = countryCode.toUpperCase();
  return NON_WHATSAPP_BUSINESS_COUNTRIES.includes(upperCountryCode);
}

/**
 * Get WhatsApp Business visibility setting for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {object} - Object with visibility settings
 */
export function getWhatsAppBusinessVisibility(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return {
      showInMenu: false,
      showInSettings: true,
      defaultEnabled: false,
      reason: 'No country code provided'
    };
  }
  
  const upperCountryCode = countryCode.toUpperCase();
  
  if (isWhatsAppBusinessCountry(upperCountryCode)) {
    return {
      showInMenu: true,
      showInSettings: true,
      defaultEnabled: true,
      reason: 'WhatsApp is popular for business in this country',
      badge: 'Popular'
    };
  }
  
  if (isNonWhatsAppBusinessCountry(upperCountryCode)) {
    return {
      showInMenu: false,
      showInSettings: true,
      defaultEnabled: false,
      reason: 'WhatsApp is less common for business in this country',
      badge: 'New'
    };
  }
  
  // Default for countries not in either list
  return {
    showInMenu: true,
    showInSettings: true,
    defaultEnabled: true,
    reason: 'Default WhatsApp Business availability',
    badge: 'Available'
  };
}

/**
 * Get appropriate payment method for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {object} - Object with payment method information
 */
export function getWhatsAppPaymentMethod(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return {
      primary: 'card',
      methods: ['card'],
      currency: 'USD',
      localPayment: null
    };
  }
  
  const upperCountryCode = countryCode.toUpperCase();
  
  // Country-specific payment methods
  const paymentMethods = {
    'KE': {
      primary: 'mpesa',
      methods: ['mpesa', 'card'],
      currency: 'KES',
      localPayment: 'M-Pesa'
    },
    'NG': {
      primary: 'card',
      methods: ['card', 'flutterwave'],
      currency: 'NGN',
      localPayment: 'Flutterwave'
    },
    'GH': {
      primary: 'card',
      methods: ['card', 'mtn_mobile_money'],
      currency: 'GHS',
      localPayment: 'MTN Mobile Money'
    },
    'UG': {
      primary: 'card',
      methods: ['card', 'mtn_mobile_money'],
      currency: 'UGX',
      localPayment: 'MTN Mobile Money'
    },
    'RW': {
      primary: 'card',
      methods: ['card', 'mtn_mobile_money'],
      currency: 'RWF',
      localPayment: 'MTN Mobile Money'
    },
    'TZ': {
      primary: 'card',
      methods: ['card', 'mpesa'],
      currency: 'TZS',
      localPayment: 'M-Pesa'
    }
  };
  
  // Return country-specific payment method or default
  return paymentMethods[upperCountryCode] || {
    primary: 'card',
    methods: ['card'],
    currency: 'USD',
    localPayment: null
  };
}

/**
 * Get localized WhatsApp Business features for a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {object} - Object with localized features
 */
export function getWhatsAppBusinessFeatures(countryCode) {
  const visibility = getWhatsAppBusinessVisibility(countryCode);
  const paymentMethod = getWhatsAppPaymentMethod(countryCode);
  
  return {
    ...visibility,
    payment: paymentMethod,
    features: {
      catalogSharing: true,
      orderManagement: true,
      paymentProcessing: true,
      customerSupport: true,
      analytics: true
    }
  };
}

/**
 * Get country list for WhatsApp Business
 * @returns {object} - Object with country lists
 */
export function getWhatsAppBusinessCountryLists() {
  return {
    businessCountries: WHATSAPP_BUSINESS_COUNTRIES,
    nonBusinessCountries: NON_WHATSAPP_BUSINESS_COUNTRIES,
    totalSupported: WHATSAPP_BUSINESS_COUNTRIES.length + NON_WHATSAPP_BUSINESS_COUNTRIES.length
  };
}

/**
 * Check if WhatsApp Business is supported in a country
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {boolean} - True if WhatsApp Business is supported
 */
export function isWhatsAppBusinessSupported(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  
  const upperCountryCode = countryCode.toUpperCase();
  return WHATSAPP_BUSINESS_COUNTRIES.includes(upperCountryCode) || 
         NON_WHATSAPP_BUSINESS_COUNTRIES.includes(upperCountryCode);
}

export default {
  isWhatsAppBusinessCountry,
  isNonWhatsAppBusinessCountry,
  getWhatsAppBusinessVisibility,
  getWhatsAppPaymentMethod,
  getWhatsAppBusinessFeatures,
  getWhatsAppBusinessCountryLists,
  isWhatsAppBusinessSupported
};