'use client';

import { Amplify } from 'aws-amplify';
import { logger } from '@/utils/logger';

// Get values from environment variables with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

// Create Amplify configuration for v6
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION,
      loginWith: {
        username: true,
        email: true,
        phone: false,
      }
    }
  }
};

// Configure Amplify globally - this ensures it happens once at module load time
try {
  logger.debug('[AmplifyConfig] Initializing with config:', {
    region: amplifyConfig.Auth.Cognito.region,
    userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
    userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId
  });
  
  Amplify.configure(amplifyConfig);
  logger.info('[AmplifyConfig] Amplify configured successfully');
} catch (error) {
  logger.error('[AmplifyConfig] Error configuring Amplify:', error);
}

export { amplifyConfig };

// Export a function to explicitly reconfigure if needed
export function reconfigureAmplify() {
  try {
    Amplify.configure(amplifyConfig);
    logger.info('[AmplifyConfig] Amplify reconfigured successfully');
    return true;
  } catch (error) {
    logger.error('[AmplifyConfig] Error reconfiguring Amplify:', error);
    return false;
  }
} 