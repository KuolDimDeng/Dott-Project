'use client';

import { useEffect } from 'react';

export default function RuntimeConfigProvider({ children }) {
  useEffect(() => {
    // Load runtime config on mount
    const loadRuntimeConfig = async () => {
      try {
        const response = await fetch('/api/runtime-config');
        if (response.ok) {
          const config = await response.json();
          // Store in window for other components to access
          window.__RUNTIME_CONFIG__ = config;
          
          // If Stripe key is available at runtime but not build time, reload Stripe
          if (config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && 
              !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
            console.log('[RuntimeConfig] Stripe key loaded from runtime config');
            // Trigger a custom event that components can listen to
            window.dispatchEvent(new CustomEvent('runtime-config-loaded', { detail: config }));
          }
        }
      } catch (error) {
        console.error('[RuntimeConfig] Failed to load runtime config:', error);
      }
    };
    
    loadRuntimeConfig();
  }, []);
  
  return children;
}