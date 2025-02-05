'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';

export default function AdminRoute({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // If we're not loading and there's no session, redirect to sign in
        if (status === 'unauthenticated') {
          logger.debug('No session found, redirecting to sign in');
          router.push('/auth/signin');
          return;
        }

        // If we have a session, check admin role
        if (status === 'authenticated') {
          const isAdmin = session?.user?.['custom:role'] === 'admin';
          if (!isAdmin) {
            logger.debug('User is not admin, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }

          // Check onboarding status
          if (session?.user?.['custom:onboarding'] !== 'completed') {
            logger.debug('Onboarding not completed, redirecting to onboarding');
            router.push('/onboarding');
            return;
          }
        }
      } catch (error) {
        logger.error('Admin access check failed:', error);
      }
    };

    checkAdminAccess();
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

  // If we have a valid session and user is admin, render the children
  if (status === 'authenticated' && 
      session?.user?.['custom:role'] === 'admin' &&
      session?.user?.['custom:onboarding'] === 'completed') {
    return children;
  }

  // Don't render anything while redirecting
  return null;
}
