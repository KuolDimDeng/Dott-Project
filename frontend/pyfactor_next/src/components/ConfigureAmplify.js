'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Amplify } from 'aws-amplify';
import { configureAmplify } from '@/config/amplifyUnified';

// Get values from environment variables with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

/**
 * Component to ensure Amplify is configured before any authentication operations
 * This should be included at the top level of your application
 */
export default function ConfigureAmplify() {
  useEffect(() => {
    logger.debug('[ConfigureAmplify] Ensuring Amplify is configured', {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_CLIENT_ID,
      region: AWS_REGION
    });
    
    try {
      // Define the configuration object
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
      
      // Ensure Amplify is configured
      Amplify.configure(amplifyConfig, { ssr: true });
      
      // Also call the configureAmplify function from amplifyUnified.js
      configureAmplify();
      
      logger.debug('[ConfigureAmplify] Amplify configured successfully');
    } catch (error) {
      logger.error('[ConfigureAmplify] Error configuring Amplify:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return () => {
      logger.debug('[ConfigureAmplify] Component unmounted');
    };
  }, []);

  // This component doesn't render anything
  return null;
}