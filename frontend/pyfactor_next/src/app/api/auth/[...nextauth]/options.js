// src/app/api/auth/[...nextauth]/options.js
import GoogleProvider from "next-auth/providers/google";
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';

/**
 * Exchange Google token for our backend token
 */
async function exchangeGoogleToken(idToken, accessToken) {
  try {
    logger.info('Exchanging Google token');
    
    const response = await fetch(`${APP_CONFIG.api.baseURL}${APP_CONFIG.api.endpoints.auth.google}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: idToken,
        access_token: accessToken
      }),
    });

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
      tokenExpiry: token.accessTokenExpires
    });

    const response = await fetch(`${APP_CONFIG.api.baseURL}/api/onboarding/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        refresh: token.refreshToken
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Token refresh failed:', {
        status: response.status,
        error: data
      });
      throw new Error(data.detail || 'Failed to refresh token');
    }

    logger.info('Token refresh successful');

    return {
      ...token,
      accessToken: data.access,
      refreshToken: data.refresh || token.refreshToken,
      accessTokenExpires: Date.now() + APP_CONFIG.auth.tokenGracePeriod,
      error: null
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError'
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
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],

  // Add global timeout settings
  timeout: {
    signIn: 10000,  // Sign in timeout
    callback: 10000, // Callback timeout
    oauth: {
      request: 10000,  // OAuth request timeout
      discovery: 10000 // Discovery timeout
    }
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google" && account?.id_token) {
          const tokenData = await exchangeGoogleToken(
            account.id_token,
            account.access_token
          );
          
          if (!tokenData?.access || !tokenData?.refresh) {
            logger.error('Invalid token data received:', tokenData);
            throw new Error('Invalid token data received');
          }
          
          user.accessToken = tokenData.access;
          user.refreshToken = tokenData.refresh;
          user.id = tokenData.user_id;
          user.onboardingStatus = tokenData.onboarding_status;
          user.email = profile.email;
          user.name = profile.name;
          user.image = profile.picture;
          user.accessTokenExpires = Date.now() + APP_CONFIG.auth.tokenGracePeriod;

          logger.info('Token data saved to user object:', {
            hasAccessToken: !!user.accessToken,
            hasRefreshToken: !!user.refreshToken,
            expiresIn: APP_CONFIG.auth.tokenGracePeriod
          });
          
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Sign in error:', {
          error: error.message,
          stack: error.stack,
          account: !!account,
          user: !!user
        });
        return false;
      }
    },

    async jwt({ token, user, account }) {
      try {
        if (account && user) {
          logger.info('Initial token creation', {
            hasAccessToken: !!user.accessToken,
            hasRefreshToken: !!user.refreshToken
          });
          
          return {
            ...token,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            userId: user.id,
            onboardingStatus: user.onboardingStatus,
            email: user.email,
            accessTokenExpires: user.accessTokenExpires
          };
        }

        if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
          logger.debug('Using existing valid token');
          return token;
        }

        logger.info('Token needs refresh', {
          expired: !token.accessTokenExpires || Date.now() >= token.accessTokenExpires
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
          redirect: '/auth/signin'
        };
      }
    },

    async session({ session, token }) {
      try {
        if (token.error) {
          logger.error('Token error in session callback:', token.error);
          throw new Error(token.error);
        }

        session.user = {
          ...session.user,
          id: token.userId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          onboardingStatus: token.onboardingStatus,
          email: token.email
        };

        logger.debug('Session updated with token data');
        return session;
      } catch (error) {
        logger.error('Session callback error:', error);
        return { 
          expires: session.expires,
          error: error.message 
        };
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        if (url.startsWith(baseUrl)) {
          return url;
        }
        return baseUrl;
      } catch (error) {
        logger.error('Redirect error:', error);
        return baseUrl;
      }
    },
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
    strategy: "jwt",
    maxAge: APP_CONFIG.auth.sessionMaxAge,
    updateAge: 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};