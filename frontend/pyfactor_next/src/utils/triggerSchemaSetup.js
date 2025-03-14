import { logger } from '@/utils/logger';
import { getAuthToken } from '@/utils/auth';
import { API_BASE_URL } from '@/config/constants';
import { logMemoryUsage, trackMemory, detectMemorySpike } from '@/utils/memoryDebug';

/**
 * Optimized utility function to trigger schema setup when user reaches the dashboard
 * This will check for any pending schema setup and initiate it if needed
 * Memory optimizations:
 * - Reduced logging verbosity
 * - Minimized object creation
 * - Simplified error handling
 * - Added memory tracking to identify potential memory leaks
 */
export async function triggerSchemaSetup() {
  // Track memory at the start of the function
  trackMemory('triggerSchemaSetup', 'start');
  
  // Use a simple string instead of an object for request ID
  const requestId = `setup-${Date.now().toString(36)}`;
  
  try {
    // Minimal logging with fewer objects
    logger.debug(`[Schema] Checking setup (${requestId})`);
    
    // Track memory before auth token retrieval
    trackMemory('triggerSchemaSetup', 'before-getAuthToken');
    
    const token = await getAuthToken();
    
    // Track memory after auth token retrieval
    trackMemory('triggerSchemaSetup', 'after-getAuthToken');
    
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Use a single endpoint variable to avoid string concatenation in multiple places
    const endpoint = `${API_BASE_URL}/onboarding/dashboard/setup/`;
    
    // Track memory before API request
    trackMemory('triggerSchemaSetup', 'before-fetch');
    
    // Make the API request with minimal headers
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': requestId
      }
    });
    
    // Track memory after API request
    trackMemory('triggerSchemaSetup', 'after-fetch');
    
    // Handle 404 early to avoid parsing JSON unnecessarily
    if (response.status === 404) {
      // Track memory at the end of the function
      trackMemory('triggerSchemaSetup', 'end-404');
      return { success: true, status: 'no_pending_setup' };
    }
    
    // Track memory before JSON parsing
    trackMemory('triggerSchemaSetup', 'before-json');
    
    // Parse JSON only once
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Track memory on parse error
      trackMemory('triggerSchemaSetup', 'json-parse-error');
      
      return {
        success: false,
        error: 'Invalid response format',
        status: 'error'
      };
    }
    
    // Track memory after JSON parsing
    trackMemory('triggerSchemaSetup', 'after-json');
    
    // Check for memory spikes after JSON parsing (which can be memory intensive)
    const spike = detectMemorySpike(20);
    if (spike) {
      console.warn('[Memory Spike in Schema Setup]', spike);
    }
    
    // Handle error responses
    if (!response.ok) {
      // Track memory on error response
      trackMemory('triggerSchemaSetup', 'error-response');
      
      return {
        success: false,
        error: data?.message || `Error ${response.status}`,
        status: response.status
      };
    }
    
    // Log success with minimal data
    logger.info(`[Schema] Setup initiated (${requestId})`);
    
    // Track memory at the end of successful execution
    trackMemory('triggerSchemaSetup', 'end-success');
    
    // Return minimal success response
    return {
      success: true,
      taskId: data.task_id,
      status: 'setup_initiated'
    };
  } catch (error) {
    // Track memory on exception
    trackMemory('triggerSchemaSetup', 'exception');
    
    // Simplified error logging
    logger.error(`[Schema] Setup error: ${error.message}`);
    
    return {
      success: false,
      error: error.message || 'Unexpected error',
      status: 'error'
    };
  }
}