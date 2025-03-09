/**
 * Currency utility functions for handling exchange rates and conversions
 **/

// Map of language codes to their default currency codes
export const languageToCurrencyMap = {
  en: { code: 'USD', symbol: '$' },      // English - US Dollar
  es: { code: 'EUR', symbol: '€' },      // Spanish - Euro
  fr: { code: 'EUR', symbol: '€' },      // French - Euro
  pt: { code: 'EUR', symbol: '€' },      // Portuguese - Euro
  de: { code: 'EUR', symbol: '€' },      // German - Euro
  zh: { code: 'CNY', symbol: '¥' },      // Chinese - Yuan
  ar: { code: 'AED', symbol: 'د.إ' },    // Arabic - UAE Dirham
  hi: { code: 'INR', symbol: '₹' },      // Hindi - Indian Rupee
  ru: { code: 'RUB', symbol: '₽' },      // Russian - Ruble
  ja: { code: 'JPY', symbol: '¥' },      // Japanese - Yen
  sw: { code: 'KES', symbol: 'KSh' },    // Swahili - Kenyan Shilling
  tr: { code: 'TRY', symbol: '₺' },      // Turkish - Lira
  id: { code: 'IDR', symbol: 'Rp' },     // Indonesian - Rupiah
  vi: { code: 'VND', symbol: '₫' },      // Vietnamese - Dong
  nl: { code: 'EUR', symbol: '€' },      // Dutch - Euro
  ha: { code: 'NGN', symbol: '₦' },      // Hausa - Nigerian Naira
  yo: { code: 'NGN', symbol: '₦' },      // Yoruba - Nigerian Naira
  am: { code: 'ETB', symbol: 'Br' },     // Amharic - Ethiopian Birr
  zu: { code: 'ZAR', symbol: 'R' },      // Zulu - South African Rand
  ko: { code: 'KRW', symbol: '₩' }       // Korean - Won
};

/**
 * Get currency info based on language code
 * @param {string} languageCode - The language code
 * @returns {Object} - Currency info object with code and symbol
 */
export function getCurrencyFromLanguage(languageCode) {
  return languageToCurrencyMap[languageCode] || { code: 'USD', symbol: '$' };
}

// Cache for exchange rates to avoid unnecessary API calls
let exchangeRatesCache = {
  rates: null,
  timestamp: 0,
  baseCurrency: 'USD'
};

// Cache expiration time (1 hour in milliseconds)
const CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Fetch exchange rates from the API
 * @param {string} baseCurrency - The base currency code (default: USD)
 * @returns {Promise<Object>} - Exchange rates data
 */
export async function fetchExchangeRates(baseCurrency = 'USD') {
  // Check if we have cached rates that are still valid
  const now = Date.now();
  if (
    exchangeRatesCache.rates &&
    exchangeRatesCache.baseCurrency === baseCurrency &&
    now - exchangeRatesCache.timestamp < CACHE_EXPIRATION
  ) {
    return exchangeRatesCache.rates;
  }

  try {
    const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result === 'success') {
      // Update the cache
      exchangeRatesCache = {
        rates: data,
        timestamp: now,
        baseCurrency
      };
      
      return data;
    } else {
      throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // If we have cached rates, return them even if expired
    if (exchangeRatesCache.rates) {
      return exchangeRatesCache.rates;
    }
    throw error;
  }
}

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The source currency code
 * @param {string} toCurrency - The target currency code
 * @returns {Promise<number>} - The converted amount
 */
export async function convertCurrency(amount, fromCurrency = 'USD', toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const ratesData = await fetchExchangeRates(fromCurrency);
    const rates = ratesData.conversion_rates;
    
    if (!rates[toCurrency]) {
      throw new Error(`Exchange rate not available for ${toCurrency}`);
    }
    
    return amount * rates[toCurrency];
  } catch (error) {
    console.error('Currency conversion error:', error);
    // Return the original amount if conversion fails
    return amount;
  }
}

/**
 * Format a currency amount according to the locale
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code
 * @param {string} locale - The locale to use for formatting
 * @returns {string} - The formatted currency string
 */
export function formatCurrency(amount, currencyCode, locale = navigator.language) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    // Fallback to a simple format
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}