#!/usr/bin/env node

/**
 * Version0032_implement_country_detection_dynamic_pricing.mjs
 * 
 * Purpose: Implement intelligent country/language detection and dynamic pricing with:
 * 1. Automatic country detection and language selection for English-speaking countries
 * 2. Dynamic currency pricing using Wise API for real-time exchange rates
 * 3. Developing country discount (50% off) for eligible countries
 * 4. Base pricing: Basic (FREE), Professional ($15 USD), Enterprise ($35 USD)
 * 5. Cognito integration for storing user preferences
 * 
 * Version: 0032 v1.0
 * Created: 2025-01-27
 * Author: AI Assistant
 * 
 * Requirements Addressed:
 * - Condition 6: Use CognitoAttributes utility for accessing Cognito user attributes
 * - Condition 7: No cookies or local storage - use Cognito Attributes or AWS App Cache
 * - Condition 9: Use custom:tenant_ID for tenant id
 * - Condition 12: Long term solutions, not short term fixes
 * - Condition 17: JavaScript (not TypeScript)
 * - Condition 22: No hardcoded environment keys or sensitive information
 * - Condition 25: Create/update .MD files in the same folder as modified code
 * - Condition 28: Make targeted, purposeful changes
 * 
 * Files to be modified:
 * - /src/services/countryDetectionService.js (create country detection service)
 * - /src/services/wiseApiService.js (create Wise API integration)
 * - /src/utils/currencyUtils.js (create currency utilities)
 * - /src/utils/countryUtils.js (create country utilities)
 * - /src/app/components/Pricing.js (enhance with dynamic pricing)
 * - /src/app/page.js (add country detection initialization)
 * - /src/i18n.js (enhance with country-based language detection)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Base pricing in USD
const BASE_PRICING = {
  basic: { monthly: 0, annual: 0 },
  professional: { monthly: 15, annual: 15 },
  enterprise: { monthly: 35, annual: 35 }
};

// English-speaking countries for auto language detection
const ENGLISH_SPEAKING_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'IN', 'PK', 'BD', 'LK', 'MY', 'SG', 'PH', 'KE', 'UG', 'TZ', 'ZW', 'BW', 'NA', 'ZM', 'MW'
];

// Developing countries eligible for 50% discount
const DEVELOPING_COUNTRIES = [
  'AF', 'AL', 'DZ', 'AO', 'AR', 'AM', 'AZ', 'BD', 'BY', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BF', 'BI', 'KH', 'CM', 'CV', 'CF', 'TD', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'CU', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'ET', 'FJ', 'GA', 'GM', 'GE', 'GH', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'IN', 'ID', 'IR', 'IQ', 'JM', 'JO', 'KZ', 'KE', 'KI', 'KP', 'XK', 'KG', 'LA', 'LB', 'LS', 'LR', 'LY', 'MK', 'MG', 'MW', 'MY', 'MV', 'ML', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NI', 'NE', 'NG', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'RW', 'WS', 'ST', 'SN', 'RS', 'SC', 'SL', 'SB', 'SO', 'ZA', 'SS', 'LK', 'SD', 'SR', 'SZ', 'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV', 'UG', 'UA', 'UZ', 'VU', 'VE', 'VN', 'YE', 'ZM', 'ZW'
];

/**
 * Utility functions
 */
async function createBackup(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const backupPath = `${filePath}.backup_${BACKUP_TIMESTAMP}`;
    await fs.writeFile(backupPath, content, 'utf8');
    console.log(`✅ Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup for ${filePath}:`, error.message);
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Create Country Detection Service
 */
async function createCountryDetectionService() {
  const filePath = path.join(PROJECT_ROOT, 'src/services/countryDetectionService.js');
  
  const serviceContent = `/**
 * countryDetectionService.js
 * 
 * Service for detecting user's country and setting appropriate language/currency
 * Uses multiple detection methods with fallbacks
 */

import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { saveUserPreference, getUserPreference } from '@/utils/userPreferences';
import CognitoAttributes from '@/utils/CognitoAttributes';

// Cache TTL for country detection (24 hours)
const COUNTRY_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Detect user's country using multiple methods
 * @returns {Promise<string>} Country code (ISO 3166-1 alpha-2)
 */
export async function detectUserCountry() {
  try {
    // First check if we have a cached result
    const cachedCountry = getCacheValue('user_detected_country');
    if (cachedCountry) {
      console.log('✅ Using cached country:', cachedCountry);
      return cachedCountry;
    }

    // Check if user has manually set country preference
    const userCountryPref = await getUserPreference('custom:country');
    if (userCountryPref) {
      setCacheValue('user_detected_country', userCountryPref, { ttl: COUNTRY_CACHE_TTL });
      return userCountryPref;
    }

    let detectedCountry = null;

    // Method 1: Try IP-based geolocation (multiple services for reliability)
    detectedCountry = await detectCountryByIP();
    
    // Method 2: Fallback to browser timezone
    if (!detectedCountry) {
      detectedCountry = detectCountryByTimezone();
    }

    // Method 3: Fallback to browser language
    if (!detectedCountry) {
      detectedCountry = detectCountryByLanguage();
    }

    // Default fallback
    if (!detectedCountry) {
      detectedCountry = 'US';
      console.log('⚠️ Using default country fallback: US');
    }

    // Cache the result
    setCacheValue('user_detected_country', detectedCountry, { ttl: COUNTRY_CACHE_TTL });
    
    // Save to user preferences for future visits
    try {
      await saveUserPreference('custom:country', detectedCountry);
    } catch (error) {
      console.error('❌ Failed to save country preference:', error);
    }

    console.log('✅ Detected user country:', detectedCountry);
    return detectedCountry;

  } catch (error) {
    console.error('❌ Error detecting user country:', error);
    return 'US'; // Safe fallback
  }
}

/**
 * Detect country by IP address using multiple services
 */
async function detectCountryByIP() {
  const services = [
    'https://ipapi.co/country_code/',
    'https://api.country.is/',
    'https://ipinfo.io/country'
  ];

  for (const service of services) {
    try {
      const response = await fetch(service, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        let countryCode;
        
        if (service.includes('country.is')) {
          const data = await response.json();
          countryCode = data.country;
        } else {
          countryCode = await response.text();
        }
        
        if (countryCode && countryCode.length === 2) {
          console.log(\`✅ Detected country via \${service}: \${countryCode}\`);
          return countryCode.toUpperCase();
        }
      }
    } catch (error) {
      console.warn(\`⚠️ Failed to detect country via \${service}:\`, error.message);
    }
  }
  
  return null;
}

/**
 * Detect country by browser timezone
 */
function detectCountryByTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToCountry = {
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Asia/Kolkata': 'IN',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      // Add more timezone mappings as needed
    };
    
    const country = timezoneToCountry[timezone];
    if (country) {
      console.log(\`✅ Detected country via timezone \${timezone}: \${country}\`);
      return country;
    }
  } catch (error) {
    console.warn('⚠️ Failed to detect country via timezone:', error);
  }
  
  return null;
}

/**
 * Detect country by browser language
 */
function detectCountryByLanguage() {
  try {
    const language = navigator.language || navigator.languages[0];
    const langToCountry = {
      'en-US': 'US',
      'en-GB': 'GB',
      'en-CA': 'CA',
      'en-AU': 'AU',
      'fr-FR': 'FR',
      'fr-CA': 'CA',
      'de-DE': 'DE',
      'es-ES': 'ES',
      'it-IT': 'IT',
      'ja-JP': 'JP',
      'zh-CN': 'CN',
      'pt-BR': 'BR',
      // Add more language mappings as needed
    };
    
    const country = langToCountry[language];
    if (country) {
      console.log(\`✅ Detected country via language \${language}: \${country}\`);
      return country;
    }
  } catch (error) {
    console.warn('⚠️ Failed to detect country via language:', error);
  }
  
  return null;
}

/**
 * Get appropriate language for detected country
 * @param {string} countryCode - ISO country code
 * @returns {string} Language code
 */
export function getLanguageForCountry(countryCode) {
  const countryToLanguage = {
    'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
    'ZA': 'en', 'IN': 'en', 'PK': 'en', 'BD': 'en', 'LK': 'en', 'MY': 'en',
    'SG': 'en', 'PH': 'en', 'KE': 'en', 'UG': 'en', 'TZ': 'en', 'ZW': 'en',
    'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr', 'MC': 'fr',
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
    'DE': 'de', 'AT': 'de',
    'IT': 'it', 'SM': 'it', 'VA': 'it',
    'PT': 'pt', 'BR': 'pt',
    'RU': 'ru', 'BY': 'ru', 'KZ': 'ru',
    'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'MO': 'zh',
    'JP': 'ja',
    'KR': 'ko',
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'JO': 'ar', 'LB': 'ar',
    'NL': 'nl', 'BE': 'nl',
    'TR': 'tr',
    'ID': 'id',
    'VN': 'vi',
    'TH': 'th',
    'HI': 'hi',
    'NG': 'ha', // Nigeria - Hausa
    // Add more mappings as needed
  };
  
  return countryToLanguage[countryCode] || 'en'; // Default to English
}

/**
 * Check if country is eligible for developing country discount
 * @param {string} countryCode - ISO country code
 * @returns {boolean} True if eligible for discount
 */
export function isDevelopingCountry(countryCode) {
  return DEVELOPING_COUNTRIES.includes(countryCode);
}

/**
 * Initialize country detection and set language
 */
export async function initializeCountryDetection() {
  try {
    const country = await detectUserCountry();
    const language = getLanguageForCountry(country);
    const isDeveloping = isDevelopingCountry(country);
    
    // Store in AppCache for immediate access
    setCacheValue('user_country', country);
    setCacheValue('user_language', language);
    setCacheValue('user_is_developing_country', isDeveloping);
    
    // Save preferences to Cognito
    try {
      await saveUserPreference('custom:country', country);
      await saveUserPreference('custom:detected_language', language);
      await saveUserPreference('custom:is_developing_country', isDeveloping.toString());
    } catch (error) {
      console.error('❌ Failed to save country detection preferences:', error);
    }
    
    return { country, language, isDeveloping };
  } catch (error) {
    console.error('❌ Error initializing country detection:', error);
    return { country: 'US', language: 'en', isDeveloping: false };
  }
}
`;

  await ensureDirectoryExists(path.dirname(filePath));
  await fs.writeFile(filePath, serviceContent, 'utf8');
  console.log('✅ Created countryDetectionService.js');
}

/**
 * Create Wise API Service
 */
async function createWiseApiService() {
  const filePath = path.join(PROJECT_ROOT, 'src/services/wiseApiService.js');
  
  const serviceContent = `/**
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
    const cacheKey = \`exchange_rate_USD_\${targetCurrency}\`;
    const cachedRate = getCacheValue(cacheKey);
    if (cachedRate) {
      console.log(\`✅ Using cached exchange rate USD to \${targetCurrency}: \${cachedRate}\`);
      return cachedRate;
    }

    // Try to fetch from Wise API (or other reliable source)
    let rate = await fetchExchangeRateFromAPI(targetCurrency);
    
    // Fallback to stored rates if API fails
    if (!rate) {
      rate = FALLBACK_RATES[targetCurrency];
      if (rate) {
        console.log(\`⚠️ Using fallback exchange rate USD to \${targetCurrency}: \${rate}\`);
      } else {
        console.warn(\`❌ No exchange rate available for \${targetCurrency}, using 1.0\`);
        rate = 1.0;
      }
    }

    // Cache the result
    setCacheValue(cacheKey, rate, { ttl: EXCHANGE_RATE_CACHE_TTL });
    
    return rate;
  } catch (error) {
    console.error(\`❌ Error getting exchange rate for \${targetCurrency}:\`, error);
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
    const response = await fetch(\`https://api.exchangerate-api.com/v4/latest/USD\`);
    if (response.ok) {
      const data = await response.json();
      const rate = data.rates[targetCurrency];
      if (rate) {
        console.log(\`✅ Fetched exchange rate USD to \${targetCurrency}: \${rate}\`);
        return rate;
      }
    }

    // Option 2: Alternative free API
    const response2 = await fetch(\`https://api.fxratesapi.com/latest?base=USD&symbols=\${targetCurrency}\`);
    if (response2.ok) {
      const data = await response2.json();
      const rate = data.rates[targetCurrency];
      if (rate) {
        console.log(\`✅ Fetched exchange rate USD to \${targetCurrency}: \${rate}\`);
        return rate;
      }
    }

    // TODO: Integrate with actual Wise API when credentials are provided
    // const wiseRate = await fetchFromWiseAPI(targetCurrency);
    // if (wiseRate) return wiseRate;

  } catch (error) {
    console.warn(\`⚠️ Failed to fetch exchange rate from API for \${targetCurrency}:\`, error.message);
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
    console.warn(\`⚠️ Failed to format currency \${currency}:\`, error);
    return \`\${currency} \${amount.toFixed(2)}\`;
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
`;

  await fs.writeFile(filePath, serviceContent, 'utf8');
  console.log('✅ Created wiseApiService.js');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Version0032_implement_country_detection_dynamic_pricing.mjs');
  console.log('📋 Purpose: Implement country detection, language auto-selection, and dynamic pricing');
  
  try {
    console.log('\n📝 Step 1: Creating country detection service...');
    await createCountryDetectionService();
    
    console.log('\n📝 Step 2: Creating Wise API service...');
    await createWiseApiService();
    
    console.log('\n✅ SUCCESS: Version0032 base services created successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('  ✅ Country detection service created');
    console.log('  ✅ Wise API service created');
    console.log('\n🔄 Next: Run the enhancement script to update components...');
    
  } catch (error) {
    console.error('\n❌ ERROR: Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the script
main(); 