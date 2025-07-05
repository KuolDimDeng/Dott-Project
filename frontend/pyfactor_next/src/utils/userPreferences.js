/**
 * User Preferences Utility - Auth0 Compatible Version
 * 
 * Handles Cognito user attributes for all preferences
 * Uses AppCache for better performance with Cognito for persistence
 */

import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from @/utils/appCache';

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Preference keys
export const PREF_KEYS = {
  THEME: 'custom:theme',
  LANGUAGE: 'custom:detected_language',
  COUNTRY: 'custom:country',
  IS_DEVELOPING_COUNTRY: 'custom:is_developing_country',
  UI_SCALE: 'custom:ui_scale',
  UI_DENSITY: 'custom:ui_density',
  SIDEBAR_COLLAPSED: 'custom:sidebar_collapsed',
  ONBOARDING_STATUS: 'custom:onboarding_status',
  ONBOARDING_STEP: 'custom:onboarding_step',
  FREE_PLAN_ONBOARDING_COMPLETE: 'custom:free_plan_onboarding_complete',
  LAST_TAB: 'custom:last_tab',
  INVOICE_VIEW: 'custom:invoice_view',
  RLS_MIGRATED: 'custom:rls_migrated',
  MIGRATION_COMPLETED: 'custom:migration_completed'
};

// Storage helpers
const STORAGE_PREFIX = 'dott_pref_';

function getStorageKey(prefKey) {
  return `${STORAGE_PREFIX}${prefKey.replace('custom:', '')}`;
}

function getFromStorage(key) {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Check if expired
    if (parsed.expires && Date.now() > parsed.expires) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch (error) {
    logger.error(`Error reading from storage: ${key}`, error);
    return null;
  }
}

function saveToStorage(key, value, ttl = CACHE_TTL) {
  try {
    if (typeof window === 'undefined') return;
    const data = {
      value,
      expires: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.error(`Error saving to storage: ${key}`, error);
  }
}

/**
 * Get a user preference from storage
 * 
 * @param {string} prefKey - The preference key (with custom: prefix)
 * @param {*} defaultValue - Default value if preference is not set
 * @returns {Promise<*>} The preference value
 */
export async function getUserPreference(prefKey, defaultValue = null) {
  try {
    // First check cache
    const cacheKey = `user_pref_${prefKey}`;
    let cachedValue = getCacheValue(cacheKey);
    
    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Check localStorage
    const storageKey = getStorageKey(prefKey);
    const storedValue = getFromStorage(storageKey);
    
    if (storedValue !== null && storedValue !== undefined) {
      // Update cache
      setCacheValue(cacheKey, storedValue, { ttl: CACHE_TTL });
      return storedValue;
    }
    
    // Return default value
    logger.debug(`[userPreferences] Using default value for ${prefKey}: ${defaultValue}`);
    return defaultValue;
    
  } catch (error) {
    logger.error(`[userPreferences] Error getting preference "${prefKey}":`, error);
    return defaultValue;
  }
}

/**
 * Save a user preference to storage
 * 
 * @param {string} prefKey - The preference key (with custom: prefix)
 * @param {*} value - The value to save
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreference(prefKey, value) {
  try {
    // Update localStorage
    const storageKey = getStorageKey(prefKey);
    saveToStorage(storageKey, value);
    
    // Update cache
    const cacheKey = `user_pref_${prefKey}`;
    setCacheValue(cacheKey, value, { ttl: CACHE_TTL });
    
    logger.debug(`[userPreferences] Preference saved: ${prefKey}=${value}`);
    
    // Optionally sync to backend (non-blocking)
    syncPreferenceToBackend(prefKey, value).catch(error => {
      logger.debug('[userPreferences] Background sync failed:', error);
    });
    
    return true;
  } catch (error) {
    logger.error(`[userPreferences] Error saving preference "${prefKey}":`, error);
    return false;
  }
}

/**
 * Save multiple user preferences at once
 * 
 * @param {Object} preferences - Object with preference key/value pairs
 * @returns {Promise<boolean>} True if successful
 */
export async function saveUserPreferences(preferences) {
  try {
    if (!preferences || Object.keys(preferences).length === 0) {
      throw new Error('Preferences object is required');
    }
    
    // Save each preference
    let allSuccessful = true;
    for (const [key, value] of Object.entries(preferences)) {
      const prefKey = key.startsWith('custom:') ? key : `custom:${key}`;
      const success = await saveUserPreference(prefKey, value);
      if (!success) allSuccessful = false;
    }
    
    logger.debug(`[userPreferences] Multiple preferences saved: ${Object.keys(preferences).join(', ')}`);
    return allSuccessful;
  } catch (error) {
    logger.error('[userPreferences] Error saving multiple preferences:', error);
    return false;
  }
}

/**
 * Sync preference to backend (optional, non-blocking)
 */
async function syncPreferenceToBackend(prefKey, value) {
  try {
    // Only sync if user is authenticated
    const response = await fetch('/api/auth/session');
    if (!response.ok) return; // Not authenticated, skip sync
    
    const sessionData = await response.json();
    if (!sessionData.user) return; // Not authenticated, skip sync
    
    // Sync to backend
    await fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [prefKey]: value
      })
    });
  } catch (error) {
    // Silent fail for background sync
    logger.debug('[userPreferences] Background sync error:', error);
  }
}

// ----------------------
// Specific preference getters and setters
// ----------------------

/**
 * Get the user's theme preference
 */
export async function getThemePreference(defaultTheme = 'system') {
  return getUserPreference(PREF_KEYS.THEME, defaultTheme);
}

/**
 * Save the user's theme preference
 */
export async function saveThemePreference(theme) {
  return saveUserPreference(PREF_KEYS.THEME, theme);
}

/**
 * Get the user's language preference
 */
export async function getLanguagePreference(defaultLanguage = 'en') {
  return getUserPreference(PREF_KEYS.LANGUAGE, defaultLanguage);
}

/**
 * Save the user's language preference
 */
export async function saveLanguagePreference(language) {
  return saveUserPreference(PREF_KEYS.LANGUAGE, language);
}

/**
 * Get the user's UI scale preference
 */
export async function getUIScalePreference(defaultScale = '100') {
  return getUserPreference(PREF_KEYS.UI_SCALE, defaultScale);
}

/**
 * Save the user's UI scale preference
 */
export async function saveUIScalePreference(scale) {
  return saveUserPreference(PREF_KEYS.UI_SCALE, scale);
}

/**
 * Get the user's UI density preference
 */
export async function getUIDensityPreference(defaultDensity = 'normal') {
  return getUserPreference(PREF_KEYS.UI_DENSITY, defaultDensity);
}

/**
 * Save the user's UI density preference
 */
export async function saveUIDensityPreference(density) {
  return saveUserPreference(PREF_KEYS.UI_DENSITY, density);
}

/**
 * Get the user's sidebar collapsed state
 */
export async function getSidebarCollapsedState(defaultCollapsed = false) {
  return getUserPreference(PREF_KEYS.SIDEBAR_COLLAPSED, defaultCollapsed);
}

/**
 * Save the user's sidebar collapsed state
 */
export async function saveSidebarCollapsedState(isCollapsed) {
  return saveUserPreference(PREF_KEYS.SIDEBAR_COLLAPSED, isCollapsed);
}

/**
 * Get the user's onboarding status
 */
export async function getOnboardingStatus(defaultStatus = 'not_started') {
  return getUserPreference(PREF_KEYS.ONBOARDING_STATUS, defaultStatus);
}

/**
 * Get the user's current onboarding step
 */
export async function getOnboardingStep(defaultStep = 'business_info') {
  return getUserPreference(PREF_KEYS.ONBOARDING_STEP, defaultStep);
}

/**
 * Update onboarding data
 */
export async function updateOnboardingData(data) {
  const attributes = {};
  
  if (data.status !== undefined) {
    attributes[PREF_KEYS.ONBOARDING_STATUS] = data.status;
  }
  if (data.step !== undefined) {
    attributes[PREF_KEYS.ONBOARDING_STEP] = data.step;
  }
  if (data.freePlanComplete !== undefined) {
    attributes[PREF_KEYS.FREE_PLAN_ONBOARDING_COMPLETE] = data.freePlanComplete;
  }
  
  return saveUserPreferences(attributes);
}

/**
 * Get language detector for i18n (Auth0 compatible)
 */
export function getCognitoLanguageDetector() {
  return {
    name: 'auth0LanguageDetector',
    lookup: async () => {
      try {
        const lang = await getLanguagePreference();
        return lang || 'en';
      } catch (error) {
        logger.error('[languageDetector] Error getting language preference:', error);
        return 'en';
      }
    },
    cacheUserLanguage: async (lng) => {
      try {
        await saveLanguagePreference(lng);
      } catch (error) {
        logger.error('[languageDetector] Error saving language preference:', error);
      }
    }
  };
} 