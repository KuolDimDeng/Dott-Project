/**
 * UI Preferences Migration Utility
 * 
 * Migrates UI preferences from localStorage/cookies to Cognito attributes
 */

import { logger } from '@/utils/logger';
import { saveThemePreference, saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { isMigrationComplete, markMigrationComplete } from '@/utils/migrationCompletionCheck';

// UI preferences migration key
const UI_MIGRATION_KEY = 'ui_preferences_migrated';

/**
 * Migrates UI-related preferences from cookies/localStorage to Cognito attributes
 * This is a one-time operation that should be called during app initialization
 * 
 * @returns {Promise<boolean>} True if migration was successful
 */
export async function migrateUIPreferences() {
  try {
    logger.info('[UIPreferences] Starting UI preferences migration');
    
    // Check if we've already migrated
    const alreadyMigrated = await isMigrationComplete(UI_MIGRATION_KEY);
    if (alreadyMigrated) {
      logger.debug('[UIPreferences] UI preferences already migrated, skipping');
      return true;
    }
    
    // Collect UI preferences from localStorage/cookies
    const uiPreferences = await collectUIPreferences();
    
    if (Object.keys(uiPreferences).length === 0) {
      logger.debug('[UIPreferences] No UI preferences found to migrate');
      await markMigrationComplete(UI_MIGRATION_KEY);
      return true;
    }
    
    // Process each preference type
    let migrationSuccess = true;
    
    // Migrate theme preference
    if (uiPreferences.theme) {
      try {
        await saveThemePreference(uiPreferences.theme);
        logger.debug(`[UIPreferences] Successfully migrated theme preference: ${uiPreferences.theme}`);
      } catch (error) {
        logger.error('[UIPreferences] Failed to migrate theme preference:', error);
        migrationSuccess = false;
      }
    }
    
    // Migrate UI scale preference
    if (uiPreferences.uiScale) {
      try {
        await saveUserPreference('custom:ui_scale', uiPreferences.uiScale);
        logger.debug(`[UIPreferences] Successfully migrated UI scale preference: ${uiPreferences.uiScale}`);
      } catch (error) {
        logger.error('[UIPreferences] Failed to migrate UI scale preference:', error);
        migrationSuccess = false;
      }
    }
    
    // Migrate UI density preference
    if (uiPreferences.uiDensity) {
      try {
        await saveUserPreference('custom:ui_density', uiPreferences.uiDensity);
        logger.debug(`[UIPreferences] Successfully migrated UI density preference: ${uiPreferences.uiDensity}`);
      } catch (error) {
        logger.error('[UIPreferences] Failed to migrate UI density preference:', error);
        migrationSuccess = false;
      }
    }
    
    // Migrate sidebar collapsed state
    if (uiPreferences.sidebarCollapsed !== undefined) {
      try {
        await saveUserPreference('custom:sidebar_collapsed', 
          uiPreferences.sidebarCollapsed ? 'true' : 'false');
        logger.debug(`[UIPreferences] Successfully migrated sidebar collapsed state: ${uiPreferences.sidebarCollapsed}`);
      } catch (error) {
        logger.error('[UIPreferences] Failed to migrate sidebar collapsed state:', error);
        migrationSuccess = false;
      }
    }
    
    // Mark migration as complete if all successful
    if (migrationSuccess) {
      logger.info('[UIPreferences] Successfully migrated all UI preferences');
      await markMigrationComplete(UI_MIGRATION_KEY);
    }
    
    return migrationSuccess;
  } catch (error) {
    logger.error('[UIPreferences] Error migrating UI preferences:', error);
    return false;
  }
}

/**
 * Collects UI preferences from cookies and localStorage
 * 
 * @returns {Promise<Object>} Object with UI preferences
 */
async function collectUIPreferences() {
  const preferences = {};
  
  if (typeof window === 'undefined') return preferences;
  
  try {
    // Theme preference
    if (typeof localStorage !== 'undefined') {
      const theme = localStorage.getItem('color-theme');
      if (theme) {
        preferences.theme = theme;
      }
    }
    
    // UI scale preference
    if (typeof localStorage !== 'undefined') {
      const uiScale = localStorage.getItem('ui-scale');
      if (uiScale) {
        preferences.uiScale = uiScale;
      }
    }
    
    // UI density preference
    if (typeof localStorage !== 'undefined') {
      const uiDensity = localStorage.getItem('ui-density');
      if (uiDensity) {
        preferences.uiDensity = uiDensity;
      }
    }
    
    // Sidebar collapsed state
    if (typeof localStorage !== 'undefined') {
      const sidebarCollapsed = localStorage.getItem('sidebar-collapsed');
      if (sidebarCollapsed !== null) {
        preferences.sidebarCollapsed = sidebarCollapsed === 'true';
      }
    }
    
    // Check cookies for UI preferences (for older implementations)
    const themeFromCookie = getCookie('theme');
    if (themeFromCookie && !preferences.theme) {
      preferences.theme = themeFromCookie;
    }
    
    logger.debug(`[UIPreferences] Found ${Object.keys(preferences).length} UI preferences to migrate`);
    return preferences;
  } catch (error) {
    logger.error('[UIPreferences] Error collecting UI preferences:', error);
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