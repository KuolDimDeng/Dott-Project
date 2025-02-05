import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

/**
 * Configures AWS Amplify with Cognito settings
 */
export function configureAmplify() {
  if (!process.env.NEXT_PUBLIC_AWS_USER_POOL_ID || !process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID) {
    console.error('[Amplify] ERROR: Missing AWS Cognito environment variables!');
    return;
  }

  logger.debug('[Amplify] Configuring AWS Amplify...');

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
          phone: false,
          username: false,
        },
        oauth: {
          domain: process.env.NEXT_PUBLIC_AWS_COGNITO_DOMAIN || 'us-east-1jpl8vgfb6.auth.us-east-1.amazoncognito.com',
          scope: ['email', 'openid', 'profile'],
          redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGNIN || 'http://localhost:3000/auth/callback',
          redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGNOUT || 'http://localhost:3000',
          responseType: 'code',
        },
      },
    },
  });

  logger.debug('[Amplify] AWS Amplify configured successfully.');
}

/**
 * Manages token storage in localStorage
 */
cognitoUserPoolsTokenProvider.setKeyValueStorage({
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.error('[Amplify] Error setting token:', error);
    }
  },
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.error('[Amplify] Error getting token:', error);
      return null;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('[Amplify] Error removing token:', error);
    }
  },
});

/**
 * Fetches latest authentication session & refreshes tokens
 */
export async function refreshTokens() {
  try {
    logger.debug('[Amplify] Fetching latest authentication session...');
    const session = await fetchAuthSession({ forceRefresh: true });
    logger.debug('[Amplify] Tokens refreshed successfully:', session.tokens);
    return session.tokens;
  } catch (error) {
    logger.error('[Amplify] Token refresh failed:', error);
    return null;
  }
}

/**
 * Converts Cognito error codes into user-friendly messages
 */
export function getCognitoErrorMessage(error) {
  const errorMap = {
    UserNotFoundException: 'User not found.',
    NotAuthorizedException: 'Incorrect username or password.',
    UserNotConfirmedException: 'Please verify your email address.',
    CodeMismatchException: 'Invalid verification code.',
    ExpiredCodeException: 'Verification code has expired.',
    LimitExceededException: 'Too many attempts. Please try again later.',
    UsernameExistsException: 'An account with this email already exists.',
    InvalidPasswordException: 'Password does not meet requirements.',
    InvalidParameterException: 'Invalid input. Please check your entries.',
    CodeDeliveryFailureException: 'Failed to send verification code.',
  };

  return error.code && errorMap[error.code] ? errorMap[error.code] : error.message || 'An unexpected error occurred.';
}

/**
 * Updates user attributes in AWS Cognito
 * @param {Object} attributes - The user attributes to update
 */
export async function updateUserAttributes(attributes) {
  const { updateUserAttributes } = await import('aws-amplify/auth');
  return updateUserAttributes({ userAttributes: attributes });
}

// ✅ Ensure Amplify is configured when the file is imported
configureAmplify();
