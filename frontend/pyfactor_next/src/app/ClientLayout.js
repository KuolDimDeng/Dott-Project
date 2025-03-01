'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isPublicRoute } from '@/lib/authUtils';
import { AuthProvider } from '@/contexts/AuthContext';
import { AmplifyProvider } from '@/providers/AmplifyProvider';
import AuthErrorBoundary from '@/components/ErrorBoundary';
import LoadingFallback from '@/components/ClientOnly/LoadingFallback';

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    logger.debug('[ClientLayout] Component mounted, starting session check');
  }, []);

  useEffect(() => {
    const verifySession = async (attempt = 1, maxAttempts = 3) => {
      logger.debug('[ClientLayout] Verifying session:', {
        attempt,
        maxAttempts,
        pathname
      });

      // Skip session check for public routes
      if (isPublicRoute(pathname)) {
        logger.debug(`[ClientLayout] Skipping session check for public route: ${pathname}`);
        return;
      }

      // Render content
      logger.debug('[ClientLayout] Rendering providers and content');
    };

    verifySession();
  }, [pathname, router]);

  return (
    <AuthErrorBoundary>
      <LoadingFallback>
        {children}
      </LoadingFallback>
    </AuthErrorBoundary>
  );
}
