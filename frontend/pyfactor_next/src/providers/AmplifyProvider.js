'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { logger } from '@/utils/logger';
import { configureAmplify } from '@/config/amplify';

const AmplifyContext = createContext({
  isInitializing: true,
  isConfigured: false,
  error: null,
  attempts: 0
});

export function AmplifyProvider({ children }) {
  const [state, setState] = useState({
    isInitializing: true,
    isConfigured: false,
    error: null,
    attempts: 0
  });

  const initializeAmplify = async (attempt = 1, maxAttempts = 3) => {
    try {
      logger.debug('[AmplifyProvider] Starting Amplify initialization:', {
        attempt,
        maxAttempts
      });

      await configureAmplify();

      setState(prev => ({
        ...prev,
        isInitializing: false,
        isConfigured: true,
        error: null,
        attempts: attempt
      }));

      // Emit configured event
      Hub.dispatch('auth', {
        event: 'configured'
      });

    } catch (error) {
      logger.error('[AmplifyProvider] Initialization failed:', {
        error: error.message,
        code: error.code,
        attempt,
        stack: error.stack
      });

      // Check if error is related to missing environment variables
      const isMissingEnvVars = error.message.includes('Missing required environment variables');
      
      if (isMissingEnvVars) {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          isConfigured: false,
          error: 'Authentication configuration is incomplete. Please check your environment variables.',
          attempts: attempt
        }));

        // Emit configuration error event
        Hub.dispatch('auth', {
          event: 'configurationError',
          data: error
        });
        return;
      }

      // If under max attempts and not a configuration error, retry with exponential backoff
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.debug(`[AmplifyProvider] Retrying initialization after ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        setTimeout(() => {
          initializeAmplify(attempt + 1, maxAttempts);
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          isConfigured: false,
          error: 'Failed to initialize authentication. Please try again later.',
          attempts: attempt
        }));

        // Emit configuration error event
        Hub.dispatch('auth', {
          event: 'configurationError',
          data: error
        });
      }
    }
  };

  useEffect(() => {
    logger.debug('[AmplifyProvider] Component mounted, starting initialization');
    initializeAmplify();

    return () => {
      logger.debug('[AmplifyProvider] Component unmounting');
    };
  }, []);

  // Log state changes
  useEffect(() => {
    if (state.error) {
      logger.debug('[AmplifyProvider] Rendering error state:', {
        error: state.error,
        attempts: state.attempts
      });
    } else if (state.isInitializing) {
      logger.debug('[AmplifyProvider] Rendering loading state:', {
        isInitializing: state.isInitializing,
        isConfigured: state.isConfigured,
        attempts: state.attempts
      });
    } else {
      logger.debug('[AmplifyProvider] Rendering configured state:', {
        isConfigured: state.isConfigured,
        attempts: state.attempts
      });
    }
  }, [state]);

  if (state.error) {
    return (
      <div className="p-4 rounded-md bg-red-50">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {state.error}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AmplifyContext.Provider value={state}>
      {children}
    </AmplifyContext.Provider>
  );
}

export function useAmplifyContext() {
  const context = useContext(AmplifyContext);
  if (!context) {
    logger.error('[AmplifyProvider] useAmplifyContext called outside of provider');
    throw new Error('useAmplifyContext must be used within an AmplifyProvider');
  }
  return context;
}

export default AmplifyContext;
