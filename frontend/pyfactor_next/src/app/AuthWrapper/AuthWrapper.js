'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { isPublicRoute, refreshSession } from '@/lib/authUtils';
import { configureAmplify, isAmplifyConfigured } from '@/config/amplify';
import { logger } from '@/utils/logger';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function AuthWrapper({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Amplify if needed
    const init = async () => {
      try {
        if (!isAmplifyConfigured()) {
          logger.debug('[AuthWrapper] Initializing Amplify');
          configureAmplify();
        }
      } catch (error) {
        logger.error('[AuthWrapper] Failed to initialize Amplify:', error);
      }
    };

    init();
  }, []);

  // Handle authentication
  useEffect(() => {
    let refreshTimer;

    const checkAuth = async () => {
      // Skip auth check for public routes
      if (isPublicRoute(pathname)) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          logger.debug('[AuthWrapper] No authenticated user found');
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
          return;
        }

        logger.debug('[AuthWrapper] User authenticated:', {
          username: user.username,
          path: pathname
        });

        setIsLoading(false);
      } catch (error) {
        logger.error('[AuthWrapper] Auth check failed:', error);
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      }
    };

    // Set up session refresh
    const startRefreshTimer = () => {
      clearInterval(refreshTimer);
      refreshTimer = setInterval(async () => {
        try {
          if (!isPublicRoute(pathname)) {
            logger.debug('[AuthWrapper] Attempting session refresh');
            const refreshed = await refreshSession();
            if (!refreshed) {
              logger.warn('[AuthWrapper] Session refresh failed');
              router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
            }
          }
        } catch (error) {
          logger.error('[AuthWrapper] Session refresh error:', error);
        }
      }, REFRESH_INTERVAL);
    };

    checkAuth();
    startRefreshTimer();

    return () => {
      clearInterval(refreshTimer);
    };
  }, [pathname, router]);

  if (isLoading && !isPublicRoute(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return children;
}
