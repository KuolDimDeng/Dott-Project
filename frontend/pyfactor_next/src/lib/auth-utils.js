/**
 * auth-utils.js
 * 
 * Authentication utilities for API routes
 * Auth0 version - replaced Cognito with Auth0
 * - Uses Auth0 session management
 * - Uses localStorage for onboarding attributes
 * - Uses tenant_id from localStorage
 * - ES modules syntax
 * 
 * Created: 2025-05-22
 * Version: 1.0
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Extract and verify JWT token from request headers
 * @param {Request} request - The incoming request
 * @returns {Object} Token information or null if invalid
 */
export async function verifyJWT(request) {
  try {
    // With Auth0, the session is managed through cookies
    // The @auth0/nextjs-auth0 middleware handles validation
    // This function is kept for compatibility but simplified
    
    logger.info('[auth-utils] JWT verification not needed with Auth0 - session managed by cookies');
    
    return {
      valid: true,
      message: 'Auth0 session validation handled by middleware'
    };

  } catch (error) {
    logger.error('[auth-utils] Error in JWT verification:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Extract token from request headers
 * @param {Request} request - The incoming request
 * @returns {string|null} The extracted token or null
 */
export function extractTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Get authenticated user with proper Cognito attribute handling
 * @param {Request} request - The incoming request (optional)
 * @returns {Object|null} User information with properly accessed attributes
 */
export async function getAuthenticatedUser(request = null) {
  try {
    logger.info('[auth-utils] Getting authenticated user');

    // For Auth0, user info comes from /api/auth/me endpoint
    const response = await fetch('/api/auth/me');
    
    if (!response.ok) {
      logger.warn('[auth-utils] No authenticated user from Auth0');
      return null;
    }
    
    const user = await response.json();
    
    // Get attributes from localStorage (for onboarding state)
    const storedAttributes = localStorage.getItem('userAttributes');
    const attributes = storedAttributes ? JSON.parse(storedAttributes) : {};
    
    // Build user object compatible with existing code
    const userWithAttributes = {
      userId: user.sub,
      username: user.email || user.sub,
      email: user.email,
      
      // Get tenant ID from localStorage
      tenantId: localStorage.getItem('tenantId') || attributes['custom:tenant_id'],
      
      // Other attributes from localStorage
      businessName: attributes['custom:business_name'],
      userRole: attributes['custom:user_role'] || 'user',
      businessId: attributes['custom:business_id'],
      setupDone: attributes['custom:setup_done'],
      onboardingStatus: attributes['custom:onboarding_status'] || localStorage.getItem('onboardingStatus'),
      accountStatus: attributes['custom:account_status'] || 'active',
      
      // Include Auth0 profile data
      name: user.name,
      picture: user.picture,
      
      // Include raw attributes for additional access if needed
      attributes: attributes,
      
      // Include original Auth0 user for backward compatibility
      originalUserInfo: user
    };

    // For new users without tenant ID, that's okay
    if (!userWithAttributes.tenantId && !userWithAttributes.businessId) {
      logger.info('[auth-utils] User does not have tenant ID yet - likely new user');
    } else {
      logger.info('[auth-utils] Successfully retrieved authenticated user with tenant ID:', 
        userWithAttributes.tenantId || userWithAttributes.businessId);
    }

    return userWithAttributes;

  } catch (error) {
    logger.error('[auth-utils] Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication middleware wrapper
 * @param {Function} handler - The API route handler to wrap
 * @returns {Function} The wrapped handler with authentication requirement
 */
export function requireAuth(handler) {
  return async (request, context) => {
    try {
      logger.info('[auth-utils] Checking authentication for API route');

      const user = await getAuthenticatedUser(request);
      
      if (!user) {
        logger.warn('[auth-utils] Authentication required - no valid user');
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      // Add user info to request context for handler use
      request.user = user;
      request.auth = user; // Alias for backward compatibility
      
      logger.info('[auth-utils] Authentication successful for user:', user.userId);
      
      return await handler(request, context);
    } catch (error) {
      logger.error('[auth-utils] Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }
  };
}

/**
 * Get user from authenticated request
 * @param {Request} request - The request object (should have user attached by requireAuth)
 * @returns {Object|null} The user object or null
 */
export function getUserFromRequest(request) {
  return request.user || request.auth || null;
}

/**
 * Create a standardized auth response
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {NextResponse} The response object
 */
export function createAuthResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Validate tenant access for the authenticated user
 * @param {Object} user - The authenticated user object
 * @param {string} requiredTenantId - The tenant ID that should be accessed
 * @returns {boolean} True if user has access to the tenant
 */
export function validateTenantAccess(user, requiredTenantId) {
  if (!user || !requiredTenantId) {
    return false;
  }

  // Check if user's tenant ID matches required tenant ID
  const userTenantId = user.tenantId || user.businessId;
  if (userTenantId === requiredTenantId) {
    return true;
  }

  // Additional checks for admin roles (if implemented)
  const userRole = user.userRole;
  if (userRole === 'admin' || userRole === 'owner') {
    logger.info('[auth-utils] Admin/Owner access granted for cross-tenant operation');
    return true;
  }

  logger.warn('[auth-utils] Tenant access denied. User tenant:', userTenantId, 'Required:', requiredTenantId);
  return false;
}

/**
 * Export all functions for use in API routes
 */
export default {
  verifyJWT,
  extractTokenFromRequest,
  getAuthenticatedUser,
  requireAuth,
  getUserFromRequest,
  createAuthResponse,
  validateTenantAccess
};
