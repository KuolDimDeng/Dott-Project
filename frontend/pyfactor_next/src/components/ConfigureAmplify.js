'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Amplify } from 'aws-amplify';
import { amplifyConfig, configureAmplify } from '@/config/amplifyUnified';

/**
 * Component to ensure Amplify is configured before any authentication operations
 * This should be included at the top level of your application
 */
export default function ConfigureAmplify() {
  useEffect(() => {
    logger.debug('[ConfigureAmplify] Ensuring Amplify is configured');
    
    try {
      // Ensure Amplify is configured
      Amplify.configure(amplifyConfig, { ssr: true });
      logger.debug('[ConfigureAmplify] Amplify configured successfully');
    } catch (error) {
      logger.error('[ConfigureAmplify] Error configuring Amplify:', error);
    }
    
    return () => {
      logger.debug('[ConfigureAmplify] Component unmounted');
    };
  }, []);

  // This component doesn't render anything
  return null;
}