'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';
import dynamic from 'next/dynamic';

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
  const { user, isLoading, error } = useUser();
  const [isVerifying, setIsVerifying] = useState(true);

  // Check authentication and handle routing
  useEffect(() => {
    if (isLoading) {
      return; // Still loading Auth0 user
    }

    const checkAuth = async () => {
      try {
        logger.debug('[ClientLayout] Checking authentication', {
          pathname,
          user: !!user,
          isPublicRoute: isPublicRoute(pathname)
        });

        // Public routes - allow access
        if (isPublicRoute(pathname)) {
          setIsVerifying(false);
          return;
        }

        // Protected routes - require authentication
        if (!user) {
          logger.info('[ClientLayout] No user found, redirecting to signin');
          router.push('/auth/signin');
          return;
        }

        // User is authenticated
        logger.debug('[ClientLayout] User authenticated', { email: user.email });
        setIsVerifying(false);

      } catch (error) {
        logger.error('[ClientLayout] Error in auth check:', error);
        router.push('/auth/signin');
      }
    };

    checkAuth();
  }, [user, isLoading, pathname, router]);

  // Handle Auth0 errors
  useEffect(() => {
    if (error) {
      logger.error('[ClientLayout] Auth0 error:', error);
      router.push('/auth/signin');
    }
  }, [error, router]);

  // Show loading state while verifying
  if (isLoading || isVerifying) {
    return <LoadingFallback />;
  }

  // Show Auth0 error
  if (error) {
    return (
      <AuthErrorBoundary>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </AuthErrorBoundary>
    );
  }

  return (
    <AuthErrorBoundary>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactErrorDebugger />}
    </AuthErrorBoundary>
  );
}
