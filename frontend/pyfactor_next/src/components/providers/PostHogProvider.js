'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHog, identifyUser, resetUser, capturePageView } from '@/lib/posthog';
import { useAuth } from '@/contexts/AuthContext';

export default function PostHogProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const posthog = initPostHog();

  useEffect(() => {
    if (!posthog) return;

    if (isAuthenticated && user) {
      identifyUser(user);
    } else {
      resetUser();
    }
  }, [isAuthenticated, user, posthog]);

  useEffect(() => {
    if (!posthog) return;

    const pageName = pathname.split('/').filter(Boolean).join(' > ') || 'Home';
    capturePageView(pageName, {
      path: pathname,
      authenticated: isAuthenticated
    });
  }, [pathname, isAuthenticated, posthog]);

  if (!posthog) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}