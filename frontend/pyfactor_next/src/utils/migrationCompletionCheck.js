/**
 * Migration Completion Check Utility
 * 
 * Provides helper functions to check if migrations are complete
 * and to mark migrations as complete in a Cognito-compatible way
 */

import { getCacheValue, setCacheValue } from @/utils/appCache';
import { saveUserPreference } from '@/utils/userPreferences';
import { logger } from '@/utils/logger';

// Constants for migration keys
const LEGACY_MIGRATION_KEY = 'preferences_migrated';
const UI_MIGRATION_KEY = 'ui_preferences_migrated';
const AUTH_MIGRATION_KEY = 'auth_preferences_migrated';

// Cache constants
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Check if all migrations have been completed
 * 
 * @returns {Promise<boolean>} True if all migrations are complete
 */
export async function isAllMigrationsComplete() {
  const legacyComplete = await isMigrationComplete(LEGACY_MIGRATION_KEY);
  const uiComplete = await isMigrationComplete(UI_MIGRATION_KEY);
  const authComplete = await isMigrationComplete(AUTH_MIGRATION_KEY);
  
  return legacyComplete && uiComplete && authComplete;
}

/**
 * Check if a specific migration is complete
 * 
 * @param {string} migrationKey - The migration key to check
 * @returns {Promise<boolean>} True if migration is complete
 */
export async function isMigrationComplete(migrationKey) {
  try {
    // Check AppCache first for better performance
    const cachedValue = getCacheValue(`migration_${migrationKey}`);
    if (cachedValue === true || cachedValue === 'true') {
      return true;
    }
    
    // If not in cache, check localStorage (for backward compatibility)
    if (typeof localStorage !== 'undefined') {
      const localValue = localStorage.getItem(migrationKey);
      if (localValue === 'true') {
        // Migration is complete according to localStorage
        // Update AppCache for future checks
        setCacheValue(`migration_${migrationKey}`, true, { ttl: CACHE_TTL });
        
        // Also save to Cognito for persistence
        await saveUserPreference(`custom:${migrationKey}`, 'true');
        
        return true;
      }
    }
    
    // If not found in cache or localStorage, check Cognito
    // This is done indirectly by using the preference API
    try {
      const response = await fetch(`/api/user/preferences?key=${migrationKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.value === 'true') {
          // Migration is complete according to Cognito
          // Update AppCache for future checks
          setCacheValue(`migration_${migrationKey}`, true, { ttl: CACHE_TTL });
          return true;
        }
      }
    } catch (error) {
      logger.error(`[migrationCheck] Error checking migration status for ${migrationKey}:`, error);
    }
    
    return false;
  } catch (error) {
    logger.error(`[migrationCheck] Error checking migration status:`, error);
    return false;
  }
}

/**
 * Mark a migration as complete
 * 
 * @param {string} migrationKey - The migration key to mark as complete
 * @returns {Promise<boolean>} True if successful
 */
export async function markMigrationComplete(migrationKey) {
  try {
    // Save to localStorage for backward compatibility
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(migrationKey, 'true');
    }
    
    // Update AppCache
    setCacheValue(`migration_${migrationKey}`, true, { ttl: CACHE_TTL });
    
    // Save to Cognito for persistence
    await saveUserPreference(`custom:${migrationKey}`, 'true');
    
    logger.debug(`[migrationCheck] Migration ${migrationKey} marked as complete`);
    return true;
  } catch (error) {
    logger.error(`[migrationCheck] Error marking migration ${migrationKey} as complete:`, error);
    return false;
  }
}

/**
 * Mark all migrations as complete
 * 
 * @returns {Promise<boolean>} True if successful
 */
export async function markAllMigrationsComplete() {
  try {
    await markMigrationComplete(LEGACY_MIGRATION_KEY);
    await markMigrationComplete(UI_MIGRATION_KEY);
    await markMigrationComplete(AUTH_MIGRATION_KEY);
    
    logger.info('[migrationCheck] All migrations marked as complete');
    return true;
  } catch (error) {
    logger.error('[migrationCheck] Error marking all migrations as complete:', error);
    return false;
  }
} 