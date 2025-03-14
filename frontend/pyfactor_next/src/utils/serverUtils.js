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
      
      logger.debug('[ServerUtils] Using tokens from cookies');
    }

    if (!accessToken || !idToken) {
      throw new Error('No valid session tokens');
    }

    // Verify tokens
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    });

    // Verify access token
    const payload = await verifier.verify(accessToken);
    
    // Extract all custom attributes from the token payload
    const customAttributes = {};
    Object.keys(payload).forEach(key => {
      if (key.startsWith('custom:')) {
        customAttributes[key] = payload[key];
      }
    });
    
    // Create user object from token payload and cookies
    const user = {
      userId: payload.sub,
      username: payload.username,
      attributes: {
        ...customAttributes,
        sub: payload.sub,
        email: payload.email,
        'custom:onboarding': payload['custom:onboarding'] || onboardedStatus || 'NOT_STARTED',
        'custom:businessid': payload['custom:businessid'] || tenantId
      }
    };
    
    // Log the user attributes for debugging
    logger.debug('[ServerUtils] User attributes:', {
      fromToken: {
        onboarding: payload['custom:onboarding'],
        businessId: payload['custom:businessid']
      },
      fromCookies: {
        onboardedStatus,
        tenantId
      },
      final: {
        onboarding: user.attributes['custom:onboarding'],
        businessId: user.attributes['custom:businessid']
      }
    });

    const tokens = {
      accessToken: { toString: () => accessToken },
      idToken: { toString: () => idToken }
    };

    logger.debug('[ServerUtils] Session tokens validated');

    return { tokens, user };
  } catch (error) {
    logger.error('[ServerUtils] Session validation failed:', error);
    throw error;
  }
}