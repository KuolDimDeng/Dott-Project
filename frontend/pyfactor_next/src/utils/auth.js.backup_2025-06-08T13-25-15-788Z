"use client";

import { logger } from '@/utils/logger';

/**
 * Auth utilities for Auth0
 */

/**
 * Checks if user is authenticated with Auth0
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    const response = await fetch('/api/auth/me');
    return response.ok;
  } catch (error) {
    logger.error('[Auth] Error checking authentication:', error);
    return false;
  }
};

/**
 * Gets the current user from Auth0
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) return null;
    
    const user = await response.json();
    return user;
  } catch (error) {
    logger.error('[Auth] Error getting current user:', error);
    return null;
  }
};

/**
 * Redirects to Auth0 login
 */
export const signIn = () => {
  window.location.href = '/api/auth/login';
};

/**
 * Redirects to Auth0 logout
 */
export const signOut = () => {
  window.location.href = '/api/auth/logout';
};

/**
 * Refreshes the user session (no-op for Auth0 as it's handled automatically)
 * @returns {Promise<Object|null>} The refreshed session or null
 */
export const refreshUserSession = async () => {
  try {
    logger.debug('[Auth] Checking Auth0 session');
    const response = await fetch('/api/auth/me');
    
    if (response.ok) {
      const user = await response.json();
      logger.debug('[Auth] Auth0 session valid');
      return user;
    }
    return null;
  } catch (error) {
    logger.error('[Auth] Failed to check Auth0 session:', error);
    return null;
  }
};

/**
 * Get the current API base URL based on the window location
 * This handles different ports in development mode
 */
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3000';
  }
  
  // Get the current origin (protocol + hostname + port)
  return window.location.origin;
};

/**
 * Directly confirm a user by their email - this bypasses the normal email verification
 * This is meant for development use only
 */
export async function confirmUserDirectly(email) {
  if (!email) {
    console.error('No email provided for confirmation');
    return { success: false, error: 'No email provided' };
  }

  console.log(`Attempting to directly confirm user: ${email}`);
  
  try {
    // Call the admin API endpoint to confirm the user
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/admin/confirm-user`;
    
    console.log(`Making request to: ${url} with email: ${email}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorText;
      let errorObj = null;
      
      try {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        try {
          if (responseText && responseText.trim()) {
            errorObj = JSON.parse(responseText);
            console.log('Parsed error response:', errorObj);
          } else {
            console.log('Empty response text received');
            errorObj = { error: 'Empty response from server' };
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          errorObj = { error: responseText || `${response.status} ${response.statusText}` };
        }
        
        errorText = errorObj?.error || `${response.status} ${response.statusText}`;
        console.error('API error response:', errorObj || { status: response.status, statusText: response.statusText });
      } catch (e) {
        console.error('Error handling API response:', e);
        errorText = `${response.status} ${response.statusText}`;
      }
      
      console.error('Failed to confirm user:', errorText);
      return { 
        success: false, 
        status: response.status,
        statusText: response.statusText,
        error: `Failed to confirm user: ${errorText}` 
      };
    }
    
    let result;
    try {
      const responseText = await response.text();
      console.log('Success response text:', responseText);
      result = responseText ? JSON.parse(responseText) : { success: true };
    } catch (e) {
      console.warn('Error parsing success response:', e);
      result = { success: true, message: 'User confirmed (no details available)' };
    }
    
    console.log('User confirmed successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Network error confirming user:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      networkError: true
    };
  }
}

// Auto-confirm user helper function (can be called from console)
export const confirmUserBypass = async (email) => {
  if (!email) {
    console.error('Email is required to confirm a user');
    return { success: false, error: 'Email is required' };
  }
  
  try {
    // Check if we have AWS credentials
    if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 
        !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
      console.error('AWS credentials not found');
      return { success: false, error: 'AWS credentials not found' };
    }
    
    // Use the Cognito admin confirm sign up endpoint
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/admin/confirm-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('User confirmed successfully:', result);
      return { success: true, result };
    } else {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Unknown error' };
      }
      console.error('Failed to confirm user:', errorData);
      return { success: false, error: errorData.error || 'Failed to confirm user' };
    }
  } catch (error) {
    console.error('Error confirming user:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

// Add a simple helper for manual confirmation
export const manualConfirmUser = async (userEmail) => {
  console.log('Manually confirming user:', userEmail);
  
  try {
    // First try the confirmUserDirectly function
    const confirmResult = await confirmUserDirectly(userEmail);
    
    if (confirmResult.success) {
      console.log('✅ User confirmed successfully:', confirmResult.data);
      return { success: true, message: 'User confirmed successfully' };
    } else {
      console.error('❌ Failed to confirm user:', confirmResult.error);
      return { success: false, error: confirmResult.error };
    }
  } catch (error) {
    console.error('❌ Error during manual confirmation:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};