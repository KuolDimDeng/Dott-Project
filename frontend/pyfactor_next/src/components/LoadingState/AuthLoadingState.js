'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { Box, CircularProgress, Typography } from '@mui/material';
import { logger } from '@/utils/logger';

export function AuthLoadingState() {
  const router = useRouter();
  const { status, data: session } = useSession();

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    logger.debug('User not authenticated, redirecting to sign in');
    router.push('/auth/signin');
    return null;
  }

  if (status === 'authenticated') {
    const onboardingStatus = session.user['custom:onboarding'];

    if (onboardingStatus !== 'complete') {
      logger.debug('Onboarding incomplete, redirecting to onboarding', {
        status: onboardingStatus,
      });
      router.push(`/onboarding/${onboardingStatus || 'business-info'}`);
      return null;
    }

    logger.debug('User authenticated and onboarding complete');
    router.push('/dashboard');
    return null;
  }

  return null;
}
