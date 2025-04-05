'use client';

// Common imports for auth-related providers
import { Amplify } from 'aws-amplify';
import { configureAmplify } from '@/config/amplifyUnified';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

// Function to clear all development flags on startup
const clearDevFlags = () => {
  // Keep this function but empty it out as we don't want any development flags
  // We'll still call it to ensure any existing dev flags are cleared
  if (typeof window !== 'undefined') {
    // Clear localStorage items
    const devKeys = [
      'dev-user-name', 'dev-authenticated', 'dev-mode', 'bypassAuthValidation',
      'dev-tenant-id', 'dev-tenant-name', 'dev-business-type', 'dev-subscription-plan',
      'dev-initials', 'authSuccess', 'authUser', 'authTimestamp'
    ];
    
    devKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Clear cookies
    const devCookies = [
      'businessName', 'businessType', 'authUser', 'bypassAuthValidation',
      'dev-tenant-id', 'tenantId', 'dev-mode', 'hasSession'
    ];
    
    devCookies.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  }
};

// Call clearDevFlags immediately when this module loads in client side
if (typeof window !== 'undefined') {
  clearDevFlags();
}

/**
 * Helper to configure Amplify for authentication
 */
export function useConfigureAmplify() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isConfigured) return;
    
    try {
      logger.debug('[useConfigureAmplify] Configuring Amplify');
      const configResult = configureAmplify();
      logger.debug('[useConfigureAmplify] Amplify configured successfully');
      setIsConfigured(true);
    } catch (e) {
      logger.error('[useConfigureAmplify] Error configuring Amplify:', e);
      setError(e);
    }
  }, [isConfigured]);

  return { isConfigured, error };
}

/**
 * Simple provider wrapper that configures Amplify
 */
export function SimpleProviderWrapper({ children }) {
  const { isConfigured, error } = useConfigureAmplify();
  
  // Remove development error display
  
  return (
    <>
      {children}
    </>
  );
} 