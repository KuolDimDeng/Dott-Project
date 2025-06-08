import { cookies } from 'next/headers';

// Import Amplify config
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Simple server-side user extraction from cookies/headers
export async function getServerUser(request) {
  try {
    // Check if this is a request from an auth flow
    const isFromAuthFlow = request?.headers?.get('x-from-auth-flow') === 'true';
    
    if (isFromAuthFlow) {
      console.log('[getServerUser] Skipping auth check for auth flow request');
      return null;
    }

    // Try to get user info from cookies
    const cookieStore = cookies();
    const userCookie = cookieStore.get('amplify-user');
    const sessionCookie = cookieStore.get('amplify-session');
    
    if (userCookie?.value) {
      try {
        const userData = JSON.parse(userCookie.value);
        console.log('[getServerUser] Found user in cookies:', userData.username);
        return userData;
      } catch (parseError) {
        console.warn('[getServerUser] Failed to parse user cookie:', parseError);
      }
    }

    // Try to get user info from Authorization header
    const authHeader = request?.headers?.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Simple JWT decode without verification (for server-side rendering)
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[getServerUser] Found user in JWT:', payload.sub);
        return {
          userId: payload.sub,
          username: payload['cognito:username'] || payload.email,
          email: payload.email,
          attributes: payload
        };
      } catch (jwtError) {
        console.warn('[getServerUser] Failed to decode JWT:', jwtError);
      }
    }

    console.log('[getServerUser] No authenticated user found');
    return null;
  } catch (error) {
    console.error('[getServerUser] Error getting server user:', error);
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