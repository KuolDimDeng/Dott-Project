import React from 'react';
import { Box, Typography, CircularProgress, Paper, Alert } from '@mui/material';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { logger } from '@/utils/logger';

export default function SetupInProgress() {
  const { isLoading, isComplete, error, progress, currentStep, stepMessage } = useSetupStatus();

  logger.debug('Setup status:', { isLoading, isComplete, error, progress, currentStep });

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography>
          There was an error setting up your dashboard. Please try refreshing the page or contact support if the issue persists.
        </Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}
        >
          {/* Removed loading spinner */}
          <Typography variant="h5" gutterBottom align="center">
            {stepMessage || 'Setting up your dashboard...'}
          </Typography>
          <Typography color="text.secondary" align="center" sx={{ mb: 2 }}>
            We're preparing your workspace. This may take a few moments.
            Please don't close this window.
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ mt: 2 }} 
            color="text.secondary"
          >
            {progress}% Complete
          </Typography>
          {currentStep && (
            <Typography 
              variant="caption" 
              sx={{ mt: 1 }} 
              color="text.secondary"
            >
              Current step: {currentStep}
            </Typography>
          )}
        </Paper>
      </Box>
    </ErrorBoundary>
  );
}
