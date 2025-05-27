/**
 * User Preferences Utility
 * 
 * Handles Cognito user attributes for all preferences
 * Uses AppCache for better performance with Cognito for persistence
 */

import { fetchUserAttributes, updateUserAttributes  } from '@/config/amplifyUnified';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

// Cache TTL in milliseconds (30 days)
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Preference keys with Cognito custom: prefix
export const PREF_KEYS = {
  // User profile
  LANGUAGE: 'custom:language',
  THEME: 'custom:theme',
  BUSINESS_NAME: 'custom:businessname',
  BUSINESS_TYPE: 'custom:businesstype',
  TENANT_ID: 'custom:tenant_ID',
  
  // UI preferences
  UI_SCALE: 'custom:ui_scale',
  UI_DENSITY: 'custom:ui_density',
  SIDEBAR_COLLAPSED: 'custom:sidebar_collapsed',
  
  // Feature preferences
  ONBOARDING_STATUS: 'custom:onboarding',
  ONBOARDING_STEP: 'custom:onboarding_step',
  SUBSCRIPTION_PLAN: 'custom:subscription',
  
  // Migration flags
  PREFERENCES_MIGRATED: 'custom:preferences_migrated',
  UI_PREFERENCES_MIGRATED: 'custom:ui_preferences_migrated',
  
  // Consent settings
  COOKIE_CONSENT: 'custom:cookie_consent',
  ANALYTICS_CONSENT: 'custom:analytics_consent',
  MARKETING_CONSENT: 'custom:marketing_consent'
};

/**
 * Get a user preference from Cognito
 * Uses AppCache for better performance
 * 
 * @param {string} prefKey - The preference key (must include 'custom:' prefix)
 * @param {string} defaultValue - Default value if preference is not set
 * @returns {Promise<string>} The preference value
 */
export async function getUserPreference(prefKey, defaultValue = null) {
  try {
    if (!prefKey) {
      throw new Error('Preference key is required');
    }
    
    // Check AppCache first
    const cacheKey = `user_pref_${prefKey}`;
    const cachedValue = getCacheValue(cacheKey);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // If not in cache, fetch from Cognito
    const attributes = await fetchUserAttributes();
    const value = attributes[prefKey] || defaultValue;
    
    // Update AppCache
    if (value !== null) {
      setCacheValue(cacheKey, value, { ttl: CACHE_TTL });
    }
    
    return value;
  } catch (error) {
    logger.error(`[userPreferences] Error getting preference "${prefKey}":`, error);
    return defaultValue;
  }
}

/**
 * Save a user preference to Cognito
 * Updates AppCache and Cognito
 * 
 * @param {string} prefKey - The preference key (must include 'custom:' prefix)
 * @param {string} value - The value to save
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreference(prefKey, value) {
  try {
    if (!prefKey) {
      throw new Error('Preference key is required');
    }
    
    // Validate key has custom: prefix
    if (!prefKey.startsWith('custom:')) {
      throw new Error('Preference key must start with "custom:"');
    }
    
    // Update AppCache immediately
    const cacheKey = `user_pref_${prefKey}`;
    setCacheValue(cacheKey, value, { ttl: CACHE_TTL });
    
    // Save to Cognito
    await updateUserAttributes({
      userAttributes: {
        [prefKey]: value !== null && value !== undefined ? String(value) : ''
      }
    });
    
    logger.debug(`[userPreferences] Preference saved: ${prefKey}=${value}`);
    return true;
  } catch (error) {
    logger.error(`[userPreferences] Error saving preference "${prefKey}":`, error);
    return false;
  }
}

/**
 * Save multiple user preferences to Cognito in a single call
 * 
 * @param {Object} preferences - Object with preference key/value pairs
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreferences(preferences) {
  try {
    if (!preferences || Object.keys(preferences).length === 0) {
      throw new Error('Preferences object is required');
    }
    
    // Format attributes for Cognito
    const userAttributes = {};
    
    // Update AppCache for each preference
    Object.entries(preferences).forEach(([key, value]) => {
      const prefKey = key.startsWith('custom:') ? key : `custom:${key}`;
      userAttributes[prefKey] = value !== null && value !== undefined ? String(value) : '';
      
      // Update AppCache
      const cacheKey = `user_pref_${prefKey}`;
      setCacheValue(cacheKey, value, { ttl: CACHE_TTL });
    });
    
    // Save to Cognito in a single call
    await updateUserAttributes({ userAttributes });
    
    logger.debug(`[userPreferences] Multiple preferences saved: ${Object.keys(preferences).join(', ')}`);
    return true;
  } catch (error) {
    logger.error('[userPreferences] Error saving multiple preferences:', error);
    return false;
  }
}

// ----------------------
// Specific preference getters and setters
// ----------------------

/**
 * Get the user's theme preference
 * 
 * @param {string} defaultTheme - Default theme if preference is not set
 * @returns {Promise<string>} The theme preference ('light', 'dark', or 'system')
 */
export async function getThemePreference(defaultTheme = 'system') {
  return getUserPreference(PREF_KEYS.THEME, defaultTheme);
}

/**
 * Save the user's theme preference
 * 
 * @param {string} theme - The theme preference ('light', 'dark', or 'system')
 * @returns {Promise<boolean>} True if successful
 */
export async function saveThemePreference(theme) {
  return saveUserPreference(PREF_KEYS.THEME, theme);
}

/**
 * Get the user's language preference
 * 
 * @param {string} defaultLanguage - Default language if preference is not set
 * @returns {Promise<string>} The language code
 */
export async function getLanguagePreference(defaultLanguage = 'en') {
  return getUserPreference(PREF_KEYS.LANGUAGE, defaultLanguage);
}

/**
 * Save the user's language preference
 * 
 * @param {string} language - The language code
 * @returns {Promise<boolean>} True if successful
 */
export async function saveLanguagePreference(language) {
  return saveUserPreference(PREF_KEYS.LANGUAGE, language);
}

/**
 * Get the user's UI scale preference
 * 
 * @param {string} defaultScale - Default scale if preference is not set
 * @returns {Promise<string>} The UI scale value ('75', '100', '125', or '150')
 */
export async function getUIScalePreference(defaultScale = '100') {
  return getUserPreference(PREF_KEYS.UI_SCALE, defaultScale);
}

/**
 * Save the user's UI scale preference
 * 
 * @param {string} scale - The UI scale value ('75', '100', '125', or '150')
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUIScalePreference(scale) {
  return saveUserPreference(PREF_KEYS.UI_SCALE, scale);
}

/**
 * Get the user's UI density preference
 * 
 * @param {string} defaultDensity - Default density if preference is not set
 * @returns {Promise<string>} The UI density value ('compact', 'normal', or 'comfortable')
 */
export async function getUIDensityPreference(defaultDensity = 'normal') {
  return getUserPreference(PREF_KEYS.UI_DENSITY, defaultDensity);
}

/**
 * Save the user's UI density preference
 * 
 * @param {string} density - The UI density value ('compact', 'normal', or 'comfortable')
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUIDensityPreference(density) {
  return saveUserPreference(PREF_KEYS.UI_DENSITY, density);
}

/**
 * Get the user's sidebar collapsed state
 * 
 * @param {boolean} defaultCollapsed - Default state if preference is not set
 * @returns {Promise<boolean>} True if sidebar is collapsed
 */
export async function getSidebarCollapsedState(defaultCollapsed = false) {
  const value = await getUserPreference(PREF_KEYS.SIDEBAR_COLLAPSED, String(defaultCollapsed));
  return value === 'true';
}

/**
 * Save the user's sidebar collapsed state
 * 
 * @param {boolean} isCollapsed - True if sidebar is collapsed
 * @returns {Promise<boolean>} True if successful
 */
export async function saveSidebarCollapsedState(isCollapsed) {
  return saveUserPreference(PREF_KEYS.SIDEBAR_COLLAPSED, String(isCollapsed));
}

/**
 * Get the user's onboarding status
 * 
 * @param {string} defaultStatus - Default status if preference is not set
 * @returns {Promise<string>} The onboarding status ('not_started', 'in_progress', or 'completed')
 */
export async function getOnboardingStatus(defaultStatus = 'not_started') {
  return getUserPreference(PREF_KEYS.ONBOARDING_STATUS, defaultStatus);
}

/**
 * Get the user's current onboarding step
 * 
 * @param {string} defaultStep - Default step if preference is not set
 * @returns {Promise<string>} The onboarding step
 */
export async function getOnboardingStep(defaultStep = 'business_info') {
  return getUserPreference(PREF_KEYS.ONBOARDING_STEP, defaultStep);
}

/**
 * Update the user's onboarding data
 * 
 * @param {Object} data - Object with status and step properties
 * @returns {Promise<boolean>} True if successful
 */
export async function updateOnboardingData(data) {
  const attributes = {};
  
  if (data.status) {
    attributes[PREF_KEYS.ONBOARDING_STATUS] = data.status;
  }
  
  if (data.step) {
    attributes[PREF_KEYS.ONBOARDING_STEP] = data.step;
  }
  
  return saveUserPreferences(attributes);
}

/**
 * Create a Cognito-based language detector for i18next
 * 
 * @returns {Object} A language detector compatible with i18next
 */
export function getCognitoLanguageDetector() {
  return {
    name: 'cognitoDetector',
    
    lookup: async function() {
      try {
        // Check if we're on a public page - skip Cognito lookup
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
          if (publicPaths.includes(path) || path.startsWith('/auth/')) {
            // On public pages, just check local cache/storage
            const cachedLang = getCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`);
            if (cachedLang) return cachedLang;
            
            // Check localStorage as fallback
            if (typeof localStorage !== 'undefined') {
              const localLang = localStorage.getItem('i18nextLng');
              if (localLang) return localLang;
            }
            
            return null; // Let other detectors handle it
          }
        }
        
        // Check AppCache first
        const cachedLang = getCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`);
        if (cachedLang) {
          return cachedLang;
        }
        
        // If not in cache, get from Cognito (only for authenticated pages)
        const langPref = await getLanguagePreference();
        if (langPref) {
          return langPref;
        }
        
        // Check for old localStorage preference (for migration)
        if (typeof localStorage !== 'undefined') {
          const localLang = localStorage.getItem('i18nextLng');
          if (localLang) {
            // Attempt to save to Cognito in the background
            saveLanguagePreference(localLang)
              .then(() => {
                // Update AppCache
                setCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`, localLang);
              })
              .catch(err => {
                logger.error('[i18n] Error saving migrated language preference:', err);
              });
            
            return localLang;
          }
        }
        
        return null;
      } catch (error) {
        logger.error('[i18n] Error in Cognito language detector:', error);
        return null;
      }
    },
    
    cacheUserLanguage: function(lng) {
      // Save to Cognito
      saveLanguagePreference(lng)
        .then(() => {
          // Update AppCache
          setCacheValue(`user_pref_${PREF_KEYS.LANGUAGE}`, lng);
        })
        .catch(err => {
          logger.error('[i18n] Error saving language preference:', err);
        });
    }
  };
} 