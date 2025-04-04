'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { reconfigureAmplify } from '@/config/amplifyConfig';
import { mockApiHandler } from '@/utils/mockApiHandler';
import ProvidersWrapper from './ProvidersWrapper';
import '@/utils/sessionDiagnostics';

/**
 * Client providers component to initialize client-side functionality
 */
export default function ClientProviders({ children }) {
  const [amplifyConfigured, setAmplifyConfigured] = useState(false);

  // Ensure Amplify is configured on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear any stuck refresh flags from previous sessions
        if (window.__tokenRefreshInProgress) {
          logger.warn('[ClientProviders] Found stale token refresh in progress flag, clearing it');
          window.__tokenRefreshInProgress = false;
        }
        
        if (window.__tokenRefreshCooldown) {
          logger.warn('[ClientProviders] Found stale token refresh cooldown, clearing it');
          window.__tokenRefreshCooldown = null;
        }
        
        logger.debug('[ClientProviders] Ensuring Amplify is configured at app startup');
        const configResult = reconfigureAmplify();
        setAmplifyConfigured(true);
        
        // Setup retry mechanism if initial configuration fails
        if (!configResult) {
          logger.warn('[ClientProviders] Initial Amplify configuration failed, will retry');
          const retryTimeout = setTimeout(() => {
            logger.info('[ClientProviders] Retrying Amplify configuration');
            const retryResult = reconfigureAmplify();
            setAmplifyConfigured(retryResult);
          }, 2000);
          
          return () => clearTimeout(retryTimeout);
        }

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