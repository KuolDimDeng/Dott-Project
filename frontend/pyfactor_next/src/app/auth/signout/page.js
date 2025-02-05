'use client';

import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

export default function SignOut() {
  const { signOut } = useAuth();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut();
        logger.debug('Sign out successful');
      } catch (error) {
        logger.error('Sign out failed:', error);
        // Even if sign out fails, we'll still redirect to sign in page
        // as the error will be shown via toast notification
      }
    };

    performSignOut();
  }, [signOut]);

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
        Signing out...
      </Typography>
    </Box>
  );
}
