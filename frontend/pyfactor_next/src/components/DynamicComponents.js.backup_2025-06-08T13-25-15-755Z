'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';
import { useUser } from '@auth0/nextjs-auth0';

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
  () => {
    logger.debug('[DynamicComponents] Attempting to load CrispChat component...');
    return import('@/components/CrispChat/CrispChat')
      .then(module => {
        logger.debug('[DynamicComponents] CrispChat component loaded successfully');
        return module;
      })
      .catch(err => {
        logger.error('[DynamicComponents] Error loading CrispChat:', err);
        return () => null; // Return empty component on error
      });
  },
  {
    ssr: false,
    loading: () => {
      logger.debug('[DynamicComponents] CrispChat is loading...');
      return null;
    },
  }
);

export default function DynamicComponents({ children }) {
  console.log('[DynamicComponents] Component created - this should appear in console');
  logger.debug('[DynamicComponents] Component created');
  
  const { user, isLoading } = useUser();
  const [componentsMounted, setComponentsMounted] = useState(false);

  // Add initial mount logging
  useEffect(() => {
    logger.debug('[DynamicComponents] Component mounting...');
  }, []);

  

  // Only render components after client-side hydration is complete
  useEffect(() => {
    logger.debug('[DynamicComponents] Setting components mounted to true');
    setComponentsMounted(true);
  }, []);

  logger.debug('[DynamicComponents] Rendering components', { 
    isAuthenticated: !!user, 
    componentsMounted, 
    isLoading 
  });

  return (
    <>
      {/* Render children immediately to avoid blocking page content */}
      {children}
      
      {/* Only render dynamic components after mount and auth check */}
      {componentsMounted && !isLoading && (
        <>
          <CookieBanner />
          {logger.debug('[DynamicComponents] About to render CrispChat with isAuthenticated:', !!user)}
          <CrispChat isAuthenticated={!!user} user={user} />
        </>
      )}
    </>
  );
}