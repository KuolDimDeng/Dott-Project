'use client';

import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/config/amplifyUnified';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

export function Providers({ children }) {
  const [configStatus, setConfigStatus] = useState({ initialized: false, error: null });

  useEffect(() => {
    try {
      // Configure Amplify with AWS credentials - only once
      if (!configStatus.initialized) {
        // Log full config for debugging (excluding sensitive data)
        logger.debug('[Providers] Initializing Amplify with config:', {
          userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
          userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
          region: amplifyConfig.Auth.Cognito.region,
          loginWith: amplifyConfig.Auth.Cognito.loginWith,
          oauthProviders: amplifyConfig.oauth?.providers || []
        });

        // Always configure even if it was done elsewhere to ensure it's properly set
        Amplify.configure(amplifyConfig);
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