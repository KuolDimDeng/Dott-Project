'use client';

import { useEffect } from 'react';

export function PostHogStagingProvider({ children }) {
  useEffect(() => {
    // Disable PostHog in staging if no key provided
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' && 
        !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.log('[PostHog] Disabled in staging environment');
      window.posthog = {
        capture: () => {},
        identify: () => {},
        reset: () => {},
        // Add other PostHog methods as no-ops
      };
    }
  }, []);

  return children;
}
