'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
// These providers are now handled in providers.js
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import { setupRenderDebugging } from '@/utils/debugReactRendering';
import dynamic from 'next/dynamic';
import ConfigureAmplify from '@/components/ConfigureAmplify';

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [debugInitialized, setDebugInitialized] = useState(false);

  // Initialize debugging tools
  useEffect(() => {
    if (typeof window !== 'undefined' && !debugInitialized) {
      try {
        logger.debug('[ClientLayout] Setting up React render debugging');
        
        // Setup render debugging
        setupRenderDebugging();
        
        // Add global error handler for "render is not a function" errors
        const originalError = console.error;
        console.error = (...args) => {
          const errorString = args.join(' ');
          if (errorString.includes('render is not a function')) {
            logger.error('[ClientLayout] Caught "render is not a function" error:', {
              args,
              stack: new Error().stack,
              pathname
            });
            
            // Add to window for debugging
            window.__LAST_RENDER_ERROR = {
              message: errorString,
              stack: new Error().stack,
              timestamp: new Date().toISOString(),
              pathname
            };
            
            // Try to identify the component causing the error
            try {
              const stackLines = new Error().stack.split('\n');
              const componentLine = stackLines.find(line =>
                line.includes('/components/') ||
                line.includes('/app/') ||
                line.includes('createElement')
              );
              
              if (componentLine) {
                logger.error('[ClientLayout] Potential component causing error:', componentLine);
                window.__LAST_RENDER_ERROR.componentLine = componentLine;
              }
            } catch (e) {
              logger.error('[ClientLayout] Error analyzing stack:', e);
            }
          }
          
          // Call original error handler
          originalError.apply(console, args);
        };
        
        setDebugInitialized(true);
        logger.debug('[ClientLayout] Debug initialization complete');
      } catch (error) {
        logger.error('[ClientLayout] Error initializing debug tools:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }, [debugInitialized, pathname]);

  useEffect(() => {
    logger.debug('[ClientLayout] Component mounted, starting session check');
    
    // Add global access to router for debugging
    if (typeof window !== 'undefined') {
      window.__NEXT_ROUTER = router;
      window.__CURRENT_PATHNAME = pathname;
    }
  }, [router, pathname]);

  useEffect(() => {
    const verifySession = async (attempt = 1, maxAttempts = 3) => {
      logger.debug('[ClientLayout] Verifying session:', {
        attempt,
        maxAttempts,
        pathname
      });

      // CRITICAL: Skip all checks for verify-email routes
      if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
        logger.debug(`[ClientLayout] BYPASSING ALL CHECKS for verify-email route: ${pathname}`);
        return;
      }

      // Skip session check for public routes
      if (isPublicRoute(pathname)) {
        logger.debug(`[ClientLayout] Skipping session check for public route: ${pathname}`);
        return;
      }
      
      // Double-check for root path
      if (pathname === '/' || pathname === '') {
        logger.debug(`[ClientLayout] Root path detected, skipping session check`);
        return;
      }
      
      logger.debug(`[ClientLayout] Route ${pathname} is not public, checking session`);

      try {
        // Check if we have a session
        const response = await fetch('/api/session');
        if (!response.ok) {
          logger.debug(`[ClientLayout] Session check failed: ${response.status}`);
          if (attempt < maxAttempts) {
            setTimeout(() => verifySession(attempt + 1, maxAttempts), 1000);
            return;
          }
          
          // CRITICAL: Never redirect from verify-email routes
          if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
            logger.debug(`[ClientLayout] NEVER redirecting from verify-email route: ${pathname}`);
            return;
          }
          
          // Never redirect from root path
          if (pathname === '/' || pathname === '') {
            logger.debug(`[ClientLayout] Not redirecting from root path`);
            return;
          }
          
          if (!isPublicRoute(pathname)) {
            logger.debug(`[ClientLayout] Redirecting to sign-in page from ${pathname}`);
            router.push('/auth/signin');
          } else {
            logger.debug(`[ClientLayout] Not redirecting from ${pathname} because it's a public route`);
          }
          return;
        }
        
        logger.debug('[ClientLayout] Session check successful');
      } catch (error) {
        logger.error('[ClientLayout] Error verifying session:', error);
        if (attempt < maxAttempts) {
          setTimeout(() => verifySession(attempt + 1, maxAttempts), 1000);
        }
      }

      // Render content
      logger.debug('[ClientLayout] Rendering providers and content');
    };

    verifySession();
  }, [pathname, router]);

  // Enhanced error boundary with detailed logging
  const handleError = (error, errorInfo) => {
    logger.error('[ClientLayout] Error caught by error boundary:', {
      error,
      componentStack: errorInfo.componentStack,
      pathname
    });
    
    // Add to window for debugging
    if (typeof window !== 'undefined') {
      window.__LAST_ERROR_BOUNDARY_ERROR = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        pathname
      };
    }
  };

  return (
    <AuthErrorBoundary onError={handleError}>
      <ConfigureAmplify />
      <LoadingFallback>
        {children}
        {/* React Error Debugger disabled */}
      </LoadingFallback>
    </AuthErrorBoundary>
  );
}
