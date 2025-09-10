/**
 * Country-Specific Configuration System
 * Provides adaptive features, payment methods, and localization per country
 * Note: Core business features remain universal across all countries
 */

// Payment method configurations with priority order
const PAYMENT_METHODS = {
  CASH: {
    id: 'cash',
    name: 'Cash',
    icon: 'cash-outline',
    color: '#10b981',
    type: 'offline'
  },
  QR_CODE: {
    id: 'qr',
    name: 'QR Payment',
    icon: 'qr-code-outline',
    color: '#3b82f6',
    type: 'digital'
  },
  MTN_MONEY: {
    id: 'mtn',
    name: 'MTN Mobile Money',
    icon: 'phone-portrait-outline',
    color: '#f59e0b',
    type: 'mobile_money'
  },
  CARD: {
    id: 'card',
    name: 'Card Payment',
    icon: 'card-outline',
    color: '#ef4444',
    type: 'card'
  },
  MPESA: {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: 'phone-portrait-outline',
    color: '#10b981',
    type: 'mobile_money'
  },
  AIRTEL_MONEY: {
    id: 'airtel',
    name: 'Airtel Money',
    icon: 'phone-portrait-outline',
    color: '#ef4444',
    type: 'mobile_money'
  },
  ORANGE_MONEY: {
    id: 'orange',
    name: 'Orange Money',
    icon: 'phone-portrait-outline',
    color: '#f97316',
    type: 'mobile_money'
  },
  TIGOCASH: {
    id: 'tigo',
    name: 'Tigo Cash',
    icon: 'phone-portrait-outline',
    color: '#3b82f6',
    type: 'mobile_money'
  },
  BANK_TRANSFER: {
    id: 'bank',
    name: 'Bank Transfer',
    icon: 'business-outline',
    color: '#6b7280',
    type: 'bank'
  }
};

// Delivery vehicle types
const VEHICLE_TYPES = {
  MOTORCYCLE: {
    id: 'motorcycle',
    name: 'Motorcycle',
    icon: 'bicycle-outline',
    color: '#ef4444',
    speed: 'fast',
    capacity: 'small'
  },
  BICYCLE: {
    id: 'bicycle',
    name: 'Bicycle',
    icon: 'bicycle-outline',
    color: '#10b981',
    speed: 'medium',
    capacity: 'small'
  },
  CAR: {
    id: 'car',
    name: 'Car',
    icon: 'car-outline',
    color: '#3b82f6',
    speed: 'fast',
    capacity: 'medium'
  },
  TUKTUK: {
    id: 'tuktuk',
    name: 'Tuk-Tuk',
    icon: 'car-outline',
    color: '#f59e0b',
    speed: 'medium',
    capacity: 'small'
  },
  VAN: {
    id: 'van',
    name: 'Van',
    icon: 'bus-outline',
    color: '#8b5cf6',
    speed: 'medium',
    capacity: 'large'
  },
  TRUCK: {
    id: 'truck',
    name: 'Truck',
    icon: 'bus-outline',
    color: '#6b7280',
    speed: 'slow',
    capacity: 'large'
  }
};

// Country-specific configurations
export const COUNTRY_CONFIGURATIONS = {
  'SS': { // South Sudan
    name: 'South Sudan',
    currency: {
      code: 'SSP',
      symbol: 'SSP',
      name: 'South Sudanese Pound'
    },
    paymentMethods: [
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.QR_CODE,
      PAYMENT_METHODS.MTN_MONEY,
      PAYMENT_METHODS.CARD
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.TUKTUK
    ],
    phoneFormat: '+211 XXX XXX XXX',
    languages: ['en', 'ar'],
    primaryLanguage: 'en',
    addressFormat: {
      format: '{street}, {city}, {state}',
      requiresPostalCode: false
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Juba'
    }
  },

  'KE': { // Kenya
    name: 'Kenya',
    currency: {
      code: 'KES',
      symbol: 'KSh',
      name: 'Kenyan Shilling'
    },
    paymentMethods: [
      PAYMENT_METHODS.MPESA,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.AIRTEL_MONEY
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.VAN
    ],
    phoneFormat: '+254 XXX XXX XXX',
    languages: ['en', 'sw'],
    primaryLanguage: 'en',
    addressFormat: {
      format: '{street}, {city}, {county}',
      requiresPostalCode: true
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Nairobi'
    }
  },

  'UG': { // Uganda
    name: 'Uganda',
    currency: {
      code: 'UGX',
      symbol: 'USh',
      name: 'Ugandan Shilling'
    },
    paymentMethods: [
      PAYMENT_METHODS.MTN_MONEY,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.AIRTEL_MONEY,
      PAYMENT_METHODS.CARD
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.VAN
    ],
    phoneFormat: '+256 XXX XXX XXX',
    languages: ['en'],
    primaryLanguage: 'en',
    addressFormat: {
      format: '{street}, {city}, {district}',
      requiresPostalCode: false
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Kampala'
    }
  },

  'TZ': { // Tanzania
    name: 'Tanzania',
    currency: {
      code: 'TZS',
      symbol: 'TSh',
      name: 'Tanzanian Shilling'
    },
    paymentMethods: [
      PAYMENT_METHODS.TIGOCASH,
      PAYMENT_METHODS.MPESA,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CARD
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.VAN
    ],
    phoneFormat: '+255 XXX XXX XXX',
    languages: ['sw', 'en'],
    primaryLanguage: 'sw',
    addressFormat: {
      format: '{street}, {city}, {region}',
      requiresPostalCode: true
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Dar_es_Salaam'
    }
  },

  'NG': { // Nigeria
    name: 'Nigeria',
    currency: {
      code: 'NGN',
      symbol: '₦',
      name: 'Nigerian Naira'
    },
    paymentMethods: [
      PAYMENT_METHODS.BANK_TRANSFER,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.MTN_MONEY
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.VAN,
      VEHICLE_TYPES.TRUCK
    ],
    phoneFormat: '+234 XXX XXX XXXX',
    languages: ['en'],
    primaryLanguage: 'en',
    addressFormat: {
      format: '{street}, {city}, {state}',
      requiresPostalCode: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Africa/Lagos'
    }
  },

  'GH': { // Ghana
    name: 'Ghana',
    currency: {
      code: 'GHS',
      symbol: 'GH₵',
      name: 'Ghanaian Cedi'
    },
    paymentMethods: [
      PAYMENT_METHODS.MTN_MONEY,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.AIRTEL_MONEY
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.VAN
    ],
    phoneFormat: '+233 XXX XXX XXXX',
    languages: ['en'],
    primaryLanguage: 'en',
    addressFormat: {
      format: '{street}, {city}, {region}',
      requiresPostalCode: false
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Accra'
    }
  },

  'RW': { // Rwanda
    name: 'Rwanda',
    currency: {
      code: 'RWF',
      symbol: 'RF',
      name: 'Rwandan Franc'
    },
    paymentMethods: [
      PAYMENT_METHODS.MTN_MONEY,
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.AIRTEL_MONEY
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.CAR,
      VEHICLE_TYPES.VAN
    ],
    phoneFormat: '+250 XXX XXX XXX',
    languages: ['rw', 'en', 'fr'],
    primaryLanguage: 'rw',
    addressFormat: {
      format: '{street}, {city}, {province}',
      requiresPostalCode: false
    },
    businessHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'Africa/Kigali'
    }
  }
};

// Default fallback configuration
const DEFAULT_CONFIG = {
  name: 'Default',
  currency: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  },
  paymentMethods: [
    PAYMENT_METHODS.CASH,
    PAYMENT_METHODS.CARD,
    PAYMENT_METHODS.BANK_TRANSFER
  ],
  vehicleTypes: [
    VEHICLE_TYPES.CAR,
    VEHICLE_TYPES.MOTORCYCLE,
    VEHICLE_TYPES.BICYCLE
  ],
  phoneFormat: '+X XXX XXX XXXX',
  languages: ['en'],
  primaryLanguage: 'en',
  addressFormat: {
    format: '{street}, {city}, {state}',
    requiresPostalCode: true
  },
  businessHours: {
    start: '09:00',
    end: '17:00',
    timezone: 'UTC'
  }
};

/**
 * Get country configuration by country code
 */
export const getCountryConfig = (countryCode) => {
  return COUNTRY_CONFIGURATIONS[countryCode] || DEFAULT_CONFIG;
};

/**
 * Get payment methods for a specific country
 */
export const getPaymentMethods = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.paymentMethods;
};

/**
 * Get vehicle types for delivery in a specific country
 */
export const getVehicleTypes = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.vehicleTypes;
};

/**
 * Get formatted currency display
 */
export const formatCurrency = (amount, countryCode) => {
  const config = getCountryConfig(countryCode);
  const { symbol, code } = config.currency;
  
  // Format number with appropriate decimal places
  const formattedAmount = typeof amount === 'number' 
    ? amount.toFixed(2) 
    : parseFloat(amount || 0).toFixed(2);
  
  return `${symbol} ${formattedAmount}`;
};

/**
 * Get phone number format for a country
 */
export const getPhoneFormat = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.phoneFormat;
};

/**
 * Get available languages for a country
 */
export const getAvailableLanguages = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.languages;
};

/**
 * Get primary language for a country
 */
export const getPrimaryLanguage = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.primaryLanguage;
};

/**
 * Check if postal code is required for a country
 */
export const isPostalCodeRequired = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.addressFormat.requiresPostalCode;
};

/**
 * Get business hours for a country
 */
export const getBusinessHours = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config.businessHours;
};

/**
 * Get all supported countries
 */
export const getSupportedCountries = () => {
  return Object.keys(COUNTRY_CONFIGURATIONS).map(code => ({
    code,
    name: COUNTRY_CONFIGURATIONS[code].name,
    currency: COUNTRY_CONFIGURATIONS[code].currency
  }));
};

export default {
  COUNTRY_CONFIGURATIONS,
  PAYMENT_METHODS,
  VEHICLE_TYPES,
  getCountryConfig,
  getPaymentMethods,
  getVehicleTypes,
  formatCurrency,
  getPhoneFormat,
  getAvailableLanguages,
  getPrimaryLanguage,
  isPostalCodeRequired,
  getBusinessHours,
  getSupportedCountries
};