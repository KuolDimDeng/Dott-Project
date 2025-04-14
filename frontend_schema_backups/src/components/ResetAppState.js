'use client'

import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { clearCache } from '@/utils/appCache';

/**
 * ResetAppState - A component that provides a button to reset all application state
 * Only shown in development mode and only when explicitly included
 */
export default function ResetAppState({ children, buttonText = "Reset Application State", redirectUrl }) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState(null);
  
  // Always keep the component minimal - never show prominently
  const isProminent = false;

  const resetAllState = async () => {
    try {
      setIsResetting(true);
      logger.info('[ResetAppState] Starting application state reset');

      // Clear AppCache instead of localStorage
      logger.debug('[ResetAppState] Clearing AppCache');
      try {
        clearCache();
        logger.debug('[ResetAppState] AppCache cleared successfully');
      } catch (err) {
        logger.warn('[ResetAppState] Failed to clear AppCache:', err);
      }

      // Clear sessionStorage
      logger.debug('[ResetAppState] Clearing sessionStorage');
      const sessionStorageKeysToRemove = [
        'signinRedirectTime',
        'lastRedirectPath',
        'loopDetected',
        'preventAuthRedirect',
      ];

      sessionStorageKeysToRemove.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (err) {
          logger.warn(`[ResetAppState] Failed to remove sessionStorage key ${key}:`, err);
        }
      });

      // For safety, try to clear everything
      try {
        sessionStorage.clear();
      } catch (err) {
        logger.warn('[ResetAppState] Failed to clear all sessionStorage:', err);
      }

      // Clear cookies
      logger.debug('[ResetAppState] Clearing cookies');
      const cookiesToReset = [
        'onboardedStatus',
        'onboardingStep',
        'authToken',
        'idToken',
        'hasSession',
        'refreshToken',
        'redirect_counter',
        'circuitBreakerActive',
        'pendingBusinessInfo',
        'businessName',
        'businessType',
        'selectedPlan'
      ];

      cookiesToReset.forEach(cookieName => {
        try {
          document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax`;
        } catch (err) {
          logger.warn(`[ResetAppState] Failed to reset cookie ${cookieName}:`, err);
        }
      });

      // Reset global window flags
      if (typeof window !== 'undefined') {
        logger.debug('[ResetAppState] Resetting global window flags');
        window.__REDIRECT_LOOP_DETECTED = false;
        window.__HARD_CIRCUIT_BREAKER = false;
        window.__LAST_REDIRECT_ERROR = null;
      }

      // Wait a bit to ensure storage operations complete
      await new Promise(resolve => setTimeout(resolve, 500));

      setResetComplete(true);
      logger.info('[ResetAppState] Application state reset complete');

      // Redirect with noloop parameter if URL provided
      if (redirectUrl) {
        logger.debug(`[ResetAppState] Redirecting to: ${redirectUrl}`);
        
        const url = new URL(redirectUrl, window.location.origin);
        // Always ensure we have a circuit breaker parameter
        if (!url.searchParams.has('noloop')) {
          url.searchParams.set('noloop', 'true');
        }
        
        // After a short delay (to give user feedback), redirect
        setTimeout(() => {
          window.location.href = url.toString();
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during reset');
      logger.error('[ResetAppState] Error during reset:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // If no children, don't render anything in production
  if (!children && process.env.NODE_ENV !== 'development') return null;

  return (
    <div className={`flex flex-col items-center ${isProminent ? 'fixed bottom-4 right-4 z-50' : ''}`}>
      {children}
      
      <div className="p-4 border border-gray-200 rounded-md w-full max-w-md">
        <h3 className="text-lg font-medium mb-2">Application State</h3>
        <p className="text-sm text-gray-600 mb-4">
          Use this tool to reset the application state if needed.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {resetComplete ? (
          <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
            Reset successful! {redirectUrl ? 'Redirecting...' : 'Please refresh the page.'}
          </div>
        ) : (
          <button
            onClick={resetAllState}
            disabled={isResetting}
            className={`w-full py-2 px-4 rounded-md text-white ${
              isResetting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isResetting ? 'Resetting...' : buttonText}
          </button>
        )}
      </div>
    </div>
  );
} 