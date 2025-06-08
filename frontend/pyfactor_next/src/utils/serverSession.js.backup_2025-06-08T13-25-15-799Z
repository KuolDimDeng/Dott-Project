import { headers } from 'next/headers';
import { logger } from './serverLogger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Get the user session from the server side using Cognito token
 * Handles token verification and extraction of user information
 * 
 * @param {Request} request - The incoming Next.js request object
 * @returns {Promise<Object|null>} The user session object or null if not authenticated
 */
export async function getSession(request) {
  try {
    // Extract the authorization header
    const headersList = request ? request.headers : headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('[ServerSession] No Authorization header found or invalid format');
      return null;
    }

    // Extract the token from the Authorization header
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Setup Cognito JWT verifier
    const cognitoClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 
                           process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 
                       process.env.NEXT_PUBLIC_USER_POOL_ID;

    if (!cognitoClientId || !userPoolId) {
      logger.error('[ServerSession] Missing Cognito configuration');
      return null;
    }

    // Decode the token to extract information without verification
    // This is used for non-critical information retrieval 
    const decodeToken = (token) => {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
      } catch (error) {
        logger.error('[ServerSession] Error decoding token:', error);
        return null;
      }
    };

    // Decode the token to extract information
    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      logger.debug('[ServerSession] Failed to decode token');
      return null;
    }

    // Extract user information from the token
    const userId = decodedToken.sub;
    const email = decodedToken.email;
    
    // Extract tenant ID from token custom attributes
    const tenantId = decodedToken['custom:tenant_ID'] ||
                     decodedToken['custom:tenantId'] ||
                     decodedToken['custom:businessid'] ||
                     decodedToken['custom:tenant_id'] ||
                     null;

    // Extract all custom attributes for convenience
    const attributes = {};
    Object.entries(decodedToken).forEach(([key, value]) => {
      if (key.startsWith('custom:') || 
          ['email', 'email_verified', 'sub', 'cognito:username'].includes(key)) {
        const cleanKey = key.replace('custom:', '');
        attributes[cleanKey] = value;
      }
    });

    // Perform actual token verification for production environments
    if (process.env.NODE_ENV === 'production') {
      try {
        const verifier = CognitoJwtVerifier.create({
          userPoolId: userPoolId,
          tokenUse: 'id',
          clientId: cognitoClientId
        });
        
        await verifier.verify(token);
        logger.debug('[ServerSession] Token verified successfully');
      } catch (verifyError) {
        logger.error('[ServerSession] Token verification failed:', verifyError);
        // In production, we should return null for invalid tokens
        if (process.env.NODE_ENV === 'production') {
          return null;
        }
        // In development, we'll continue with the extracted information
        logger.debug('[ServerSession] Proceeding with unverified token in development');
      }
    }

    // Return user session information
    return {
      user: {
        userId,
        email,
        tenantId,
        attributes
      },
      token
    };
  } catch (error) {
    logger.error('[ServerSession] Error getting session:', error);
    return null;
  }
} 