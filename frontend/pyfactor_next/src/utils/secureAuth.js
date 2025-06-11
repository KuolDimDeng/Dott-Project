/**
 * Secure Authentication Utilities
 * Replaces localStorage-based authentication with secure cookie-based approach
 */

/**
 * Authenticate user securely
 */
export async function secureLogin(email, password) {
  try {
    // Step 1: Authenticate with Auth0
    const authResponse = await fetch('/api/auth/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({ email, password })
    });

    if (!authResponse.ok) {
      throw new Error('Authentication failed');
    }

    const authData = await authResponse.json();

    // Step 2: Create secure session (cookie-based)
    const sessionResponse = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({
        accessToken: authData.access_token,
        idToken: authData.id_token,
        user: authData.user
      })
    });

    if (!sessionResponse.ok) {
      throw new Error('Session creation failed');
    }

    // Do NOT store tokens in localStorage!
    // The session is now stored in secure HttpOnly cookies

    return await sessionResponse.json();
  } catch (error) {
    console.error('[SecureAuth] Login error:', error);
    throw error;
  }
}

/**
 * Get current session securely
 */
export async function getSecureSession() {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include' // Important: include cookies
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[SecureAuth] Session error:', error);
    return null;
  }
}

/**
 * Logout securely
 */
export async function secureLogout() {
  try {
    // Clear server session
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include'
    });

    // Clear any localStorage (migration cleanup)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dott_session');
      localStorage.removeItem('appSession');
      sessionStorage.clear();
    }

    // Redirect to login
    window.location.href = '/auth/signin';
  } catch (error) {
    console.error('[SecureAuth] Logout error:', error);
    // Force redirect even on error
    window.location.href = '/auth/signin';
  }
}

/**
 * Make authenticated API request
 */
export async function secureApiRequest(url, options = {}) {
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, {
    ...options,
    ...defaultOptions,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });

  // Handle unauthorized
  if (response.status === 401) {
    // Session expired, redirect to login
    window.location.href = '/auth/signin';
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getSecureSession();
  return session && session.authenticated;
}

/**
 * Migration helper: Clean up localStorage
 */
export function cleanupLocalStorage() {
  if (typeof window !== 'undefined') {
    const keysToRemove = [
      'dott_session',
      'dott_session_expiry',
      'appSession',
      'auth_token',
      'access_token',
      'id_token',
      'refresh_token'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('[SecureAuth] Cleaned up insecure storage');
  }
}