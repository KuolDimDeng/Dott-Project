/**
 * Middleware to set RLS tenant ID in database sessions
 * Supports both production and development modes
 */
import { logger } from '@/utils/serverLogger';

/**
 * Extracts the tenant ID from a user or request
 * Falls back to development mode tenant ID if available
 */
export const getTenantId = (user, request) => {
  // First priority: Check if there's a user with a tenant ID
  if (user && user.tenant_id) {
    return user.tenant_id;
  }
  
  if (user && user['custom:tenant_ID']) {
    return user['custom:tenant_ID'];
  }
  
  if (user && user.sub) {
    // Use Cognito sub as tenant ID if no explicit tenant ID
    return user.sub;
  }
  
  // For development mode, use environment variable or user ID
  if (process.env.NODE_ENV === 'development') {
    // Check for tenant ID in the request
    const tenantIdFromRequest = request?.cookies?.get('tenantId')?.value;
    
    if (tenantIdFromRequest) {
      logger.debug('[RLS] Using tenant ID from request cookies', { 
        tenantId: tenantIdFromRequest
      });
      return tenantIdFromRequest;
    }
    
    // Try to get user.sub as fallback
    if (user && user.sub) {
      logger.debug('[RLS] Using user sub as tenant ID fallback', { 
        tenantId: user.sub
      });
      return user.sub;
    }
    
    // Log warning about missing tenant ID but don't hardcode one
    logger.warn('[RLS] No tenant ID found in development mode');
    return null;
  }
  
  // Fallback - in production, this should never happen
  return null;
};

/**
 * Sets RLS tenant ID in a database client/connection
 * This function should be adapted to your specific database type
 */
export const setRlsTenantId = async (db, tenantId, requestId) => {
  if (!tenantId) {
    logger.warn('[RLS] No tenant ID available', { requestId });
    return false;
  }
  
  try {
    // For development mode with real DB testing
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[RLS] Setting tenant ID in development real DB mode', { 
        tenantId, 
        requestId,
        testing: true
      });
    }
    
    // For PostgreSQL
    if (db && db.query) {
      await db.query('SET LOCAL rls.tenant_id = $1', [tenantId]);
      logger.debug('[RLS] Set tenant ID in database session', { tenantId, requestId });
      return true;
    }
    
    // For database.js style pools
    if (db && db.execute) {
      await db.execute('SET LOCAL rls.tenant_id = ?', [tenantId]);
      logger.debug('[RLS] Set tenant ID in database session', { tenantId, requestId });
      return true;
    }
    
    // For Prisma
    if (db && db.$executeRawUnsafe) {
      await db.$executeRawUnsafe('SET LOCAL rls.tenant_id = $1', tenantId);
      logger.debug('[RLS] Set tenant ID in Prisma session', { tenantId, requestId });
      return true;
    }
    
    logger.warn('[RLS] Unknown database client type', { requestId });
    return false;
  } catch (error) {
    logger.error('[RLS] Error setting tenant ID', { 
      error: error.message, 
      stack: error.stack,
      tenantId,
      requestId
    });
    return false;
  }
};

/**
 * Middleware for API routes to set RLS tenant ID
 * Use this in API routes that need RLS enforcement
 */
export const withRls = (handler) => {
  return async (request, context) => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Get tenant ID from user or dev mode
      const { getServerUser } = await import('@/utils/getServerUser');
      const user = await getServerUser(request, context).catch(error => {
        logger.warn('[RLS] Error getting server user', {
          error: error.message,
          requestId
        });
        return null;
      });
      
      const tenantId = getTenantId(user, request);
      
      // No tenant ID - handle based on environment
      if (!tenantId) {
        if (process.env.NODE_ENV === 'development') {
          // In development, log warning but continue
          logger.warn('[RLS] No tenant ID available in development', { requestId });
        } else {
          // In production, reject the request
          logger.error('[RLS] No tenant ID available', { requestId });
          return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: 'No tenant ID available',
            requestId
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Add tenant ID to context for the handler
      context.tenantId = tenantId;
      
      // Call the handler with tenant ID in context
      const response = await handler(request, context);
      
      // Log timing
      const duration = Date.now() - startTime;
      logger.debug('[RLS] Request completed', { 
        requestId, 
        tenantId, 
        duration,
        url: request.url
      });
      
      return response;
    } catch (error) {
      logger.error('[RLS] Middleware error', {
        error: error.message,
        stack: error.stack,
        requestId,
        url: request.url
      });
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An error occurred processing your request',
        requestId
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
};

/**
 * Row-Level Security (RLS) utility functions
 * 
 * This module contains functions for enforcing tenant isolation and RLS.
 */

/**
 * Verifies that the current user has access to the specified tenant
 * 
 * @param {Object} user - User object with Cognito attributes
 * @param {string} tenantId - Tenant ID to verify access for
 * @returns {boolean} - Whether the user has access to this tenant
 */
export function verifyTenantAccess(user, tenantId) {
  if (!user || !tenantId) return false;
  
  // Get the user's tenant ID from any potential attribute
  const userTenantId = 
    user['custom:tenant_ID'] || 
    user['custom:businessid'] || 
    user['custom:business_id'] || 
    user.tenantId || 
    null;
  
  // If user has a tenant ID, it must match the requested tenant ID
  if (userTenantId) {
    return userTenantId === tenantId;
  }
  
  // If user has no tenant ID, they don't have access to any tenant
  return false;
}

/**
 * Enforces Row-Level Security access policy on data objects
 * 
 * @param {Object} data - Data object to filter
 * @param {string} tenantId - Tenant ID to enforce
 * @param {string} tenantIdField - Field name in data containing tenant ID (default: 'tenantId')
 * @returns {Object|null} - Filtered data object or null if access denied
 */
export function enforceRlsPolicy(data, tenantId, tenantIdField = 'tenantId') {
  if (!data || !tenantId) return null;
  
  // For arrays, filter each item
  if (Array.isArray(data)) {
    return data.filter(item => 
      item && 
      item[tenantIdField] && 
      item[tenantIdField] === tenantId
    );
  }
  
  // For objects, check if tenant ID matches
  if (data[tenantIdField] && data[tenantIdField] !== tenantId) {
    // Tenant ID mismatch - deny access
    return null;
  }
  
  return data;
}

/**
 * Creates a tenant-specific key for cache storage
 * 
 * @param {string} baseKey - Base key name
 * @param {string} tenantId - Tenant ID
 * @returns {string} - Tenant-specific key
 */
export function getTenantCacheKey(baseKey, tenantId) {
  if (!tenantId) return baseKey;
  return `${tenantId}_${baseKey}`;
}

/**
 * Clears all tenant-specific data from application cache
 * 
 * @param {string} tenantId - Tenant ID to clear
 */
export function clearTenantCache(tenantId) {
  if (typeof window === 'undefined' || !window.__APP_CACHE || !tenantId) return;
  
  try {
    // Remove all tenant-specific keys from each category
    Object.keys(window.__APP_CACHE).forEach(category => {
      if (typeof window.__APP_CACHE[category] === 'object') {
        Object.keys(window.__APP_CACHE[category]).forEach(key => {
          if (key.startsWith(`${tenantId}_`)) {
            delete window.__APP_CACHE[category][key];
          }
        });
      }
    });
    
    // Clear tenant-specific object
    if (window.__APP_CACHE.tenant && window.__APP_CACHE.tenant[tenantId]) {
      delete window.__APP_CACHE.tenant[tenantId];
    }
  } catch (error) {
    console.error('[RLS] Error clearing tenant cache:', error);
  }
}

/**
 * Verifies a user's subscription plan
 * 
 * @param {Object} user - User object with Cognito attributes
 * @param {string} requiredPlan - Minimum plan required ('professional', 'enterprise')
 * @returns {boolean} - Whether the user's plan meets the requirement
 */
export function verifySubscriptionPlan(user, requiredPlan) {
  if (!user || !requiredPlan) return false;
  
  // Get the user's subscription plan
  const userPlan = 
    user['custom:subplan'] || 
    user['custom:subscription_plan'] || 
    user.subscriptionType || 
    user.subscription_type || 
    'free';
  
  // Plan hierarchy for comparison
  const planHierarchy = {
    'free': 0,
    'professional': 1,
    'enterprise': 2
  };
  
  // Get numeric values for comparison
  const userPlanValue = planHierarchy[userPlan.toLowerCase()] || 0;
  const requiredPlanValue = planHierarchy[requiredPlan.toLowerCase()] || 0;
  
  // User's plan must be greater than or equal to required plan
  return userPlanValue >= requiredPlanValue;
} 