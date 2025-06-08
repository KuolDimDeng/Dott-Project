import { headers, cookies } from 'next/headers';
import { logger } from './serverLogger';

/**
 * Get the user session from the server side using Auth0 session
 * Handles session extraction from Auth0 cookie
 * 
 * @param {Request} request - The incoming Next.js request object
 * @returns {Promise<Object|null>} The user session object or null if not authenticated
 */
export async function getSession(request) {
  try {
    // Try to get session from Auth0 cookie
    const cookieStore = request ? request.cookies : await cookies();
    const sessionCookie = cookieStore.get('appSession');

    if (!sessionCookie) {
      logger.debug('[ServerSession] No Auth0 session cookie found');
      return null;
    }

    // Parse the session data
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      logger.error('[ServerSession] Error parsing session cookie:', parseError);
      return null;
    }

    if (!sessionData || !sessionData.user) {
      logger.debug('[ServerSession] No user data in session');
      return null;
    }

    const user = sessionData.user;
    
    // Extract user information
    const userId = user.sub;
    const email = user.email;
    const tenantId = user.tenant_id || user.tenantId || null;

    // Return user session information in a format compatible with existing code
    return {
      user: {
        userId,
        email,
        tenantId,
        attributes: {
          email: user.email,
          name: user.name,
          given_name: user.given_name,
          family_name: user.family_name,
          picture: user.picture,
          tenant_id: tenantId,
          tenantId: tenantId,
          businessName: user.businessName,
          subscriptionPlan: user.subscriptionPlan,
          onboardingCompleted: user.onboardingCompleted,
          needsOnboarding: user.needsOnboarding
        }
      },
      token: 'auth0-session' // Placeholder since Auth0 handles tokens internally
    };
  } catch (error) {
    logger.error('[ServerSession] Error getting session:', error);
    return null;
  }
} 