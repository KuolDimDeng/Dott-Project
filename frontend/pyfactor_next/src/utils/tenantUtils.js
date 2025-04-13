'use client';

import { usePathname, useParams, useSearchParams } from 'next/navigation';
import { logger } from './logger';

/**
 * Custom hook to get the tenant ID from various sources
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export function useTenantId() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // First check route parameters from dynamic routes
  let tenantId = params?.tenantId || null;
  
  // If not in route params, try to extract from pathname
  if (!tenantId && pathname) {
    const match = pathname.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i);
    if (match) {
      tenantId = match[1];
    }
  }
  
  // If still not found, check query parameters
  if (!tenantId) {
    tenantId = searchParams?.get('tenantId') || null;
  }
  
  // We'll check Cognito in a separate effect since it's async
  return tenantId;
}

/**
 * Gets the tenant ID for server components from headers
 * @param {Object} headers - Request headers
 * @returns {string|null} The tenant ID or null if not found
 */
export function getServerTenantId(headers) {
  // Check the headers (set by middleware)
  if (headers && headers.get('x-tenant-id')) {
    return headers.get('x-tenant-id');
  }
  
  return null;
}

/**
 * Tenant utility functions
 * 
 * Provides helper functions for working with tenant IDs
 */

// UUID regex pattern for matching tenant IDs
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if string is a valid UUID
 * This function is compatible with both client and server
 * 
 * @param {string} id - The ID to check
 * @returns {boolean} - True if the ID is a valid UUID
 */
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return UUID_PATTERN.test(id);
}

/**
 * Stores the tenant ID in Cognito user attributes
 * @param {string} tenantId The tenant ID to store
 * @returns {Promise<boolean>} Success status
 */
export async function storeTenantId(tenantId) {
  if (!tenantId) {
    logger.warn('[tenantUtils] Attempted to store empty tenant ID');
    return false;
  }
  
  if (typeof window === 'undefined') {
    return false; // Cannot access Cognito on server
  }

  try {
    // Capture the original source for logging
    const source = new Error().stack?.includes('TenantInitializer') 
      ? 'TenantInitializer' 
      : 'other';
    
    logger.debug(`[tenantUtils] Storing tenant ID in Cognito: ${tenantId}`, {
      source
    });
    
    // Update Cognito with tenant ID
    try {
      const { updateUserAttributes } = await import('aws-amplify/auth');
      
      await updateUserAttributes({
        userAttributes: {
          'custom:tenant_ID': tenantId,
          'custom:tenant_id': tenantId,
          'custom:businessid': tenantId,
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[tenantUtils] Updated Cognito attributes with tenant ID:', tenantId);
      return true;
    } catch (e) {
      logger.warn('[tenantUtils] Failed to update Cognito with tenant ID:', e);
      return false;
    }
  } catch (e) {
    logger.error('[tenantUtils] Error storing tenant ID:', e);
    return false;
  }
}

/**
 * Get tenant ID from the current auth context (Cognito, then localStorage)
 * @returns {string|null} The tenant ID or null if not found
 */
export async function getTenantIdFromCognito() {
  if (typeof window === 'undefined') {
    return null; // Cannot access Cognito on server
  }

  try {
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const attributes = await fetchUserAttributes();
    
    // Check for tenant ID in Cognito attributes (prioritized)
    const tenantIdFromCognito = attributes['custom:tenant_ID'] || 
                               attributes['custom:tenant_id'] || 
                               attributes['custom:businessid'];
    
    if (tenantIdFromCognito) {
      logger.debug('[tenantUtils] Found tenant ID in Cognito custom:tenant_ID attribute:', tenantIdFromCognito);
      return tenantIdFromCognito;
    }
    
    return null;
  } catch (e) {
    logger.warn('[tenantUtils] Error getting tenant ID from Cognito:', e);
    return null;
  }
}

/**
 * Gets the tenant ID from Cognito user attributes
 * @returns {Promise<string|null>} The tenant ID or null if not found
 */
export async function getTenantId() {
  if (typeof window === 'undefined') {
    return null; // Cannot access Cognito on server
  }

  try {
    // Get tenant ID from Cognito 
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    const attributes = await fetchUserAttributes();
    
    // Check for tenant ID in Cognito attributes (prioritized)
    const tenantIdFromCognito = attributes['custom:tenant_ID'] || 
                               attributes['custom:tenant_id'] || 
                               attributes['custom:businessid'];
    
    if (tenantIdFromCognito) {
      logger.debug('[tenantUtils] Found tenant ID in Cognito attributes:', tenantIdFromCognito);
      return tenantIdFromCognito;
    }
    
    // If we've reached here with no tenant ID, log it
    logger.warn('[tenantUtils] No tenant ID found in Cognito attributes');
    return null;
  } catch (e) {
    logger.error('[tenantUtils] Error getting tenant ID:', e);
    return null;
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
 * Generate a deterministic tenant ID based on user ID
 * 
 * @param {string} userId - The user ID
 * @returns {string} - The generated tenant ID
 */
export function generateDeterministicTenantId(userId) {
  if (!userId) return null;
  
  // This is a simplified implementation
  // In a real system, this would use crypto libraries for proper UUID generation
  const hash = Array.from(userId).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) & 0xFFFFFFFF;
  }, 0).toString(16).padStart(8, '0');
  
  const parts = [
    hash.slice(0, 8),
    hash.slice(0, 4),
    '5' + hash.slice(0, 3), // Version 5 UUID
    ((parseInt(hash.slice(0, 4), 16) & 0x3FFF) | 0x8000).toString(16), // Variant 1 UUID
    userId.slice(0, 12).padEnd(12, '0')
  ];
  
  return parts.join('-');
}

/**
 * Clears tenant-related data from Cognito attributes
 * @returns {Promise<boolean>} Success status
 */
export async function clearTenantStorage() {
  if (typeof window === 'undefined') return false;
  
  try {
    // Import auth utilities
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Clear tenant attributes from Cognito
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_ID': '',
        'custom:tenant_id': '',
        'custom:businessid': '',
        'custom:tenant_cleared_at': new Date().toISOString()
      }
    });
    
    logger.debug('[tenantUtils] Tenant data cleared from Cognito');
    return true;
  } catch (error) {
    logger.error('[tenantUtils] Error clearing tenant data from Cognito:', error);
    return false;
  }
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
  if (!tenantInfo || typeof window === 'undefined') return false;
  
  try {
    // Prepare tenant data for Cognito attributes
    const attributes = {};
    
    // Store basic tenant info
    if (tenantInfo.id) {
      attributes['custom:tenant_ID'] = tenantInfo.id;
      attributes['custom:tenant_id'] = tenantInfo.id;
      attributes['custom:businessid'] = tenantInfo.id;
    }
    
    if (tenantInfo.name) {
      attributes['custom:tenant_name'] = tenantInfo.name;
      
      // Also use as business name if not already set
      if (!tenantInfo.businessName) {
        attributes['custom:businessname'] = tenantInfo.name;
      }
    }
    
    if (tenantInfo.businessName) {
      attributes['custom:businessname'] = tenantInfo.businessName;
    }
    
    if (tenantInfo.businessType) {
      attributes['custom:businesstype'] = tenantInfo.businessType;
    }
    
    if (tenantInfo.status) {
      attributes['custom:tenant_status'] = tenantInfo.status;
    }
    
    // Store nested data as JSON string if needed
    if (Object.keys(tenantInfo).length > 5) {
      // Store limited data as JSON in a custom attribute
      const jsonData = JSON.stringify({
        id: tenantInfo.id,
        name: tenantInfo.name,
        created: tenantInfo.created || new Date().toISOString(),
        status: tenantInfo.status || 'active'
      });
      attributes['custom:tenant_data'] = jsonData;
    }
    
    // Update Cognito with tenant info
    const { updateUserAttributes } = await import('aws-amplify/auth');
    await updateUserAttributes({
      userAttributes: {
        ...attributes,
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    logger.debug('[tenantUtils] Tenant info stored in Cognito');
    
    // If tenantInfo contains ID, also ensure it's stored as primary tenant ID
    if (tenantInfo.id) {
      await storeTenantId(tenantInfo.id);
    }
    
    return true;
  } catch (error) {
    logger.error('[tenantUtils] Error storing tenant info in Cognito:', error);
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
            userAttributes?.email ? `${userAttributes.email.split('@')[0]}'s Business` : 'My Business'),
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
           userAttributes?.email ? `${userAttributes.email.split('@')[0]}'s Business` : 'My Business'),
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
 * Updates tenant ID in Cognito user attributes
 * @param {string} tenantId - The tenant ID to set
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export async function updateTenantIdInCognito(tenantId) {
  if (!tenantId) {
    console.warn('[tenantUtils] Cannot update Cognito with empty tenant ID');
    return false;
  }
  
  try {
    // Import auth utilities
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    // Update user attributes with tenant ID
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_id': tenantId,
        'custom:businessid': tenantId
      }
    });
    
    console.log(`[tenantUtils] Successfully updated Cognito with tenant ID: ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`[tenantUtils] Error updating Cognito with tenant ID: ${error.message}`);
    return false;
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