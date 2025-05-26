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
  console.log('[DynamicComponents] Component created - this should appear in console');
  logger.debug('[DynamicComponents] Component created');
  
  const [componentsMounted, setComponentsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Add initial mount logging
  useEffect(() => {
    logger.debug('[DynamicComponents] Component mounting...');
  }, []);

  // Check authentication status for Crisp Chat
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        logger.debug('[DynamicComponents] Checking authentication status for Crisp Chat');
        
        // Check if user is authenticated
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          logger.debug('[DynamicComponents] User authenticated for Crisp Chat', { userId: user.userId });
        } else {
          setIsAuthenticated(false);
          logger.debug('[DynamicComponents] User not authenticated for Crisp Chat');
        }
      } catch (error) {
        // User not authenticated
        setIsAuthenticated(false);
        logger.debug('[DynamicComponents] Authentication check failed, user not authenticated', { error: error.message });
      } finally {
        setAuthChecked(true);
        logger.debug('[DynamicComponents] Auth check completed', { isAuthenticated, authChecked: true });
      }
    }

    checkAuthStatus();
  }, []);

  // Only render components after client-side hydration is complete
  useEffect(() => {
    logger.debug('[DynamicComponents] Setting components mounted to true');
    setComponentsMounted(true);
  }, []);

  if (!componentsMounted || !authChecked) {
    logger.debug('[DynamicComponents] Not ready to render', { componentsMounted, authChecked });
    return null;
  }

  logger.debug('[DynamicComponents] Rendering components', { isAuthenticated, componentsMounted, authChecked });

  return (
    <>
      <CookieBanner />
      <CrispChat isAuthenticated={isAuthenticated} />
      {children}
    </>
  );
}