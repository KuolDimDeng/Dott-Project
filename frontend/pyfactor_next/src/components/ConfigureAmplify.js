'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Amplify } from 'aws-amplify';

// Constants for Cognito configuration
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

/**
 * Component to ensure Amplify is configured before any authentication operations
 * This should be included at the top level of your application
 */
export default function ConfigureAmplify() {
  useEffect(() => {
    logger.debug('[ConfigureAmplify] Configuring Amplify on client side');
    
    try {
      // Basic configuration for Amplify v6
      const config = {
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
      
      // Configure Amplify on the client side
      Amplify.configure(config);
      logger.info('[ConfigureAmplify] Amplify configured successfully');
    } catch (error) {
      logger.error('[ConfigureAmplify] Error configuring Amplify:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}