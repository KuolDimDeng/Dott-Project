/**
 * authUtils.js - Auth0 utilities for authentication
 * Version: 1.0.0
 * Created: June 7, 2025
 */

import { getSession } from '@auth0/nextjs-auth0';
import { appCache } from '@/utils/appCache';
import { getTenantId } from '../../utils/tenantStorage';

/**
 * Get the Auth0 session
 * @returns {Promise<object|null>} The Auth0 session object or null if not authenticated
 */
export async function getAuth0Session() {
  try {
    // First try to get from Auth0
    const { user, accessToken, idToken } = await getSession() || {};
    
    if (user && (accessToken || idToken)) {
      // Store in cache for future use
      if (appCache && typeof appCache.set === 'function') {
        appCache.set('user', user);
        if (accessToken) appCache.set('accessToken', accessToken);
        if (idToken) appCache.set('idToken', idToken);
      }
      
      // Enhanced session object with convenience properties
      return {
        user,
        accessToken,
        idToken,
        id_token: idToken,
        access_token: accessToken,
        tokens: {
          idToken: {
            toString: () => idToken
          },
          accessToken: {
            toString: () => accessToken
          }
        }
      };
    }
    
    // If not found in Auth0, try to get from cache
    if (appCache && typeof appCache.get === 'function') {
      const cachedUser = appCache.get('user');
      const cachedAccessToken = appCache.get('accessToken');
      const cachedIdToken = appCache.get('idToken');
      
      if (cachedUser && (cachedAccessToken || cachedIdToken)) {
        return {
          user: cachedUser,
          accessToken: cachedAccessToken,
          idToken: cachedIdToken,
          id_token: cachedIdToken,
          access_token: cachedAccessToken,
          tokens: {
            idToken: {
              toString: () => cachedIdToken
            },
            accessToken: {
              toString: () => cachedAccessToken
            }
          }
        };
      }
    }
    
    // No session found
    console.warn('[getAuth0Session] No Auth0 session found');
    return null;
  } catch (error) {
    console.error('[getAuth0Session] Error getting Auth0 session:', error);
    return null;
  }
}

/**
 * Get user attributes from Auth0 session
 * @returns {Promise<object|null>} User attributes or null if not authenticated
 */
export async function getUserAttributes() {
  try {
    const session = await getAuth0Session();
    if (!session || !session.user) {
      return null;
    }
    
    // Map Auth0 user properties to Cognito-like attribute format
    const { user } = session;
    
    // Include tenant ID in user attributes
    const tenantId = getTenantId() || user.tenant_id || user['custom:tenant_id'] || user['https://dottapps.com/tenant_id'];
    
    return {
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      sub: user.sub,
      'custom:tenant_id': tenantId,
      'custom:tenantId': tenantId,
      ...user
    };
  } catch (error) {
    console.error('[getUserAttributes] Error getting user attributes:', error);
    return null;
  }
}

/**
 * Compatibility layer for Auth0/Cognito
 */
export async function fetchAuthSession() {
  return getAuth0Session();
}

export async function fetchUserAttributes() {
  return getUserAttributes();
}

export default {
  getAuth0Session,
  getUserAttributes,
  fetchAuthSession,
  fetchUserAttributes
};
