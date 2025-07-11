/**
 * Auth0 Backend Proxy Configuration
 * This module handles Auth0 operations that require secrets by proxying through the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Authenticate user via backend (which has Auth0 secrets)
 */
export async function authenticateViaBackend(email, password, cookies) {
  try {
    // Call the Django backend's session creation endpoint directly
    const response = await fetch(`${API_URL}/api/sessions/create-from-credentials/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({
        email,
        password,
        source: 'frontend_login'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    
    // Transform backend response to match expected Auth0 format
    return {
      user: {
        sub: data.auth0_sub || `auth0|${data.user_id}`,
        email: data.email,
        name: data.name || data.email,
        given_name: data.given_name || '',
        family_name: data.family_name || '',
        picture: data.picture || '',
        email_verified: data.email_verified || true
      },
      access_token: data.access_token || 'backend_session',
      id_token: data.id_token || 'backend_session',
      token_type: 'Bearer',
      expires_in: 86400
    };
  } catch (error) {
    console.error('[Auth0BackendProxy] Authentication error:', error);
    throw error;
  }
}

/**
 * Create user via backend
 */
export async function signupViaBackend(userData, cookies) {
  try {
    const response = await fetch(`${API_URL}/api/auth/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[Auth0BackendProxy] Signup error:', error);
    throw error;
  }
}

/**
 * Update user metadata via backend
 */
export async function updateMetadataViaBackend(userId, metadata, cookies) {
  try {
    const response = await fetch(`${API_URL}/api/users/update-metadata/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({
        user_id: userId,
        metadata
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Metadata update failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[Auth0BackendProxy] Metadata update error:', error);
    throw error;
  }
}