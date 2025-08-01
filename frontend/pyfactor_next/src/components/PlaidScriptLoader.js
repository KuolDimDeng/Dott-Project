'use client';

import { useEffect } from 'react';

export const PlaidScriptLoader = () => {
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="plaid.com/link"]');
    if (existingScript) {
      console.log('🏦 [PlaidScriptLoader] Plaid script already loaded');
      return;
    }

    // Create and load Plaid script
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('🏦 [PlaidScriptLoader] Plaid script loaded successfully');
    };
    
    script.onerror = (error) => {
      console.error('🏦 [PlaidScriptLoader] Failed to load Plaid script:', error);
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      // Don't remove the script on cleanup as it might be used by other components
      console.log('🏦 [PlaidScriptLoader] Component unmounting (script remains loaded)');
    };
  }, []);

  return null;
};

export default PlaidScriptLoader;