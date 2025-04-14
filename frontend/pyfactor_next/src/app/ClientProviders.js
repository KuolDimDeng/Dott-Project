'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { reconfigureAmplify } from '@/config/amplifyConfig';
import { mockApiHandler } from '@/utils/mockApiHandler';
import ProvidersWrapper from './ProvidersWrapper';
import '@/utils/sessionDiagnostics';
import { migrateLegacyPreferences } from '@/utils/migrateLegacyPreferences';
import { migrateUIPreferences } from '@/utils/migrateUIPreferences';

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
        
        // Migrate legacy preferences from cookies/localStorage to Cognito attributes
        // This should be done after Amplify is configured
        if (configResult) {
          logger.info('[ClientProviders] Migrating legacy preferences to Cognito attributes');
          
          // First migrate core preferences (onboarding, language, etc.)
          migrateLegacyPreferences()
            .then(success => {
              if (success) {
                logger.info('[ClientProviders] Successfully migrated legacy preferences');
                
                // After core preferences, migrate UI preferences
                migrateUIPreferences()
                  .then(uiSuccess => {
                    if (uiSuccess) {
                      logger.info('[ClientProviders] Successfully migrated UI preferences');
                    } else {
                      logger.warn('[ClientProviders] Failed to migrate UI preferences');
                    }
                  })
                  .catch(error => {
                    logger.error('[ClientProviders] Error migrating UI preferences:', error);
                  });
              } else {
                logger.warn('[ClientProviders] Failed to migrate legacy preferences');
              }
            })
            .catch(error => {
              logger.error('[ClientProviders] Error migrating legacy preferences:', error);
            });
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