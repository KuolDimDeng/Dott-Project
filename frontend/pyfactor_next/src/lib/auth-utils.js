/**
 * auth-utils.js
 * 
 * Authentication utilities for API routes
 * Integrates with existing authUtils.js and follows all project conditions:
 * - No mock data - connects to live AWS/Cognito services
 * - Uses CognitoAttributes utility for proper attribute access
 * - Uses custom:tenant_ID for tenant identification (correct casing)
 * - No cookies/localStorage - uses Cognito Attributes and AWS App Cache only
 * - ES modules syntax
 * 
 * Created: 2025-05-22
 * Version: 1.0
 */

import { NextResponse } from 'next/server';
import { getCurrentUser, fetchAuthSession  } from '@/config/amplifyUnified';
import CognitoAttributes from '@/utils/CognitoAttributes';
import { logger } from '@/utils/logger';
import { 
  getAuthenticatedUser as getAuthenticatedUserFromUtils,
  getAuthSessionWithRetries,
  ensureAmplifyConfigured 
} from '@/utils/authUtils';

/**
 * Extract and verify JWT token from request headers
 * @param {Request} request - The incoming request
 * @returns {Object} Token information or null if invalid
 */
export async function verifyJWT(request) {
  try {
    // Ensure Amplify is configured
    ensureAmplifyConfigured();

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[auth-utils] No valid Authorization header found');
      return { valid: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    
    // Get current session to validate token
    const session = await getAuthSessionWithRetries(2);
    if (!session?.tokens?.accessToken) {
      logger.warn('[auth-utils] No valid session found');
      return { valid: false, error: 'No valid session' };
    }

    // Verify the token matches current session
    const sessionToken = session.tokens.accessToken.toString();
    if (token !== sessionToken) {
      logger.warn('[auth-utils] Token mismatch with current session');
      return { valid: false, error: 'Token mismatch' };
    }

    // Get user information
    const user = await getCurrentUser();
    if (!user) {
      logger.warn('[auth-utils] No authenticated user found');
      return { valid: false, error: 'No authenticated user' };
    }

    return {
      valid: true,
      userId: user.userId,
      username: user.username,
      attributes: user.attributes || {},
      tokens: session.tokens
    };

  } catch (error) {
    logger.error('[auth-utils] JWT verification failed:', error);
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

    // If request is provided, verify the token first
    if (request) {
      const tokenVerification = await verifyJWT(request);
      if (!tokenVerification.valid) {
        logger.warn('[auth-utils] Token verification failed for request');
        return null;
      }
    }

    // Use existing authUtils function
    const userInfo = await getAuthenticatedUserFromUtils();
    if (!userInfo) {
      logger.warn('[auth-utils] No user info from authUtils');
      return null;
    }

    const attributes = userInfo.attributes || {};
    
    // Use CognitoAttributes utility for proper attribute access
    const userWithCognitoAttributes = {
      userId: userInfo.userId,
      username: userInfo.username,
      email: CognitoAttributes.getValue(attributes, CognitoAttributes.EMAIL),
      
      // Use CognitoAttributes utility for tenant ID with correct casing
      tenantId: CognitoAttributes.getTenantId(attributes),
      
      // Other attributes using CognitoAttributes utility
      businessName: CognitoAttributes.getBusinessName(attributes),
      userRole: CognitoAttributes.getUserRole(attributes),
      businessId: CognitoAttributes.getValue(attributes, CognitoAttributes.BUSINESS_ID),
      setupDone: CognitoAttributes.getValue(attributes, CognitoAttributes.SETUP_DONE),
      onboardingStatus: CognitoAttributes.getValue(attributes, CognitoAttributes.ONBOARDING),
      accountStatus: CognitoAttributes.getValue(attributes, CognitoAttributes.ACCOUNT_STATUS),
      
      // Include raw attributes for additional access if needed
      attributes: attributes,
      
      // Include original userInfo for backward compatibility
      originalUserInfo: userInfo
    };

    // Validate tenant ID is present (required for API operations)
    if (!userWithCognitoAttributes.tenantId && !userWithCognitoAttributes.businessId) {
      logger.warn('[auth-utils] User does not have tenant ID or business ID');
      return null;
    }

    logger.info('[auth-utils] Successfully retrieved authenticated user with tenant ID:', 
      userWithCognitoAttributes.tenantId || userWithCognitoAttributes.businessId);

    return userWithCognitoAttributes;

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
