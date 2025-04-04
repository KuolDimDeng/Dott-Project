'use client';

import { Amplify } from 'aws-amplify';
import { configureAmplify } from '@/config/amplifyUnified';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

// Get values from environment variables with fallbacks
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

export function Providers({ children }) {
  const [configStatus, setConfigStatus] = useState({ initialized: false, error: null });

  useEffect(() => {
    try {
      // Configure Amplify with AWS credentials - only once
      if (!configStatus.initialized) {
        // Create the configuration object
        const amplifyConfig = {
          Auth: {
            Cognito: {
              userPoolId: COGNITO_USER_POOL_ID,
              userPoolClientId: COGNITO_CLIENT_ID,
              region: AWS_REGION,
              loginWith: {
                email: true,
                username: true,
                phone: false
              }
            }
          }
        };
        
        // Log full config for debugging (excluding sensitive data)
        logger.debug('[Providers] Initializing Amplify with config:', {
          userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
          userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
          region: amplifyConfig.Auth.Cognito.region,
          loginWith: amplifyConfig.Auth.Cognito.loginWith
        });

        // Always configure even if it was done elsewhere to ensure it's properly set
        Amplify.configure(amplifyConfig);
        
        // Also call the configureAmplify function
        configureAmplify();
        
        logger.info('[Providers] Amplify configured successfully');
        setConfigStatus({ initialized: true, error: null });
      }
    } catch (error) {
      logger.error('[Providers] Error configuring Amplify:', error instanceof Error ? { 
        name: error.name,
        message: error.message, 
        stack: error.stack?.substring(0, 500) 
      } : error);
      
      setConfigStatus({ initialized: false, error: error });
    }
  }, [configStatus.initialized]);

  // Display error in development for easier debugging
  if (configStatus.error && process.env.NODE_ENV === 'development') {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f8d7da', 
        color: '#721c24',
        borderRadius: '5px',
        margin: '20px'
      }}>
        <h2>Amplify Configuration Error</h2>
        <p>{configStatus.error instanceof Error ? configStatus.error.message : 'Unknown error'}</p>
        <p>Please check the console for more details.</p>
      </div>
    );
  }

  return children;
} 