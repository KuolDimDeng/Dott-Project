///Users/kuoldeng/projectx/frontend/pyfactor_next/src/providers/AmplifyProvider.js
'use client';

import React, { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { createSafeContext, useSafeContext } from '@/utils/ContextFix';

const AmplifyContext = createSafeContext({
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

  // This function is simplified since Amplify is now configured in src/config/amplifyUnified.js
  const initializeAmplify = async (attempt = 1, maxAttempts = 3) => {
    try {
      // Log the current configuration for debugging
      logger.debug('[AmplifyProvider] Amplify is already configured in amplifyUnified.js');
      
      // Just update the state to reflect that Amplify is configured
      setState(prev => ({
        ...prev,
        isInitializing: false,
        isConfigured: true,
        error: null,
        attempts: attempt
      }));

    } catch (error) {
      logger.error('[AmplifyProvider] Error checking Amplify configuration:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });

      setState(prev => ({
        ...prev,
        isInitializing: false,
        isConfigured: false,
        error: 'Failed to initialize authentication. Please try again later.',
        attempts: attempt
      }));
    }
  };

  useEffect(() => {
    logger.debug('[AmplifyProvider] Component mounted, starting initialization');
    
    // Since Amplify is already configured in src/config/amplifyUnified.js, we just need to
    // update the state to reflect that it's configured
    setState(prev => ({
      ...prev,
      isInitializing: false,
      isConfigured: true,
      error: null,
      attempts: 1
    }));

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
  const context = useSafeContext(AmplifyContext);
  if (!context) {
    logger.error('[AmplifyProvider] useAmplifyContext called outside of provider');
    throw new Error('useAmplifyContext must be used within an AmplifyProvider');
  }
  return context;
}

export default AmplifyContext;
