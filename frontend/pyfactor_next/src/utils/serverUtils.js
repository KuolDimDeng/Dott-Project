// This file is server-side only - do not import in client components
import { cookies, headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export async function validateServerSession(providedTokens) {
  try {
    let accessToken, idToken;
    let onboardingStep, onboardedStatus, tenantId;
    
    if (providedTokens?.accessToken && providedTokens?.idToken) {
      // Use provided tokens if available
      accessToken = providedTokens.accessToken;
      idToken = providedTokens.idToken;
      logger.debug('[ServerUtils] Using provided tokens');
    } else {
      // Fall back to cookies if no tokens provided
      // Use request() to get headers which includes cookies
      const headersList = await headers();
      const cookieHeader = headersList.get('cookie') || '';
      
      // Parse cookies from the header
      const parseCookies = (cookieHeader) => {
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
          const parts = cookie.split('=');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            cookies[name] = value;
          }
        });
        return cookies;
      };
      
      const parsedCookies = parseCookies(cookieHeader);
      
      // Extract values from cookies
      accessToken = parsedCookies['accessToken'];
      idToken = parsedCookies['idToken'];
      onboardingStep = parsedCookies['onboardingStep'];
      onboardedStatus = parsedCookies['onboardedStatus'];
      tenantId = parsedCookies['tenantId'];
      
      logger.debug('[ServerUtils] Using tokens from cookies', {
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasOnboardingStep: !!onboardingStep,
        hasOnboardedStatus: !!onboardedStatus,
        hasTenantId: !!tenantId,
        cookieCount: Object.keys(parsedCookies).length,
        cookieKeys: Object.keys(parsedCookies),
      });
    }

    if (!accessToken || !idToken) {
      logger.warn('[ServerUtils] No valid session tokens found in cookies or parameters');
      return { verified: false };
    }

    // Verify tokens
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    });

    try {
      const verifiedToken = await verifier.verify(accessToken);
      logger.debug('[ServerUtils] Token verified successfully');
      
      // Extract user information from ID token
      const idTokenDecoded = parseJwt(idToken);
      const userId = idTokenDecoded?.sub;
      const email = idTokenDecoded?.email;
      const attributes = {};
      
      // Extract custom attributes
      if (idTokenDecoded) {
        Object.keys(idTokenDecoded).forEach(key => {
          if (key.startsWith('custom:')) {
            attributes[key] = idTokenDecoded[key];
          }
        });
      }
      
      return {
        verified: true,
        username: verifiedToken.username || verifiedToken.sub,
        sub: verifiedToken.sub,
        userId: userId,
        email: email,
        tokens: {
          accessToken,
          idToken
        },
        user: {
          userId: userId,
          email: email,
          attributes: attributes || {}
        },
        onboardingStep,
        onboardedStatus,
        tenantId
      };
    } catch (verifyError) {
      logger.error('[ServerUtils] Token verification failed:', verifyError);
      return { 
        verified: false, 
        error: verifyError.message 
      };
    }
  } catch (error) {
    logger.error('[ServerUtils] Session validation failed:', error);
    return { 
      verified: false, 
      error: error.message 
    };
  }
}

// Helper function to parse JWT token without validation
function parseJwt(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    logger.error('[ServerUtils] Failed to parse JWT token:', e);
    return null;
  }
}

export async function getServerUserFromToken(token) {
  try {
    if (!token) {
      logger.error('[ServerUtils] No token provided for user extraction');
      return null;
    }
    
    // Parse the token - this is simplified and NOT proper verification
    // For real security, use the verifier from validateServerSession
    function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
        return JSON.parse(jsonPayload);
      } catch (e) {
        logger.error('[ServerUtils] Error parsing JWT:', e);
        return null;
      }
    }
    
    const decodedToken = parseJwt(token);
    if (!decodedToken) {
      return null;
    }
    
    const username = decodedToken.username || decodedToken['cognito:username'] || decodedToken.sub;
    const email = decodedToken.email || null;
    const sub = decodedToken.sub;
    
    // Extract custom attributes if they exist
    const customAttributes = {};
    Object.keys(decodedToken).forEach(key => {
      if (key.startsWith('custom:')) {
        const customKey = key.replace('custom:', '');
        customAttributes[customKey] = decodedToken[key];
      }
    });
    
    return {
      username,
      email,
      sub,
      ...customAttributes,
      _raw: decodedToken
    };
  } catch (error) {
    logger.error('[ServerUtils] Error getting user from token:', error);
    return null;
  }
}