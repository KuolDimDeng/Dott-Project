/**
 * Banking Provider Configuration
 * Centralized configuration for banking provider selection
 */

// Countries where Plaid is available (synchronized with backend)
export const PLAID_COUNTRIES = [
  'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE',
  'IT', 'PL', 'DK', 'NO', 'SE', 'EE', 'LT', 'LV', 'PT', 'BE'
];

// Country names mapping for display
export const COUNTRY_NAMES = {
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'FR': 'France',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'IE': 'Ireland',
  'DE': 'Germany',
  'IT': 'Italy',
  'PL': 'Poland',
  'DK': 'Denmark',
  'NO': 'Norway',
  'SE': 'Sweden',
  'EE': 'Estonia',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'PT': 'Portugal',
  'BE': 'Belgium',
  'SS': 'South Sudan',
  'KE': 'Kenya',
  'NG': 'Nigeria',
  'ZA': 'South Africa',
  'GH': 'Ghana',
  'TZ': 'Tanzania',
  'UG': 'Uganda',
  'ET': 'Ethiopia',
  'RW': 'Rwanda',
  'SN': 'Senegal'
};

/**
 * Determine banking provider based on country
 * @param {string} countryCode - Two-letter country code
 * @returns {string} 'plaid' or 'wise'
 */
export function getBankingProvider(countryCode) {
  if (!countryCode) return 'wise'; // Default to Wise for international
  
  // Ensure uppercase for comparison
  const country = countryCode.toUpperCase();
  
  // Check if country supports Plaid
  return PLAID_COUNTRIES.includes(country) ? 'plaid' : 'wise';
}

/**
 * Get display name for country
 * @param {string} countryCode - Two-letter country code
 * @returns {string} Country display name
 */
export function getCountryDisplayName(countryCode) {
  if (!countryCode) return 'International';
  
  const country = countryCode.toUpperCase();
  return COUNTRY_NAMES[country] || countryCode;
}

/**
 * Storage keys for persistence
 */
export const STORAGE_KEYS = {
  DETECTED_COUNTRY: 'banking_detected_country',
  SELECTED_COUNTRY: 'banking_selected_country',
  PROVIDER_OVERRIDE: 'banking_provider_override',
  DETECTION_TIMESTAMP: 'banking_detection_timestamp'
};

/**
 * Get cached country data
 * @returns {object|null} Cached country data or null
 */
export function getCachedCountryData() {
  try {
    const cachedCountry = localStorage.getItem(STORAGE_KEYS.DETECTED_COUNTRY);
    const timestamp = localStorage.getItem(STORAGE_KEYS.DETECTION_TIMESTAMP);
    
    if (cachedCountry && timestamp) {
      // Validate cached country isn't a bad value
      if (cachedCountry === 'null' || cachedCountry === 'undefined' || 
          cachedCountry === 'International' || cachedCountry === '') {
        console.log('🔍 [BankingProviders] Clearing invalid cached country:', cachedCountry);
        clearCountryCache();
        return null;
      }
      
      // Check if cache is less than 24 hours old
      const age = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age < maxAge) {
        return {
          country: cachedCountry,
          provider: getBankingProvider(cachedCountry),
          cached: true,
          age: age
        };
      } else {
        console.log('🔍 [BankingProviders] Cache expired, clearing...');
        clearCountryCache();
      }
    }
  } catch (error) {
    console.error('Error reading cached country data:', error);
  }
  
  return null;
}

/**
 * Cache country data
 * @param {string} countryCode - Two-letter country code
 */
export function cacheCountryData(countryCode) {
  try {
    localStorage.setItem(STORAGE_KEYS.DETECTED_COUNTRY, countryCode);
    localStorage.setItem(STORAGE_KEYS.DETECTION_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('Error caching country data:', error);
  }
}

/**
 * Clear cached country data
 */
export function clearCountryCache() {
  try {
    localStorage.removeItem(STORAGE_KEYS.DETECTED_COUNTRY);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_COUNTRY);
    localStorage.removeItem(STORAGE_KEYS.PROVIDER_OVERRIDE);
    localStorage.removeItem(STORAGE_KEYS.DETECTION_TIMESTAMP);
  } catch (error) {
    console.error('Error clearing country cache:', error);
  }
}

/**
 * Get user's manual country selection
 * @returns {string|null} Selected country code or null
 */
export function getUserSelectedCountry() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COUNTRY);
  } catch (error) {
    console.error('Error reading selected country:', error);
    return null;
  }
}

/**
 * Save user's manual country selection
 * @param {string} countryCode - Two-letter country code
 */
export function saveUserSelectedCountry(countryCode) {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_COUNTRY, countryCode);
    // Also update the detected country for consistency
    cacheCountryData(countryCode);
  } catch (error) {
    console.error('Error saving selected country:', error);
  }
}