'use client';

import { useEffect, useState } from 'react';

// Global flag to track script loading
let scriptLoadingPromise = null;

export function usePlaidScript() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If script is already loaded
    if (window.Plaid) {
      console.log('🏦 [PlaidScriptWrapper] Plaid already available');
      setLoaded(true);
      return;
    }

    // If script is currently loading, wait for it
    if (scriptLoadingPromise) {
      console.log('🏦 [PlaidScriptWrapper] Script already loading, waiting...');
      scriptLoadingPromise
        .then(() => {
          setLoaded(true);
        })
        .catch((err) => {
          setError(err.message);
        });
      return;
    }

    // Start loading the script
    console.log('🏦 [PlaidScriptWrapper] Starting script load');
    
    scriptLoadingPromise = new Promise((resolve, reject) => {
      // First, check if there's an existing script
      const existingScript = document.querySelector('script[src*="plaid.com"]');
      if (existingScript) {
        console.log('🏦 [PlaidScriptWrapper] Removing existing script');
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      
      let checkAttempts = 0;
      const maxAttempts = 100; // 10 seconds
      
      const checkPlaid = () => {
        checkAttempts++;
        
        if (window.Plaid && typeof window.Plaid.create === 'function') {
          console.log(`🏦 [PlaidScriptWrapper] Plaid ready after ${checkAttempts} attempts`);
          resolve();
          return;
        }
        
        if (checkAttempts >= maxAttempts) {
          reject(new Error('Plaid failed to initialize after 10 seconds'));
          return;
        }
        
        setTimeout(checkPlaid, 100);
      };

      script.onload = () => {
        console.log('🏦 [PlaidScriptWrapper] Script onload fired');
        // Start checking for window.Plaid
        checkPlaid();
      };

      script.onerror = () => {
        console.error('🏦 [PlaidScriptWrapper] Script failed to load');
        reject(new Error('Failed to load Plaid script'));
      };

      // Try appending to body instead of head
      document.body.appendChild(script);
      console.log('🏦 [PlaidScriptWrapper] Script appended to body');
      
      // Log current state
      console.log('🏦 [PlaidScriptWrapper] Script element:', {
        src: script.src,
        async: script.async,
        defer: script.defer,
        parentNode: script.parentNode?.tagName
      });
    });

    scriptLoadingPromise
      .then(() => {
        console.log('🏦 [PlaidScriptWrapper] Script loaded successfully');
        setLoaded(true);
      })
      .catch((err) => {
        console.error('🏦 [PlaidScriptWrapper] Script loading error:', err);
        setError(err.message);
        scriptLoadingPromise = null; // Reset so it can be retried
      });
  }, []);

  return { loaded, error };
}

export default function PlaidScriptWrapper({ children }) {
  const { loaded, error } = usePlaidScript();

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <p className="font-medium">Failed to load Plaid</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading banking connection...</p>
      </div>
    );
  }

  return children;
}