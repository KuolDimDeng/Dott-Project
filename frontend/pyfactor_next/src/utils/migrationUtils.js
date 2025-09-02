import { logger } from '@/utils/logger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';
// Auth0 authentication is handled via useSession hook
import { removeCacheValue, setCacheValue } from './appCache';
import { resilientUpdateUserAttributes } from './amplifyResiliency';

/**
 * Utility functions to help migrate from cookie/localStorage to Cognito attributes
 */

/**
 * Migrates user data from cookies/localStorage to Cognito attributes
 * @returns {Promise<Object>} Result of the migration
 */
export async function migrateUserDataToCognito() {
  logger.info('[Migration] Starting migration of user data to Cognito');
  
  try {
    const migratedData = {};
    
    // Import userPreferences utils
    const { saveUserPreference, PREF_KEYS } = await import('@/utils/userPreferences');
    const { setCacheValue } = await import('@/utils/appCache');
    
    // Check and migrate tenantId from cookies or localStorage
    const localTenantId = getCookie('tenantId') || localStorage.getItem('tenantId');
    if (localTenantId) {
      migratedData.tenantId = localTenantId;
      
      // Check if the tenantId already exists in Cognito
      const cognitoTenantId = await getTenantIdFromCognito();
      if (!cognitoTenantId || cognitoTenantId !== localTenantId) {
        // Update the tenant ID in Cognito
        await updateTenantIdInCognito(localTenantId);
      }
      
      // Also set it in AppCache
      setCacheValue('tenant_id', localTenantId);
    }
    
    // Check and migrate onboarding status
    const onboardingStatus = getCookie('onboardingStep') || localStorage.getItem('onboardingStep');
    if (onboardingStatus) {
      migratedData.onboardingStatus = onboardingStatus;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.ONBOARDING_STATUS, onboardingStatus);
      
      // Also set in AppCache
      setCacheValue('onboarding_status', onboardingStatus);
    }
    
    // Check and migrate setup completed status
    const setupCompleted = localStorage.getItem('setupCompleted') === 'true' || 
                          getCookie('setupCompleted') === 'true';
    if (setupCompleted) {
      migratedData.setupCompleted = setupCompleted;
      
      // Save to Cognito
      await saveUserPreference('custom:setupdone', 'true');
      
      // Also set in AppCache
      setCacheValue('setup_completed', true);
    }
    
    // Check and migrate business information
    const businessName = localStorage.getItem('businessName') || getCookie('businessName');
    if (businessName) {
      migratedData.businessName = businessName;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.BUSINESS_NAME, businessName);
      
      // Also set in AppCache
      setCacheValue('business_name', businessName);
    }
    
    const businessType = localStorage.getItem('businessType') || getCookie('businessType');
    if (businessType) {
      migratedData.businessType = businessType;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.BUSINESS_TYPE, businessType);
      
      // Also set in AppCache
      setCacheValue('business_type', businessType);
    }
    
    // UI Preferences Migration
    
    // Theme preference
    const theme = localStorage.getItem('color-theme') || getCookie('theme');
    if (theme) {
      migratedData.theme = theme;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.THEME, theme);
      
      // Also set in AppCache
      setCacheValue('user_theme', theme);
    }
    
    // UI Scale preference
    const uiScale = localStorage.getItem('ui-scale') || getCookie('ui-scale');
    if (uiScale) {
      migratedData.uiScale = uiScale;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.UI_SCALE, uiScale);
      
      // Also set in AppCache
      setCacheValue('ui_scale', uiScale);
    }
    
    // UI Density preference
    const uiDensity = localStorage.getItem('ui-density') || getCookie('ui-density');
    if (uiDensity) {
      migratedData.uiDensity = uiDensity;
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.UI_DENSITY, uiDensity);
      
      // Also set in AppCache
      setCacheValue('ui_density', uiDensity);
    }
    
    // Sidebar collapsed state
    const sidebarCollapsed = localStorage.getItem('sidebar-collapsed');
    if (sidebarCollapsed !== null) {
      migratedData.sidebarCollapsed = sidebarCollapsed === 'true' ? 'true' : 'false';
      
      // Save to Cognito
      await saveUserPreference(PREF_KEYS.SIDEBAR_COLLAPSED, sidebarCollapsed === 'true' ? 'true' : 'false');
      
      // Also set in AppCache
      setCacheValue('sidebar_collapsed', sidebarCollapsed === 'true');
    }
    
    // Set migration timestamp in Cognito
    await saveUserPreference('custom:migration_timestamp', new Date().toISOString());
    
    // Mark migration as complete in Cognito
    await saveUserPreference(PREF_KEYS.PREFERENCES_MIGRATED, 'true');
    
    // Set migration flags in AppCache
    setCacheValue('preferences_migrated', 'true');
    setCacheValue('migration_timestamp', new Date().toISOString());
    
    // No need to call API endpoint as we've set everything in Cognito directly
    
    // Clear cookies and localStorage after successful migration
    if (Object.keys(migratedData).length > 0) {
      clearMigratedLocalData(migratedData);
    }
    
    return {
      success: true,
      migratedData,
      message: 'User data successfully migrated to Cognito attributes',
    };
  } catch (error) {
    logger.error('[Migration] Failed to migrate user data to Cognito', {
      error: error.message,
      stack: error.stack,
    });
    
    return {
      success: false,
      error: error,
      message: error.message || 'Failed to migrate user data to Cognito',
    };
  }
}

/**
 * Clears migrated data from cookies, localStorage, and AppCache
 * @param {Object} migratedData The data that was migrated
 */
function clearMigratedLocalData(migratedData) {
  try {
    // Clear from AppCache first
    if (migratedData.tenantId) {
      removeCacheValue('tenantId');
    }
    if (migratedData.onboardingStatus) {
      removeCacheValue('onboardingStep');
    }
    if (migratedData.setupCompleted !== undefined) {
      removeCacheValue('setupCompleted');
    }
    if (migratedData.businessName) {
      removeCacheValue('businessName');
    }
    if (migratedData.businessType) {
      removeCacheValue('businessType');
    }
    
    // Clear UI preferences from AppCache
    if (migratedData.theme) {
      removeCacheValue('color-theme');
    }
    if (migratedData.uiScale) {
      removeCacheValue('ui-scale');
    }
    if (migratedData.uiDensity) {
      removeCacheValue('ui-density');
    }
    if (migratedData.sidebarCollapsed !== undefined) {
      removeCacheValue('sidebar-collapsed');
    }
    
    // Clear from localStorage (legacy)
    if (migratedData.tenantId) {
      localStorage.removeItem('tenantId');
    }
    if (migratedData.onboardingStatus) {
      localStorage.removeItem('onboardingStep');
    }
    if (migratedData.setupCompleted !== undefined) {
      localStorage.removeItem('setupCompleted');
    }
    if (migratedData.businessName) {
      localStorage.removeItem('businessName');
    }
    if (migratedData.businessType) {
      localStorage.removeItem('businessType');
    }
    
    // Clear UI preferences from localStorage
    if (migratedData.theme) {
      localStorage.removeItem('color-theme');
    }
    if (migratedData.uiScale) {
      localStorage.removeItem('ui-scale');
    }
    if (migratedData.uiDensity) {
      localStorage.removeItem('ui-density');
    }
    if (migratedData.sidebarCollapsed !== undefined) {
      localStorage.removeItem('sidebar-collapsed');
    }
    
    // Clear from cookies
    if (migratedData.tenantId) {
      document.cookie = 'tenantId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.onboardingStatus) {
      document.cookie = 'onboardingStep=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.setupCompleted !== undefined) {
      document.cookie = 'setupCompleted=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.businessName) {
      document.cookie = 'businessName=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.businessType) {
      document.cookie = 'businessType=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    // Clear UI preferences from cookies
    if (migratedData.theme) {
      document.cookie = 'theme=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.uiScale) {
      document.cookie = 'ui-scale=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.uiDensity) {
      document.cookie = 'ui-density=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.sidebarCollapsed !== undefined) {
      document.cookie = 'sidebar-collapsed=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    logger.info('[Migration] Cleared migrated data from AppCache, localStorage and cookies');
  } catch (error) {
    logger.error('[Migration] Error clearing local data after migration:', error);
  }
}

/**
 * Helper function to get a cookie value by name
 * @param {string} name The name of the cookie
 * @returns {string|null} The cookie value or null if not found
 */
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

/**
 * Utility functions for cleaning up legacy cookie and localStorage data
 */

/**
 * Clears all legacy cookies and localStorage items that have been migrated to Cognito
 * Call this after successful authentication to clean up old data
 */
export async function clearLegacyStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    logger.info('[migrationUtils] Clearing all legacy cookies, localStorage, and AppCache data');
    
    // Clear cookies - expanded to include all possible cookies
    const cookiesToClear = [
      // Tenant IDs and Business info
      'tenantId', 'businessid', 'businessName', 'businessType', 'businessSubtypes',
      'business_name', 'business_type', 'country', 'business_country', 'business_state',
      'legalStructure', 'dateFounded', 'business_date_founded',
      
      // Auth tokens
      'idToken', 'accessToken', 'refreshToken', 'authToken', 'tokenExpires', 'tokenTimestamp',
      'token', // Include token explicitly
      
      // Onboarding status
      'onboardingStep', 'onboardedStatus', 'setupCompleted', 'businessInfoCompleted', 
      'subscriptionCompleted', 'paymentCompleted', 'tokenExpired', 'freePlanSelected',
      'navigatingTo', 'onboardingInProgress',
      
      // Subscription info
      'subscriptionPlan', 'subscriptionInterval', 'subplan', 'billingCycle', 'subprice',
      
      // User info
      'email', 'userEmail', 'first_name', 'firstName', 'given_name', 
    ];
    
    // Clear all cookies
    for (const name of cookiesToClear) {
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; SameSite=Lax;`;
    }
    
    // Also clear all cookies by getting all and expiring them
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; SameSite=Lax;`;
    });
    
    // Clear AppCache and localStorage items - expanded list
    const itemsToClear = [
      // Tenant IDs and Business info
      'tenantId', 'businessid', 'businessName', 'businessType', 'businessSubtypes',
      'business_name', 'business_type', 'country', 'business_country', 'business_state',
      'legalStructure', 'dateFounded', 'business_date_founded',
      
      // Auth tokens
      'idToken', 'accessToken', 'refreshToken', 'authToken', 'tokenExpires', 'tokenTimestamp',
      'token', // Explicitly include token
      
      // Onboarding status
      'onboardingStep', 'onboardedStatus', 'setupCompleted', 'businessInfoCompleted', 
      'subscriptionCompleted', 'paymentCompleted', 'freePlanSelected',
      'navigatingTo', 'onboardingInProgress',
      
      // UI preferences
      'color-theme', 'ui-scale', 'ui-density', 'sidebar-collapsed',
      
      // Languages and localization
      'i18nextLng', 'language',
      
      // Session data
      'lastVisitedPage', 'dashboard_version', 'tour_completed',
      
      // User preferences (these should all be in Cognito)
      'user_settings', 'user_preferences', 'dashboard_preferences',
    ];
    
    // Clear all specified localStorage items
    for (const item of itemsToClear) {
      localStorage.removeItem(item);
      removeCacheValue(item);
    }
    
    // Keep the migration flags in AppCache for backwards compatibility
    // This helps prevent repeated migration attempts
    setCacheValue('migration_to_cognito_completed', 'true');
    setCacheValue('migration_to_cognito_timestamp', new Date().toISOString());
    
    // Also keep in localStorage for older components
    localStorage.setItem('migration_to_cognito_completed', 'true');
    localStorage.setItem('migration_to_cognito_timestamp', new Date().toISOString());
    
    // Import userPreferences to confirm migration status in Cognito
    const { saveUserPreference, PREF_KEYS } = await import('@/utils/userPreferences');
    await saveUserPreference(PREF_KEYS.PREFERENCES_MIGRATED, 'true');
    
    logger.info('[migrationUtils] Successfully cleared legacy data');
    return true;
  } catch (error) {
    logger.error('[migrationUtils] Error clearing legacy data:', error);
    return false;
  }
}

/**
 * Gets user attributes from Cognito
 * @returns {Promise<Object>} User attributes
 */
export async function getUserAttributes() {
  try {
    const userAttributes = {}; // Removed Amplify - using Auth0
  } catch (error) {
    logger.error('[Migration] Failed to get user attributes', error);
    throw error;
  }
}

/**
 * Updates Cognito attributes for the current user
 * @param {Object} attributes The attributes to update
 * @returns {Promise<Object>} Result of the update
 */
export async function updateCognitoAttributes(attributes) {
  try {
    logger.debug('[Migration] Updating Cognito attributes using resilient implementation');
    const result = await resilientUpdateUserAttributes({
      userAttributes: attributes
    });
    return result;
  } catch (error) {
    logger.error('[Migration] Failed to update Cognito attributes', error);
    throw error;
  }
} 