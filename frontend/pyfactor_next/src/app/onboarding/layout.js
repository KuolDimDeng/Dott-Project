'use client';

import React from 'react';
import { Box, Container, CircularProgress } from '@mui/material';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const { status, data: session } = useSession();

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        if (status === 'unauthenticated') {
          logger.debug('User not authenticated, redirecting to sign in');
          router.push('/auth/signin');
          return;
        }

        if (status === 'authenticated') {
          const onboardingStatus = session.user['custom:onboarding'];
          
          // If onboarding is complete, redirect to dashboard
          if (onboardingStatus === 'complete') {
            logger.debug('Onboarding complete, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }

          logger.debug('Onboarding status:', {
            status: onboardingStatus,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error in onboarding layout:', error);
      }
    };

    checkAuth();
  }, [status, session, router]);

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

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        py: 3,
      }}
    >
      {children}
    </Container>
  );
}
