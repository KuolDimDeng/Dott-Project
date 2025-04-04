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
  
  if (user && user['custom:tenant_id']) {
    return user['custom:tenant_id'];
  }
  
  if (user && user.sub) {
    // Use Cognito sub as tenant ID if no explicit tenant ID
    return user.sub;
  }
  
  // For development mode, check environment variable first
  if (process.env.NODE_ENV === 'development') {
    // Check env var first (highest priority for dev mode)
    if (process.env.DEV_TENANT_ID) {
      logger.debug('[RLS] Using environment variable tenant ID', { 
        tenantId: process.env.DEV_TENANT_ID 
      });
      return process.env.DEV_TENANT_ID;
    }
    
    // Then check development mode headers
    if (request) {
      const isDev = request.headers.get('x-dev-mode') === 'true';
      if (isDev) {
        const devTenantId = request.headers.get('x-tenant-id');
        if (devTenantId) {
          logger.debug('[RLS] Using development tenant ID from headers', { devTenantId });
          return devTenantId;
        }
      }
    }
    
    // Then check cookies
    if (request) {
      const cookies = request.cookies || new Map();
      const bypassAuth = cookies.get('bypassAuthValidation')?.value === 'true';
      
      if (bypassAuth) {
        const cookieTenantId = cookies.get('dev-tenant-id')?.value;
        if (cookieTenantId) {
          logger.debug('[RLS] Using tenant ID from cookies', { tenantId: cookieTenantId });
          return cookieTenantId;
        }
        
        // Fallback to default dev tenant ID if no cookie
        const devTenantId = 'dev-tenant-123';
        logger.debug('[RLS] Using fallback development tenant ID', { devTenantId });
        return devTenantId;
      }
    }
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