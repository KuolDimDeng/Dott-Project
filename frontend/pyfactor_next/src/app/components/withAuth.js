'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';

export function withAuth(WrappedComponent, options = {}) {
  return function WithAuthComponent(props) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { requireAdmin = false } = options;

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // If we're not loading and there's no session, redirect to sign in
          if (status === 'unauthenticated') {
            logger.debug('No session found, redirecting to sign in');
            router.push('/auth/signin');
            return;
          }

          // If admin access is required, check user role
          if (requireAdmin && status === 'authenticated') {
            const isAdmin = session?.user?.['custom:role'] === 'admin';
            if (!isAdmin) {
              logger.debug('Admin access required but user is not admin');
              router.push('/dashboard');
              return;
            }
          }

          // Check onboarding status
          if (status === 'authenticated' && 
              session?.user?.['custom:onboarding'] !== 'completed') {
            logger.debug('Onboarding not completed, redirecting to onboarding');
            router.push('/onboarding');
            return;
          }
        } catch (error) {
          logger.error('Auth check failed:', error);
        }
      };

      checkAuth();
    }, [router, session, status]);

    // Show loading state while checking auth
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

    // If we have a valid session and all checks pass, render the component
    if (status === 'authenticated') {
      // For admin routes, ensure user is admin
      if (requireAdmin && session?.user?.['custom:role'] !== 'admin') {
        return null;
      }
      // For regular routes, ensure onboarding is complete
      if (session?.user?.['custom:onboarding'] !== 'completed') {
        return null;
      }
      return <WrappedComponent {...props} />;
    }

    // Don't render anything while redirecting
    return null;
  };
}
