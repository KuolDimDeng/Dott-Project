/**
 * Development Tools for testing with real databases and RLS
 * These functions are only available in development mode
 */
import { logger } from './logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { saveUserPreference } from '@/utils/userPreferences';

const DEV_KEYS = {
  USE_REAL_DB: 'dev_use_real_db',
  TENANT_ID: 'dev-tenant-id'
};

/**
 * Set development mode options
 * Only functions in development mode
 */
export const setDevOptions = (options = {}) => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return false;
  }
  
  try {
    // Store settings in AppCache
    if (options.useRealDb !== undefined) {
      setCacheValue(DEV_KEYS.USE_REAL_DB, options.useRealDb ? 'true' : 'false');
      console.log(`✅ Development DB mode set to: ${options.useRealDb ? 'REAL DATABASE' : 'MOCK DATABASE'}`);
    }
    
    if (options.tenantId) {
      setCacheValue(DEV_KEYS.TENANT_ID, options.tenantId);
      
      // Also save in Cognito for persistence
      saveUserPreference('custom:dev_tenant_id', options.tenantId)
        .catch(err => logger.error('[DevTools] Error saving tenant ID to Cognito:', err));
        
      console.log(`✅ Development tenant ID set to: ${options.tenantId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting development options:', error);
    return false;
  }
};

/**
 * Get current development tenant ID
 */
export const getDevTenantId = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return getCacheValue(DEV_KEYS.TENANT_ID) || 'dev-tenant-123';
};

/**
 * Set a specific tenant ID for development
 */
export const setDevTenantId = (tenantId) => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return false;
  }
  
  setCacheValue(DEV_KEYS.TENANT_ID, tenantId);
  
  // Also save in Cognito for persistence
  saveUserPreference('custom:dev_tenant_id', tenantId)
    .catch(err => logger.error('[DevTools] Error saving tenant ID to Cognito:', err));
    
  console.log(`✅ Development tenant ID set to: ${tenantId}`);
  
  return true;
};

/**
 * Enable real database usage in development
 */
export const useRealDatabase = (enable = true) => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return false;
  }
  
  setCacheValue(DEV_KEYS.USE_REAL_DB, enable ? 'true' : 'false');
  
  // Also save in Cognito for persistence
  saveUserPreference('custom:dev_use_real_db', enable ? 'true' : 'false')
    .catch(err => logger.error('[DevTools] Error saving DB preference to Cognito:', err));
    
  console.log(`✅ ${enable ? 'Enabled' : 'Disabled'} real database in development mode`);
  
  // Add a refresh notice
  console.log('⚠️ You may need to refresh the page for this change to take effect');
  
  return true;
};

/**
 * Create a new tenant ID for development testing
 * @param {string} prefix - Optional prefix for the tenant ID
 * @returns {string} The new tenant ID
 */
export const createNewTenantId = (prefix = 'tenant') => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return null;
  }
  
  // Generate a unique ID using current timestamp and random number
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const newTenantId = `${prefix}-${timestamp}-${random}`;
  
  // Store the new tenant ID in AppCache
  setCacheValue(DEV_KEYS.TENANT_ID, newTenantId);
  
  // Also save in Cognito for persistence
  saveUserPreference('custom:dev_tenant_id', newTenantId)
    .catch(err => logger.error('[DevTools] Error saving tenant ID to Cognito:', err));
  
  // Log success message with styling
  console.log(
    `%c✅ Created new tenant ID: ${newTenantId}`,
    'color: #10B981; font-weight: bold;'
  );
  
  // Show usage instructions
  console.log(
    '%cRefresh the page to start using this tenant ID, or navigate to a new page.',
    'color: #4B5563; font-style: italic;'
  );
  
  return newTenantId;
};

// Add to window if we're in the browser
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Development tools disabled - production mode
} 