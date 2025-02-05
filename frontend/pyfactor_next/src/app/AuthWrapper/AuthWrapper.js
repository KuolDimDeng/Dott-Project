///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/AuthWrapper/AuthWrapper.js
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { isPublicRoute } from '@/lib/authUtils';
import { logger } from '@/utils/logger';

export default function AuthWrapper({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (isPublicRoute(pathname)) {
          return;
        }

        if (status === 'unauthenticated') {
          logger.debug('No session found, redirecting to sign in');
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
          return;
        }

        if (status === 'authenticated') {
          logger.debug('Session found:', session);

          // If onboarding is incomplete, redirect to onboarding
          if (!session?.user?.['custom:onboarding'] || session?.user?.['custom:onboarding'] !== 'complete') {
            if (!pathname.startsWith('/onboarding')) {
              logger.debug('Onboarding not completed, redirecting to onboarding');
              router.push('/onboarding/business-info');
            }
            return;
          }

          // If user is already onboarded but on an onboarding page, redirect to dashboard
          if (pathname.startsWith('/onboarding') && session?.user?.['custom:onboarding'] === 'complete') {
            logger.debug('Onboarding already completed, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        logger.error('Auth check failed:', error);
      }
    };

    handleAuth();
  }, [pathname, router, session, status]);

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isPublicRoute(pathname) || status === 'authenticated') {
    return children;
  }

  return null;
}
