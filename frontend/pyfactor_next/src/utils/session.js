import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { logger } from './logger';

/**
 * Retrieves the current user session
 * 
 * @returns {Promise<Object|null>} The user session or null if not authenticated
 */
export async function getSession() {
  try {
    // Get the current authenticated user
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      logger.debug('[Session] No authenticated user found');
      return null;
    }
    
    // Get the user's session
    const { tokens } = await fetchAuthSession();
    
    if (!tokens || !tokens.idToken) {
      logger.debug('[Session] No valid ID token found in session');
      return null;
    }
    
    // Parse the ID token to get user information
    const payload = tokens.idToken.payload;
    
    return {
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        attributes: {
          ...Object.entries(payload)
            .filter(([key]) => key.startsWith('custom:'))
            .reduce((acc, [key, value]) => {
              // Remove the 'custom:' prefix for easier access
              const cleanKey = key.replace('custom:', '');
              acc[cleanKey] = value;
              return acc;
            }, {})
        }
      },
      idToken: tokens.idToken.toString()
    };
  } catch (error) {
    logger.error('[Session] Error getting user session', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}