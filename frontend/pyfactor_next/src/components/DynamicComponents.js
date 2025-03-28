'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';

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

export default function DynamicComponents({ isAuthenticated = false }) {
  const [componentsMounted, setComponentsMounted] = useState(false);

  // Only render components after client-side hydration is complete
  useEffect(() => {
    setComponentsMounted(true);
  }, []);

  if (!componentsMounted) {
    return null;
  }

  return (
    <>
      <CookieBanner />
      <CrispChat isAuthenticated={isAuthenticated} />
    </>
  );
}