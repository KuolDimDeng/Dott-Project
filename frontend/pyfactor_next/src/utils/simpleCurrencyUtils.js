/**
 * Simple currency utilities without external API dependencies
 */

// Map countries to their primary currencies
const COUNTRY_CURRENCY_MAP = {
  // Americas
  'US': 'USD', 'CA': 'CAD', 'MX': 'MXN', 'BR': 'BRL', 'AR': 'ARS',
  'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN', 'VE': 'VES', 'BO': 'BOB',
  'PY': 'PYG', 'UY': 'UYU', 'EC': 'USD', 'GY': 'GYD', 'SR': 'SRD',
  'GT': 'GTQ', 'HN': 'HNL', 'NI': 'NIO', 'CR': 'CRC', 'PA': 'PAB',
  'DO': 'DOP', 'CU': 'CUP', 'JM': 'JMD', 'HT': 'HTG', 'BS': 'BSD',
  'BB': 'BBD', 'TT': 'TTD', 'BZ': 'BZD',
  
  // Europe
  'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
  'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR',
  'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'FI': 'EUR',
  'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
  'HR': 'HRK', 'RS': 'RSD', 'UA': 'UAH', 'RU': 'RUB', 'IS': 'ISK',
  'TR': 'TRY', 'GR': 'EUR', 'SI': 'EUR', 'SK': 'EUR', 'EE': 'EUR',
  'LV': 'EUR', 'LT': 'EUR', 'MT': 'EUR', 'CY': 'EUR', 'LU': 'EUR',
  
  // Asia
  'CN': 'CNY', 'JP': 'JPY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD',
  'HK': 'HKD', 'TH': 'THB', 'MY': 'MYR', 'ID': 'IDR', 'PH': 'PHP',
  'VN': 'VND', 'BD': 'BDT', 'PK': 'PKR', 'LK': 'LKR', 'TW': 'TWD',
  'NP': 'NPR', 'AF': 'AFN', 'MM': 'MMK', 'KH': 'KHR', 'LA': 'LAK',
  'BN': 'BND', 'BT': 'BTN', 'MV': 'MVR', 'MN': 'MNT', 'KZ': 'KZT',
  'UZ': 'UZS', 'KG': 'KGS', 'TJ': 'TJS', 'TM': 'TMT', 'AZ': 'AZN',
  'GE': 'GEL', 'AM': 'AMD',
  
  // Middle East
  'AE': 'AED', 'SA': 'SAR', 'QA': 'QAR', 'KW': 'KWD', 'BH': 'BHD',
  'OM': 'OMR', 'JO': 'JOD', 'IL': 'ILS', 'LB': 'LBP', 'SY': 'SYP',
  'IQ': 'IQD', 'IR': 'IRR', 'YE': 'YER',
  
  // Africa
  'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'EG': 'EGP',
  'MA': 'MAD', 'TN': 'TND', 'DZ': 'DZD', 'ET': 'ETB', 'UG': 'UGX',
  'TZ': 'TZS', 'ZW': 'ZWL', 'ZM': 'ZMW', 'BW': 'BWP', 'MW': 'MWK',
  'MZ': 'MZN', 'AO': 'AOA', 'RW': 'RWF', 'SS': 'SSP', 'BI': 'BIF',
  'DJ': 'DJF', 'ER': 'ERN', 'SO': 'SOS', 'SD': 'SDG', 'LY': 'LYD',
  'MR': 'MRU', 'MG': 'MGA', 'KM': 'KMF', 'SC': 'SCR', 'MU': 'MUR',
  'LS': 'LSL', 'SZ': 'SZL', 'NA': 'NAD', 'CV': 'CVE', 'ST': 'STN',
  'GM': 'GMD', 'LR': 'LRD', 'SL': 'SLL',
  // CFA zones
  'CM': 'XAF', 'CF': 'XAF', 'TD': 'XAF', 'CG': 'XAF', 'GA': 'XAF', 'GQ': 'XAF',
  'BJ': 'XOF', 'BF': 'XOF', 'CI': 'XOF', 'GW': 'XOF', 'ML': 'XOF', 
  'NE': 'XOF', 'SN': 'XOF', 'TG': 'XOF',
  
  // Pacific
  'AU': 'AUD', 'NZ': 'NZD', 'FJ': 'FJD', 'PG': 'PGK', 'SB': 'SBD',
  'VU': 'VUV', 'WS': 'WST', 'TO': 'TOP', 'PF': 'XPF', 'NC': 'XPF',
  
  // Caribbean
  'AG': 'XCD', 'DM': 'XCD', 'GD': 'XCD', 'KN': 'XCD', 'LC': 'XCD',
  'VC': 'XCD', 'AI': 'XCD', 'MS': 'XCD', 'AW': 'AWG', 'CW': 'ANG',
  'SX': 'ANG', 'KY': 'KYD', 'BM': 'BMD', 'VG': 'USD', 'TC': 'USD',
  
  // Others
  'GI': 'GIP', 'FK': 'FKP', 'SH': 'SHP'
};

/**
 * Get currency code for a country
 * @param {string} countryCode - Two-letter country code
 * @returns {string} Currency code (defaults to USD if not found)
 */
export function getCurrencyForCountry(countryCode) {
  return COUNTRY_CURRENCY_MAP[countryCode?.toUpperCase()] || 'USD';
}

/**
 * Simple currency conversion placeholder
 * Since we're not using external APIs, this just returns the amount
 * @param {number} amount - Amount in USD
 * @param {string} targetCurrency - Target currency code
 * @returns {Promise<number>} Same amount (no conversion)
 */
export async function convertFromUSD(amount, targetCurrency) {
  // No actual conversion - just return the same amount
  // This is a placeholder since we're not using currency APIs
  return amount;
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}