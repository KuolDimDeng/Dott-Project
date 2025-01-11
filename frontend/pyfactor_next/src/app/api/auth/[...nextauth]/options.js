// src/app/api/auth/[...nextauth]/options.js

import GoogleProvider from 'next-auth/providers/google';
import { getSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import { validateUserState, generateRequestId } from '@/lib/authUtils';  // Add this line
import { RoutingManager } from '@/lib/routingManager';


/**
 * Exchanges a Google OAuth token for our backend authentication token.
 * This function handles the secure token exchange process with proper error handling.
 */

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? !!process.env.VERCEL;


   // Helper function to validate user object
   function validateUserObject(user) {
    const required = ['id', 'accessToken', 'refreshToken', 'onboardingStatus', 'email'];
    const errors = [];
  
    required.forEach(field => {
      if (!user[field]) {
        errors.push(`Missing ${field}`);
      }
    });
  
    if (user.accessTokenExpires <= Date.now()) {
      errors.push('Invalid token expiration');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async function exchangeGoogleToken(idToken, accessToken) {
    const requestId = crypto.randomUUID();
    
    logger.debug('Starting token exchange', {
      requestId,
      hasIdToken: !!idToken,
      hasAccessToken: !!accessToken
    });
  
    try {
      // Validate input tokens
      if (!idToken || !accessToken) {
        throw new Error('Both id_token and access_token are required');
      }
  
      const response = await fetch(
        `${APP_CONFIG.api.baseURL}/api/onboarding/token-exchange/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            id_token: idToken,  // Changed from token to id_token
            access_token: accessToken
          }),
          credentials: 'include',
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Server error: ${response.status}` 
        }));
        
        logger.error('Token exchange request failed', {
          requestId,
          status: response.status,
          error: errorData.error
        });
        
        throw new Error(errorData.error || `Token exchange failed: ${response.status}`);
      }
  
      const data = await response.json();
      
      // Validate response structure
      const requiredFields = [
        'tokens', 
        'user', 
        'onboarding'
      ];
      
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        logger.error('Invalid response structure', {
          requestId,
          missingFields,
          receivedFields: Object.keys(data)
        });
        throw new Error(`Invalid response: missing ${missingFields.join(', ')}`);
      }
  
      // Validate specific nested fields
      if (!data.tokens.access || !data.tokens.refresh) {
        throw new Error('Missing required token data');
      }
  
      if (!data.user.id || !data.user.email) {
        throw new Error('Missing required user data');
      }
  
      // Normalize onboarding status
      const normalizedStatus = data.onboarding.status || 'step1';
      data.onboarding.status = normalizeOnboardingStatus(normalizedStatus);
  
      // Create standardized return object
      const result = {
        tokens: {
          access: data.tokens.access,
          refresh: data.tokens.refresh
        },
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.first_name,
          lastName: data.user.last_name,

        },
        onboarding: {
          status: 'business-info',  // Use server status with fallback
          currentStep: 1,
          databaseStatus: data.onboarding?.database_status || 'not_created',
          setupStatus: data.onboarding?.setup_status || 'pending'
        }
      };
  
      logger.info('Token exchange successful', {
        requestId,
        userId: result.user.id,
        onboardingStatus: result.onboarding.status,
        hasTokens: true
      });
  
      return result;
  
    } catch (error) {
      logger.error('Token exchange failed', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      
      // Rethrow with standardized error format
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
  


// Replace both functions with this single version
function normalizeOnboardingStatus(status) {
  // Handle null/undefined/empty cases
  if (!status || status === 'null') {
    return 'business-info';
  }

  // Normalize input
  const normalized = status.toLowerCase();

  // Map legacy states to new format
  const legacyMapping = {
    'step1': 'business-info',
    'step2': 'subscription',
    'step3': 'payment',
    'step4': 'setup'
  };

  if (legacyMapping[normalized]) {
    return legacyMapping[normalized];
  }

  // Validate against known status values
  const validStatuses = [
    'business-info',
    'subscription',
    'payment',
    'setup',
    'complete'
  ];

  // Return valid status or default to business-info
  return validStatuses.includes(normalized) ? normalized : 'business-info';
}

/**
 * Refreshes an expired access token using the refresh token.
 * Handles token refresh with proper error handling and logging.
 */
async function refreshAccessToken(token) {
  try {
    if (!token?.refreshToken) {
      logger.error('No refresh token available in token object:', token);
      throw new Error('No refresh token available');
    }

    logger.info('Attempting to refresh token', {
      hasRefreshToken: !!token.refreshToken,
      tokenExpiry: token.accessTokenExpires,
    });

    const response = await fetch(`${APP_CONFIG.api.baseURL}/api/onboarding/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        refresh: token.refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Token refresh failed:', {
        status: response.status,
        error: data,
      });
      throw new Error(data.detail || 'Failed to refresh token');
    }

    logger.info('Token refresh successful');

    return {
      ...token,
      accessToken: data.access,
      refreshToken: data.refresh || token.refreshToken,
      accessTokenExpires: Date.now() + APP_CONFIG.auth.tokenGracePeriod,
      error: null,
      // Preserve these fields
      database_status: token.database_status,
      database_name: token.database_name,
      setup_status: token.setup_status,
      onboardingStatus: token.onboardingStatus,
      isComplete: token.isComplete
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Helper function to determine user completion status
 * Checks both onboarding and database setup status
 */
function determineUserCompletion(tokenData) {
  const isOnboardingComplete = tokenData.onboarding_status === 'complete';
  const isDatabaseActive = tokenData.database_status === 'active';
  const hasRequiredFields = tokenData.user_id && tokenData.access && tokenData.refresh;

  return {
    isComplete: Boolean(isOnboardingComplete && isDatabaseActive),
    hasAllFields: Boolean(hasRequiredFields),
    status: {
      onboarding: tokenData.onboarding_status,
      database: tokenData.database_status
    }
  };
}

// First, let's create a helper to determine our environment settings
const getEnvironmentSettings = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    baseUrl: isDevelopment 
      ? 'http://localhost:3000'
      : process.env.NEXTAUTH_URL, // You'll set this in production
    cookieSecure: !isDevelopment, // false in development, true in production
    debug: isDevelopment
  };
};


// Main NextAuth configuration
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
  ],

  timeout: {
    signIn: 15000,
    callback: 15000,
    oauth: {
      request: 15000,
      discovery: 15000,
    },
  },

  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    },
    callbackUrl: {
      name: `${useSecureCookies ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    },
    csrfToken: {
      name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: 900
      }
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: 900
      }
    }
  },




  callbacks: {
    async signIn({ user, account, profile }) {
      const requestId = crypto.randomUUID();
      
      try {
        if (!account?.id_token || !account?.access_token) {
          throw new Error('Missing authentication tokens');
        }
    
        const tokenData = await exchangeGoogleToken(
          account.id_token,
          account.access_token
        );
    
        const onboardingStatus = tokenData.onboarding.status || 'business-info';
    
        Object.assign(user, {
          id: tokenData.user.id,
          email: profile.email,
          name: profile.name || '',
          image: profile.picture || null,
          accessToken: tokenData.tokens.access,
          refreshToken: tokenData.tokens.refresh,
          onboardingStatus,
          accessTokenExpires: Date.now() + 3600 * 1000,
          redirectPath: `/onboarding/${onboardingStatus}`,
          databaseStatus: tokenData.onboarding.databaseStatus,
          setupStatus: tokenData.onboarding.setupStatus,
          currentStep: tokenData.onboarding.currentStep,
          isAuthenticated: true
        });
    
        logger.debug('User object created:', {
          requestId,
          userId: user.id,
          hasToken: !!user.accessToken,
          onboardingStatus,
          tokenExpiry: user.accessTokenExpires
        });
    
        return true;
      } catch (error) {
        logger.error('Sign in failed:', {
          requestId,
          error: error.message
        });
        return false;
      }
    }
  },
 
  async jwt({ token, user, account }) {
    const requestId = crypto.randomUUID();
  
    // Initial sign in
    if (account && user) {
      logger.debug('Creating initial JWT token:', {
        requestId,
        userId: user.id,
        hasToken: !!user.accessToken
      });
  
      return {
        ...token,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        onboardingStatus: user.onboardingStatus,
        accessTokenExpires: user.accessTokenExpires,
        redirectPath: user.redirectPath,
        databaseStatus: user.databaseStatus,
        setupStatus: user.setupStatus,
        currentStep: user.currentStep,
        isAuthenticated: true
      };
    }
  
    // Return previous token if still valid
    if (Date.now() < token.accessTokenExpires) {
      return token;
    }
  
    // Token has expired, try to refresh it
    try {
      const refreshedToken = await refreshAccessToken(token);
      
      logger.debug('Token refreshed:', {
        requestId,
        userId: refreshedToken.userId,
        newExpiry: refreshedToken.accessTokenExpires
      });
  
      return {
        ...refreshedToken,
        onboardingStatus: refreshedToken.onboardingStatus || 'business-info',
        isAuthenticated: true
      };
    } catch (error) {
      logger.error('Token refresh failed:', {
        requestId,
        error: error.message
      });
      return {
        ...token,
        error: 'RefreshAccessTokenError',
        isAuthenticated: false
      };
    }
  },

  async session({ session, token }) {
    const requestId = crypto.randomUUID();
  
    try {
      if (!token) {
        logger.debug('No token available', { requestId });
        return null;
      }
  
      // Basic token validation
      if (!token.accessToken || !token.userId) {
        logger.debug('Invalid token data', {
          requestId,
          hasAccessToken: !!token.accessToken,
          hasUserId: !!token.userId
        });
        return null;
      }
  
      // Build session with defaults
      session.user = {
        ...session.user,
        id: token.userId,
        email: token.email || '',
        name: token.name || '',
        image: token.image || null,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        onboardingStatus: token.onboardingStatus || 'business-info',
        accessTokenExpires: token.accessTokenExpires,
        databaseStatus: token.databaseStatus || 'not_created',
        setupStatus: token.setupStatus || 'not_started',
        currentStep: token.currentStep || 1,
        redirectPath: `/onboarding/${token.onboardingStatus || 'business-info'}`
      };
  
      // Set session metadata
      session.isAuthenticated = true;
      session.error = undefined;
      session.expires = new Date(token.accessTokenExpires).toISOString();
  
      logger.debug('Session created successfully', {
        requestId,
        userId: session.user.id,
        onboardingStatus: session.user.onboardingStatus
      });
  
      return session;
  
    } catch (error) {
      logger.error('Session validation failed:', {
        requestId,
        error: error.message
      });
      return null;
    }
  },

  async redirect({ url, baseUrl }) {
    const requestId = crypto.randomUUID();
    
    logger.debug('Handling redirect:', {
      requestId,
      url,
      baseUrl,
      fullUrl: `${baseUrl}${url}`
    });
  
    try {
      // 1. Handle OAuth callbacks
      if (url.includes('/api/auth/callback') || 
          url.includes('/callback/google') ||
          url.includes('oauth')) {
        logger.debug('Processing OAuth callback', {
          requestId,
          url
        });
        return url;
      }
  
      // 2. Get current session
      const session = await getSession();
      
      // 3. Handle authenticated state
      if (session?.user?.accessToken) {
        const onboardingPath = '/onboarding/business-info';
  
        // If on signin page, redirect to onboarding
        if (url.includes('/auth/signin')) {
          logger.debug('Redirecting authenticated user from signin', {
            requestId,
            from: url,
            to: onboardingPath
          });
          return `${baseUrl}${onboardingPath}`;
        }
  
        // If accessing root or other pages, check onboarding status
        const currentStatus = session.user.onboardingStatus || 'business-info';
        const targetPath = `/onboarding/${currentStatus}`;
  
        logger.debug('Handling authenticated redirect', {
          requestId,
          currentUrl: url,
          targetPath,
          onboardingStatus: currentStatus
        });
  
        return `${baseUrl}${targetPath}`;
      }
  
      // 4. Handle callback URL parameter
      const urlObj = new URL(url, baseUrl);
      if (urlObj.searchParams.has('callbackUrl')) {
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        
        // Validate callback URL
        if (callbackUrl && (
            callbackUrl.startsWith(baseUrl) || 
            callbackUrl.startsWith('/')
        )) {
          logger.debug('Following callback URL', {
            requestId,
            callbackUrl
          });
          
          return callbackUrl.startsWith('/') 
            ? `${baseUrl}${callbackUrl}` 
            : callbackUrl;
        }
      }
  
      // 5. Handle unauthenticated state
      if (!session?.user) {
        // Allow access to signin page
        if (url.includes('/auth/signin')) {
          logger.debug('Allowing access to signin', {
            requestId,
            url
          });
          return url;
        }
  
        // Redirect other pages to signin
        logger.debug('Redirecting unauthenticated user to signin', {
          requestId,
          from: url
        });
        return `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
      }
  
      // 6. Handle default case - should redirect to business-info
      logger.debug('Using default redirect', {
        requestId,
        to: '/onboarding/business-info'
      });
      
      return `${baseUrl}/onboarding/business-info`;
  
    } catch (error) {
      logger.error('Redirect handling failed:', {
        requestId,
        error: error.message,
        url,
        baseUrl
      });
  
      // Safe fallback - redirect to business-info
      return `${baseUrl}/onboarding/business-info`;
    }
  },



  events: {
    async signIn(message) {
      logger.info('User signed in', {
        ...message,
        redirectTo: RoutingManager.ROUTES.ONBOARDING.BUSINESS_INFO
      });
    },
    async signOut(message) {
      logger.info('User signed out', message);
      if (message.token) {
        message.token.onboardingStatus = undefined;
        message.token.database_status = undefined;
        message.token.database_name = undefined;
        message.token.setup_status = undefined;
        message.token.isComplete = undefined;
        message.token.lastValidated = undefined;
      }
    },
    async createUser(message) {
      logger.info('User created', message);
    },
    async linkAccount(message) {
      logger.info('Account linked', message);
    },
    async session(message) {
      if (message.session?.error) {
        logger.error('Session error:', message.session.error);
      }
    }
  },

  pages: {
    signIn: RoutingManager.ROUTES.AUTH.SIGNIN,
    signOut: RoutingManager.ROUTES.AUTH.SIGNOUT,
    error: RoutingManager.ROUTES.AUTH.ERROR,
    verifyRequest: RoutingManager.ROUTES.AUTH.VERIFY,
    newUser: RoutingManager.ROUTES.ONBOARDING.BUSINESS_INFO
  },

  session: {
    strategy: 'jwt',
    maxAge: APP_CONFIG.auth.sessionMaxAge,
    updateAge: 24 * 60 * 60, // 24 hours
    // Add callbacks for session events
    callbacks: {
      async activated(session) {
        logger.info('Session activated', { 
          userId: session.user.id,
          onboardingStatus: session.user.onboardingStatus 
        });
      },
      async expired(session) {
        logger.info('Session expired', { 
          userId: session.user.id 
        });
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: getEnvironmentSettings().debug
};