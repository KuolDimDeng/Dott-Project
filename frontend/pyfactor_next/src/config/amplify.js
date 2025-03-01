import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import { logger } from '@/utils/logger';
import { env } from './env';

let isConfigured = false;

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      region: env.NEXT_PUBLIC_AWS_REGION,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false
      }
    }
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: env.NEXT_PUBLIC_API_URL,
        region: env.NEXT_PUBLIC_AWS_REGION
      }
    ]
  }
};

export async function configureAmplify() {
  try {
    logger.debug('[Amplify] Starting configuration');

    if (isConfigured) {
      logger.debug('[Amplify] Already configured, skipping');
      return;
    }

    // Log configuration (excluding sensitive data)
    logger.debug('[Amplify] Configuration:', {
      region: env.NEXT_PUBLIC_AWS_REGION,
      userPoolId: env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      loginWith: amplifyConfig.Auth.Cognito.loginWith
    });

    // Configure Amplify
    Amplify.configure(amplifyConfig);

    isConfigured = true;
    logger.debug('[Amplify] Configuration verified successfully');

  } catch (error) {
    logger.error('[Amplify] Configuration failed:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Helper function to check if Amplify is configured
export function isAmplifyConfigured() {
  return isConfigured;
}

// Export config for server-side usage
export function getAmplifyConfig() {
  return amplifyConfig;
}