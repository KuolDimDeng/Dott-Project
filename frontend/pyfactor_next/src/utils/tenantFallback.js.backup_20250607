/**
 * Tenant Fallback Utilities
 * 
 * This module provides fallback mechanisms for tenant operations when
 * API calls fail or network connectivity issues occur.
 */

import { isValidUUID, generateDeterministicTenantId } from './tenantUtils';
import { logger } from './logger';

// Storage keys
const STORAGE_KEYS = {
  TENANT_ID: 'tenant_id',
  TENANT_METADATA: 'tenant_metadata',
  TENANT_EXPIRY: 'tenant_id_expiry',
  SUBSCRIPTION_COMPLETED: 'subscription_completed',
  TENANT_RECOVERY_ATTEMPTS: 'tenant_recovery_attempts',
  LAST_KNOWN_TENANT: 'last_known_tenant_id',
  FALLBACK_ACTIVATED: 'tenant_fallback_activated',
  EMERGENCY_RECOVERY_EXECUTED: 'emergency_recovery_executed',
  EMERGENCY_RECOVERY_TIMESTAMP: 'emergency_recovery_timestamp'
};

// Emergency recovery throttling
const RECOVERY_THROTTLE_MS = 10000; // 10 seconds
let recoveryInProgress = false;

/**
 * Get a tenant ID from any available source in case of API failure
 * Uses multiple storage mechanisms and prioritizes sources
 */
export const getFallbackTenantId = () => {
  try {
    // Try localStorage first (most common)
    const localTenantId = localStorage.getItem(STORAGE_KEYS.TENANT_ID);
    if (localTenantId && isValidUUID(localTenantId)) {
      logger.debug("[TenantFallback] Using tenant ID from localStorage:", localTenantId);
      return localTenantId;
    }

    // Try sessionStorage next
    const sessionTenantId = sessionStorage.getItem(STORAGE_KEYS.TENANT_ID);
    if (sessionTenantId && isValidUUID(sessionTenantId)) {
      logger.debug("[TenantFallback] Using tenant ID from sessionStorage:", sessionTenantId);
      // Save to localStorage for future use
      localStorage.setItem(STORAGE_KEYS.TENANT_ID, sessionTenantId);
      return sessionTenantId;
    }

    // Try to extract from URL path if available
    try {
      const pathTenantId = extractTenantIdFromUrl();
      if (pathTenantId && isValidUUID(pathTenantId)) {
        logger.debug("[TenantFallback] Extracted tenant ID from URL path:", pathTenantId);
        // Save for future reference
        localStorage.setItem(STORAGE_KEYS.TENANT_ID, pathTenantId);
        return pathTenantId;
      }
    } catch (e) {
      logger.error("[TenantFallback] Error extracting tenant ID from URL:", e);
    }

    // Try AppCache for tenant ID
    if (typeof window !== 'undefined' && 
        window.__APP_CACHE?.tenant?.id && 
        isValidUUID(window.__APP_CACHE.tenant.id)) {
      logger.debug("[TenantFallback] Using tenant ID from AppCache:", window.__APP_CACHE.tenant.id);
      localStorage.setItem(STORAGE_KEYS.TENANT_ID, window.__APP_CACHE.tenant.id);
      return window.__APP_CACHE.tenant.id;
    }

    // Last resort: check for a last known tenant ID
    const lastKnownTenantId = localStorage.getItem(STORAGE_KEYS.LAST_KNOWN_TENANT);
    if (lastKnownTenantId && isValidUUID(lastKnownTenantId)) {
      logger.debug("[TenantFallback] Using last known tenant ID:", lastKnownTenantId);
      localStorage.setItem(STORAGE_KEYS.TENANT_ID, lastKnownTenantId);
      return lastKnownTenantId;
    }

    logger.warn("[TenantFallback] Could not find a valid tenant ID from any source");
    return null;
  } catch (error) {
    logger.error("[TenantFallback] Error getting fallback tenant ID:", error);
    return null;
  }
};

/**
 * Extract a tenant ID from the current URL
 */
export const extractTenantIdFromUrl = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Look for UUID pattern in path segments
    for (const segment of segments) {
      if (isValidUUID(segment)) {
        return segment;
      }
    }
    
    return null;
  } catch (error) {
    logger.error("[TenantFallback] Error extracting tenant ID from URL:", error);
    return null;
  }
};

/**
 * Check if we need to activate tenant recovery
 * This happens when we see consistent API failures but have a valid tenant ID
 */
export const shouldActivateTenantRecovery = () => {
  try {
    // Check if we've already activated fallback mode
    if (localStorage.getItem(STORAGE_KEYS.FALLBACK_ACTIVATED) === 'true') {
      return true;
    }

    // Check for API failure pattern
    const recoveryAttempts = parseInt(localStorage.getItem(STORAGE_KEYS.TENANT_RECOVERY_ATTEMPTS) || '0', 10);
    
    // If we've had multiple recovery attempts and have a tenant ID, activate recovery
    if (recoveryAttempts >= 2 && getFallbackTenantId()) {
      localStorage.setItem(STORAGE_KEYS.FALLBACK_ACTIVATED, 'true');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error("[TenantFallback] Error checking if tenant recovery should activate:", error);
    return false;
  }
};

/**
 * Record an API failure to track patterns
 */
export const recordApiFailure = (endpoint, error) => {
  try {
    const recoveryAttempts = parseInt(localStorage.getItem(STORAGE_KEYS.TENANT_RECOVERY_ATTEMPTS) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.TENANT_RECOVERY_ATTEMPTS, String(recoveryAttempts + 1));
    
    // Log the error for diagnostics
    logger.warn(`[TenantFallback] API failure #${recoveryAttempts + 1} at ${endpoint}:`, error?.message || error);
    
    // Check if we should activate recovery mode
    return shouldActivateTenantRecovery();
  } catch (storageError) {
    logger.error("[TenantFallback] Error recording API failure:", storageError);
    return false;
  }
};

/**
 * Track a successful tenant ID for potential future recovery
 */
export const trackSuccessfulTenant = (tenantId) => {
  if (!tenantId || !isValidUUID(tenantId)) return;
  
  try {
    // Store as the last known good tenant ID
    localStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TENANT, tenantId);
    
    // Reset recovery attempts on success
    localStorage.setItem(STORAGE_KEYS.TENANT_RECOVERY_ATTEMPTS, '0');
    
    // Deactivate fallback mode if it was active
    localStorage.setItem(STORAGE_KEYS.FALLBACK_ACTIVATED, 'false');
    
    // Also store in AppCache
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenant.id = tenantId;
    }
  } catch (error) {
    logger.error("[TenantFallback] Error tracking successful tenant:", error);
  }
};

/**
 * Generate a fallback tenant route when navigation fails
 */
export const getRecoveryDashboardUrl = (tenantId = null) => {
  try {
    const effectiveTenantId = tenantId || getFallbackTenantId();
    
    if (!effectiveTenantId) {
      logger.error("[TenantFallback] Cannot generate recovery URL without a tenant ID");
      return '/';
    }
    
    return `/${effectiveTenantId}/dashboard?recovery=true`;
  } catch (error) {
    logger.error("[TenantFallback] Error generating recovery dashboard URL:", error);
    return '/';
  }
};

/**
 * Check if we should throttle emergency recovery
 * @returns {boolean} - True if recovery should be throttled
 */
const shouldThrottleRecovery = () => {
  // Check if recovery is already in progress
  if (recoveryInProgress) {
    return true;
  }
  
  try {
    // Check when the last recovery was executed
    const lastRecoveryTimestamp = parseInt(localStorage.getItem(STORAGE_KEYS.EMERGENCY_RECOVERY_TIMESTAMP) || '0', 10);
    const now = Date.now();
    
    // Throttle if less than throttle time has passed
    if (now - lastRecoveryTimestamp < RECOVERY_THROTTLE_MS) {
      logger.warn(`[TenantFallback] Throttling emergency recovery - last recovery was ${now - lastRecoveryTimestamp}ms ago`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error("[TenantFallback] Error checking recovery throttle:", error);
    return false;
  }
};

/**
 * Handle complete navigation failure - last resort recovery
 */
export const executeEmergencyRecovery = () => {
  // Skip recovery on auth pages and public routes
  if (typeof window !== 'undefined' && 
      (window.location.pathname.includes('/auth/') || 
       window.location.pathname.includes('/sign-in') || 
       window.location.pathname.includes('/sign-up') ||
       window.location.pathname === '/' ||
       window.location.pathname === '/login')) {
    logger.debug("[TenantFallback] Skipping emergency recovery on auth/public page");
    return false;
  }
  
  // Check if we should throttle recovery
  if (shouldThrottleRecovery()) {
    return false;
  }
  
  // Set in-progress flag to prevent parallel recoveries
  recoveryInProgress = true;
  
  try {
    const tenantId = getFallbackTenantId();
    
    // Record recovery timestamp
    localStorage.setItem(STORAGE_KEYS.EMERGENCY_RECOVERY_TIMESTAMP, Date.now().toString());
    localStorage.setItem(STORAGE_KEYS.EMERGENCY_RECOVERY_EXECUTED, 'true');
    
    if (tenantId) {
      const recoveryUrl = getRecoveryDashboardUrl(tenantId);
      logger.info("[TenantFallback] Executing emergency recovery navigation to:", recoveryUrl);
      
      // Use setTimeout to avoid immediate page load abort errors
      setTimeout(() => {
        try {
          window.location.href = recoveryUrl;
        } catch (navigationError) {
          logger.error("[TenantFallback] Navigation error during emergency recovery:", navigationError);
          recoveryInProgress = false;
        }
      }, 100);
      
      return true;
    }
    
    // If we can't recover and we're on a tenant route, redirect to home
    if (typeof window !== 'undefined' && 
        window.location.pathname.includes('/dashboard')) {
      logger.error("[TenantFallback] Emergency recovery failed - no valid tenant ID found, redirecting to home");
      
      // Use setTimeout to avoid immediate page load abort errors
      setTimeout(() => {
        try {
          window.location.href = '/';
        } catch (navigationError) {
          logger.error("[TenantFallback] Navigation error during fallback to home:", navigationError);
          recoveryInProgress = false;
        }
      }, 100);
      
      return false;
    }
    
    // If we're not on a dashboard route, just stay where we are
    logger.warn("[TenantFallback] No tenant ID available, but not disrupting current page");
    recoveryInProgress = false;
    return false;
  } catch (error) {
    logger.error("[TenantFallback] Critical error in emergency recovery:", error);
    recoveryInProgress = false;
    return false;
  }
};

/**
 * Create a mock API response when the real API fails
 */
export const createFallbackApiResponse = (tenantId = null) => {
  try {
    const effectiveTenantId = tenantId || getFallbackTenantId();
    
    if (!effectiveTenantId) {
      return {
        success: false,
        error: 'No tenant ID available for fallback response',
        fallback: true
      };
    }
    
    // Return a standardized fallback response
    return {
      success: true,
      fallback: true,
      tenant: {
        id: effectiveTenantId,
        created: new Date().toISOString(),
        status: 'active'
      },
      message: 'Using locally cached tenant information due to API unavailability'
    };
  } catch (error) {
    logger.error("[TenantFallback] Error creating fallback API response:", error);
    return {
      success: false,
      error: 'Error creating fallback response',
      fallback: true
    };
  }
};

/**
 * Utility to safely store tenant ID across multiple storage mechanisms
 */
export const storeReliableTenantId = (tenantId) => {
  if (!tenantId || !isValidUUID(tenantId)) {
    // Try to fix the tenant ID if possible
    if (tenantId) {
      const validatedId = generateDeterministicTenantId(tenantId);
      if (validatedId) {
        tenantId = validatedId;
      } else {
        logger.error("[TenantFallback] Cannot store invalid tenant ID and validation failed");
        return false;
      }
    } else {
      logger.error("[TenantFallback] Cannot store null tenant ID");
      return false;
    }
  }
  
  try {
    // Store in multiple locations for resilience
    localStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId);
    sessionStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId);
    localStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TENANT, tenantId);
    
    // Also store in AppCache
    if (typeof window !== 'undefined') {
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenant.id = tenantId;
    }
    
    return true;
  } catch (error) {
    logger.error("[TenantFallback] Error storing tenant ID reliably:", error);
    return false;
  }
};

/**
 * Reset recovery system (for testing or debugging)
 */
export const resetRecoverySystem = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.FALLBACK_ACTIVATED);
    localStorage.removeItem(STORAGE_KEYS.TENANT_RECOVERY_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEYS.EMERGENCY_RECOVERY_EXECUTED);
    localStorage.removeItem(STORAGE_KEYS.EMERGENCY_RECOVERY_TIMESTAMP);
    recoveryInProgress = false;
    logger.info("[TenantFallback] Recovery system reset");
    return true;
  } catch (error) {
    logger.error("[TenantFallback] Error resetting recovery system:", error);
    return false;
  }
}; 