import { logger } from '@/utils/logger';
import { getAuthToken } from '@/utils/auth';
import { API_BASE_URL } from '@/config/constants';
import { logMemoryUsage, trackMemory, detectMemorySpike } from '@/utils/memoryDebug';

/**
 * Optimized utility function to verify tenant consistency for Row Level Security (RLS)
 * This function has replaced the schema setup since we now use RLS instead of schema-per-tenant
 * Memory optimizations:
 * - Reduced logging verbosity
 * - Minimized object creation
 * - Simplified error handling
 * - Added memory tracking to identify potential memory leaks
 */
export async function verifyTenantForRLS() {
  // Track memory at the start of the function
  trackMemory('verifyTenantForRLS', 'start');
  
  // Use a simple string instead of an object for request ID
  const requestId = `tenant-${Date.now().toString(36)}`;
  
  try {
    // Minimal logging with fewer objects
    logger.debug(`[Tenant] Verifying tenant for RLS (${requestId})`);
    
    // Track memory before auth token retrieval
    trackMemory('verifyTenantForRLS', 'before-getAuthToken');
    
    const token = await getAuthToken();
    
    // Track memory after auth token retrieval
    trackMemory('verifyTenantForRLS', 'after-getAuthToken');
    
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Get tenant ID from various sources
    let tenantId;
    try {
      // First check localStorage
      if (typeof localStorage !== 'undefined') {
        tenantId = localStorage.getItem('tenantId');
      }
      
      // Then check cookies if not found in localStorage
      if (!tenantId && typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'tenantId' && value) {
            tenantId = value;
            break;
          }
        }
      }
    } catch (e) {
      // Ignore errors accessing storage
      logger.warn(`[Tenant] Error accessing storage: ${e.message}`);
    }
    
    // Use tenant verification endpoint 
    const endpoint = `${API_BASE_URL}/auth/verify-tenant`;
    
    // Track memory before API request
    trackMemory('verifyTenantForRLS', 'before-fetch');
    
    // Make the API request with minimal headers
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': requestId
      },
      body: JSON.stringify({
        tenantId,
        validateOnly: true
      })
    });
    
    // Track memory after API request
    trackMemory('verifyTenantForRLS', 'after-fetch');
    
    // Handle 404 early to avoid parsing JSON unnecessarily
    if (response.status === 404) {
      // Track memory at the end of the function
      trackMemory('verifyTenantForRLS', 'end-404');
      return { success: false, status: 'tenant_not_found' };
    }
    
    // Track memory before JSON parsing
    trackMemory('verifyTenantForRLS', 'before-json');
    
    // Parse JSON only once
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Track memory on parse error
      trackMemory('verifyTenantForRLS', 'json-parse-error');
      
      return {
        success: false,
        error: 'Invalid response format',
        status: 'error'
      };
    }
    
    // Track memory after JSON parsing
    trackMemory('verifyTenantForRLS', 'after-json');
    
    // Check for memory spikes after JSON parsing (which can be memory intensive)
    const spike = detectMemorySpike(20);
    if (spike) {
      console.warn('[Memory Spike in Tenant Verification]', spike);
    }
    
    // Handle error responses
    if (!response.ok) {
      // Track memory on error response
      trackMemory('verifyTenantForRLS', 'error-response');
      
      return {
        success: false,
        error: data?.message || `Error ${response.status}`,
        status: response.status
      };
    }
    
    // Store tenant ID if we got a valid one from the API
    if (data.tenantId) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tenantId', data.tenantId);
        }
        
        if (typeof document !== 'undefined') {
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 30);
          document.cookie = `tenantId=${data.tenantId}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        }
      } catch (e) {
        logger.warn(`[Tenant] Error saving tenant ID: ${e.message}`);
      }
    }
    
    // Log success with minimal data
    logger.info(`[Tenant] Verification complete (${requestId})`);
    
    // Track memory at the end of successful execution
    trackMemory('verifyTenantForRLS', 'end-success');
    
    // Return minimal success response
    return {
      success: true,
      tenantId: data.tenantId,
      status: 'verified'
    };
  } catch (error) {
    // Track memory on exception
    trackMemory('verifyTenantForRLS', 'exception');
    
    // Simplified error logging
    logger.error(`[Tenant] Verification error: ${error.message}`);
    
    return {
      success: false,
      error: error.message || 'Unexpected error',
      status: 'error'
    };
  }
}

// Export the old function name as an alias to the new one for backward compatibility
export const triggerSchemaSetup = verifyTenantForRLS;