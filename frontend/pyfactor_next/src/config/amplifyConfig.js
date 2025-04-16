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
      },
      authenticationFlowType: 'USER_SRP_AUTH',
      userPoolWebClientId: COGNITO_CLIENT_ID
    }
  },
  API: {
    REST: {
      headers: async () => ({
        'Content-Type': 'application/json',
      }),
      errorHandler: error => {
        if (error.response && error.response.status === 401) {
          logger.warn('[AmplifyConfig] Auth token expired, trigger refresh');
        }
        return Promise.reject(error);
      },
      endpoints: [],
      customMiddleware: {
        retry: {
          maxRetries: 3,
          retryDelay: attempt => Math.pow(2, attempt) * 1000,
          retryableErrors: ['Network Error', 'TimeoutError', 'AbortError', 'NetworkError']
        }
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

// Setup Amplify error handling and network resilience
export function setupAmplifyResilience() {
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  window.addEventListener('online', () => {
    logger.info('[AmplifyConfig] Network connection restored');
    reconfigureAmplify();
  });
  
  window.addEventListener('offline', () => {
    logger.warn('[AmplifyConfig] Network connection lost');
  });
  
  if (navigator.onLine) {
    logger.debug('[AmplifyConfig] Network is online, configuration should succeed');
  } else {
    logger.warn('[AmplifyConfig] Network is offline, waiting for connection');
    
    const retryInterval = setInterval(() => {
      if (navigator.onLine) {
        reconfigureAmplify();
        retryCount++;
        
        if (retryCount >= MAX_RETRIES) {
          clearInterval(retryInterval);
          logger.debug('[AmplifyConfig] Max reconfiguration attempts reached');
        }
      }
    }, 5000);
  }
} 