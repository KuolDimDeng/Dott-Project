import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { axiosInstance } from './axiosConfig';
import { logger } from './logger';
import { cookies } from 'next/headers';
import { fetchAuthSession } from 'aws-amplify/auth';

// Fix issue with cookies() not being callable directly in some contexts
const getCookieStore = async () => {
  try {
    return cookies();
  } catch (error) {
    logger.warn('[Auth] Error getting cookie store:', error);
    return {
      get: () => null,
      getAll: () => []
    };
  }
};

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 * @type {NextAuthOptions}
 */
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Make a request to your authentication API
          const response = await axiosInstance.post('/api/auth/signin/', {
            email: credentials.email,
            password: credentials.password,
          });

          if (response.data && response.data.user) {
            return {
              id: response.data.user.id,
              email: response.data.user.email,
              name: `${response.data.user.first_name} ${response.data.user.last_name}`,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              tenantId: response.data.tenantId,
            };
          }
          
          return null;
        } catch (error) {
          logger.error('[NextAuth] Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.tenantId = token.tenantId;
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Get tenant ID from a session or JWT token
 * @param {object} session - The session object from getServerSession
 * @returns {string|null} The tenant ID or null
 */
export const getTenantIdFromSession = (session) => {
  if (!session) return null;
  return session.tenantId || null;
};

/**
 * Verify if a user has the required role
 * @param {object} session - The session object from getServerSession
 * @param {string[]} requiredRoles - Array of required roles
 * @returns {boolean} True if the user has one of the required roles
 */
export const hasRole = (session, requiredRoles) => {
  if (!session || !session.user || !session.user.roles) return false;
  return session.user.roles.some(role => requiredRoles.includes(role));
};

/**
 * Gets authentication information from the server context
 * This is used by API routes to get the current user and tokens
 * @returns {Promise<{user: object|null, accessToken: string|null, idToken: string|null}>}
 */
export async function getAuth() {
  try {
    // First try to get auth from cookies using the helper function
    const cookieStore = await getCookieStore();
    let accessToken = cookieStore.get('accessToken')?.value;
    let idToken = cookieStore.get('idToken')?.value;
    let tenantId = cookieStore.get('tenantId')?.value;
    let userId = cookieStore.get('userId')?.value;
    let userEmail = cookieStore.get('userEmail')?.value;
    
    // Log what we found for debugging
    logger.debug('[Auth] getAuth function called', { 
      hasAccessToken: !!accessToken,
      hasIdToken: !!idToken,
      hasTenantId: !!tenantId,
      hasUserId: !!userId
    });
    
    // If we don't have tokens in cookies, try to get from Amplify
    if (!accessToken || !idToken) {
      try {
        logger.debug('[Auth] No tokens in cookies, trying Amplify');
        const { tokens } = await fetchAuthSession();
        
        if (tokens) {
          accessToken = tokens.accessToken?.toString();
          idToken = tokens.idToken?.toString();
          
          logger.info('[Auth] Retrieved tokens from Amplify');
        } else {
          logger.warn('[Auth] No tokens available from Amplify');
        }
      } catch (amplifyError) {
        logger.warn('[Auth] Error fetching Amplify session:', amplifyError);
        // Continue with tokens from cookies (if any)
      }
    }
    
    // If we still don't have tokens, authentication has failed
    if (!accessToken) {
      logger.warn('[Auth] No authentication tokens available');
      return { user: null, accessToken: null, idToken: null };
    }
    
    // If we have tokens but no tenantId, check if we can find default tenant ID
    if (!tenantId) {
      tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff'; // Use fallback tenant ID
      logger.info('[Auth] No tenant ID available, using fallback:', tenantId);
    }
    
    // Ensure we have a userId even if cookies don't have it
    if (!userId && idToken) {
      try {
        // Try to extract sub from idToken
        // This is simplified - in production would use proper JWT validation
        const tokenParts = idToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          if (payload.sub) {
            userId = payload.sub;
            logger.info('[Auth] Extracted user ID from token:', userId);
          }
        }
      } catch (tokenError) {
        logger.warn('[Auth] Error extracting user ID from token:', tokenError);
      }
    }
    
    // Create user object - must include tenantId for RLS
    const user = {
      id: userId || 'anonymous',
      email: userEmail || 'unknown',
      tenantId: tenantId
    };
    
    return {
      user,
      accessToken,
      idToken
    };
  } catch (error) {
    logger.error('[Auth] Error in getAuth:', error);
    
    // Even on error, return a user with fallback tenant ID to allow operations to work
    return { 
      user: {
        id: 'anonymous',
        email: 'unknown',
        tenantId: '18609ed2-1a46-4d50-bc4e-483d6e3405ff'
      }, 
      accessToken: null, 
      idToken: null 
    };
  }
}