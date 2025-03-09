// Server-side Amplify utilities
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';

// Constants
const COGNITO_CLIENT_ID = '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = 'us-east-1_JPL8vGfb6';
const AWS_REGION = 'us-east-1';

// Server-side implementation of getCurrentUser
export async function getCurrentUser(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = jwtDecode(token);
    
    return {
      username: decoded['cognito:username'] || decoded.sub,
      userId: decoded.sub,
      email: decoded.email,
    };
  } catch (error) {
    logger.error('[amplifyServer] Error in getCurrentUser:', error);
    throw error;
  }
}

// Server-side implementation of fetchAuthSession
export async function fetchAuthSession(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Return a simplified session object with the token
    return {
      tokens: {
        idToken: token,
        accessToken: token
      }
    };
  } catch (error) {
    logger.error('[amplifyServer] Error in fetchAuthSession:', error);
    throw error;
  }
}

// Helper function to validate a token
export function validateToken(token) {
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    
    // In development mode, be more lenient with token expiration
    if (process.env.NODE_ENV !== 'production') {
      // Still validate basic token structure
      if (!decoded || !decoded.sub) {
        logger.warn('[amplifyServer] Token missing required fields in development mode');
        return { valid: false, reason: 'Token missing required fields', decoded };
      }
      
      // Log expiration but don't fail validation in development
      if (decoded.exp && decoded.exp < now) {
        logger.warn('[amplifyServer] Token expired in development mode:', {
          exp: decoded.exp,
          now,
          diff: (decoded.exp - now) / 60, // minutes
        });
        // Return valid anyway in development
        return { valid: true, decoded, warning: 'Token expired but accepted in development mode' };
      }
      
      return { valid: true, decoded };
    }
    
    // In production, strictly validate token expiration
    if (!decoded.exp || decoded.exp < now) {
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true, decoded };
  } catch (error) {
    logger.error('[amplifyServer] Token validation failed:', error);
    return { valid: false, reason: 'Invalid token format' };
  }
}

// Export the Amplify configuration for reference
export const amplifyServerConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION,
    }
  }
};

// Export the Amplify configuration for use in other files
export function getAmplifyConfig() {
  return amplifyServerConfig;
}

// Server-side implementation of updateOnboardingStep
export async function updateOnboardingStep(step, attributes = {}, tokens = {}) {
  try {
    const { accessToken } = tokens;
    
    if (!accessToken) {
      throw new Error('No valid access token provided');
    }
    
    // Format attributes for Cognito
    const formattedAttributes = {
      'custom:onboarding': String(step),
      'custom:updated_at': new Date().toISOString(),
      ...Object.entries(attributes).reduce((acc, [key, value]) => ({
        ...acc,
        [key.startsWith('custom:') ? key : `custom:${key}`]: String(value)
      }), {})
    };
    
    logger.debug('[amplifyServer] Updating step:', {
      step,
      attributes: Object.keys(formattedAttributes)
    });
    
    // Make direct request to Cognito API
    const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        AccessToken: accessToken,
        UserAttributes: Object.entries(formattedAttributes).map(([key, value]) => ({
          Name: key,
          Value: value
        }))
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to update attributes: ${response.status} - ${error.message || 'Unknown error'}`);
    }
    
    logger.debug('[amplifyServer] Step updated successfully');
    return true;
  } catch (error) {
    logger.error('[amplifyServer] Failed to update step:', {
      error: error.message,
      step
    });
    throw error;
  }
}

// Server-side implementation of updateCookies
export function updateCookies(response, onboardingStep, onboardedStatus) {
  if (!response || !response.cookies) {
    logger.error('[amplifyServer] Invalid response object for cookie update');
    return response;
  }
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  };
  
  if (onboardingStep) {
    // Store onboardingStep in lowercase for middleware comparison
    const normalizedStep = typeof onboardingStep === 'string'
      ? onboardingStep.toLowerCase().replace('-', '_')
      : onboardingStep;
    response.cookies.set('onboardingStep', normalizedStep, cookieOptions);
    logger.debug('[amplifyServer] Set onboardingStep cookie:', {
      original: onboardingStep,
      normalized: normalizedStep
    });
  }
  
  if (onboardedStatus) {
    // Store onboardedStatus in uppercase with underscores (to match Cognito format)
    const normalizedStatus = typeof onboardedStatus === 'string'
      ? onboardedStatus.toUpperCase().replace(/-/g, '_')
      : onboardedStatus;
    response.cookies.set('onboardedStatus', normalizedStatus, cookieOptions);
    logger.debug('[amplifyServer] Set onboardedStatus cookie:', {
      original: onboardedStatus,
      normalized: normalizedStatus
    });
  }
  
  return response;
}