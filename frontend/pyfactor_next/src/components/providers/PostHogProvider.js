'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHog, identifyUser, resetUser, capturePageView } from '@/lib/posthog';
import { useAuth } from '@/contexts/AuthContext';

export default function PostHogProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [posthog, setPosthog] = useState(null);

  // Initialize PostHog on mount
  useEffect(() => {
    console.log('[PostHogProvider] Component mounted, initializing PostHog...');
    const client = initPostHog();
    if (client) {
      console.log('[PostHogProvider] PostHog client obtained successfully');
      setPosthog(client);
    } else {
      console.error('[PostHogProvider] Failed to initialize PostHog client');
    }
  }, []);

  // Handle user identification
  useEffect(() => {
    console.log('[PostHogProvider] User auth state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.sub || user?.id
    });

    if (!posthog) {
      console.log('[PostHogProvider] Skipping user identification - PostHog not ready');
      return;
    }

    if (isAuthenticated && user) {
      console.log('[PostHogProvider] User authenticated, identifying...');
      identifyUser(user);
    } else {
      console.log('[PostHogProvider] User not authenticated, resetting...');
      resetUser();
    }
  }, [isAuthenticated, user, posthog]);

  // Handle page view tracking
  useEffect(() => {
    console.log('[PostHogProvider] Path changed to:', pathname);

    if (!posthog) {
      console.log('[PostHogProvider] Skipping pageview - PostHog not ready');
      return;
    }

    const pageName = pathname.split('/').filter(Boolean).join(' > ') || 'Home';
    console.log('[PostHogProvider] Tracking pageview for:', pageName);
    
    capturePageView(pageName, {
      path: pathname,
      authenticated: isAuthenticated,
      timestamp: new Date().toISOString()
    });
  }, [pathname, isAuthenticated, posthog]);

  // Check network and debug info
  useEffect(() => {
    if (posthog) {
      console.log('[PostHogProvider] PostHog debug info:', {
        apiHost: posthog.config?.api_host,
        persistence: posthog.config?.persistence,
        distinctId: posthog.get_distinct_id?.(),
        sessionId: posthog.get_session_id?.(),
        isFeatureEnabled: !!posthog.isFeatureEnabled
      });

      // Check if PostHog can reach the server
      if (typeof window !== 'undefined' && window.navigator.onLine === false) {
        console.error('[PostHogProvider] Browser is offline - events will be queued');
      }
    }
  }, [posthog]);

  if (!posthog) {
    console.log('[PostHogProvider] Rendering without PostHog wrapper');
    return <>{children}</>;
  }

  console.log('[PostHogProvider] Rendering with PostHog wrapper');
  return <PHProvider client={posthog}>{children}</PHProvider>;
}