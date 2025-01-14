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
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
  
    logger.debug('Starting user object validation:', {
      requestId,
      timestamp,
      userFields: Object.keys(user)
    });
  
    const required = [
      'id', 
      'accessToken', 
      'refreshToken', 
      'onboardingStatus', 
      'email'
    ];
    const errors = [];
  
    // Check required fields
    required.forEach(field => {
      if (!user[field]) {
        errors.push(`Missing ${field}`);
      }
    });
  
    // Log field presence
    logger.debug('Field validation results:', {
      requestId,
      timestamp,
      fieldStatus: required.reduce((acc, field) => ({
        ...acc,
        [field]: !!user[field]
      }), {})
    });
  
    // Check token expiration
    if (user.accessTokenExpires && user.accessTokenExpires <= Date.now()) {
      const expireInfo = {
        expiryTime: new Date(user.accessTokenExpires).toISOString(),
        currentTime: new Date().toISOString(),
        timeUntilExpiry: user.accessTokenExpires - Date.now()
      };
      
      logger.debug('Token expiration check failed:', {
        requestId,
        timestamp,
        ...expireInfo
      });
      
      errors.push('Invalid token expiration');
    }
  
    const validationResult = {
      isValid: errors.length === 0,
      errors
    };
  
    logger.debug('User validation completed:', {
      requestId,
      timestamp,
      isValid: validationResult.isValid,
      errorCount: errors.length,
      errors: errors
    });
  
    return validationResult;
  }


  async function exchangeGoogleToken(idToken, accessToken) {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    logger.debug('Starting token exchange:', {
      requestId,
      timestamp,
      hasIdToken: !!idToken,
      hasAccessToken: !!accessToken,
      endpoint: `${APP_CONFIG.api.baseURL}/api/onboarding/token-exchange/`
    });
  
    try {
      // Validate input tokens
      if (!idToken || !accessToken) {
        logger.error('Missing required tokens:', {
          requestId,
          timestamp,
          missingTokens: {
            idToken: !idToken,
            accessToken: !accessToken
          }
        });
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
            id_token: idToken,
            access_token: accessToken
          }),
          credentials: 'include',
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Server error: ${response.status}` 
        }));
        
        logger.error('Token exchange request failed:', {
          requestId,
          timestamp,
          status: response.status,
          error: errorData.error,
          responseHeaders: Object.fromEntries(response.headers.entries())
        });
        
        throw new Error(errorData.error || `Token exchange failed: ${response.status}`);
      }
  
      const data = await response.json();
      logger.debug('Token exchange response received:', {
        requestId,
        timestamp,
        hasTokens: !!data.tokens,
        hasUser: !!data.user,
        hasOnboarding: !!data.onboarding,
        responseFields: Object.keys(data)
      });
  
      // Validate response structure
      const requiredFields = ['tokens', 'user', 'onboarding'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        logger.error('Invalid response structure:', {
          requestId,
          timestamp,
          missingFields,
          receivedFields: Object.keys(data)
        });
        throw new Error(`Invalid response: missing ${missingFields.join(', ')}`);
      }
  
      // Normalize onboarding status
      const normalizedStatus = data.onboarding.status || 'step1';
      const originalStatus = data.onboarding.status;
      data.onboarding.status = normalizeOnboardingStatus(normalizedStatus);
  
      logger.debug('Onboarding status normalized:', {
        requestId,
        timestamp,
        originalStatus,
        normalizedStatus: data.onboarding.status
      });
  
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
          lastName: data.user.last_name
        },
        onboarding: {
          status: 'business-info',
          currentStep: 1,
          databaseStatus: data.onboarding?.database_status || 'not_created',
          setupStatus: data.onboarding?.setup_status || 'pending'
        }
      };
  
      logger.info('Token exchange successful:', {
        requestId,
        timestamp,
        userId: result.user.id,
        onboardingStatus: result.onboarding.status,
        hasTokens: !!result.tokens.access && !!result.tokens.refresh,
        responseTime: Date.now() - new Date(timestamp).getTime()
      });
  
      return result;
  
    } catch (error) {
      logger.error('Token exchange failed:', {
        requestId,
        timestamp,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        },
        context: {
          hasIdToken: !!idToken,
          hasAccessToken: !!accessToken
        }
      });
      
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
  


// Replace both functions with this single version
function normalizeOnboardingStatus(status) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  logger.debug('Starting onboarding status normalization:', {
    requestId,
    timestamp,
    originalStatus: status
  });

  // Handle null/undefined/empty cases
  if (!status || status === 'null') {
    logger.debug('Empty status detected, using default:', {
      requestId,
      timestamp,
      defaultValue: 'business-info'
    });
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
    logger.debug('Legacy status mapped:', {
      requestId,
      timestamp,
      originalStatus: normalized,
      mappedStatus: legacyMapping[normalized]
    });
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

  const isValid = validStatuses.includes(normalized);
  const finalStatus = isValid ? normalized : 'business-info';

  logger.debug('Status normalization completed:', {
    requestId,
    timestamp,
    originalStatus: status,
    normalizedStatus: normalized,
    isValidStatus: isValid,
    finalStatus,
    validationPath: isValid ? 'valid_status' : 'fallback_default'
  });

  return finalStatus;
}

/**
 * Refreshes an expired access token using the refresh token.
 * Handles token refresh with proper error handling and logging.
 */
async function refreshAccessToken(token) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  logger.debug('Starting token refresh:', {
    requestId,
    timestamp,
    tokenState: {
      hasRefreshToken: !!token?.refreshToken,
      expiryTime: token?.accessTokenExpires ? new Date(token.accessTokenExpires).toISOString() : null,
      isExpired: token?.accessTokenExpires ? Date.now() >= token.accessTokenExpires : true
    }
  });

  try {
    if (!token?.refreshToken) {
      logger.error('Refresh token missing:', {
        requestId,
        timestamp,
        tokenFields: Object.keys(token || {})
      });
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${APP_CONFIG.api.baseURL}/api/onboarding/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        refresh: token.refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Token refresh request failed:', {
        requestId,
        timestamp,
        status: response.status,
        error: data,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      throw new Error(data.detail || 'Failed to refresh token');
    }

    logger.debug('Token refresh successful:', {
      requestId,
      timestamp,
      hasNewAccessToken: !!data.access,
      hasNewRefreshToken: !!data.refresh,
      accessTokenUpdated: data.access !== token.accessToken
    });

    const updatedToken = {
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

    logger.debug('Updated token state:', {
      requestId,
      timestamp,
      tokenUpdates: {
        accessTokenChanged: updatedToken.accessToken !== token.accessToken,
        refreshTokenChanged: updatedToken.refreshToken !== token.refreshToken,
        newExpiryTime: new Date(updatedToken.accessTokenExpires).toISOString(),
        preservedFields: {
          onboardingStatus: updatedToken.onboardingStatus,
          databaseStatus: updatedToken.database_status,
          setupStatus: updatedToken.setup_status
        }
      }
    });

    return updatedToken;

  } catch (error) {
    logger.error('Token refresh failed:', {
      requestId,
      timestamp,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      }
    });

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
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  logger.debug('Evaluating user completion status:', {
    requestId,
    timestamp,
    tokenState: {
      onboardingStatus: tokenData.onboarding_status,
      databaseStatus: tokenData.database_status,
      hasUserId: !!tokenData.user_id,
      hasTokens: !!(tokenData.access && tokenData.refresh)
    }
  });

  const isOnboardingComplete = tokenData.onboarding_status === 'complete';
  const isDatabaseActive = tokenData.database_status === 'active';
  const hasRequiredFields = tokenData.user_id && tokenData.access && tokenData.refresh;

  const completionStatus = {
    isComplete: Boolean(isOnboardingComplete && isDatabaseActive),
    hasAllFields: Boolean(hasRequiredFields),
    status: {
      onboarding: tokenData.onboarding_status,
      database: tokenData.database_status
    }
  };

  logger.debug('User completion evaluation completed:', {
    requestId,
    timestamp,
    evaluation: {
      onboardingComplete: isOnboardingComplete,
      databaseActive: isDatabaseActive,
      hasRequiredFields,
      finalStatus: completionStatus.isComplete
    }
  });

  return completionStatus;
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
        secure: useSecureCookies,
        maxAge: APP_CONFIG.auth.sessionMaxAge // Add this

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
      name: `${useSecureCookies ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: 900
      }
    },
    state: {
      name: `${useSecureCookies ? '__Secure-' : ''}next-auth.state`,
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
      
      logger.debug('Starting signin process:', {
        requestId,
        provider: account?.provider,
        hasTokens: !!account?.id_token
      });
    
      try {
        if (!account?.id_token) {
          throw new Error('Missing OAuth tokens');
        }
    
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token-exchange/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId
          },
          body: JSON.stringify({
            id_token: account.id_token,
            access_token: account.access_token,
            provider: account.provider,
            profile: {
              email: profile.email,
              name: profile.name,
              picture: profile.picture
            }
          })
        });
    
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Token exchange failed');
        }
    
        const data = await response.json();
        
        // Set all required fields on user object
        user.id = data.user.id;
        user.sub = data.user.id; // Add sub for JWT compatibility
        user.accessToken = data.tokens.access;
        user.refreshToken = data.tokens.refresh;
        user.email = profile.email;
        user.name = profile.name;
        user.image = profile.picture;
        user.onboardingStatus = 'business-info';
        user.currentStep = 1;
        user.accessTokenExpires = Date.now() + 3600 * 1000;
        user.isInitialized = true;
        user.isAuthenticated = true;
    
        logger.debug('User object populated:', {
          requestId,
          userId: user.id,
          hasTokens: !!(user.accessToken && user.refreshToken),
          onboardingStatus: user.onboardingStatus
        });
    
        return true;
    
      } catch (error) {
        logger.error('Authentication failed:', {
          requestId,
          error: error.message,
          stack: error.stack
        });
        return false;
      }
    },
    
    async jwt({ token, user, account, profile, trigger }) {
      const requestId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
    
      try {
        // Handle initial sign in
        if (account && user) {
          // Validate required tokens
          if (!user.accessToken || !user.refreshToken) {
            return {
              ...token,
              error: 'MissingTokens',
              isAuthenticated: false
            };
          }
    
          // Create complete token
          const newToken = {
            ...token,
            sub: user.id,
            userId: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            accessTokenExpires: user.accessTokenExpires,
            onboardingStatus: 'business-info',
            currentStep: 1,
            isInitialized: true,
            isAuthenticated: true
          };
    
          logger.debug('Initial JWT created:', {
            requestId,
            hasTokens: !!(newToken.accessToken && newToken.refreshToken),
            onboardingStatus: newToken.onboardingStatus
          });
    
          return newToken;
        }
    
        // Handle updates
        if (trigger === 'update' && token?.accessToken) {
          return {
            ...token,
            ...user,
            accessToken: user?.accessToken || token.accessToken,
            refreshToken: user?.refreshToken || token.refreshToken,
            accessTokenExpires: user?.accessTokenExpires || token.accessTokenExpires
          };
        }
    
        // Check expiration
        const gracePeriod = 60 * 1000;
        if (token?.accessTokenExpires && 
            Date.now() >= (token.accessTokenExpires - gracePeriod)) {
          try {
            const refreshedToken = await refreshAccessToken(token);
            if (!refreshedToken.error) {
              return {
                ...token,
                ...refreshedToken,
                isAuthenticated: true
              };
            }
          } catch (error) {
            return {
              ...token,
              error: 'RefreshAccessTokenError',
              isAuthenticated: false
            };
          }
        }
    
        return token;
    
      } catch (error) {
        logger.error('JWT processing failed:', {
          requestId,
          error: error.message
        });
        return {
          ...token,
          error: 'JWTError',
          isAuthenticated: false
        };
      }
    },
    
    async session({ session, token, trigger }) {
      const requestId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
    
      try {
        // Validate token existence
        if (!token?.accessToken || !token?.refreshToken) {
          return null;
        }
    
        // Create session user object
        const sessionUser = {
          id: token.userId || token.sub,
          email: token.email,
          name: token.name,
          image: token.image,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          onboardingStatus: token.onboardingStatus || 'business-info',
          currentStep: token.currentStep || 1,
          isAuthenticated: !!token.accessToken && !token.error,
          error: token.error
        };
    
        const updatedSession = {
          ...session,
          user: sessionUser,
          expires: new Date(token.accessTokenExpires).toISOString()
        };
    
        logger.debug('Session created:', {
          requestId,
          hasTokens: !!(sessionUser.accessToken && sessionUser.refreshToken),
          onboardingStatus: sessionUser.onboardingStatus
        });
    
        return updatedSession;
    
      } catch (error) {
        logger.error('Session creation failed:', {
          requestId,
          error: error.message
        });
        return null;
      }
    }
  },

async redirect({ url, baseUrl }) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  logger.debug('Redirect handling started:', {
    requestId,
    timestamp,
    redirectParams: {
      url,
      baseUrl,
      fullUrl: `${baseUrl}${url}`,
      isRelative: url.startsWith('/')
    }
  });

  try {
    // Always allow OAuth and callback URLs to proceed
    if (url.includes('/api/auth/callback') || 
        url.includes('/callback/google') ||
        url.includes('oauth')) {
      logger.debug('OAuth callback detected, allowing through:', {
        requestId,
        url
      });
      return url;
    }

    // Get fresh session state
    const session = await getSession();
    
    logger.debug('Session state retrieved:', {
      requestId,
      sessionState: {
        exists: !!session,
        hasToken: !!session?.user?.accessToken,
        onboardingStatus: session?.user?.onboardingStatus
      }
    });

    // Special handling for business-info
    if (url.includes('/onboarding/business-info')) {
      if (session?.user?.accessToken) {
        logger.debug('Allowing authenticated business-info access:', {
          requestId,
          url
        });
        return url;
      }
      logger.debug('Unauthenticated business-info access, redirecting to signin:', {
        requestId,
        url
      });
      return `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
    }

    // Handle authenticated users
    if (session?.user?.accessToken) {
      // Redirect away from signin if already authenticated
      if (url.includes('/auth/signin')) {
        const onboardingPath = '/onboarding/business-info';
        logger.debug('Redirecting authenticated user from signin:', {
          requestId,
          to: onboardingPath
        });
        return `${baseUrl}${onboardingPath}`;
      }

      // Route based on onboarding status
      const currentStatus = session.user.onboardingStatus || 'business-info';
      const targetPath = `/onboarding/${currentStatus}`;

      logger.debug('Routing authenticated user:', {
        requestId,
        currentUrl: url,
        targetPath,
        status: currentStatus
      });

      return `${baseUrl}${targetPath}`;
    }

    // Handle callback URLs
    if (url.includes('callbackUrl=')) {
      const urlObj = new URL(url, baseUrl);
      const callbackUrl = urlObj.searchParams.get('callbackUrl');
      
      if (callbackUrl && (callbackUrl.startsWith(baseUrl) || callbackUrl.startsWith('/'))) {
        const finalUrl = callbackUrl.startsWith('/') ? `${baseUrl}${callbackUrl}` : callbackUrl;
        
        logger.debug('Following callback URL:', {
          requestId,
          from: url,
          to: finalUrl
        });
        
        return finalUrl;
      }
    }

    // Handle unauthenticated access
    if (!session?.user) {
      // Allow direct signin access
      if (url.includes('/auth/signin')) {
        return url;
      }

      // Redirect to signin with callback
      const signInUrl = `${baseUrl}/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
      logger.debug('Redirecting unauthenticated user to signin:', {
        requestId,
        from: url,
        to: signInUrl
      });
      return signInUrl;
    }

    // Default fallback
    logger.debug('Using default redirect:', {
      requestId,
      to: '/onboarding/business-info'
    });
    return `${baseUrl}/onboarding/business-info`;

  } catch (error) {
    logger.error('Redirect failed:', {
      requestId,
      error: error.message,
      url,
      baseUrl
    });
    
    // Safe fallback
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