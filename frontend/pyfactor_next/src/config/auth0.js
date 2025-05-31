'use client';

import { Auth0Provider } from '@auth0/nextjs-auth0';

// Auth0 configuration
export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
    postLogoutRedirect: '/auth/signin'
  },
  authorizationParams: {
    redirect_uri: process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/callback'
  }
};

// Auth0 provider configuration
export const AUTH0_CONFIG = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`,
  scope: 'openid profile email',
};

// Re-export Auth0Provider for convenience
export { Auth0Provider };

// Export a function to validate Auth0 configuration
export const validateAuth0Config = () => {
  const required = [
    'NEXT_PUBLIC_AUTH0_DOMAIN',
    'NEXT_PUBLIC_AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('[Auth0] Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};

// Auth0 utility functions
export const auth0Utils = {
  getAccessToken: async () => {
    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const data = await response.json();
        return data.accessToken;
      }
    } catch (error) {
      console.error('[Auth0] Error getting access token:', error);
    }
    return null;
  },
  
  getUser: async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Auth0] Error getting user:', error);
    }
    return null;
  }
}; 