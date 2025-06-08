'use client';


import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { mockApiHandler } from '@/utils/mockApiHandler';
import ProvidersWrapper from './ProvidersWrapper';
import '@/utils/sessionDiagnostics';

/**
 * Client providers component to initialize client-side functionality
 */
export default function ClientProviders({ children }) {
  const [authConfigured, setAuthConfigured] = useState(false);

  // Initialize client-side functionality for Auth0
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
        
        logger.debug('[ClientProviders] Auth0 client configuration ready');
        setAuthConfigured(true);

        // Initialize mock API handler in development
        if (process.env.NODE_ENV === 'development') {
          logger.info('[ClientProviders] Initializing mock API handler');
          mockApiHandler.initialize();
        }
        
        logger.info('[ClientProviders] Client initialization completed with Auth0');
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