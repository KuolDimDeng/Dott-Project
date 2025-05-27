'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';
import { getCurrentUser  } from '@/config/amplifyUnified';

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
  
  const [componentsMounted, setComponentsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Add initial mount logging
  useEffect(() => {
    logger.debug('[DynamicComponents] Component mounting...');
  }, []);

  // Check authentication status for Crisp Chat
  useEffect(() => {
    // Skip auth check during build/SSR
    if (typeof window === 'undefined') {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    async function checkAuthStatus() {
      try {
        logger.debug('[DynamicComponents] Checking authentication status for Crisp Chat');
        
        // Check if we're on a public page
        const isPublicPage = () => {
          const path = window.location.pathname;
          const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
          return publicPaths.includes(path) || path.startsWith('/auth/');
        };
        
        // Skip auth check on public pages
        if (isPublicPage()) {
          logger.debug('[DynamicComponents] On public page, skipping auth check');
          setIsAuthenticated(false);
          setAuthChecked(true);
          return;
        }
        
        // Add a timeout to prevent hanging on auth check
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 1000)
        );
        
        // Race between auth check and timeout
        const user = await Promise.race([
          getCurrentUser(),
          timeoutPromise
        ]);
        
        if (user) {
          setIsAuthenticated(true);
          logger.debug('[DynamicComponents] User authenticated for Crisp Chat', { userId: user.userId });
        } else {
          setIsAuthenticated(false);
          logger.debug('[DynamicComponents] User not authenticated for Crisp Chat');
        }
      } catch (error) {
        // User not authenticated or timeout
        setIsAuthenticated(false);
        logger.debug('[DynamicComponents] Authentication check failed or timed out', { error: error.message });
      } finally {
        setAuthChecked(true);
        logger.debug('[DynamicComponents] Auth check completed', { isAuthenticated, authChecked: true });
      }
    }

    // Add a small delay to ensure the page has loaded
    const timer = setTimeout(checkAuthStatus, 100);
    return () => clearTimeout(timer);
  }, []);

  // Only render components after client-side hydration is complete
  useEffect(() => {
    logger.debug('[DynamicComponents] Setting components mounted to true');
    setComponentsMounted(true);
  }, []);

  logger.debug('[DynamicComponents] Rendering components', { isAuthenticated, componentsMounted, authChecked });

  return (
    <>
      {/* Render children immediately to avoid blocking page content */}
      {children}
      
      {/* Only render dynamic components after mount and auth check */}
      {componentsMounted && authChecked && (
        <>
          <CookieBanner />
          {logger.debug('[DynamicComponents] About to render CrispChat with isAuthenticated:', isAuthenticated)}
          <CrispChat isAuthenticated={isAuthenticated} />
        </>
      )}
    </>
  );
}