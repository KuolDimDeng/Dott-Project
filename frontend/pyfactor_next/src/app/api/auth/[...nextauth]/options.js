// src/app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
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
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${APP_CONFIG.api.baseURL}${APP_CONFIG.api.endpoints.auth.refresh}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: token.refreshToken
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const refreshedTokens = await response.json();
    
    if (!refreshedTokens?.access) {
      throw new Error('Invalid refresh token response');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access,
      refreshToken: refreshedTokens.refresh ?? token.refreshToken,
      accessTokenExpires: Date.now() + APP_CONFIG.auth.tokenGracePeriod,
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
          const tokenData = await exchangeGoogleToken(
            account.id_token,
            account.access_token
          );
          
          if (!tokenData?.access || !tokenData?.user_id) {
            throw new Error('Invalid token data received');
          }
          
          // Update user object with token data
          user.accessToken = tokenData.access;
          user.refreshToken = tokenData.refresh;
          user.id = tokenData.user_id;
          user.onboardingStatus = tokenData.onboarding_status;
          user.email = profile.email;
          user.name = profile.name;
          user.image = profile.picture;
          user.accessTokenExpires = Date.now() + APP_CONFIG.auth.tokenGracePeriod;

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
        // Initial sign in
        if (account && user) {
          logger.info('JWT callback - initial sign in', { email: user.email });
          
          return {
            ...token,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            userId: user.id,
            onboardingStatus: user.onboardingStatus,
            email: user.email,
            accessTokenExpires: user.accessTokenExpires,
          };
        }

        // Return existing token if still valid
        if (Date.now() < (token.accessTokenExpires || 0)) {
          return token;
        }

        // Refresh expired token
        logger.info('Token expired, refreshing...');
        return await refreshAccessToken(token);
      } catch (error) {
        logger.error('JWT callback error:', error);
        return { ...token, error: 'TokenError' };
      }
    },

    async session({ session, token }) {
      try {
        session.user = {
          ...session.user,
          id: token.userId,
          onboardingStatus: token.onboardingStatus,
          accessToken: token.accessToken,
          error: token.error,
          email: token.email,
        };

        return session;
      } catch (error) {
        logger.error('Session callback error:', error);
        return { ...session, error: 'SessionError' };
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        // Handle relative URLs
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        // Allow redirects to same origin
        if (url.startsWith(baseUrl)) {
          return url;
        }
        // Default to base URL
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
    updateAge: APP_CONFIG.auth.refreshInterval,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

logger.info("NextAuth configuration loaded.");

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };