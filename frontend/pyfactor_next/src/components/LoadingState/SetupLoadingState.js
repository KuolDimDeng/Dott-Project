'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplify';

export default function SetupLoadingState() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [setupStatus, setSetupStatus] = useState('pending');
  const [error, setError] = useState(null);

  const checkSetupStatus = useCallback(async () => {
    if (!session?.user) return;

    try {
      const status = session.user['custom:setup_status'] || 'pending';
      setSetupStatus(status);

      if (status === 'complete') {
        // Update onboarding status to complete
        await updateUserAttributes({
          'custom:onboarding': 'complete',
          'custom:setup_status': 'complete'
        });
        await update();

        logger.debug('Setup completed successfully');
        router.push('/dashboard');
      } else if (status === 'failed') {
        setError('Setup failed. Please try again.');
      }
    } catch (error) {
      logger.error('Setup status check failed:', error);
      setError('Failed to check setup status');
    }
  }, [session, router, update]);

  useEffect(() => {
    if (status === 'authenticated') {
      const interval = setInterval(checkSetupStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status, checkSetupStatus]);

  const handleRetry = async () => {
    setError(null);
    try {
      await updateUserAttributes({
        'custom:setup_status': 'pending'
      });
      await update();
      setSetupStatus('pending');
    } catch (error) {
      logger.error('Setup retry failed:', error);
      setError('Failed to retry setup');
    }
  };

  if (status === 'loading' || setupStatus === 'pending' || setupStatus === 'in_progress') {
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
          Setting up your account...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return null;
}
