'use client';

import { Auth0Provider } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';

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

/**
 * Fetch Auth0 session data as fallback when API calls fail
 * @returns {Promise<Object|null>} Auth0 session data in profile format
 */
export async function fetchAuth0SessionData() {
  try {
    logger.debug('[Auth0] Fetching session data as fallback');
    
    // Try to get session from our Auth0 session API
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Auth0 session API returned ${response.status}`);
    }
    
    const sessionData = await response.json();
    
    if (!sessionData.user) {
      throw new Error('No user data in Auth0 session');
    }
    
    // Transform Auth0 session data to profile format
    const user = sessionData.user;
    const profileData = {
      profile: {
        id: user.sub,
        userId: user.sub,
        email: user.email,
        name: user.name,
        firstName: user.given_name || '',
        lastName: user.family_name || '',
        tenantId: user.tenantId || user.tenant_id || localStorage.getItem('tenant_id') || '',
        role: user.userRole || user['custom:userrole'] || 'user',
        businessName: user.businessName || user['custom:businessname'] || '',
        businessType: user.businessType || user['custom:businesstype'] || '',
        subscriptionPlan: user.subscriptionPlan || user['custom:subplan'] || 'free',
        subscriptionStatus: user.subscriptionStatus || user['custom:subscriptionstatus'] || 'active',
        onboardingStatus: user.onboardingStatus || user['custom:onboarding'] || 'completed',
        setupDone: user.setupDone === true || user['custom:setupdone'] === 'TRUE',
        picture: user.picture,
        email_verified: user.email_verified,
        updated_at: user.updated_at,
        preferences: {
          theme: 'light',
          notificationsEnabled: true,
          language: user.language || 'en'
        }
      }
    };
    
    logger.info('[Auth0] Session data fetched successfully for fallback');
    return profileData;
    
  } catch (error) {
    logger.warn('[Auth0] Failed to fetch session data for fallback:', error.message);
    
    // Try to create a minimal profile from localStorage
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('email') || '';
      const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId') || '';
      const businessName = localStorage.getItem('businessName') || '';
      
      if (email || tenantId) {
        logger.debug('[Auth0] Creating minimal profile from localStorage');
        return {
          profile: {
            id: null,
            email: email,
            name: '',
            firstName: '',
            lastName: '',
            tenantId: tenantId,
            role: 'user',
            businessName: businessName,
            isMinimalProfile: true,
            source: 'localStorage',
            preferences: {
              theme: 'light',
              notificationsEnabled: true
            }
          }
        };
      }
    }
    
    return null;
  }
} 