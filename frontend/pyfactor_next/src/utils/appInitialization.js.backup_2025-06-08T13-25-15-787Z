/**
 * App initialization utilities for ensuring proper auth and tenant ID setup
 */
import { logger } from '@/utils/logger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';
import { migrateToSingleTruthSource } from '@/components/MigrationComponent';

/**
 * Initializes the application by ensuring proper Cognito setup
 * This should be called early in the app lifecycle
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeApp() {
  try {
    logger.info('[appInitialization] Starting app initialization');
    
    // Check if the user is authenticated with Cognito
    const isAuthenticated = await checkAuthentication();
    
    if (!isAuthenticated) {
      logger.debug('[appInitialization] User not authenticated, skipping initialization');
      return { success: true, authenticated: false };
    }
    
    // Run migration from cookies/localStorage to Cognito
    const migrationResult = await migrateToSingleTruthSource();
    logger.debug('[appInitialization] Migration result:', { success: migrationResult });
    
    // Ensure tenant ID is properly set
    const tenantId = await getTenantIdFromCognito();
    
    return {
      success: true,
      authenticated: true,
      tenantId,
      hasTenantId: !!tenantId,
      migrationComplete: !!migrationResult
    };
  } catch (error) {
    logger.error('[appInitialization] Error initializing app:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      authenticated: false
    };
  }
}

/**
 * Checks if the user is authenticated with Cognito
 * @returns {Promise<boolean>} Whether the user is authenticated
 */
async function checkAuthentication() {
  try {
    // Import auth utilities
    const { getCurrentUser } = await import('@/config/amplifyUnified');
    
    // Attempt to get current user - will throw if not authenticated
    const user = await getCurrentUser();
    
    return !!user;
  } catch (error) {
    logger.debug('[appInitialization] User not authenticated');
    return false;
  }
}

/**
 * Extracts tenant ID from the URL and stores it in Cognito if valid
 * @param {string} url - The current URL
 * @returns {Promise<string|null>} The tenant ID if found and valid
 */
export async function extractAndStoreTenantFromUrl(url) {
  try {
    // Extract tenant ID from URL path - assuming format /{tenantId}/...
    const parsedUrl = new URL(url, window.location.origin);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    
    // Check if the first path part looks like a UUID
    if (pathParts.length > 0 && isValidUUID(pathParts[0])) {
      const urlTenantId = pathParts[0];
      logger.debug('[appInitialization] Found tenant ID in URL:', urlTenantId);
      
      // Check if this tenant ID is already stored in Cognito
      const cognitoTenantId = await getTenantIdFromCognito();
      
      // If the tenant IDs don't match, update Cognito
      if (urlTenantId !== cognitoTenantId) {
        logger.info('[appInitialization] Storing tenant ID from URL in Cognito:', urlTenantId);
        await updateTenantIdInCognito(urlTenantId);
      }
      
      return urlTenantId;
    }
    
    return null;
  } catch (error) {
    logger.error('[appInitialization] Error extracting tenant ID from URL:', error);
    return null;
  }
}

/**
 * Validates if a string is a valid UUID
 * @param {string} id - The ID to check
 * @returns {boolean} Whether the ID is a valid UUID
 */
function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
} 