'use client';

import { appCache } from '@/utils/appCache';


import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { clearLegacyStorage, migrateUserDataToCognito } from '@/utils/migrationUtils';
import { updateTenantIdInCognito } from '@/utils/tenantUtils';
import { getUserPreference, saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';

// Initialize global app cache at the top of the file
if (typeof window !== 'undefined') {
  if (!appCache.getAll()) appCache.init();
  if (!appCache.get('tenant')) appCache.set('tenant', {});
  if (!appCache.get('migration')) appCache.set('migration', {});
}

/**
 * A component that helps clean up cookies/localStorage data
 * This is a transition component that can be added to layout files
 * to ensure all legacy storage data is cleared after migrating to Cognito
 */
export default function MigrationComponent() {
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    // Only attempt migration and cleanup if we're in the browser
    if (typeof window !== 'undefined') {
      const runMigration = async () => {
        try {
          // Check if we've already run this migration via Cognito attribute
          const migrationStatus = await getUserPreference(PREF_KEYS.PREFERENCES_MIGRATED, 'false');
          if (migrationStatus === 'true') {
            logger.debug('[MigrationComponent] Migration already completed (Cognito)');
            setMigrationComplete(true);
            return;
          }
          
          // Backwards compatibility check for localStorage
          if (localStorage.getItem('migration_to_cognito_completed') === 'true') {
            // If localStorage shows completed but Cognito doesn't, update Cognito
            await saveUserPreference(PREF_KEYS.PREFERENCES_MIGRATED, 'true');
            const timestamp = localStorage.getItem('migration_to_cognito_timestamp') || new Date().toISOString();
            await saveUserPreference('custom:migration_timestamp', timestamp);
            
            logger.debug('[MigrationComponent] Migration already completed (localStorage), updated Cognito');
            setMigrationComplete(true);
            // Still clear legacy storage to be safe
            await clearLegacyStorage();
            return;
          }

          // First, try to migrate any important data to Cognito
          const migrationResult = await migrateUserDataToCognito();
          
          if (migrationResult.success) {
            logger.info('[MigrationComponent] Successfully migrated data to Cognito', 
              migrationResult.migratedData);
              
            // Set migration complete flag in Cognito and AppCache
            await saveUserPreference(PREF_KEYS.PREFERENCES_MIGRATED, 'true');
            await saveUserPreference('custom:migration_timestamp', new Date().toISOString());
            setCacheValue('preferences_migrated', 'true');
          } else {
            logger.warn('[MigrationComponent] Some data migration failed:', 
              migrationResult.message);
          }
          
          // Even if migration wasn't fully successful, still try to clear legacy data
          // Wait a short delay to ensure any async operations have completed
          setTimeout(async () => {
            try {
              // Clear legacy storage data
              const clearResult = await clearLegacyStorage();
              
              if (clearResult) {
                logger.info('[MigrationComponent] Successfully cleared legacy data');
              } else {
                logger.warn('[MigrationComponent] Some data could not be cleared');
              }
              
              // Mark migration as complete
              setMigrationComplete(true);
            } catch (clearError) {
              logger.error('[MigrationComponent] Error clearing legacy data:', clearError);
              setMigrationComplete(true);
            }
          }, 500);
        } catch (error) {
          logger.error('[MigrationComponent] Migration error:', error);
          setMigrationComplete(true);
        }
      };
      
      // Run the migration
      runMigration();
    }
  }, []);
  
  // This component doesn't render anything visible
  return null;
}

/**
 * Migration utility function to help with one-time data migration
 * This enhanced function verifies tenant ID migration and provides better error handling
 */
export async function migrateToSingleTruthSource() {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if migration has already been done
    if (localStorage.getItem('migration_to_cognito_completed') === 'true') {
      logger.debug('[migrateToSingleTruthSource] Migration already completed');
      return true;
    }
    
    logger.info('[migrateToSingleTruthSource] Starting data migration to Cognito');
    
    // Import Cognito utilities
    
    // Get current Cognito attributes
    const userAttributes = {}; // Removed Amplify - using Auth0
    
    // Prepare migration data
    const migratedAttributes = {};
    let hasMigrated = false;
    
    // Tenant ID migration - prioritize finding a valid UUID
    // First check app cache, then localStorage, then cookies
    const appCacheTenantId = typeof window !== 'undefined' && appCache.getAll()
    const localTenantId = localStorage.getItem('tenantId');
    const cookieTenantId = getCookieValue('tenantId') || getCookieValue('businessid');
    const effectiveTenantId = findValidUUID(appCacheTenantId, localTenantId, cookieTenantId);
    
    if (effectiveTenantId && 
        !isValidUUID(attributes['custom:tenant_ID']) && 
        !isValidUUID(attributes['custom:tenant_id'])) {
      
      // Use the tenant utils for consistent update
      await updateTenantIdInCognito(effectiveTenantId);
      
      // Also update the migratedAttributes object for reporting
      migratedAttributes['custom:tenant_ID'] = effectiveTenantId;
      migratedAttributes['custom:tenant_id'] = effectiveTenantId;
      migratedAttributes['custom:businessid'] = effectiveTenantId;
      hasMigrated = true;
      
      // Store in app cache
      if (typeof window !== 'undefined') {
        appCache.set('tenant.id', effectiveTenantId);
      }
      
      logger.info('[migrateToSingleTruthSource] Migrated tenant ID:', effectiveTenantId);
    }
    
    // Collect business data from localStorage or cookies with proper mapping to Cognito attributes
    const attributeMappings = {
      'businessName': 'custom:businessname',
      'businessType': 'custom:businesstype',
      'country': 'custom:country',
      'businessState': 'custom:state',
      'legalStructure': 'custom:legalstructure',
      'dateFounded': 'custom:datefounded'
    };
    
    // Add onboarding status migrations
    const onboardingStatus = 
      (typeof window !== 'undefined' && appCache.getAll()?.onboardingStatus) ||
      localStorage.getItem('onboardingStatus') || 
      localStorage.getItem('onboardingStep') || 
      getCookieValue('onboardingStep') || 
      getCookieValue('onboardedStatus');
                            
    if (onboardingStatus && !attributes['custom:onboarding']) {
      migratedAttributes['custom:onboarding'] = onboardingStatus.toLowerCase();
      hasMigrated = true;
      
      // Also store in app cache
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.getAll().onboarding) appCache.set('onboarding', {});
        appCache.set('onboarding.status', onboardingStatus.toLowerCase());
      }
    }
    
    // Check if onboarding is complete
    const setupCompleted = 
      (typeof window !== 'undefined' && appCache.getAll()?.setupCompleted === 'true') ||
      localStorage.getItem('setupCompleted') === 'true' || 
      getCookieValue('setupCompleted') === 'true';
                          
    if (setupCompleted && !attributes['custom:setupdone']) {
      migratedAttributes['custom:setupdone'] = 'true';
      migratedAttributes['custom:onboarding'] = 'complete';
      hasMigrated = true;
      
      // Also store in app cache
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.getAll().onboarding) appCache.set('onboarding', {});
        appCache.set('onboarding.status', 'complete');
        appCache.set('onboarding.completed', true);
      }
    }
    
    // Migrate business information
    Object.entries(attributeMappings).forEach(([sourceKey, targetKey]) => {
      // Check app cache first, then localStorage, then cookies
      const appCacheValue = typeof window !== 'undefined' && 
                          appCache.getAll()
                          appCache.getAll().business[sourceKey];
      const sourceValue = appCacheValue || 
                          localStorage.getItem(sourceKey) || 
                          getCookieValue(sourceKey);
      
      if (sourceValue && !attributes[targetKey]) {
        migratedAttributes[targetKey] = sourceValue;
        hasMigrated = true;
        
        // Also store in app cache
        if (typeof window !== 'undefined') {
          if (!appCache.getAll()) appCache.init();
          if (!appCache.getAll().business) appCache.set('business', {});
          appCache.getAll().business[sourceKey] = sourceValue;
        }
        
        logger.debug(`[migrateToSingleTruthSource] Migrating ${sourceKey} to ${targetKey}:`, sourceValue);
      }
    });
    
    // Update Cognito with the migrated attributes if there are any
    if (hasMigrated) {
      // Add migration metadata
      migratedAttributes['custom:migration_timestamp'] = new Date().toISOString();
      migratedAttributes['custom:updated_at'] = new Date().toISOString();
      
      // Update attributes in Cognito
      await updateUserAttributes({
        userAttributes: migratedAttributes
      });
      
      logger.info('[migrateToSingleTruthSource] Successfully migrated data to Cognito', {
        migratedKeys: Object.keys(migratedAttributes)
      });
      
      // Mark migration as complete in app cache
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.getAll().migration) appCache.set('migration', {});
        appCache.set('migration.completed', true);
        appCache.set('migration.timestamp', new Date().toISOString());
      }
      
      // Also mark in localStorage for backward compatibility
      localStorage.setItem('migration_to_cognito_completed', 'true');
      localStorage.setItem('migration_to_cognito_timestamp', new Date().toISOString());
      return true;
    } else {
      logger.info('[migrateToSingleTruthSource] No data to migrate');
      
      // Mark migration as complete in app cache
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.getAll().migration) appCache.set('migration', {});
        appCache.set('migration.completed', true);
        appCache.set('migration.timestamp', new Date().toISOString());
      }
      
      // Also mark in localStorage for backward compatibility
      localStorage.setItem('migration_to_cognito_completed', 'true');
      localStorage.setItem('migration_to_cognito_timestamp', new Date().toISOString());
      return true;
    }
  } catch (error) {
    logger.error('[migrateToSingleTruthSource] Error migrating data:', error);
    return false;
  }
}

// Helper function to get cookie value
function getCookieValue(name) {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    try {
      return decodeURIComponent(parts.pop().split(';').shift());
    } catch (e) {
      return parts.pop().split(';').shift();
    }
  }
  return null;
}

// Enhanced UUID validation
function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Function to find the first valid UUID from a list of candidates
function findValidUUID(...candidates) {
  for (const candidate of candidates) {
    if (isValidUUID(candidate)) {
      return candidate;
    }
  }
  return null;
} 