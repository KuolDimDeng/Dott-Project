/**
 * countryDetectionService.js
 * 
 * Service for detecting user's country and setting appropriate language/currency
 * Uses multiple detection methods with fallbacks
 */

import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { saveUserPreference, getUserPreference } from '@/utils/userPreferences';

// Cache TTL for country detection (24 hours)
// Developed countries that should NEVER get discount
const DEVELOPED_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'LU', 'MC',
  'CH', 'NO', 'SE', 'DK', 'FI', 'IS', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'BH',
  'SA', 'OM', 'BN', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR', 'GR'
];

// Developing countries eligible for 50% discount (explicit list)
const DEVELOPING_COUNTRIES = [
  'AF', 'AL', 'DZ', 'AO', 'AR', 'AM', 'AZ', 'BD', 'BY', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 
  'BF', 'BI', 'KH', 'CM', 'CV', 'CF', 'TD', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'CU', 'DJ', 
  'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'ET', 'FJ', 'GA', 'GM', 'GE', 'GH', 'GD', 'GT', 'GN', 
  'GW', 'GY', 'HT', 'HN', 'IN', 'ID', 'IR', 'IQ', 'JM', 'JO', 'KZ', 'KE', 'KI', 'KP', 'XK', 'KG', 
  'LA', 'LB', 'LS', 'LR', 'LY', 'MK', 'MG', 'MW', 'MY', 'MV', 'ML', 'MH', 'MR', 'MU', 'MX', 'FM', 
  'MD', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NI', 'NE', 'NG', 'PK', 'PW', 'PS', 'PA', 
  'PG', 'PY', 'PE', 'PH', 'RW', 'WS', 'ST', 'SN', 'RS', 'SC', 'SL', 'SB', 'SO', 'ZA', 'SS', 'LK', 
  'SD', 'SR', 'SZ', 'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV', 'UG', 
  'UA', 'UZ', 'VU', 'VE', 'VN', 'YE', 'ZM', 'ZW'
];

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

    // Ensure we have a valid country code
    if (!detectedCountry || detectedCountry === 'null' || detectedCountry.length !== 2) {
      detectedCountry = 'US';
      console.log('⚠️ Invalid country code detected, using US as fallback');
    }

    console.log('✅ Detected user country:', detectedCountry);
    
    // Store in localStorage for language detector
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('detected_country', detectedCountry);
      }
    } catch (e) {
      console.warn('Could not store country in localStorage:', e);
    }
    
    // Debug: Check discount eligibility
    const isEligibleForDiscount = isDevelopingCountry(detectedCountry);
    console.log(`💰 Country ${detectedCountry} discount eligibility: ${isEligibleForDiscount}`);
    return detectedCountry;

  } catch (error) {
    console.error('❌ Error detecting user country:', error);
    return 'US'; // Safe fallback
  }
}

/**
 * Detect country by IP address using backend API
 */
async function detectCountryByIP() {
  try {
    // Use backend API instead of direct external calls to avoid CORS issues
    const response = await fetch('/api/pricing/by-country', { 
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code;
      
      if (countryCode && countryCode.length === 2) {
        console.log(`✅ Detected country via backend API: ${countryCode}`);
        return countryCode.toUpperCase();
      }
    } else {
      console.warn('⚠️ Backend country detection failed:', response.status);
    }
  } catch (error) {
    console.warn('⚠️ Failed to detect country via backend API:', error.message);
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
      console.log(`✅ Detected country via timezone ${timezone}: ${country}`);
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
      console.log(`✅ Detected country via language ${language}: ${country}`);
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
    // English-speaking countries
    'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
    'ZA': 'en', 'IN': 'hi', 'PK': 'en', 'BD': 'en', 'LK': 'en', 'MY': 'en',
    'SG': 'en', 'PH': 'en', 'UG': 'en', 'ZW': 'en', 'ZM': 'en', 'BW': 'en',
    'GH': 'en', 'NG': 'en', // Nigeria uses English as official language
    
    // Swahili-speaking countries
    'KE': 'sw', // Kenya - Swahili
    'TZ': 'sw', // Tanzania - Swahili
    
    // French-speaking countries
    'FR': 'fr', 'BE': 'fr', 'CH': 'fr', 'LU': 'fr', 'MC': 'fr',
    'SN': 'fr', 'CI': 'fr', 'CM': 'fr', 'CD': 'fr', 'CG': 'fr',
    'GA': 'fr', 'BF': 'fr', 'ML': 'fr', 'NE': 'fr', 'TD': 'fr',
    'TG': 'fr', 'BJ': 'fr', 'GN': 'fr', 'MG': 'fr', 'DJ': 'fr',
    
    // Spanish-speaking countries
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'PE': 'es', 'VE': 'es',
    'CL': 'es', 'EC': 'es', 'GT': 'es', 'CU': 'es', 'BO': 'es', 'DO': 'es',
    'HN': 'es', 'PY': 'es', 'SV': 'es', 'NI': 'es', 'CR': 'es', 'PA': 'es',
    'UY': 'es', 'GQ': 'es',
    
    // Portuguese-speaking countries
    'PT': 'pt', 'BR': 'pt', 'AO': 'pt', 'MZ': 'pt', 'CV': 'pt',
    'GW': 'pt', 'ST': 'pt', 'TL': 'pt',
    
    // German-speaking countries
    'DE': 'de', 'AT': 'de', 'LI': 'de',
    
    // Russian-speaking countries
    'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru', 'TJ': 'ru',
    
    // Chinese-speaking regions
    'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'MO': 'zh',
    
    // Arabic-speaking countries
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'JO': 'ar', 'LB': 'ar',
    'KW': 'ar', 'QA': 'ar', 'BH': 'ar', 'OM': 'ar', 'YE': 'ar',
    'SY': 'ar', 'IQ': 'ar', 'LY': 'ar', 'TN': 'ar', 'DZ': 'ar',
    'MA': 'ar', 'SD': 'ar',
    
    // Other Asian languages
    'JP': 'ja', // Japanese
    'KR': 'ko', // Korean
    'ID': 'id', // Indonesian
    'VN': 'vi', // Vietnamese
    'TH': 'en', // Thailand - English (no Thai translation yet)
    
    // Other European languages
    'IT': 'it', 'SM': 'it', 'VA': 'it', // Italian
    'NL': 'nl', 'SR': 'nl', // Dutch
    'TR': 'tr', // Turkish
    
    // African languages
    'ET': 'am', // Ethiopia - Amharic
    // 'NG': 'ha', // Nigeria - Could use Hausa, but English is more common
    // 'NG': 'yo', // Nigeria - Could use Yoruba, but English is more common
    
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
  // First check if it's explicitly a developed country
  if (DEVELOPED_COUNTRIES.includes(countryCode)) {
    console.log(`🏛️ ${countryCode} is a developed country - NO discount`);
    return false;
  }
  
  // Then check if it's in the developing countries list
  const isDeveloping = DEVELOPING_COUNTRIES.includes(countryCode);
  console.log(`🌍 ${countryCode} developing country status: ${isDeveloping}`);
  return isDeveloping;
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
    
    // Save preferences to user storage
    try {
      await saveUserPreference('custom:country', country);
      await saveUserPreference('custom:detected_language', language);
      await saveUserPreference('custom:is_developing_country', isDeveloping.toString());
    } catch (error) {
      console.error('❌ Failed to save country detection preferences:', error);
    }
    
    // Log the detected language for debugging
    console.log(`🌍 Country ${country} maps to language: ${language}`);
    
    return { country, language, isDeveloping };
  } catch (error) {
    console.error('❌ Error initializing country detection:', error);
    return { country: 'US', language: 'en', isDeveloping: false };
  }
}

/**
 * Clear manual language selection to allow geo-based detection
 * Used when you want to reset to automatic language detection
 */
export function clearManualLanguageSelection() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('i18nextLng');
      console.log('🔄 Cleared manual language selection');
    }
  } catch (error) {
    console.error('❌ Error clearing manual language selection:', error);
  }
}
