///Users/kuoldeng/projectx/frontend/pyfactor_next/src/lib/cognito.js
import { 
  getCurrentUser,
  fetchAuthSession,
  updateUserAttributes as amplifyUpdateAttributes,
  fetchUserAttributes
} from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';
import { isServerSide } from '@/utils/env-helpers';

// Import server logger for server-side contexts
import { createServerLogger } from '@/utils/serverLogger';

// Create server logger for server-side operations
const serverLogger = createServerLogger('cognito');

// Helper to get the appropriate logger based on context
const getLogger = () => isServerSide() ? serverLogger : logger;

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Update user attributes in Cognito
 * 
 * @param {string} userId - The user's id/sub
 * @param {Object} attributes - An object containing the attributes to update
 * @returns {Promise<void>}
 */
export async function updateUserAttributes(userId, attributes) {
  try {
    // Get the Cognito configuration from environment variables
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    
    if (!userPoolId || !region) {
      throw new Error('Missing Cognito configuration. Check environment variables.');
    }
    
    // Create a Cognito Identity Provider client
    const client = new CognitoIdentityProviderClient({ 
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    // Format attributes for the API
    const userAttributes = Object.entries(attributes).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
    
    // Prepare the command to update user attributes
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userId,
      UserAttributes: userAttributes,
    });
    
    // Execute the command
    await client.send(command);
    
    logger.info('[Cognito] Successfully updated user attributes', {
      userId,
      updatedAttributes: Object.keys(attributes),
    });
  } catch (error) {
    logger.error('[Cognito] Failed to update user attributes', {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get the current user's session
 * 
 * @returns {Promise<Object>} The user session
 */
export async function getUserSession() {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens;
  } catch (error) {
    logger.error('[Cognito] Failed to get user session', { error: error.message });
    throw error;
  }
}

/**
 * Get the current authenticated session
 */
export async function getSession() {
  try {
    const session = await fetchAuthSession();
    return session;
  } catch (error) {
    getLogger().error('Failed to get session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    const session = await fetchAuthSession();
    return !!session?.tokens?.accessToken;
  } catch {
    return false;
  }
}

/**
 * Get the current Cognito user
 * @returns {Promise<Object|null>} The user object or null if not authenticated
 */
export async function getCognitoUser() {
  try {
    // Try fetching the session first
    try {
      const session = await fetchAuthSession();
      if (session?.tokens?.idToken) {
        console.info('[getCognitoUser] Found user from session tokens');
        return session.tokens.idToken.payload;
      }
    } catch (sessionError) {
      console.warn('[getCognitoUser] Error getting auth session:', sessionError.message);
      // Continue to other methods
    }
    
    // If running on server, try to get user info from cookies
    if (isServerSide()) {
      try {
        const cookieStore = await cookies();
        
        // Check for ID token in cookies
        const idTokenCookie = cookieStore.get('idToken')?.value;
        
        if (idTokenCookie) {
          try {
            // Parse the JWT token
            const payload = parseJwtToken(idTokenCookie);
            if (payload) {
              console.info('[getCognitoUser] Found user from server-side ID token cookie');
              return payload;
            }
          } catch (parseError) {
            console.error('[getCognitoUser] Error parsing ID token:', parseError);
          }
        }
        
        // Check for Cognito cookies
        const lastAuthUser = cookieStore.get('CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.LastAuthUser')?.value;
        
        if (lastAuthUser) {
          const userIdToken = cookieStore.get(`CognitoIdentityServiceProvider.1o5v84mrgn4gt87khtr179uc5b.${lastAuthUser}.idToken`)?.value;
          
          if (userIdToken) {
            try {
              const payload = parseJwtToken(userIdToken);
              if (payload) {
                console.info('[getCognitoUser] Found user from server-side Cognito cookie');
                return payload;
              }
            } catch (parseError) {
              console.error('[getCognitoUser] Error parsing Cognito token:', parseError);
            }
          }
        }
        
        // Check for a businessid cookie as fallback
        const businessIdCookie = cookieStore.get('businessid')?.value;
        const businessNameCookie = cookieStore.get('businessName')?.value;
        
        if (businessIdCookie || businessNameCookie) {
          console.info('[getCognitoUser] Creating fallback user from business cookies');
          const fallbackUser = {
            // Use some dummy values that are safe for tenant creation
            sub: 'anonymous-' + Date.now(),
            email: 'anonymous@example.com',
            'custom:businessid': businessIdCookie || null,
            'custom:businessname': businessNameCookie || ''
          };
          return fallbackUser;
        }
      } catch (cookieError) {
        console.error('[getCognitoUser] Error accessing cookies:', cookieError);
      }
      
      console.warn('[getCognitoUser] No user found in server context, using fallback user');
      
      // Return a fallback anonymous user for server-side operations
      // This allows the API to still function without full authentication
      return {
        sub: 'anonymous-' + Date.now(),
        email: 'anonymous@example.com',
        'custom:businessid': null,
        anonymous: true
      };
    }
    
    // On client-side, try getting the current user directly
    try {
      const user = await getCurrentUser();
      if (user) {
        const userAttributes = await fetchUserAttributes();
        console.info('[getCognitoUser] Found user attributes from client-side');
        
        // Add user ID to attributes if not present
        if (!userAttributes.sub && user.userId) {
          userAttributes.sub = user.userId;
        }
        
        return userAttributes;
      }
    } catch (userError) {
      console.warn('[getCognitoUser] Error getting current user:', userError.message);
    }
    
    // Try AppCache as a last resort on client-side
    if (!isServerSide()) {
      try {
        const appCache = window.__APP_CACHE || {};
        const auth = appCache.auth || {};
        const idToken = auth.idToken;
        
        if (idToken) {
          try {
            const payload = parseJwtToken(idToken);
            if (payload) {
              console.info('[getCognitoUser] Found user from AppCache token');
              return payload;
            }
          } catch (parseError) {
            console.error('[getCognitoUser] Error parsing AppCache token:', parseError);
          }
        }
      } catch (cacheError) {
        console.warn('[getCognitoUser] Error accessing AppCache:', cacheError);
      }
    }

    console.warn('[getCognitoUser] No authenticated user found');
    return null;
  } catch (error) {
    console.error('[getCognitoUser] Authentication error:', error);
    return null;
  }
}

/**
 * Parse a JWT token string
 * @param {string} token - The JWT token to parse
 * @returns {Object|null} The parsed token payload or null if invalid
 */
function parseJwtToken(token) {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[parseJwtToken] Error parsing token:', e);
    return null;
  }
}

/**
 * Get JWT tokens for the current user
 * @returns {Promise<Object|null>} Object containing accessToken and idToken or null
 */
export async function getCognitoTokens() {
  try {
    const session = await fetchAuthSession();
    if (!session?.tokens?.idToken || !session?.tokens?.accessToken) {
      getLogger().warn('[getCognitoTokens] No valid tokens found');
      return null;
    }
    
    return {
      accessToken: session.tokens.accessToken.toString(),
      idToken: session.tokens.idToken.toString(),
      refreshToken: session.tokens.refreshToken?.toString() || null,
      expiration: session.tokens.accessToken.payload.exp * 1000, // Convert to milliseconds
    };
  } catch (error) {
    getLogger().error('[getCognitoTokens] Error fetching tokens:', error);
    return null;
  }
}