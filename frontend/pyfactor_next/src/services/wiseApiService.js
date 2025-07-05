/**
 * wiseApiService.js
 * 
 * Service for integrating with Wise API for real-time currency exchange rates
 * Includes caching and fallback mechanisms
 */

import { getCacheValue, setCacheValue } from '@/utils/appCache';

// Cache TTL for exchange rates (1 hour)
const EXCHANGE_RATE_CACHE_TTL = 60 * 60 * 1000;

// Fallback exchange rates (updated periodically)
const FALLBACK_RATES = {
  'USD': 1.0,
  'EUR': 0.85,
  'GBP': 0.73,
  'CAD': 1.25,
  'AUD': 1.35,
  'JPY': 110.0,
  'CNY': 6.45,
  'INR': 74.5,
  'BRL': 5.2,
  'MXN': 20.1,
  'ZAR': 14.8,
  'NGN': 411.0,
  'KES': 108.0,
  'GHS': 6.1,
  'EGP': 15.7,
  'MAD': 9.0,
  'TND': 2.8,
  'DZD': 134.0,
  'XOF': 558.0, // West African CFA franc
  'XAF': 558.0, // Central African CFA franc
};

/**
 * Get exchange rate from USD to target currency
 * @param {string} targetCurrency - Target currency code (e.g., 'EUR', 'GBP')
 * @returns {Promise<number>} Exchange rate
 */
export async function getExchangeRate(targetCurrency) {
  try {
    if (targetCurrency === 'USD') {
      return 1.0;
    }

    // Check cache first
    const cacheKey = `exchange_rate_USD_${targetCurrency}`;
    const cachedRate = getCacheValue(cacheKey);
    if (cachedRate) {
      console.log(`✅ Using cached exchange rate USD to ${targetCurrency}: ${cachedRate}`);
      return cachedRate;
    }

    // Try to fetch from Wise API (or other reliable source)
    let rate = await fetchExchangeRateFromAPI(targetCurrency);
    
    // Fallback to stored rates if API fails
    if (!rate) {
      rate = FALLBACK_RATES[targetCurrency];
      if (rate) {
        console.log(`⚠️ Using fallback exchange rate USD to ${targetCurrency}: ${rate}`);
      } else {
        console.warn(`❌ No exchange rate available for ${targetCurrency}, using 1.0`);
        rate = 1.0;
      }
    }

    // Cache the result
    setCacheValue(cacheKey, rate, { ttl: EXCHANGE_RATE_CACHE_TTL });
    
    return rate;
  } catch (error) {
    console.error(`❌ Error getting exchange rate for ${targetCurrency}:`, error);
    return FALLBACK_RATES[targetCurrency] || 1.0;
  }
}

/**
 * Fetch exchange rate from external API
 * Note: Replace with actual Wise API integration when credentials are available
 */
async function fetchExchangeRateFromAPI(targetCurrency) {
  try {
    // Option 1: Free exchange rate API (for development/fallback)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    if (response.ok) {
      const data = await response.json();
      const rate = data.rates[targetCurrency];
      if (rate) {
        console.log(`✅ Fetched exchange rate USD to ${targetCurrency}: ${rate}`);
        return rate;
      }
    }

    // Option 2: Alternative free API
    const response2 = await fetch(`https://api.fxratesapi.com/latest?base=USD&symbols=${targetCurrency}`);
    if (response2.ok) {
      const data = await response2.json();
      const rate = data.rates[targetCurrency];
      if (rate) {
        console.log(`✅ Fetched exchange rate USD to ${targetCurrency}: ${rate}`);
        return rate;
      }
    }

    // TODO: Integrate with actual Wise API when credentials are provided
    // const wiseRate = await fetchFromWiseAPI(targetCurrency);
    // if (wiseRate) return wiseRate;

  } catch (error) {
    console.warn(`⚠️ Failed to fetch exchange rate from API for ${targetCurrency}:`, error.message);
  }
  
  return null;
}

/**
 * Convert USD amount to target currency
 * @param {number} usdAmount - Amount in USD
 * @param {string} targetCurrency - Target currency code
 * @returns {Promise<number>} Converted amount
 */
export async function convertFromUSD(usdAmount, targetCurrency) {
  const rate = await getExchangeRate(targetCurrency);
  return usdAmount * rate;
}

/**
 * Get multiple exchange rates at once
 * @param {string[]} currencies - Array of currency codes
 * @returns {Promise<Object>} Object with currency codes as keys and rates as values
 */
export async function getMultipleExchangeRates(currencies) {
  const rates = {};
  
  await Promise.all(
    currencies.map(async (currency) => {
      rates[currency] = await getExchangeRate(currency);
    })
  );
  
  return rates;
}

/**
 * Format currency amount with proper symbol and formatting
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    console.warn(`⚠️ Failed to format currency ${currency}:`, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get currency for country
 * @param {string} countryCode - ISO country code
 * @returns {string} Currency code
 */
export function getCurrencyForCountry(countryCode) {
  const countryToCurrency = {
    'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD', 'NZ': 'NZD',
    'EU': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR',
    'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'BR': 'BRL', 'MX': 'MXN',
    'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'EG': 'EGP',
    'MA': 'MAD', 'TN': 'TND', 'DZ': 'DZD', 'RU': 'RUB', 'TR': 'TRY',
    'ID': 'IDR', 'MY': 'MYR', 'TH': 'THB', 'VN': 'VND', 'PH': 'PHP',
    'SG': 'SGD', 'HK': 'HKD', 'KR': 'KRW', 'TW': 'TWD',
    // West African countries using CFA franc
    'SN': 'XOF', 'CI': 'XOF', 'BF': 'XOF', 'ML': 'XOF', 'NE': 'XOF',
    'TG': 'XOF', 'BJ': 'XOF', 'GW': 'XOF',
    // Central African countries using CFA franc
    'CM': 'XAF', 'CF': 'XAF', 'TD': 'XAF', 'CG': 'XAF', 'GQ': 'XAF', 'GA': 'XAF',
  };
  
  return countryToCurrency[countryCode] || 'USD';
}
