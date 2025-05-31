'use client';

// Auth0 Compatibility Layer - Provides Amplify-like API for Auth0
// This maintains backward compatibility for files still using Amplify imports

// Mock Amplify object for compatibility
export const Amplify = {
  configure: () => {
    console.log('[Auth0] Amplify.configure called - no-op for Auth0');
  }
};

// Auth0 compatibility functions
export const signIn = async ({ username, password }) => {
  // Auth0 uses redirect-based login
  window.location.href = '/api/auth/login';
  return { isSignedIn: false };
};

export const signOut = async () => {
  // Clear local storage
  localStorage.removeItem('userAttributes');
  localStorage.removeItem('tenantId');
  localStorage.removeItem('onboardingStatus');
  
  // Redirect to Auth0 logout
  window.location.href = '/api/auth/logout';
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Not authenticated');
    
    const user = await response.json();
    return {
      username: user.email || user.sub,
      userId: user.sub,
      signInDetails: {
        loginId: user.email
      }
    };
  } catch (error) {
    console.error('[Auth0] getCurrentUser error:', error);
    throw error;
  }
};

export const fetchUserAttributes = async () => {
  try {
    // First try Auth0 user
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      
      // Get attributes from localStorage (for onboarding state)
      const storedAttributes = localStorage.getItem('userAttributes');
      const attributes = storedAttributes ? JSON.parse(storedAttributes) : {};
      
      return {
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
        ...attributes
      };
    }
  } catch (error) {
    console.error('[Auth0] fetchUserAttributes error:', error);
  }
  
  // Return stored attributes as fallback
  const storedAttributes = localStorage.getItem('userAttributes');
  return storedAttributes ? JSON.parse(storedAttributes) : {};
};

export const fetchAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error('Not authenticated');
    
    return {
      tokens: {
        accessToken: {
          toString: () => 'auth0-token' // Placeholder
        },
        idToken: {
          toString: () => 'auth0-id-token' // Placeholder
        }
      }
    };
  } catch (error) {
    console.error('[Auth0] fetchAuthSession error:', error);
    throw error;
  }
};

export const updateUserAttributes = async ({ userAttributes }) => {
  // Store in localStorage for onboarding flow
  const currentAttributes = localStorage.getItem('userAttributes');
  const attributes = currentAttributes ? JSON.parse(currentAttributes) : {};
  
  const updatedAttributes = {
    ...attributes,
    ...userAttributes
  };
  
  localStorage.setItem('userAttributes', JSON.stringify(updatedAttributes));
  
  // If updating tenant-related attributes, also update specific keys
  if (userAttributes['custom:tenant_id']) {
    localStorage.setItem('tenantId', userAttributes['custom:tenant_id']);
  }
  if (userAttributes['custom:onboarding_status']) {
    localStorage.setItem('onboardingStatus', userAttributes['custom:onboarding_status']);
  }
  
  return { success: true };
};

// Hub event emitter for compatibility
class HubClass {
  listeners = {};
  
  listen(channel, callback) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[channel] = this.listeners[channel].filter(cb => cb !== callback);
    };
  }
  
  dispatch(channel, event) {
    if (this.listeners[channel]) {
      this.listeners[channel].forEach(callback => callback(event));
    }
  }
}

export const Hub = new HubClass();

// Additional exports for compatibility
export const signUp = async () => {
  throw new Error('Sign up not supported - use Auth0 dashboard');
};

export const confirmSignUp = async () => {
  throw new Error('Confirm sign up not supported - use Auth0');
};

export const resendSignUpCode = async () => {
  throw new Error('Resend code not supported - use Auth0');
};

export const resetPassword = async () => {
  window.location.href = '/api/auth/login'; // Redirect to Auth0 where they can reset
};

export const confirmResetPassword = async () => {
  throw new Error('Confirm reset not supported - use Auth0');
};

export const signInWithRedirect = async ({ provider }) => {
  // Auth0 handles OAuth through its own flow
  window.location.href = `/api/auth/login?connection=${provider}`;
};

// Export Auth0 check function
export const isAuth0User = () => true; // Always true now

// Export default for backward compatibility
export default {
  Amplify,
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  updateUserAttributes,
  Hub,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
  isAuth0User
};