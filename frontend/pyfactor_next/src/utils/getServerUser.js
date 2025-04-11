import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { cookies } from 'next/headers';

// Import Amplify config
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Server-side Amplify config
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION
    }
  }
};

/**
 * Gets the authenticated user from server-side context
 * Returns null for unauthenticated users instead of throwing errors
 * 
 * @param {Request} request - Optional request object
 * @returns {Promise<Object|null>} - User object or null if not authenticated
 */
export async function getServerUser(request) {
  try {
    // Configure Amplify in server environment
    Amplify.configure(amplifyConfig);
    
    // Get cookies from request headers instead of using cookies() directly
    let idToken = null;
    
    // Try to extract token from request headers if available
    if (request?.headers) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
        console.debug('[getServerUser] Using token from authorization header');
      }
    }
    
    // If no token in headers, check for cookie directly in headers
    if (!idToken && request?.headers) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        idToken = cookies.idToken;
        
        if (idToken) {
          console.debug('[getServerUser] Using token from cookie header');
        }
      }
    }
    
    // Last resort - try to get from cookies API
    if (!idToken) {
      try {
        const cookieStore = await cookies();
        idToken = cookieStore.get('idToken')?.value;
        
        if (idToken) {
          console.debug('[getServerUser] Using token from cookies API');
        }
      } catch (cookieError) {
        console.warn('[getServerUser] Error accessing cookies API:', {
          error: cookieError.message
        });
      }
    }
    
    if (!idToken) {
      console.debug('[getServerUser] No ID token found');
      return null;
    }
    
    // Handle authentication with a try/catch to catch authentication errors
    try {
      // Get user from Cognito - if this fails due to authentication, we'll return null
      const user = await getCurrentUser();
      
      if (!user) {
        console.debug('[getServerUser] No user found in session');
        return null;
      }
      
      // Get user attributes
      const session = await fetchAuthSession();
      const attributes = session?.tokens?.idToken?.payload || {};
      
      // Verify token is valid
      if (!session?.tokens?.idToken) {
        console.warn('[getServerUser] Session tokens missing or invalid');
        return null;
      }
      
      // Enhanced attribute mapping to ensure names are properly mapped
      // Map Cognito attributes to expected format
      const enhancedUser = {
        ...user,
        attributes,
        token: session.tokens.idToken.toString(),
        // Explicitly map name fields - order matters for fallbacks
        first_name: attributes.given_name || attributes.first_name || '',
        last_name: attributes.family_name || attributes.last_name || '',
        given_name: attributes.given_name || attributes.first_name || '',
        family_name: attributes.family_name || attributes.last_name || '',
        email: attributes.email || user.username,
        name: attributes.name || `${attributes.given_name || ''} ${attributes.family_name || ''}`.trim(),
        // Map custom attributes
        'custom:tenantId': attributes['custom:tenantId'] || attributes['custom:businessid'] || '',
        'custom:businessname': attributes['custom:businessname'] || '',
        'custom:businesstype': attributes['custom:businesstype'] || '',
        'custom:subplan': attributes['custom:subplan'] || 'free'
      };
      
      console.log('[getServerUser] Enhanced user attributes:', {
        email: enhancedUser.email,
        first_name: enhancedUser.first_name,
        last_name: enhancedUser.last_name,
        given_name: enhancedUser.given_name,
        family_name: enhancedUser.family_name
      });
      
      // Return enhanced user
      return enhancedUser;
    } catch (authError) {
      // Handle authentication errors gracefully without throwing
      console.debug('[getServerUser] Authentication error, user not authenticated:', {
        error: authError.message,
        code: authError.code
      });
      return null;
    }
  } catch (error) {
    // For general errors, log but don't throw
    console.error('[getServerUser] Error getting user:', {
      error: error.message,
      code: error.code,
      name: error.name
    });
    
    // Return null instead of throwing
    return null;
  }
}

/**
 * Parse cookies from a cookie header string
 * @param {string} cookieHeader - The cookie header string
 * @returns {Object} - Object with parsed cookies
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (e) {
        cookies[name] = value;
      }
    }
  });
  
  return cookies;
} 