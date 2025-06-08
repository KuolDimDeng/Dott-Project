/**
 * Development Tools for testing with real databases and RLS
 * These functions are only available in development mode
 */
import { logger } from './logger';
import { setCacheValue, getCacheValue } from './appCache';
import { v4 as uuidv4 } from 'uuid'; // Add import for UUID generation

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
      setCacheValue('dev_use_real_db', options.useRealDb ? 'true' : 'false');
      console.log(`✅ Development DB mode set to: ${options.useRealDb ? 'REAL DATABASE' : 'MOCK DATABASE'}`);
    }
    
    if (options.tenantId) {
      setCacheValue('dev-tenant-id', options.tenantId);
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
  
  return getCacheValue('dev-tenant-id') || 'dev-tenant-123';
};

/**
 * Set a specific tenant ID for development
 */
export const setDevTenantId = (tenantId) => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return false;
  }
  
  setCacheValue('dev-tenant-id', tenantId);
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
  
  setCacheValue('dev_use_real_db', enable ? 'true' : 'false');
  console.log(`✅ ${enable ? 'Enabled' : 'Disabled'} real database in development mode`);
  
  // Add a refresh notice
  console.log('⚠️ You may need to refresh the page for this change to take effect');
  
  return true;
};

/**
 * Create a new tenant ID for development testing
 * @returns {string} The new tenant ID in proper UUID format
 */
export const createNewTenantId = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are only available in development mode');
    return null;
  }
  
  // Generate a proper UUID instead of timestamp-based format
  // This ensures compatibility with backend expectations and AWS RDS
  const newTenantId = uuidv4();
  
  // Store the new tenant ID in AppCache
  setCacheValue('dev-tenant-id', newTenantId);
  
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