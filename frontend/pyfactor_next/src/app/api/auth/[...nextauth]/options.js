// src/app/api/auth/[...nextauth]/options.js
import GoogleProvider from 'next-auth/providers/google';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';

/**
 * Exchange Google token for our backend token
 */
async function exchangeGoogleToken(idToken, accessToken) {
  try {
    logger.info('Exchanging Google token');

    const response = await fetch(
      `${APP_CONFIG.api.baseURL}${APP_CONFIG.api.endpoints.auth.google}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: idToken,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();

    if (!tokenData?.access || !tokenData?.refresh) {
      throw new Error('Invalid token response from server');
    }

    logger.info('Token exchange successful');
    return tokenData;
  } catch (error) {
    logger.error('Token exchange failed:', error);
    throw new Error('Failed to exchange token');
  }
}

/**
 * Refresh access token
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
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

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

  // Add global timeout settings
  timeout: {
    signIn: 10000, // Sign in timeout
    callback: 10000, // Callback timeout
    oauth: {
      request: 10000, // OAuth request timeout
      discovery: 10000, // Discovery timeout
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google' && account?.id_token) {
          const tokenData = await exchangeGoogleToken(account.id_token, account.access_token);

          if (!tokenData?.access || !tokenData?.refresh) {
            logger.error('Invalid token data received:', tokenData);
            throw new Error('Invalid token data received');
          }

          // Add more detailed logging about onboarding status
          logger.info('User authentication successful:', {
            email: profile.email,
            onboardingStatus: tokenData.onboarding_status,
            isNewUser: !tokenData.onboarding_status,
            isComplete: tokenData.onboarding_status === 'complete',
          });

          user.accessToken = tokenData.access;
          user.refreshToken = tokenData.refresh;
          user.id = tokenData.user_id;
          user.onboardingStatus = tokenData.onboarding_status;
          user.email = profile.email;
          user.name = profile.name;
          user.image = profile.picture;
          user.accessTokenExpires = Date.now() + APP_CONFIG.auth.tokenGracePeriod;
          user.isComplete = tokenData.onboarding_status === 'complete';

          logger.info('Token data saved to user object:', {
            hasAccessToken: !!user.accessToken,
            hasRefreshToken: !!user.refreshToken,
            expiresIn: APP_CONFIG.auth.tokenGracePeriod,
          });

          return true;
        }
        return false;
      } catch (error) {
        logger.error('Sign in error:', {
          error: error.message,
          stack: error.stack,
          account: !!account,
          user: !!user,
        });
        return false;
      }
    },

    async jwt({ token, user, account }) {
      try {
        if (account && user) {
          logger.info('Initial token creation', {
            hasAccessToken: !!user.accessToken,
            hasRefreshToken: !!user.refreshToken,
            onboardingStatus: user.onboardingStatus,
          });

          return {
            ...token,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            userId: user.id,
            onboardingStatus: user.onboardingStatus,
            email: user.email,
            accessTokenExpires: user.accessTokenExpires,
            isComplete: user.onboardingStatus === 'complete', // Add this flag
          };
        }

        if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
          logger.debug('Using existing valid token');
          return token;
        }

        logger.info('Token needs refresh', {
          expired: !token.accessTokenExpires || Date.now() >= token.accessTokenExpires,
        });

        const refreshedToken = await refreshAccessToken(token);

        if (refreshedToken.error) {
          logger.error('Token refresh failed, redirecting to signin');
          return { ...refreshedToken, redirect: '/auth/signin' };
        }

        return refreshedToken;
      } catch (error) {
        logger.error('JWT callback error:', error);
        return {
          ...token,
          error: 'TokenError',
          redirect: '/auth/signin',
        };
      }
    },

    async session({ session, token }) {
      try {
        if (token.error) {
          logger.error('Token error in session callback:', token.error);
          throw new Error(token.error);
        }

        // Add isComplete flag based on onboarding status
        const isComplete = token.onboardingStatus === 'complete';

        session.user = {
          ...session.user,
          id: token.userId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          onboardingStatus: token.onboardingStatus,
          email: token.email,
          isComplete: isComplete, // Add this flag
        };

        logger.debug('Session updated:', {
          onboardingStatus: token.onboardingStatus,
          isComplete: isComplete,
        });

        return session;
      } catch (error) {
        logger.error('Session callback error:', error);
        return {
          expires: session.expires,
          error: error.message,
        };
      }
    },
  },

  async redirect({ url, baseUrl }) {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      try {
        if (url.startsWith(`${baseUrl}/api/auth/callback`)) {
          const session = await getSession();

          if (!session?.user?.accessToken) {
            logger.warn('No access token available for redirect check');
            return `${baseUrl}/auth/signin`;
          }

          const response = await fetch(`${APP_CONFIG.api.baseURL}/api/onboarding/status/`, {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch onboarding status: ${response.statusText}`);
          }

          const { status: onboardingStatus, currentStep } = await response.json();

          logger.info('Redirect check:', {
            onboardingStatus,
            currentStep,
            isComplete: onboardingStatus === 'complete',
            attempt: retryCount + 1,
          });

          return onboardingStatus === 'complete'
            ? `${baseUrl}/dashboard`
            : `${baseUrl}/onboarding/${currentStep || 'step1'}`;
        }

        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      } catch (error) {
        logger.error('Redirect error:', {
          error,
          attempt: retryCount + 1,
          maxRetries,
        });

        retryCount++;

        if (retryCount === maxRetries) {
          return `${baseUrl}/auth/signin?error=RedirectFailed`;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  },

  events: {
    async signIn(message) {
      logger.info('User signed in', message);
    },
    async signOut(message) {
      logger.info('User signed out', message);
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
    },
  },

  pages: {
    signIn: APP_CONFIG.routes.auth.signIn,
    signOut: APP_CONFIG.routes.auth.signOut,
    error: APP_CONFIG.routes.auth.error,
    verifyRequest: APP_CONFIG.routes.auth.verifyRequest,
  },

  session: {
    strategy: 'jwt',
    maxAge: APP_CONFIG.auth.sessionMaxAge,
    updateAge: 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
