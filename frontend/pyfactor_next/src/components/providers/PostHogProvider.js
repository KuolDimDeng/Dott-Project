'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHog, identifyUser, resetUser, capturePageView } from '@/lib/posthog';
import { useSession } from '@/hooks/useSession-v2';
import { getPageName, trackEvent, EVENTS } from '@/utils/posthogTracking';

export default function PostHogProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: sessionLoading } = useSession();
  const [posthog, setPosthog] = useState(null);
  
  // Extract user and auth status from session
  const user = session?.user;
  const isAuthenticated = session?.authenticated;

  // Initialize PostHog on mount
  useEffect(() => {
    console.log('[PostHogProvider] Component mounted, initializing PostHog...');
    const initializePostHog = async () => {
      const client = await initPostHog();
      if (client) {
        console.log('[PostHogProvider] PostHog client obtained successfully');
        setPosthog(client);
      } else {
        console.error('[PostHogProvider] Failed to initialize PostHog client');
      }
    };
    initializePostHog();
  }, []);

  // Handle user identification
  useEffect(() => {
    console.log('[PostHogProvider] User auth state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.sub || user?.id || user?.email,
      userEmail: user?.email,
      userName: user?.name
    });

    if (!posthog) {
      console.log('[PostHogProvider] Skipping user identification - PostHog not ready');
      return;
    }

    if (isAuthenticated && user && user.email) {
      console.log('[PostHogProvider] User authenticated, identifying with complete data...');
      
      // Create a timeout to ensure this runs after any other identification calls
      setTimeout(() => {
        identifyUser(user);
      }, 100);
    } else if (!isAuthenticated) {
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

    const pageName = getPageName(pathname);
    console.log('[PostHogProvider] Tracking pageview for:', pageName);
    
    capturePageView(pageName, {
      path: pathname,
      pageName: pageName,
      authenticated: isAuthenticated,
      userEmail: user?.email,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });
  }, [pathname, isAuthenticated, posthog, user]);

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