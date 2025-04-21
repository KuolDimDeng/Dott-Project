  }
}

/**
 * Tenant utilities
 * 
 * This module provides functions for working with tenant IDs
 * using Cognito attributes for persistent storage
 */

// Cache constants
const TENANT_ID_CACHE_KEY = 'tenant_id';
const TENANT_ID_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the tenant ID from Cognito, with fallback to AppCache for performance
 * 
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export async function getTenantId() {
  try {
    // First check AppCache for better performance
    const cachedTenantId = getCacheValue(TENANT_ID_CACHE_KEY);
    if (cachedTenantId) {
      logger.debug('[TenantUtils] Got tenant ID from AppCache');
      return cachedTenantId;
    }
    
    // Otherwise fetch from Cognito
    return await getTenantIdFromCognito();
  } catch (error) {
    logger.error('[TenantUtils] Error getting tenant ID:', error);
    return null;
  }
}

/**
 * Gets the tenant ID from Cognito or null if not found
 * @returns {Promise<string|null>} Tenant ID or null
 */
export async function getTenantIdFromCognito() {
  try {
    const { resilientFetchUserAttributes } = await import('@/utils/amplifyResiliency');
    const attributes = await resilientFetchUserAttributes(fetchUserAttributes);
    
    // Try to get tenant ID from different attribute keys
    const tenantId = attributes ? (
      attributes['custom:tenant_ID'] ||
      attributes['custom:tenantId'] ||
      attributes['custom:businessid']
    ) : null;
    
    if (tenantId && isValidUUID(tenantId)) {
      logger.debug('[TenantUtils] Found tenant ID in Cognito:', tenantId);
      return tenantId;
    }
    
    logger.debug('[TenantUtils] No tenant ID found in Cognito attributes');
    return null;
  } catch (error) {
    logger.debug('[TenantUtils] Error getting user attributes from Cognito:', error);
    return null;
  }
}

/**
 * Sets the tenant ID for the current user, updating both storage and Cognito attributes
 * @param {string} tenantId The tenant ID to set
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function setTenantId(tenantId) {
  try {
    if (!tenantId) {
      logger.error('[TenantUtils] Cannot set null or empty tenant ID');
      return false;
    }
    
    // Format and validate the tenant ID
    const formattedTenantId = formatTenantId(tenantId);
    if (!isValidTenantId(formattedTenantId)) {
      logger.error('[TenantUtils] Invalid tenant ID format:', tenantId);
      return false;
    }
    
    logger.info('[TenantUtils] Setting tenant ID:', formattedTenantId);
    
    // Update local storage
    setTenantIdStorage(formattedTenantId);
    
    // Update Cognito attributes with resilient implementation
    try {
      await resilientUpdateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': formattedTenantId,
          'custom:tenantId': formattedTenantId,
          'custom:businessid': formattedTenantId,
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[TenantUtils] Successfully updated Cognito attributes with tenant ID');
      return true;
    } catch (cognitoError) {
      logger.error('[TenantUtils] Error updating Cognito attributes with tenant ID:', cognitoError);
      
      // Even if Cognito update fails, we still set the ID in storage
      // This provides fallback in case of Cognito service issues
      return false;
    }
  } catch (error) {
    logger.error('[TenantUtils] Error in setTenantId:', error);
    return false;
  }
}

/**
 * Update the tenant ID in Cognito
 * 
 * @param {string} tenantId - The tenant ID to update
 * @returns {Promise<boolean>} True if successful
 */
export async function updateTenantIdInCognito(tenantId) {
  if (!tenantId) {
    console.error("[TenantUtils] Cannot update Cognito with null or empty tenantId");
    return { success: false };
  }

  // Always ensure we're dealing with a valid UUID before updating Cognito
  const validatedTenantId = isValidUUID(tenantId) 
    ? tenantId 
    : generateDeterministicTenantId(tenantId);
  
  console.log(`[TenantUtils] Updating Cognito with tenant ID: ${validatedTenantId}`);
  
  const attemptUpdate = async () => {
    try {
      // Get the current user
      const user = await getCurrentUser();
      // Update the attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:tenant_id': tenantId,
        }
      });
      
      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);
      return true;
    } catch (e) {
      logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
      return false;
    }
  };
  
  return handleNetworkError(attemptUpdate, 3);
}

/**
 * Clear the tenant ID from storage
 * @returns {Promise<boolean>} Success status
 */
export async function clearTenantId() {
  try {
    // Clear from Cognito
    try {
      await updateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': '',
          'custom:tenant_id': '',
          'custom:businessid': ''
        }
      });
    } catch (e) {
      logger.warn('[TenantUtils] Error clearing tenant ID from Cognito:', e);
    }
    
    // Clear from AppCache
    setCacheValue(TENANT_ID_CACHE_KEY, null);
    
    return true;
  } catch (error) {
    logger.error('[TenantUtils] Error clearing tenant ID:', error);
    return false;
  }
}

/**
 * Format tenant ID into schema name
 * 
 * @param {string} tenantId - The tenant ID
 * @returns {string} - The formatted schema name
 */
export function formatSchemaName(tenantId) {
  if (!tenantId || !isValidUUID(tenantId)) {
    return '';
  }
  
  // Replace hyphens with underscores for database schema compatibility
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Stores authentication tokens (no-op, as Cognito manages tokens internally)
 * @param {Object} tokens - The tokens to store
 */
export function setTokens(tokens) {
  // Cognito manages tokens internally - nothing to do here
  if (typeof window === 'undefined' || !tokens) return;
  
  logger.debug('[tenantUtils] Tokens are managed by Cognito internally');
}

/**
 * Forces validation of tenant ID with the server
 * @param {string} tenantId - The tenant ID to validate
 * @returns {Promise<boolean>} Whether the tenant ID is valid
 */
export async function forceValidateTenantId(tenantId) {
  if (!tenantId) return false;
  
  try {
    const response = await fetch(`/api/auth/verify-tenant?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Error validating tenant ID:', error);
    return false;
  }
}

/**
 * Get the tenant headers for API requests
 * @returns {Object} Headers object with tenant ID
 */
export function getTenantHeaders() {
  const tenantId = getTenantId();
  if (!tenantId) return {};
  
  return {
    'X-Tenant-ID': tenantId
  };
}

/**
 * Extract tenant ID from various sources (URL, request headers, cookies)
 * @param {Object} request - Next.js request object
 * @returns {string|null} The extracted tenant ID or null if not found
 */
export function extractTenantId(request) {
  if (!request) return null;
  
  // Try to get tenant ID from URL path
  const url = new URL(request.url, 'http://localhost');
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Check if first part of path is a UUID (tenant ID)
  if (pathParts.length > 0 && isValidUUID(pathParts[0])) {
    return pathParts[0];
  }
  
  // Try to get tenant ID from query parameters
  const searchParams = url.searchParams;
  const queryTenantId = searchParams.get('tenantId');
  if (queryTenantId && isValidUUID(queryTenantId)) {
    return queryTenantId;
  }
  
  // Try to get tenant ID from headers
  const headerTenantId = request.headers.get('x-tenant-id');
  if (headerTenantId && isValidUUID(headerTenantId)) {
    return headerTenantId;
  }
  
  // Try to get tenant ID from cookies
  const cookies = request.headers.get('cookie') || '';
  const cookieMatch = cookies.match(/tenantId=([^;]+)/);
  if (cookieMatch && cookieMatch[1] && isValidUUID(cookieMatch[1])) {
    return cookieMatch[1];
  }
  
  return null;
}

/**
 * Validates that a tenant ID is in the correct format
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean} Whether the tenant ID is valid
 */
export function validateTenantIdFormat(tenantId) {
  return isValidUUID(tenantId);
}

/**
 * Store tenant information in Cognito user attributes
 * @param {Object} tenantInfo - The tenant info to store
 * @returns {Promise<boolean>} Success status
 */
export async function storeTenantInfo(tenantInfo) {
  if (!tenantInfo || !tenantInfo.tenantId) {
    console.error("[TenantUtils] Cannot store null or invalid tenant info");
    return false;
  }

  try {
    // Always mark subscription as completed to help with fallback recovery
    localStorage.setItem('subscription_completed', 'true');
    
    // Store tenantId in localStorage
    localStorage.setItem('tenant_id', tenantInfo.tenantId);
    
    // Calculate TTL if provided
    let expiryTime = null;
    if (tenantInfo.ttl) {
      expiryTime = Date.now() + tenantInfo.ttl;
      localStorage.setItem('tenant_id_expiry', expiryTime);
    }
    
    // Store additional metadata if provided
    if (tenantInfo.metadata) {
      localStorage.setItem('tenant_metadata', JSON.stringify(tenantInfo.metadata));
    }
    
    console.log("[TenantUtils] Tenant info stored successfully in local storage");
    
    // Try to update IndexedDB if available
    try {
      // Open the database
      const dbPromise = indexedDB.open('tenant_db', 1);
      
      dbPromise.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tenant_store')) {
          db.createObjectStore('tenant_store', { keyPath: 'id' });
        }
      };
      
      dbPromise.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['tenant_store'], 'readwrite');
        const store = transaction.objectStore('tenant_store');
        
        // Store the tenant info with an ID and timestamp
        store.put({
          id: 'current_tenant',
          tenantId: tenantInfo.tenantId,
          metadata: tenantInfo.metadata || {},
          expiry: expiryTime,
          updatedAt: Date.now()
        });
        
        transaction.oncomplete = () => {
          console.log("[TenantUtils] Tenant info also stored in IndexedDB");
        };
        
        transaction.onerror = (error) => {
          console.error("[TenantUtils] Error storing in IndexedDB:", error);
          // Already saved in localStorage, so still consider it a success
        };
      };
      
      dbPromise.onerror = (error) => {
        console.error("[TenantUtils] Error opening IndexedDB:", error);
        // Already saved in localStorage, so still consider it a success
      };
    } catch (dbError) {
      console.error("[TenantUtils] Error with IndexedDB operations:", dbError);
      // Already saved in localStorage, so still consider it a success
    }
    
    return true;
  } catch (error) {
    console.error("[TenantUtils] Error storing tenant info:", error);
    return false;
  }
}

/**
 * Get schema name from tenant ID (for backward compatibility)
 * @param {string} tenantId - The tenant ID
 * @returns {string} The schema name
 */
export function getSchemaName(tenantId) {
  if (!tenantId) return '';
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Extract tenant ID from the URL path
 * @param {string} path - URL path to extract from
 * @returns {string|null} - Extracted tenant ID or null
 */
export function extractTenantIdFromPath(path) {
  if (!path) return null;
  
  // Match UUID in path:
  // 1. /uuid/any-path
  // 2. /tenant/uuid/any-path
  const directMatch = path.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
  const legacyMatch = path.match(/^\/tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
  
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }
  
  if (legacyMatch && legacyMatch[1]) {
    return legacyMatch[1];
  }
  
  return null;
}

/**
 * Creates a tenant-aware URL with the tenant ID in the path
 * @param {string} path - The original path without tenant ID
 * @param {string} tenantId - The tenant ID to include (defaults to the current one)
 * @returns {string} - The tenant-aware URL
 */
export function createTenantUrl(path, tenantId = null) {
  // Don't modify paths that already have a tenant ID
  if (extractTenantIdFromPath(path)) {
    return path;
  }
  
  // Get tenant ID if not provided
  const effectiveTenantId = tenantId || getTenantId();
  if (!effectiveTenantId) {
    return path; // Return original path if no tenant ID available
  }
  
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Create tenant-aware URL with the pattern /{tenantId}{path}
  return `/${effectiveTenantId}${normalizedPath}`;
}

/**
 * Validate and verify the tenant ID with the backend
 * @param {string} tenantId - The tenant ID to verify
 * @returns {Promise<Object>} The verification result with status and tenant data
 */
export async function verifyTenantId(tenantId) {
  try {
    logger.debug('[tenantUtils] Verifying tenant ID:', tenantId);
    
    // Check format first
    if (!isValidUUID(tenantId)) {
      logger.warn('[tenantUtils] Invalid tenant ID format:', tenantId);
      return {
        valid: false,
        error: 'invalid_format',
        message: 'Invalid tenant ID format'
      };
    }
    
    // In development mode, we can skip the actual backend verification
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_TENANT_VERIFICATION === 'true') {
      logger.info('[tenantUtils] Development mode: skipping backend tenant verification');
      
      // Get user attributes to find a business name
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const attributes = await fetchUserAttributes().catch(() => ({}));
      
      return {
        valid: true,
        tenant: {
          id: tenantId,
          name: attributes['custom:businessname'] || 'Development Business',
          status: 'active'
        },
        correctTenantId: tenantId,
        isDevelopment: true,
        mockData: true
      };
    }
    
    // First, try with the tenant/verify API endpoint (fast check)
    try {
      const verifyResponse = await fetch(`/api/tenant/verify?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Tenant-ID': tenantId
        },
        cache: 'no-store'
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        
        if (verifyData.valid) {
          // Successful verification - store the tenant ID
          storeTenantId(tenantId);
          
          return {
            valid: true,
            tenant: verifyData.tenant || { id: tenantId },
            correctTenantId: tenantId
          };
        } else if (verifyData.correctTenantId && verifyData.correctTenantId !== tenantId) {
          // Tenant ID needs correction
          logger.info('[tenantUtils] Tenant ID needs correction:', {
            original: tenantId,
            corrected: verifyData.correctTenantId
          });
          
          // Store the correct tenant ID
          storeTenantId(verifyData.correctTenantId);
          
          return {
            valid: true,
            tenant: verifyData.tenant || { id: verifyData.correctTenantId },
            correctTenantId: verifyData.correctTenantId,
            wasCorrected: true
          };
        }
      }
      
      // If verify endpoint failed, continue to fallback
    } catch (verifyError) {
      logger.warn('[tenantUtils] Error with tenant/verify endpoint:', verifyError);
      // Continue to fallback
    }
    
    // Fallback: try with tenant DB ensure endpoint (slower but more reliable)
    try {
      const ensureResponse = await fetch('/api/tenant/ensure-db-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify({
          tenantId: tenantId,
          forceCreate: false // Don't create if it doesn't exist
        })
      });
      
      if (ensureResponse.ok) {
        const ensureData = await ensureResponse.json();
        
        if (ensureData.success || ensureData.exists) {
          // Successful verification with ensure endpoint
          storeTenantId(tenantId);
          
          return {
            valid: true,
            tenant: {
              id: tenantId,
              name: ensureData.name || 'Verified Business',
              schemaName: ensureData.schemaName
            },
            correctTenantId: tenantId,
            ensureFallback: true
          };
        }
      }
    } catch (ensureError) {
      logger.error('[tenantUtils] Error with tenant/ensure-db-record endpoint:', ensureError);
    }
    
    // Both verification methods failed - tenant likely doesn't exist
    logger.warn('[tenantUtils] Tenant verification failed completely for:', tenantId);
    return {
      valid: false,
      error: 'verification_failed',
      message: 'Tenant verification failed'
    };
  } catch (error) {
    logger.error('[tenantUtils] Critical error during tenant verification:', error);
    return {
      valid: false,
      error: 'unexpected_error',
      message: error.message || 'Unexpected error during tenant verification'
    };
  }
}

/**
 * Create a tenant for a user with robust error handling
 * @param {string} businessId - The business ID to use as tenant ID
 * @param {Object} userAttributes - The Cognito user attributes
 * @returns {Promise<string|null>} The created tenant ID or null if failed
 */
export async function createTenantForUser(businessId, userAttributes) {
  if (!businessId || !isValidUUID(businessId)) {
    logger.error('[tenantUtils] Invalid business ID format:', businessId);
    return null;
  }
  
  try {
    logger.info('[tenantUtils] Creating tenant for user with business ID:', businessId);
    
    // First, ensure the business ID is set in Cognito attributes
    await updateUserWithTenantId(businessId);
    
    // Then call the tenant init endpoint to create the RLS policy in PostgreSQL
    try {
      const initResponse = await fetch('/api/tenant/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: businessId,
          forceCreate: true, // Always force create to ensure RLS policy exists
          userId: userAttributes?.sub,
          userName: userAttributes?.name || userAttributes?.email,
          userEmail: userAttributes?.email,
          businessName: userAttributes?.['custom:businessname'] || 
            (userAttributes?.given_name ? `${userAttributes.given_name}'s Business` : 
            userAttributes?.email ? `${userAttributes.email.split('@')[0]}'s Business` : ''),
          businessType: userAttributes?.['custom:businesstype'] || 'Other',
          businessCountry: userAttributes?.['custom:businesscountry'] || 'US'
        })
      });
      
      if (initResponse.ok) {
        const initResult = await initResponse.json();
        logger.info('[tenantUtils] Tenant init result:', initResult);
        
        // Store the tenant ID in all storage mechanisms
        storeTenantId(businessId);
        
        return businessId;
      } else {
        logger.warn('[tenantUtils] Tenant init warning:', await initResponse.text());
        // Continue with secondary approach even if this fails
      }
    } catch (initError) {
      logger.error('[tenantUtils] Tenant init error (trying secondary approach):', initError);
      // Continue with secondary approach
    }
    
    // Call the enhanced tenant API endpoint that ensures schema creation (secondary approach)
    const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: businessId,
        userId: userAttributes?.sub,
        email: userAttributes?.email,
        businessName: userAttributes?.['custom:businessname'] || 
          (userAttributes?.given_name ? `${userAttributes.given_name}'s Business` : 
           userAttributes?.email ? `${userAttributes.email.split('@')[0]}'s Business` : ''),
        businessType: userAttributes?.['custom:businesstype'] || 'Other',
        businessCountry: userAttributes?.['custom:businesscountry'] || 'US',
        forceCreate: true
      })
    });
    
    if (tenantResponse.ok) {
      const tenantResult = await tenantResponse.json();
      logger.info('[tenantUtils] Tenant creation result (secondary approach):', tenantResult);
      
      if (tenantResult.success && tenantResult.tenantId) {
        // Store the tenant ID in all storage mechanisms
        storeTenantId(tenantResult.tenantId);
        
        return tenantResult.tenantId;
      }
    } else {
      logger.error('[tenantUtils] Tenant creation failed (secondary approach):', await tenantResponse.text());
    }
    
    // If we get here, both approaches failed but at least the tenant ID is in Cognito
    // Return the businessId anyway since it's set in Cognito attributes
    return businessId;
  } catch (error) {
    logger.error('[tenantUtils] Error creating tenant:', error);
    return null;
  }
}

/**
 * Update user attributes with tenant ID
 * @param {string} tenantId - Tenant ID to save in user attributes
 * @returns {Promise<boolean>} - Success/failure
 */
export async function updateUserWithTenantId(tenantId) {
  try {
    if (!tenantId || !isValidUUID(tenantId)) {
      logger.error('[TenantUtils] Invalid tenant ID format:', tenantId);
      return false;
    }
    
    logger.info('[TenantUtils] Updating user attributes with tenant ID:', tenantId);
    
    // Import from AWS Amplify directly for more reliable implementation
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Update Cognito user attributes
    // Use custom:tenant_ID (uppercase ID) as the primary source of truth
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': tenantId, // Primary source of truth - uppercase ID
        'custom:tenant_id': tenantId, // Backward compatibility - lowercase id
        'custom:tenantId': tenantId,  // Backward compatibility - camelCase
        'custom:businessid': tenantId, // Backward compatibility
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    // Also store in localStorage and cookies for immediate use
    storeTenantId(tenantId);
    
    logger.info('[TenantUtils] User attributes updated successfully with tenant ID');
    return true;
  } catch (error) {
    logger.error('[TenantUtils] Error updating user attributes with tenant ID:', error);
    return false;
  }
}

/**
 * Get business ID from Cognito user attributes
 * @returns {Promise<string|null>} - Business ID or null if not found
 */
export async function getBusinessId() {
  try {
    // Get user attributes from Cognito
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const userAttributes = await fetchUserAttributes();
    
    // Try user attributes with various possible attribute names
    const attributeBusinessId = userAttributes['custom:business_id'] || 
                               userAttributes['custom:businessid'] || 
                               userAttributes['custom:tenant_id'] || 
                               userAttributes['custom:tenant_ID'];
    
    if (attributeBusinessId) {
      logger.debug('[TenantUtils] Found business ID in Cognito attributes:', attributeBusinessId);
      return attributeBusinessId;
    }
    
    // No business ID found
    logger.debug('[TenantUtils] No business ID found in Cognito attributes');
    return null;
  } catch (error) {
    logger.error('[TenantUtils] Error getting business ID from Cognito:', error);
    return null;
  }
}

/**
 * Fix uppercase onboarding status in user attributes
 * @param {Object} userAttributes - User attributes from Cognito
 * @returns {Promise<boolean>} - Success/failure
 */
export async function fixOnboardingStatusCase(userAttributes) {
  try {
    // Check if status is uppercase
    const onboardingStatus = userAttributes['custom:onboarding'];
    
    if (onboardingStatus && onboardingStatus === onboardingStatus.toUpperCase()) {
      logger.info('[TenantUtils] Fixing uppercase onboarding status:', onboardingStatus);
      
      // Import from config to avoid SSR issues
      const { updateUserAttributes } = await import('@/config/amplifyUnified');
      
      // Update Cognito user attributes with lowercase value
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': onboardingStatus.toLowerCase(),
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[TenantUtils] Onboarding status case fixed');
      return true;
    }
    
    // No fix needed
    return false;
  } catch (error) {
    logger.error('[TenantUtils] Error fixing onboarding status case:', error);
    return false;
  }
}

/**
 * Checks if a user already has an existing tenant ID in Cognito
 * @returns {Promise<string|null>} The existing tenant ID if found, otherwise null
 */
export async function findExistingTenantId() {
  if (typeof window === 'undefined') {
    return null; // Cannot access Cognito on server
  }

  try {
    // Check Cognito attributes
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const attributes = await fetchUserAttributes();
    
    // Check various attribute names that might contain the tenant ID
    const tenantIdFromCognito = attributes['custom:tenant_ID'] || 
                              attributes['custom:tenant_id'] || 
                              attributes['custom:businessid'];
    
    if (tenantIdFromCognito && isValidUUID(tenantIdFromCognito)) {
      logger.debug('[tenantUtils] Found tenant ID in Cognito attributes:', tenantIdFromCognito);
      return tenantIdFromCognito;
    }
    
    return null;
  } catch (error) {
    logger.error('[tenantUtils] Error finding existing tenant ID from Cognito:', error);
    return null;
  }
}

/**
 * Gets the tenant ID from Cognito ONLY (no fallbacks to localStorage or cookies)
 * This is the secure version that should be used for all data access operations
 * @returns {Promise<string|null>} The tenant ID from Cognito or null if not found
 */
export async function getSecureTenantId() {
  if (typeof window === 'undefined') {
    return null; // Cannot access Cognito on server
  }

  try {
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const attributes = await fetchUserAttributes();
    
    // ONLY check for tenant ID in Cognito attributes
    const tenantIdFromCognito = attributes['custom:tenant_ID'] || 
                               attributes['custom:tenant_id'] || 
                               attributes['custom:businessid'];
    
    if (tenantIdFromCognito) {
      logger.debug('[tenantUtils] Secure tenant ID from Cognito: ' + tenantIdFromCognito);
      return tenantIdFromCognito;
    }
    
    logger.warn('[tenantUtils] No tenant ID found in Cognito attributes');
    return null;
  } catch (e) {
    logger.error('[tenantUtils] Error getting tenant ID from Cognito:', e);
    return null;
  }
}

/**
 * Gets tenant ID from URL, Cognito, or server API
 * Prioritizes Cognito attributes and falls back to server API if needed
 * @returns {Promise<string|null>} - The tenant ID or null if not found
 */
export async function getEffectiveTenantId() {
  try {
    // First check URL for tenant ID
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Check if the first path part looks like a UUID
    if (pathParts.length > 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathParts[0])) {
      const urlTenantId = pathParts[0];
      console.log(`[tenantUtils] Found tenant ID in URL: ${urlTenantId}`);
      
      // Sync this tenant ID to Cognito to ensure consistency
      updateTenantIdInCognito(urlTenantId).catch(() => {
        // Swallow errors - we'll continue with the URL tenant ID
      });
      
      return urlTenantId;
    }
    
    // Then try to get tenant ID from Cognito
    const cognitoTenantId = await getTenantIdFromCognito();
    if (cognitoTenantId) {
      return cognitoTenantId;
    }
    
    // As a last resort, try to get tenant ID from the server API endpoints
    try {
      // First try the Cognito-specific endpoint
      const cognitoResponse = await fetch('/api/tenant/cognito');
      if (cognitoResponse.ok) {
        const data = await cognitoResponse.json();
        if (data.success && data.tenantId) {
          console.log(`[tenantUtils] Found tenant ID from Cognito API: ${data.tenantId}`);
          return data.tenantId;
        }
      }
      
      // Then try the general fallback endpoint
      const fallbackResponse = await fetch('/api/tenant/fallback');
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (data.success && data.tenantId) {
          console.log(`[tenantUtils] Found tenant ID from fallback API: ${data.tenantId} (source: ${data.source})`);
          
          // Sync this tenant ID to Cognito for future use
          updateTenantIdInCognito(data.tenantId).catch(() => {
            // Swallow errors - we'll continue with the API tenant ID
          });
          
          return data.tenantId;
        }
      }
    } catch (apiError) {
      console.error(`[tenantUtils] Error fetching tenant ID from API: ${apiError.message}`);
    }
    
    // If we got here, we couldn't find a tenant ID anywhere
    console.warn('[tenantUtils] No tenant ID found in any source');
    return null;
  } catch (error) {
    console.error(`[tenantUtils] Error in getEffectiveTenantId: ${error.message}`);
    return null;
  }
}

// Add a method to handle network errors with retry logic
export const handleNetworkError = async (operation, maxRetries = 3) => {
  let retryCount = 0;
  let lastError = null;
  
  const exponentialBackoff = (attempt) => {
    const delay = Math.min(100 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
    const jitter = Math.random() * 300; // Add up to 300ms of jitter
    return delay + jitter;
  };
  
  const executeWithRetry = async () => {
    while (retryCount < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        retryCount++;
        
        // Log the retry attempt
        console.warn(`[TenantUtils] Operation failed (attempt ${retryCount}/${maxRetries}):`, 
          error.message || error);
        
        // If we've hit max retries, throw the last error
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // Wait with exponential backoff before retrying
        const backoffTime = exponentialBackoff(retryCount);
        console.log(`[TenantUtils] Retrying in ${Math.round(backoffTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    // This should never be reached due to the throw above
    throw lastError || new Error('Maximum retries exceeded');
  };
  
  try {
    return await executeWithRetry();
  } catch (finalError) {
    // Create a fallback response as a last resort
    console.error("[TenantUtils] All retries failed:", finalError);
    
    return {
      success: false,
      error: finalError.message || 'Operation failed after multiple retries',
      retries: retryCount,
      fallback: true
    };
  }
};

// Apply this to the tenant fetching function
export const getTenantFromCognito = async () => {
  try {
    const userAttributes = await handleNetworkError(async () => {
      return await fetchUserAttributes();
    });
    
    let tenantId = userAttributes['custom:businessid'];
    
    // Log tenant ID found in Cognito with different log level based on presence
    if (tenantId) {
      logger.info('[TenantUtils] Found tenant ID in Cognito:', tenantId);
    } else {
      logger.debug('[TenantUtils] No tenant ID found in Cognito attributes');
    }
    
    return tenantId || null;
  } catch (error) {
    logger.error('[TenantUtils] Error getting user attributes from Cognito:', error);
    return null;
  }
};