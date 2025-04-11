'use client';

import { usePathname, useParams, useSearchParams } from 'next/navigation';
import { logger } from './logger';

/**
 * Custom hook to get the tenant ID from various sources
 * @returns {string|null} The tenant ID or null if not found
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
  
  // If still not found, check localStorage
  if (!tenantId && typeof window !== 'undefined') {
    tenantId = localStorage.getItem('tenantId');
  }
  
  // If still not found, check cookies
  if (!tenantId && typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'tenantId' && value) {
        tenantId = value;
        break;
      } else if (name === 'businessid' && value) {
        tenantId = value;
        break;
      }
    }
  }
  
  return tenantId;
}

/**
 * Gets the tenant ID for server components from headers or cookies
 * @param {Object} headers - Request headers
 * @param {Object} cookies - Request cookies
 * @returns {string|null} The tenant ID or null if not found
 */
export function getServerTenantId(headers, cookies) {
  // Check the headers first (set by middleware)
  if (headers && headers.get('x-tenant-id')) {
    return headers.get('x-tenant-id');
  }
  
  // Then check cookies
  if (cookies && cookies.tenantId) {
    return cookies.tenantId;
  }
  
  if (cookies && cookies.businessid) {
    return cookies.businessid;
  }
  
  return null;
}

/**
 * Validates that a string is a valid UUID
 * @param {string} str - The string to validate
 * @returns {boolean} Whether the string is a valid UUID
 */
export function isValidUUID(str) {
  if (!str) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

/**
 * Stores the tenant ID in client storage (localStorage and cookies)
 * @param {string} tenantId - The tenant ID to store
 * @returns {boolean} Whether the operation was successful
 */
export function storeTenantId(tenantId) {
  if (!tenantId || !isValidUUID(tenantId)) {
    console.error('[tenantUtils] Invalid tenant ID format:', tenantId);
    return false;
  }
  
  try {
    // Store in localStorage with error handling
    try {
      localStorage.setItem('tenantId', tenantId);
      localStorage.setItem('businessid', tenantId); // For backward compatibility
    } catch (storageError) {
      console.warn('[tenantUtils] Error storing tenant ID in localStorage:', storageError);
      // Continue anyway as cookies are more important for server requests
    }
    
    // Store in cookies for server requests with secure parameters
    try {
      const secure = process.env.NODE_ENV === 'production' ? ';secure' : '';
      document.cookie = `tenantId=${tenantId};path=/;max-age=${30*24*60*60};SameSite=Lax${secure}`;
      document.cookie = `businessid=${tenantId};path=/;max-age=${30*24*60*60};SameSite=Lax${secure}`;
    } catch (cookieError) {
      console.warn('[tenantUtils] Error storing tenant ID in cookies:', cookieError);
      // If cookies fail, try to set them with minimal options
      try {
        document.cookie = `tenantId=${tenantId};path=/`;
        document.cookie = `businessid=${tenantId};path=/`;
      } catch (e) {
        console.error('[tenantUtils] Critical error storing tenant ID in cookies:', e);
        return false;
      }
    }
    
    // Also store in memory for faster access
    try {
      window.__TENANT_ID = tenantId;
    } catch (memoryError) {
      console.warn('[tenantUtils] Error storing tenant ID in memory:', memoryError);
      // Not critical
    }
    
    return true;
  } catch (error) {
    console.error('[tenantUtils] Critical error storing tenant ID:', error);
    return false;
  }
}

/**
 * Gets the tenant ID from storage (localStorage or cookies)
 * @returns {string|null} The tenant ID or null if not found
 */
export function getTenantId() {
  // Check in-memory cache first for performance
  if (typeof window !== 'undefined' && window.__TENANT_ID) {
    return window.__TENANT_ID;
  }
  
  // Check localStorage
  const localStorageValue = typeof window !== 'undefined' 
    ? localStorage.getItem('tenantId') 
    : null;
    
  if (localStorageValue && isValidUUID(localStorageValue)) {
    return localStorageValue;
  }
  
  // Check cookies
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'tenantId' && isValidUUID(value)) {
        return value;
      }
      if (name === 'businessid' && isValidUUID(value)) {
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Clears all tenant-related data from storage
 */
export function clearTenantStorage() {
  if (typeof window === 'undefined') return;
  
  // Clear from localStorage
  localStorage.removeItem('tenantId');
  localStorage.removeItem('tenant');
  localStorage.removeItem('tenantData');
  
  // Clear from cookies
  document.cookie = 'tenantId=; path=/; max-age=0';
  document.cookie = 'businessid=; path=/; max-age=0';
}

/**
 * Stores authentication tokens in localStorage
 * @param {Object} tokens - The tokens to store
 */
export function setTokens(tokens) {
  if (typeof window === 'undefined' || !tokens) return;
  
  if (tokens.accessToken) {
    localStorage.setItem('accessToken', tokens.accessToken);
  }
  
  if (tokens.refreshToken) {
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }
  
  if (tokens.idToken) {
    localStorage.setItem('idToken', tokens.idToken);
  }
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
 * Store tenant information in client storage
 * @param {Object} tenantInfo - The tenant info to store
 */
export function storeTenantInfo(tenantInfo) {
  if (!tenantInfo || typeof window === 'undefined') return;
  
  // Store tenant info in localStorage
  localStorage.setItem('tenantData', JSON.stringify(tenantInfo));
  
  // If tenantInfo contains ID, also store as tenantId
  if (tenantInfo.id) {
    storeTenantId(tenantInfo.id);
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
      return {
        valid: true,
        tenant: {
          id: tenantId,
          name: localStorage.getItem('businessName') || 'Development Business',
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
    
    // Call the enhanced tenant API endpoint that ensures schema creation
    const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: businessId,
        userId: userAttributes?.sub,
        email: userAttributes?.email,
        businessName: userAttributes?.['custom:businessname'] || 'Default Business',
        businessType: userAttributes?.['custom:businesstype'] || 'Other',
        businessCountry: userAttributes?.['custom:businesscountry'] || 'US',
        forceCreate: true
      })
    });
    
    if (tenantResponse.ok) {
      const tenantResult = await tenantResponse.json();
      logger.info('[tenantUtils] Tenant creation result:', tenantResult);
      
      if (tenantResult.success && tenantResult.tenantId) {
        // Store the tenant ID in all storage mechanisms
        storeTenantId(tenantResult.tenantId);
        
        // Initialize the tenant database schema
        try {
          const initResponse = await fetch('/api/tenant/initialize-tenant', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantResult.tenantId
            },
            body: JSON.stringify({
              tenantId: tenantResult.tenantId
            })
          });
          
          if (initResponse.ok) {
            logger.info('[tenantUtils] Tenant database initialized successfully');
          } else {
            logger.warn('[tenantUtils] Tenant database initialization warning:', await initResponse.text());
            // Continue anyway as this is non-fatal
          }
        } catch (initError) {
          logger.error('[tenantUtils] Tenant initialization error (non-fatal):', initError);
          // Continue anyway as this is non-fatal
        }
        
        return tenantResult.tenantId;
      }
    } else {
      logger.error('[tenantUtils] Tenant creation failed:', await tenantResponse.text());
    }
    
    return null;
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
    logger.info('[TenantUtils] Updating user attributes with tenant ID:', tenantId);
    
    // Import from config to avoid SSR issues
    const { updateUserAttributes } = await import('@/config/amplifyUnified');
    
    // Update Cognito user attributes
    await updateUserAttributes({
      userAttributes: {
        'custom:tenant_id': tenantId,
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    logger.info('[TenantUtils] User attributes updated successfully');
    return true;
  } catch (error) {
    logger.error('[TenantUtils] Error updating user attributes:', error);
    return false;
  }
}

/**
 * Get business ID from various sources (localStorage, cookies, attributes)
 * @param {Object} userAttributes - Optional user attributes
 * @returns {string|null} - Business ID or null if not found
 */
export function getBusinessId(userAttributes = {}) {
  // Try localStorage first
  const localStorageBusinessId = localStorage.getItem('businessId');
  if (localStorageBusinessId) {
    logger.debug('[TenantUtils] Found business ID in localStorage:', localStorageBusinessId);
    return localStorageBusinessId;
  }
  
  // Try user attributes with both possible attribute names
  const attributeBusinessId = userAttributes['custom:business_id'] || userAttributes['custom:businessid'];
  if (attributeBusinessId) {
    logger.debug('[TenantUtils] Found business ID in user attributes:', attributeBusinessId);
    return attributeBusinessId;
  }
  
  // Try cookies
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };
  
  const cookieBusinessId = getCookie('businessId');
  if (cookieBusinessId) {
    logger.debug('[TenantUtils] Found business ID in cookies:', cookieBusinessId);
    return cookieBusinessId;
  }
  
  // No business ID found
  logger.debug('[TenantUtils] No business ID found');
  return null;
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