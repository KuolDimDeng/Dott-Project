'use client';

import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { reconfigureAmplify } from '@/config/amplifyConfig';
import { mockApiHandler } from '@/utils/mockApiHandler';
import ProvidersWrapper from './ProvidersWrapper';

/**
 * Client providers component to initialize client-side functionality
 */
export default function ClientProviders({ children }) {
  // Ensure Amplify is configured on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        logger.debug('[ClientProviders] Ensuring Amplify is configured at app startup');
        reconfigureAmplify();

        // Initialize mock API handler in development
        if (process.env.NODE_ENV === 'development') {
          logger.info('[ClientProviders] Initializing mock API handler');
          mockApiHandler.initialize();
        }
      } catch (error) {
        logger.error('[ClientProviders] Error in client initialization:', error);
      }
    }
  }, []);

  return (
    <ProvidersWrapper>
      {children}
    </ProvidersWrapper>
  );
} 