/**
 * Utility for migrating legacy preferences from cookies/localStorage to Cognito attributes
 */

import { saveUserPreference, saveUserPreferences, PREF_KEYS } from '@/utils/userPreferences';
import { setCacheValue } from @/utils/appCache';
import { isMigrationComplete, markMigrationComplete } from '@/utils/migrationCompletionCheck';
import { logger } from '@/utils/logger';

// Legacy migration key
const LEGACY_MIGRATION_KEY = 'preferences_migrated';

/**
 * Migrates user preferences from cookies and localStorage to Cognito attributes
 * This is a one-time operation that should be called on app initialization
 * 
 * @returns {Promise<boolean>} True if migration was successful
 */
export async function migrateLegacyPreferences() {
  try {
    logger.info('[Migration] Starting legacy preferences migration');
    
    // Check if we've already migrated
    const alreadyMigrated = await isMigrationComplete(LEGACY_MIGRATION_KEY);
    if (alreadyMigrated) {
      logger.debug('[Migration] Preferences already migrated, skipping');
      return true;
    }
    
    // Collect legacy preferences
    const preferences = collectLegacyPreferences();
    
    if (Object.keys(preferences).length === 0) {
      logger.debug('[Migration] No legacy preferences found');
      await markMigrationComplete(LEGACY_MIGRATION_KEY);
      return true;
    }
    
    // Save collected preferences to Cognito
    const success = await saveUserPreferences(preferences);
    
    if (success) {
      logger.info('[Migration] Successfully migrated preferences to Cognito');
      
      // Clear legacy data from localStorage and cookies
      clearLegacyData(preferences);
      
      await markMigrationComplete(LEGACY_MIGRATION_KEY);
      return true;
    } else {
      logger.error('[Migration] Failed to migrate preferences to Cognito');
      return false;
    }
  } catch (error) {
    logger.error('[Migration] Error migrating preferences:', error);
    return false;
  }
}

/**
 * Collects legacy preferences from cookies and localStorage
 * 
 * @returns {Object} Object with Cognito attribute keys and values
 */
function collectLegacyPreferences() {
  const preferences = {};
  
  if (typeof window === 'undefined') return preferences;
  
  try {
    // Language preference
    if (typeof localStorage !== 'undefined') {
      const language = localStorage.getItem('i18nextLng');
      if (language) {
        preferences[PREF_KEYS.LANGUAGE] = language;
      }
    }
    
    // Check cookies for language preference
    const langCookie = getCookie('i18nextLng');
    if (langCookie && !preferences[PREF_KEYS.LANGUAGE]) {
      preferences[PREF_KEYS.LANGUAGE] = langCookie;
    }
    
    // Theme preference
    if (typeof localStorage !== 'undefined') {
      const theme = localStorage.getItem('color-theme');
      if (theme) {
        preferences[PREF_KEYS.THEME] = theme;
      }
    }
    
    // Onboarding status
    if (typeof localStorage !== 'undefined') {
      const onboardingStatus = localStorage.getItem('onboardedStatus') || 
                              localStorage.getItem('cognitoOnboardingStatus');
      if (onboardingStatus) {
        preferences[PREF_KEYS.ONBOARDING_STATUS] = onboardingStatus;
      }
    }
    
    // Check cookies for onboarding status
    const statusCookie = getCookie('onboardedStatus');
    if (statusCookie && !preferences[PREF_KEYS.ONBOARDING_STATUS]) {
      preferences[PREF_KEYS.ONBOARDING_STATUS] = statusCookie;
    }
    
    // Onboarding step
    if (typeof localStorage !== 'undefined') {
      const onboardingStep = localStorage.getItem('onboardingStep');
      if (onboardingStep) {
        preferences[PREF_KEYS.ONBOARDING_STEP] = onboardingStep;
      }
    }
    
    // Check cookies for onboarding step
    const stepCookie = getCookie('onboardingStep');
    if (stepCookie && !preferences[PREF_KEYS.ONBOARDING_STEP]) {
      preferences[PREF_KEYS.ONBOARDING_STEP] = stepCookie;
    }
    
    // Business name
    if (typeof localStorage !== 'undefined') {
      const businessName = localStorage.getItem('businessName');
      if (businessName) {
        preferences[PREF_KEYS.BUSINESS_NAME] = businessName;
      }
    }
    
    // Check cookies for business name
    const businessNameCookie = getCookie('businessName');
    if (businessNameCookie && !preferences[PREF_KEYS.BUSINESS_NAME]) {
      preferences[PREF_KEYS.BUSINESS_NAME] = businessNameCookie;
    }
    
    // Business type
    if (typeof localStorage !== 'undefined') {
      const businessType = localStorage.getItem('businessType');
      if (businessType) {
        preferences[PREF_KEYS.BUSINESS_TYPE] = businessType;
      }
    }
    
    // Check cookies for business type
    const businessTypeCookie = getCookie('businessType');
    if (businessTypeCookie && !preferences[PREF_KEYS.BUSINESS_TYPE]) {
      preferences[PREF_KEYS.BUSINESS_TYPE] = businessTypeCookie;
    }
    
    // Subscription plan
    if (typeof localStorage !== 'undefined') {
      const subscriptionPlan = localStorage.getItem('subscriptionPlan');
      if (subscriptionPlan) {
        preferences[PREF_KEYS.SUBSCRIPTION_PLAN] = subscriptionPlan;
      }
    }
    
    // Check cookies for subscription plan
    const planCookie = getCookie('subscriptionPlan');
    if (planCookie && !preferences[PREF_KEYS.SUBSCRIPTION_PLAN]) {
      preferences[PREF_KEYS.SUBSCRIPTION_PLAN] = planCookie;
    }
    
    // Tenant ID
    if (typeof localStorage !== 'undefined') {
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        preferences[PREF_KEYS.TENANT_ID] = tenantId;
      }
    }
    
    // Check cookies for tenant ID
    const tenantIdCookie = getCookie('tenantId');
    if (tenantIdCookie && !preferences[PREF_KEYS.TENANT_ID]) {
      preferences[PREF_KEYS.TENANT_ID] = tenantIdCookie;
    }
    
    // Also include UI preferences
    if (typeof localStorage !== 'undefined') {
      const uiScale = localStorage.getItem('ui-scale');
      if (uiScale) {
        preferences[PREF_KEYS.UI_SCALE] = uiScale;
      }
      
      const uiDensity = localStorage.getItem('ui-density');
      if (uiDensity) {
        preferences[PREF_KEYS.UI_DENSITY] = uiDensity;
      }
      
      const sidebarCollapsed = localStorage.getItem('sidebar-collapsed');
      if (sidebarCollapsed !== null) {
        preferences[PREF_KEYS.SIDEBAR_COLLAPSED] = sidebarCollapsed;
      }
    }
    
    // Log the collected preferences for debugging
    logger.debug('[Migration] Collected legacy preferences:', 
      Object.keys(preferences).length ? preferences : 'None found');
    
    return preferences;
  } catch (error) {
    logger.error('[Migration] Error collecting legacy preferences:', error);
    return preferences;
  }
}

/**
 * Helper to get cookie value by name
 * 
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  
  return null;
}

/**
 * Clear legacy data from localStorage and cookies after successful migration
 * 
 * @param {Object} migratedPreferences - The preferences that were migrated
 */
function clearLegacyData(migratedPreferences) {
  if (typeof window === 'undefined') return;
  
  try {
    logger.info('[Migration] Clearing legacy data from localStorage and cookies');
    
    // Create a mapping of preference keys to localStorage/cookie keys
    const storageMappings = {
      [PREF_KEYS.LANGUAGE]: ['i18nextLng'],
      [PREF_KEYS.THEME]: ['color-theme', 'theme'],
      [PREF_KEYS.ONBOARDING_STATUS]: ['onboardedStatus', 'cognitoOnboardingStatus'],
      [PREF_KEYS.ONBOARDING_STEP]: ['onboardingStep'],
      [PREF_KEYS.BUSINESS_NAME]: ['businessName'],
      [PREF_KEYS.BUSINESS_TYPE]: ['businessType'],
      [PREF_KEYS.SUBSCRIPTION_PLAN]: ['subscriptionPlan', 'subplan'],
      [PREF_KEYS.TENANT_ID]: ['tenantId', 'businessid'],
      [PREF_KEYS.UI_SCALE]: ['ui-scale'],
      [PREF_KEYS.UI_DENSITY]: ['ui-density'],
      [PREF_KEYS.SIDEBAR_COLLAPSED]: ['sidebar-collapsed']
    };
    
    // Clear migrated data from localStorage
    if (typeof localStorage !== 'undefined') {
      Object.entries(migratedPreferences).forEach(([prefKey, value]) => {
        const storageKeys = storageMappings[prefKey] || [];
        storageKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
            logger.debug(`[Migration] Removed localStorage item: ${key}`);
          } catch (e) {
            logger.warn(`[Migration] Error removing localStorage item ${key}:`, e);
          }
        });
      });
    }
    
    // Clear migrated data from cookies
    if (typeof document !== 'undefined') {
      Object.entries(migratedPreferences).forEach(([prefKey, value]) => {
        const storageKeys = storageMappings[prefKey] || [];
        storageKeys.forEach(key => {
          try {
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
            logger.debug(`[Migration] Removed cookie: ${key}`);
          } catch (e) {
            logger.warn(`[Migration] Error removing cookie ${key}:`, e);
          }
        });
      });
    }
    
    logger.info('[Migration] Successfully cleared legacy data');
  } catch (error) {
    logger.error('[Migration] Error clearing legacy data:', error);
  }
} 