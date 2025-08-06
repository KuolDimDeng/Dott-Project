/**
 * Industry-Standard Session Management
 * Centralized session handling following OWASP best practices
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
const SESSION_COOKIE_NAME = 'sid';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Cookie configuration following security best practices
 */
export const COOKIE_CONFIG = {
  httpOnly: true,        // Prevent XSS attacks
  secure: true,          // HTTPS only
  sameSite: 'lax',      // CSRF protection
  path: '/',            // Available to entire app
  maxAge: SESSION_DURATION,
  // Domain configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    domain: '.dottapps.com' // Allow sharing between subdomains
  })
};

/**
 * Session validation cache to reduce backend calls
 * In production, use Redis for distributed caching
 */
const sessionCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Validates session with backend
 * @param {string} sessionId - Session ID to validate
 * @returns {Promise<Object|null>} Session data or null if invalid
 */
export async function validateSession(sessionId) {
  if (!sessionId) return null;

  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    // Validate with backend
    const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Disable Next.js caching for session validation
    });

    if (!response.ok) {
      sessionCache.delete(sessionId);
      return null;
    }

    const sessionData = await response.json();
    
    // Cache the valid session
    sessionCache.set(sessionId, {
      data: sessionData,
      expires: Date.now() + CACHE_TTL
    });

    return sessionData;
  } catch (error) {
    console.error('[SessionManager] Validation error:', error);
    return null;
  }
}

/**
 * Gets current session from cookies
 * @returns {Promise<Object|null>} Session data or null
 */
export async function getCurrentSession() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }

    return await validateSession(sessionCookie.value);
  } catch (error) {
    console.error('[SessionManager] Error getting session:', error);
    return null;
  }
}

/**
 * Creates a new session
 * @param {Object} credentials - User credentials
 * @returns {Promise<Object>} Session data with token
 */
export async function createSession(credentials) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/password-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      cache: 'no-store'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const sessionData = await response.json();
    return sessionData;
  } catch (error) {
    console.error('[SessionManager] Create session error:', error);
    throw error;
  }
}

/**
 * Sets session cookie with proper configuration
 * @param {NextResponse} response - Next.js response object
 * @param {string} sessionToken - Session token to set
 */
export function setSessionCookie(response, sessionToken) {
  if (!sessionToken) {
    console.error('[SessionManager] No session token provided');
    return;
  }

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, COOKIE_CONFIG);
  
  // Also set backup cookie for compatibility
  response.cookies.set('session_token', sessionToken, COOKIE_CONFIG);
}

/**
 * Clears session cookies
 * @param {NextResponse} response - Next.js response object
 */
export function clearSessionCookies(response) {
  const clearConfig = {
    ...COOKIE_CONFIG,
    maxAge: 0,
    expires: new Date(0)
  };

  response.cookies.set(SESSION_COOKIE_NAME, '', clearConfig);
  response.cookies.set('session_token', '', clearConfig);
  
  // Clear any legacy cookies
  const legacyCookies = [
    'dott_auth_session',
    'appSession',
    'idToken',
    'accessToken',
    'refreshToken'
  ];
  
  legacyCookies.forEach(name => {
    response.cookies.set(name, '', clearConfig);
  });
}

/**
 * Refreshes session expiry
 * @param {string} sessionId - Session ID to refresh
 * @returns {Promise<boolean>} Success status
 */
export async function refreshSession(sessionId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    return response.ok;
  } catch (error) {
    console.error('[SessionManager] Refresh error:', error);
    return false;
  }
}

/**
 * Destroys session on backend
 * @param {string} sessionId - Session ID to destroy
 * @returns {Promise<boolean>} Success status
 */
export async function destroySession(sessionId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    // Clear from cache
    sessionCache.delete(sessionId);
    
    return response.ok;
  } catch (error) {
    console.error('[SessionManager] Destroy error:', error);
    return false;
  }
}

/**
 * Middleware helper to protect API routes
 * @param {Function} handler - API route handler
 * @returns {Function} Protected handler
 */
export function withAuth(handler) {
  return async (request, ...args) => {
    const session = await getCurrentSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Add session to request for handler use
    request.session = session;
    
    return handler(request, ...args);
  };
}

/**
 * Client-side session check (for pages)
 * @returns {Promise<Object>} Redirect or session props
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  
  if (!session) {
    return {
      redirect: {
        destination: '/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}