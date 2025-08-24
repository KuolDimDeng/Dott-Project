/**
 * Payment conversion utilities for handling Stripe-supported and unsupported currencies
 * For currency formatting, use currencyFormatter.js instead
 */

// Currencies NOT supported by Stripe (requires conversion to USD)
// This list is maintained based on Stripe documentation
export const UNSUPPORTED_CURRENCIES = [
  'SSP', // South Sudanese Pound
  'SYP', // Syrian Pound
  'IRR', // Iranian Rial
  'KPW', // North Korean Won
  'VED', // Venezuelan Bolívar (old)
  'VES', // Venezuelan Bolívar Soberano
  'CUP', // Cuban Peso
  'SDG', // Sudanese Pound
  'LYD', // Libyan Dinar
  'YER', // Yemeni Rial
  'SOS', // Somali Shilling
  'HTG', // Haitian Gourde
  'MMK', // Myanmar Kyat
  'BYN', // Belarusian Ruble
  'BYR', // Belarusian Ruble (old)
  'TMT', // Turkmenistan Manat
  'ZWL', // Zimbabwe Dollar
  'RSD', // Serbian Dinar (sometimes restricted)
  'IQD', // Iraqi Dinar
  'AFN', // Afghan Afghani
  'TJS', // Tajikistani Somoni
  'UZS', // Uzbekistani Som
  'KGS', // Kyrgyzstani Som
  'GNF', // Guinean Franc
  'XAF', // Central African CFA Franc (limited support)
  'XOF', // West African CFA Franc (limited support)
  'BIF', // Burundian Franc
  'DJF', // Djiboutian Franc
  'ERN', // Eritrean Nakfa
  'MRU', // Mauritanian Ouguiya
  'STN', // São Tomé and Príncipe Dobra
  'SLE', // Sierra Leonean Leone
];

// Common currencies that ARE supported by Stripe (for reference)
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'INR',
  'KES', // Kenya Shilling - SUPPORTED
  'NGN', // Nigerian Naira - SUPPORTED
  'ZAR', // South African Rand - SUPPORTED
  'EGP', // Egyptian Pound - SUPPORTED
  'MAD', // Moroccan Dirham - SUPPORTED
  'GHS', // Ghanaian Cedi - SUPPORTED
  'UGX', // Ugandan Shilling - SUPPORTED
  'TZS', // Tanzanian Shilling - SUPPORTED
  'RWF', // Rwandan Franc - SUPPORTED
  'ETB', // Ethiopian Birr - SUPPORTED
  'BRL', 'MXN', 'ARS', 'COP', 'PEN', 'CLP',
  'PHP', 'IDR', 'THB', 'VND', 'MYR', 'SGD',
  'NZD', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'ISK',
  'TRY', 'ILS', 'AED', 'SAR', 'QAR', 'KWD',
  'BHD', 'OMR', 'JOD', 'LBP', 'PKR', 'BDT',
  'LKR', 'NPR', 'KRW', 'TWD', 'HKD', 'MOP'
];

/**
 * Check if a currency needs conversion to USD for Stripe
 * @param {string} currencyCode - 3-letter currency code
 * @returns {boolean} true if conversion needed
 */
export function needsCurrencyConversion(currencyCode) {
  if (!currencyCode) return false;
  return UNSUPPORTED_CURRENCIES.includes(currencyCode.toUpperCase());
}

/**
 * Get display information for currency conversion
 * @param {string} currencyCode - Original currency code
 * @param {number} originalAmount - Amount in original currency
 * @param {number} usdAmount - Converted USD amount
 * @returns {object} Display information
 */
export function getConversionDisplay(currencyCode, originalAmount, usdAmount) {
  return {
    message: `Payment will be processed in USD (${currencyCode} not directly supported)`,
    original: `${originalAmount} ${currencyCode}`,
    converted: `$${usdAmount.toFixed(2)} USD`,
    disclaimer: 'Exchange rate applied at time of payment'
  };
}

/**
 * Convert amount to USD using exchange rate
 * @param {number} amount - Amount in original currency
 * @param {number} exchangeRate - Exchange rate to USD (how many units of currency per 1 USD)
 * @returns {number} Amount in USD
 */
export function convertToUSD(amount, exchangeRate) {
  if (!exchangeRate || exchangeRate <= 0) {
    throw new Error('Invalid exchange rate');
  }
  const usdAmount = amount / exchangeRate;
  // Ensure minimum charge of $0.50 for Stripe (minimum processable amount)
  return Math.max(0.50, usdAmount);
}

// formatCurrency function removed - use formatCurrency from currencyFormatter.js instead

/**
 * Get current user pricing information based on location
 * @returns {Promise<object>} Pricing information with potential discounts
 */
export async function getCurrentUserPricing() {
  try {
    const response = await fetch('/api/pricing/current');
    if (response.ok) {
      return await response.json();
    }
    // Return default pricing if API fails
    return {
      basic: { monthly: '$0', annual: '$0' },
      professional: { monthly: '$15', annual: '$144' },
      enterprise: { monthly: '$45', annual: '$432' },
      hasDiscount: false,
      discountPercentage: 0
    };
  } catch (error) {
    console.error('Failed to fetch user pricing:', error);
    return {
      basic: { monthly: '$0', annual: '$0' },
      professional: { monthly: '$15', annual: '$144' },
      enterprise: { monthly: '$45', annual: '$432' },
      hasDiscount: false,
      discountPercentage: 0
    };
  }
}

/**
 * Fetch current exchange rate from API
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code (default USD)
 * @returns {Promise<number>} Exchange rate
 */
export async function fetchExchangeRate(fromCurrency, toCurrency = 'USD') {
  try {
    // Always fetch fresh rate from API for accuracy
    const response = await fetch(`/api/exchange-rate?from=${fromCurrency}&to=${toCurrency}`);
    if (response.ok) {
      const data = await response.json();
      return data.rate;
    }
    
    // If API fails, use fallback rates as last resort
    console.warn(`Failed to fetch exchange rate for ${fromCurrency}, using fallback`);
    return getCachedExchangeRate(fromCurrency, toCurrency);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Use fallback only if API is completely unavailable
    return getCachedExchangeRate(fromCurrency, toCurrency);
  }
}

/**
 * Get cached/fallback exchange rates for common unsupported currencies
 * These are approximate rates updated periodically
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number} Approximate exchange rate
 */
export function getCachedExchangeRate(fromCurrency, toCurrency = 'USD') {
  if (toCurrency !== 'USD') {
    console.warn('Only USD conversion supported for fallback rates');
    return 1;
  }
  
  // Approximate exchange rates to USD (as of 2024)
  // These should be updated periodically or fetched from API
  const FALLBACK_RATES = {
    'SSP': 1300,    // South Sudanese Pound (market rate, highly volatile)
    'SYP': 13000,   // Syrian Pound
    'IRR': 42000,   // Iranian Rial
    'VES': 36,      // Venezuelan Bolívar
    'CUP': 24,      // Cuban Peso
    'SDG': 600,     // Sudanese Pound
    'LYD': 4.8,     // Libyan Dinar
    'YER': 250,     // Yemeni Rial
    'SOS': 570,     // Somali Shilling
    'HTG': 130,     // Haitian Gourde
    'MMK': 2100,    // Myanmar Kyat
    'BYN': 3.2,     // Belarusian Ruble
    'ZWL': 5000,    // Zimbabwe Dollar (extremely volatile)
    'IQD': 1310,    // Iraqi Dinar
    'AFN': 70,      // Afghan Afghani
    'TJS': 11,      // Tajikistani Somoni
    'UZS': 12500,   // Uzbekistani Som
    'KGS': 89,      // Kyrgyzstani Som
    'GNF': 8600,    // Guinean Franc
    'XAF': 600,     // Central African CFA Franc
    'XOF': 600,     // West African CFA Franc
    'BIF': 2850,    // Burundian Franc
    'DJF': 177,     // Djiboutian Franc
    'ERN': 15,      // Eritrean Nakfa
    'MRU': 34,      // Mauritanian Ouguiya
    'STN': 22,      // São Tomé and Príncipe Dobra
    'SLE': 23,      // Sierra Leonean Leone
  };
  
  const rate = FALLBACK_RATES[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`No fallback rate for ${fromCurrency}, using 1:1`);
    return 1;
  }
  
  return rate;
}

/**
 * Process payment with currency conversion if needed
 * @param {object} paymentData - Payment information
 * @returns {object} Processed payment data for Stripe
 */
export async function processPaymentWithConversion(paymentData) {
  const { amount, currencyCode, currencySymbol } = paymentData;
  
  // Check if conversion needed
  if (!needsCurrencyConversion(currencyCode)) {
    return {
      ...paymentData,
      processedAmount: amount,
      processedCurrency: currencyCode.toLowerCase(),
      conversionApplied: false
    };
  }
  
  // Get exchange rate
  const exchangeRate = await fetchExchangeRate(currencyCode, 'USD');
  const usdAmount = convertToUSD(amount, exchangeRate);
  
  return {
    ...paymentData,
    originalAmount: amount,
    originalCurrency: currencyCode,
    processedAmount: usdAmount,
    processedCurrency: 'usd',
    exchangeRate: exchangeRate,
    conversionApplied: true,
    conversionDisplay: getConversionDisplay(currencyCode, amount, usdAmount)
  };
}