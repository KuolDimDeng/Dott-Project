'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';

// Dynamically import components to avoid SSR issues with error handling
const CookieBanner = dynamic(
  () => import('@/components/Cookie/CookieBanner').catch(err => {
    logger.error('[DynamicComponents] Error loading CookieBanner:', err);
    return () => null; // Return empty component on error
  }),
  {
    ssr: false,
    loading: () => null,
  }
);

const CrispChat = dynamic(
  () => import('@/components/CrispChat/CrispChat').catch(err => {
    logger.error('[DynamicComponents] Error loading CrispChat:', err);
    return () => null; // Return empty component on error
  }),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function DynamicComponents({ children }) {
  const [componentsMounted, setComponentsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status for Crisp Chat
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        logger.debug('[DynamicComponents] Checking authentication status for Crisp Chat');
        
        // Check if user is authenticated
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          logger.debug('[DynamicComponents] User authenticated for Crisp Chat');
        } else {
          setIsAuthenticated(false);
          logger.debug('[DynamicComponents] User not authenticated for Crisp Chat');
        }
      } catch (error) {
        // User not authenticated
        setIsAuthenticated(false);
        logger.debug('[DynamicComponents] Authentication check failed, user not authenticated');
      } finally {
        setAuthChecked(true);
      }
    }

    checkAuthStatus();
  }, []);

  // Only render components after client-side hydration is complete
  useEffect(() => {
    setComponentsMounted(true);
  }, []);

  if (!componentsMounted || !authChecked) {
    return null;
  }

  return (
    <>
      <CookieBanner />
      <CrispChat isAuthenticated={isAuthenticated} />
      {children}
    </>
  );
}