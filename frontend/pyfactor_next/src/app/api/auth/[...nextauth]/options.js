// src/app/api/auth/[...nextauth]/options.js

import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials'; // Add this import
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
      'onboarding_status', 
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


  async function exchangeGoogleToken(idToken, accessToken, profile) {  // Add profile parameter
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
            OAuthProfile: profile,
            account: {
              id_token: idToken,
              access_token: accessToken
            },
            profile: {
              email: profile.email,
              name: profile.name,
              image: profile.picture
            }
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
      data.onboarding.status = normalizeonboarding_status(normalizedStatus);
  
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
          current_step: 'business-info',
          databaseStatus: data.onboarding?.database_status || 'not_created',
          setupStatus: data.onboarding?.setup_status || 'pending'
        }
      };
  
      logger.info('Token exchange successful:', {
        requestId,
        timestamp,
        userId: result.user.id,
        onboarding_status: result.onboarding.status,
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
function normalizeonboarding_status(status) {
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
      onboarding_status: token.onboarding_status,
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
          onboarding_status: updatedToken.onboarding_status,
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
      onboarding_status: tokenData.onboarding_status,
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
    CredentialsProvider({
      name: 'Credentials',
      credentials: {},
      async authorize(credentials, req) {
        try {
          // If this is a status update
          if (credentials.onboarding_status) {
            const session = await getSession({ req });
            if (!session?.user) {
              throw new Error('No session found');
            }
    
            // Create updated user object
            const user = {
              ...session.user,
              id: session.user.id,
              email: session.user.email,
              accessToken: session.user.accessToken,
              refreshToken: session.user.refreshToken,
              onboarding_status: credentials.onboarding_status,
              current_step: credentials.onboarding_status,
              selected_plan: credentials.selected_plan,
              isAuthenticated: true
            };
    
            return user;
          }
    
          // If this is a regular credential verification
          if (credentials.email && credentials.password) {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify-credentials`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            });
    
            if (!response.ok) {
              return null;
            }
    
            const user = await response.json();
            return user;
          }
    
          throw new Error('Invalid credentials request');
    
        } catch (error) {
          logger.error('Credentials authorize failed:', {
            error: error.message,
            credentials: credentials
          });
          return null;
        }
      }
    })
    
    
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
    
      logger.debug('Starting signin process - Full data:', {
        requestId,
        accountData: {
          provider: account?.provider,
          type: account?.type,
          hasIdToken: !!account?.id_token,
          hasAccessToken: !!account?.access_token,
          tokenLength: account?.id_token?.length
        },
        profileData: {
          email: profile?.email,
          name: profile?.name,
          picture: profile?.picture
        }
      });
    
      try {
        // Handle OAuth sign in (Google)
        if (account?.provider === 'google') {
          if (!account.id_token || !account.access_token) {
            logger.error('Missing OAuth tokens:', {
              requestId,
              account: account
            });
            throw new Error('Missing OAuth tokens');
          }
    
          const result = await exchangeGoogleToken(
            account.id_token,
            account.access_token,
            profile
          );
    
          // Set user fields from exchange result
          user.id = result.user.id;
          user.sub = result.user.id;
          user.accessToken = result.tokens.access;
          user.refreshToken = result.tokens.refresh;
          user.email = profile.email;
          user.name = profile.name;
          user.image = profile.picture;
          user.onboarding_status = result.onboarding.status;
          user.current_step = result.onboarding.current_step;
          user.accessTokenExpires = Date.now() + 3600 * 1000;
          user.isInitialized = true;
          user.isAuthenticated = true;
    
          // Validate the user object
          const validation = validateUserObject(user);
          if (!validation.isValid) {
            logger.error('Invalid user object after token exchange:', {
              requestId,
              errors: validation.errors
            });
            throw new Error(`Invalid user object: ${validation.errors.join(', ')}`);
          }
    
        // Handle credentials sign in
        } else if (account?.provider === 'credentials') {
          // For credentials, we just validate the existing user object
          const validation = validateUserObject(user);
          if (!validation.isValid) {
            logger.error('Invalid credentials user object:', {
              requestId,
              errors: validation.errors
            });
            throw new Error(`Invalid user object: ${validation.errors.join(', ')}`);
          }
    
          user.isAuthenticated = true;
          
        } else {
          logger.error('Unknown provider:', {
            requestId,
            provider: account?.provider
          });
          throw new Error('Unsupported authentication provider');
        }
    
        logger.debug('User object populated:', {
          requestId,
          userId: user.id,
          provider: account?.provider,
          hasTokens: !!(user.accessToken && user.refreshToken),
          onboarding_status: user.onboarding_status,
          current_step: user.current_step,
          isAuthenticated: user.isAuthenticated
        });
    
        return true;
    
      } catch (error) {
        logger.error('Authentication failed:', {
          requestId,
          error: error.message,
          stack: error.stack,
          context: {
            provider: account?.provider,
            hasIdToken: !!account?.id_token,
            hasAccessToken: !!account?.access_token
          }
        });
        return false;
      }
    },
    
    async jwt({ token, user, account, profile, trigger }) {
      const requestId = crypto.randomUUID();
    
      logger.debug('JWT callback started:', {
        requestId,
        trigger,
        hasUser: !!user,
        hasAccount: !!account,
        currentStatus: token?.onboarding_status,
        tokenState: {
          hasAccessToken: !!token?.accessToken,
          hasRefreshToken: !!token?.refreshToken,
          currentonboarding_status: token?.onboarding_status
        }
      });
    
      try {
        if (!token && !user) {
          logger.warn('No token or user available:', { requestId });
          return null;
        }
    
        // Handle initial sign in
        if (account && user) {
          logger.debug('Processing initial sign in:', {
            requestId,
            userId: user.id,
            hasTokens: !!(user.accessToken && user.refreshToken)
          });

          const validation = validateUserObject(user);
          if (!validation.isValid) {
            logger.error('Invalid user object:', {
              requestId,
              errors: validation.errors
            });
            return {
              ...token,
              error: 'InvalidUserObject',
              isAuthenticated: false
            };
          }
    
          // Validate required tokens
          if (!user.accessToken || !user.refreshToken) {
            logger.error('Missing required tokens during sign in:', {
              requestId,
              hasAccessToken: !!user.accessToken,
              hasRefreshToken: !!user.refreshToken
            });
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
            onboarding_status: user.onboarding_status || 'business-info',
            current_step: user.current_step || 'business-info',
            selected_plan: user.selected_plan,  // Changed from selected_plan
            isInitialized: true,
            isAuthenticated: true,
            lastUpdated: new Date().toISOString()
          };
    
          logger.debug('Initial JWT created:', {
            requestId,
            hasTokens: !!(newToken.accessToken && newToken.refreshToken),
            onboarding_Status: newToken.onboarding_status,
            tokenState: {
              current_step: newToken.current_step,
              selected_plan: newToken.selected_plan,
              isInitialized: newToken.isInitialized
            }
          });
    
          return newToken;
        }
    
        // Handle explicit updates
        if (trigger === 'update' && user) {
          logger.debug('Processing token update:', {
            requestId,
            updateType: user?.onboarding_status ? 'onboarding' : 'plan',
            currentState: {
              onboarding_status: token.onboarding_status,
              selected_plan: token.selected_plan
            },
            newState: {
              onboarding_status: user?.onboarding_status,
              selected_plan: user?.selected_plan || null
            }
          });
    
          // Update onboarding status if provided
          if (user?.onboarding_status) {
            logger.debug('Updating onboarding status:', {
              requestId,
              from: token.onboarding_status,
              to: user.onboarding_status
            });
    
            return {
              ...token,
              onboarding_status: user.onboarding_status,
              current_step: user.current_step || token.current_step,
              selected_plan: user.selected_plan || token.selected_plan || null,
              isAuthenticated: true, // Add this
              lastUpdated: new Date().toISOString()
            };
          }
    
          // Update selected plan if provided
          if (user?.selected_plan) {
            logger.debug('Updating selected plan:', {
              requestId,
              from: token.selected_plan,
              to: user.selected_plan
            });
    
            return {
              ...token,
              selected_plan: user.selected_plan,
              lastUpdated: new Date().toISOString()
            };
          }
        }
    
        // Handle token expiration
        const gracePeriod = 60 * 1000; // 1 minute
        if (token?.accessTokenExpires && 
            Date.now() >= (token.accessTokenExpires - gracePeriod)) {
          logger.debug('Token requires refresh:', {
            requestId,
            expiresAt: new Date(token.accessTokenExpires).toISOString(),
            gracePeriod: `${gracePeriod}ms`
          });
    
          try {
            const refreshedToken = await refreshAccessToken(token);
            if (!refreshedToken.error) {
              logger.debug('Token refreshed successfully:', {
                requestId,
                newExpiryTime: new Date(refreshedToken.accessTokenExpires).toISOString()
              });
    
              return {
                ...token,
                ...refreshedToken,
                isAuthenticated: true,
                lastUpdated: new Date().toISOString()
              };
            }
    
            throw new Error('Token refresh failed');
          } catch (error) {
            logger.error('Token refresh error:', {
              requestId,
              error: error.message,
              tokenState: {
                hasAccessToken: !!token.accessToken,
                hasRefreshToken: !!token.refreshToken
              }
            });
    
            return {
              ...token,
              error: 'RefreshAccessTokenError',
              isAuthenticated: false,
              lastUpdated: new Date().toISOString()
            };
          }
        }
    
        // Return existing token if no updates needed
        return token;
    
      } catch (error) {
        logger.error('JWT processing failed:', {
          requestId,
          error: error.message,
          stack: error.stack,
          tokenState: {
            hasAccessToken: !!token?.accessToken,
            hasRefreshToken: !!token?.refreshToken,
            onboarding_status: token?.onboarding_status
          }
        });
    
        return {
          ...token,
          error: 'JWTError',
          isAuthenticated: false,
          lastUpdated: new Date().toISOString()
        };
      }
    },
    
    async session({ session, token, trigger }) {
      const requestId = crypto.randomUUID();
      
      logger.debug('Session callback started:', {
        requestId,
        trigger,
        currentStatus: token?.onboarding_status,
        hasToken: !!token,
        hasSession: !!session
      });
    
      try {
        // If no token exists, return null immediately
        if (!token) {
          logger.warn('Missing token:', {
            requestId,
            hasToken: false
          });
          return null;
        }
    
        // If no session exists, create a basic one
        if (!session) {
          session = {
            user: {},
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
        }
    
        // Handle token refresh errors
        if (token.error === 'RefreshAccessTokenError') {
          logger.error('Token refresh error detected:', {
            requestId,
            error: token.error
          });
          return {
            ...session,
            error: 'RefreshAccessTokenError'
          };
        }
    
        // Create session user object with all required fields
        const sessionUser = {
          ...session.user,
          id: token.userId || token.sub,
          email: token.email,
          name: token.name,
          image: token.image,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          onboarding_status: token.onboarding_status || 'business-info',
          current_step: token.current_step || token.onboarding_status || 'business-info',
          selected_plan: token.selected_plan || null,
          isAuthenticated: !!token.accessToken && !token.error,
          error: token.error,
          sub: token.sub
        };
    
        // Create the updated session
        const updatedSession = {
          ...session,
          user: sessionUser,
          expires: token.accessTokenExpires 
            ? new Date(token.accessTokenExpires).toISOString()
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          error: token.error || null
        };
    
        logger.debug('Session updated successfully:', {
          requestId,
          onboarding_status: sessionUser.onboarding_status,
          current_step: sessionUser.current_step,
          isAuthenticated: sessionUser.isAuthenticated,
          expiresAt: updatedSession.expires,
          trigger
        });
    
        return updatedSession;
    
      } catch (error) {
        logger.error('Session creation failed:', {
          requestId,
          error: error.message,
          stack: error.stack,
          trigger
        });
        
        // Return a basic session with error instead of null
        return {
          ...session,
          error: 'SessionCreationError',
          errorMessage: error.message
        };
      }
    }
  },

  async redirect({ url, baseUrl }) {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
  
    logger.debug('Starting redirect handling:', {
      requestId,
      timestamp,
      context: {
        url,
        baseUrl,
        isRelativeUrl: url.startsWith('/'),
        isRootPath: url === '/' || url === baseUrl
      }
    });
  
    try {
      // Handle root path specifically
      if (url === '/' || url === baseUrl) {
        const session = await getSession();

                // Add this new condition
        if (session?.user?.onboarding_status === 'complete') {
          return `${baseUrl}/dashboard`;
        }
    
        
        if (session?.user?.accessToken) {
          const targetPath = session.user.onboarding_status 
            ? `/onboarding/${session.user.onboarding_status}`
            : '/onboarding/business-info';
  
          logger.debug('Redirecting authenticated user from root:', {
            requestId,
            to: targetPath,
            onboarding_status: session.user.onboarding_status
          });
          
          return `${baseUrl}${targetPath}`;
        }
  
        // Allow unauthenticated access to root
        logger.debug('Allowing unauthenticated root access:', {
          requestId,
          url: baseUrl
        });
        return baseUrl;
      }


  
      // Always allow OAuth and callback URLs
      if (
        url.includes('/api/auth/callback') || 
        url.includes('/callback/google') ||
        url.includes('oauth') ||
        url.startsWith(`${baseUrl}/api/auth`)
      ) {
        logger.debug('Allowing auth-related URL:', {
          requestId,
          url
        });
        return url;
      }
  
      const session = await getSession();
      const isAuthenticated = !!session?.user?.accessToken;
  
      // Handle callback URL parameters
      const urlObj = new URL(url.startsWith('http') ? url : `${baseUrl}${url}`);
      const callbackUrl = urlObj.searchParams.get('callbackUrl');
  
      // Special handling for signin page
      if (url.includes('/auth/signin')) {
        if (isAuthenticated) {
          const targetPath = session.user.onboarding_status 
            ? `/onboarding/${session.user.onboarding_status}`
            : '/onboarding/business-info';
  
          logger.debug('Redirecting authenticated user from signin:', {
            requestId,
            to: targetPath
          });
          
          return `${baseUrl}${targetPath}`;
        }
  
        // Allow unauthenticated users to access signin with callback
        if (callbackUrl) {
          return url;
        }
  
        // Default signin without callback
        return `${baseUrl}/auth/signin`;
      }
  
      // Handle authenticated users
      if (isAuthenticated) {
        // If trying to access a protected route, allow it
        if (url.startsWith(`${baseUrl}/onboarding/`) || url.startsWith('/onboarding/')) {
          logger.debug('Allowing authenticated onboarding access:', {
            requestId,
            url
          });
          return url;
        }
  
        // Default authenticated redirect
        const targetPath = session.user.onboarding_status 
          ? `/onboarding/${session.user.onboarding_status}`
          : '/onboarding/business-info';
  
        logger.debug('Default authenticated redirect:', {
          requestId,
          to: targetPath
        });
        
        return `${baseUrl}${targetPath}`;
      }
  
      // Handle unauthenticated users
      if (!isAuthenticated && !url.includes('/auth/signin')) {
        const encodedCallback = encodeURIComponent(
          url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`
        );
  
        logger.debug('Redirecting unauthenticated user to signin:', {
          requestId,
          from: url,
          callback: encodedCallback
        });
  
        return `${baseUrl}/auth/signin?callbackUrl=${encodedCallback}`;
      }
  
      // Final fallback
      logger.debug('Using fallback redirect:', {
        requestId,
        to: baseUrl
      });
      
      return baseUrl;
  
    } catch (error) {
      logger.error('Redirect error:', {
        requestId,
        error: error.message,
        stack: error.stack,
        context: { url, baseUrl },
        url,
        baseUrl
      });
  
      // Safe fallback on error
      return baseUrl;
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
        message.token.onboarding_status = undefined;
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
          onboarding_status: session.user.onboarding_status 
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
