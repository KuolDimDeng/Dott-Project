// /pages/api/auth/[...nextauth].js

import NextAuth from 'next-auth';
import GoogleProvider from "next-auth/providers/google";
import { logger } from '@/utils/logger';
import axiosInstance from '@/lib/axiosConfig';

/**
 * Exchange Google token for our backend token
 */
async function exchangeGoogleToken(googleToken) {
  try {
    logger.info('Exchanging Google token');
    const response = await axiosInstance.post('/api/onboarding/token-exchange/', {
      token: googleToken
    });
    logger.info('Token exchange successful');
    return response.data;
  } catch (error) {
    logger.error('Token exchange failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to exchange token');
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(token) {
  try {
    const response = await axiosInstance.post('/api/token/refresh/', {
      refresh: token.refreshToken
    });

    return {
      ...token,
      accessToken: response.data.access,
      refreshToken: response.data.refresh ?? token.refreshToken,
      accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
    };
  } catch (error) {
    logger.error('Error refreshing access token:', error);
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
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        logger.info('Sign in callback initiated', { 
          provider: account?.provider,
          email: profile?.email 
        });
        
        if (account?.provider === "google" && account?.id_token) {
          const tokenData = await exchangeGoogleToken(account.id_token);
          
          // Store both JWT and raw access token
          user.access_token = tokenData.access;
          user.raw_access_token = tokenData.access; // Store raw token for WebSocket
          user.refresh_token = tokenData.refresh;
          user.id = tokenData.user_id;
          user.onboardingStatus = tokenData.onboarding_status;
          user.email = profile.email;
          user.name = profile.name;
          user.image = profile.picture;
          user.accessTokenExpires = Date.now() + 60 * 60 * 1000;

          logger.info('Google sign-in successful', { 
            userId: tokenData.user_id,
            email: profile.email 
          });
          
          return true;
        }

        return !!user;
      } catch (error) {
        logger.error('Sign in error:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      try {
        if (account && user) {
          logger.info('JWT callback - initial sign in', { 
            email: user.email 
          });
          
          return {
            ...token,
            accessToken: user.access_token,
            rawAccessToken: user.raw_access_token, // Store raw token
            refreshToken: user.refresh_token,
            userId: user.id,
            onboardingStatus: user.onboardingStatus,
            email: user.email,
            accessTokenExpires: user.accessTokenExpires,
          };
        }

        if (Date.now() < token.accessTokenExpires) {
          return token;
        }

        // Refresh token
        const refreshedToken = await refreshAccessToken(token);
        logger.info('Access token refreshed');
        return {
          ...refreshedToken,
          rawAccessToken: refreshedToken.accessToken // Store raw refreshed token
        };

      } catch (error) {
        logger.error('JWT callback error:', error);
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        };
      }
    },

    async session({ session, token }) {
      try {
        logger.info('Session callback', { email: token.email });
        
        session.user = {
          ...session.user,
          id: token.userId,
          onboardingStatus: token.onboardingStatus,
          accessToken: token.rawAccessToken, // Use raw token for WebSocket
          refreshToken: token.refreshToken,
          email: token.email,
          error: token.error,
        };

        session.error = token.error;
        return session;
      } catch (error) {
        logger.error('Session callback error:', error);
        return {
          ...session,
          error: 'SessionError',
        };
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        // Allows relative callback URLs
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        // Allows callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) {
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
      logger.info('User signed in', { 
        email: message.user?.email,
        provider: message.account?.provider 
      });
    },
    async signOut(message) {
      logger.info('User signed out', { 
        email: message.token?.email 
      });
    },
    async createUser(message) {
      logger.info('New user created', { 
        email: message.user?.email 
      });
    },
    async linkAccount(message) {
      logger.info('Account linked', { 
        email: message.user?.email,
        provider: message.account?.provider 
      });
    },
    async session(message) {
      if (message.session?.error) {
        logger.error('Session error:', message.session.error);
      }
    },
    async error(error) {
      logger.error('Auth error:', error);
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    signOut: '/auth/signout',
    verifyRequest: '/auth/verify-request',
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    encryption: true,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  
  logger: {
    error(code, metadata) {
      logger.error(code, metadata);
    },
    warn(code) {
      logger.warn(code);
    },
    debug(code, metadata) {
      logger.debug(code, metadata);
    }
  }
};

logger.info("NextAuth configuration loaded.");

export default NextAuth(authOptions);