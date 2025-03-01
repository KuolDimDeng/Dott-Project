'use client';

import React, { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useForm } from 'react-hook-form';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { validateSession } from '@/utils/onboardingUtils';
import {
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { useOnboarding } from './hooks/useOnboarding';
import { logger } from '@/utils/logger';
import PropTypes from 'prop-types';

// Onboarding-specific error fallback
const OnboardingErrorFallback = memo(function OnboardingErrorFallback({
  error,
  resetErrorBoundary,
  stepNumber = 1,
}) {
  const [isResetting, setIsResetting] = React.useState(false);
  const errorId = React.useRef(crypto.randomUUID()).current;

  React.useEffect(() => {
    logger.error('Onboarding error occurred:', {
      errorId,
      stepNumber,
      error: error?.message,
      stack: error?.stack,
    });
  }, [error, stepNumber, errorId]);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await resetErrorBoundary();
    } catch (error) {
      logger.error('Onboarding reset failed:', {
        errorId,
        error: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={3}
      gap={2}
    >
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? <CircularProgress size={20} /> : 'Try Again'}
          </Button>
        }
        sx={{ maxWidth: 500, width: '100%' }}
      >
        Error in Step {stepNumber}:{' '}
        {error?.message || 'Failed to load onboarding'}
      </Alert>
      <Typography variant="body2" color="text.secondary" align="center">
        Please try again or contact support if the problem persists.
        <br />
        Error Reference: {errorId}
      </Typography>
    </Box>
  );
});

// Main onboarding content component
const OnboardingContent = memo(function OnboardingContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const requestIdRef = React.useRef(crypto.randomUUID());

  const methods = useForm({
    defaultValues: {
      selected_plan: '',
      billingCycle: 'monthly',
      tier: '',
    },
  });

  const {
    current_step,
    loading: storeLoading,
    error: storeError,
    initialized,
    initialize,
    progress,
    selected_plan,
  } = useOnboarding(methods);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initStore = async () => {
      if (!initialized && !isInitializing && status === 'authenticated') {
        try {
          setIsInitializing(true);

          logger.info('Starting store initialization', {
            requestId: requestIdRef.current,
            attempt: initializationAttempts + 1,
            tier: selected_plan,
          });

          await initialize();

          if (mounted) {
            logger.debug('Store initialization complete', {
              requestId: requestIdRef.current,
              current_step,
              initialized: true,
              tier: selected_plan,
            });
          }
        } catch (error) {
          logger.error('Store initialization failed:', {
            requestId: requestIdRef.current,
            error: error.message,
            attempt: initializationAttempts + 1,
            tier: selected_plan,
          });

          if (initializationAttempts < 3) {
            const delay = Math.pow(2, initializationAttempts) * 1000;
            timeoutId = setTimeout(() => {
              if (mounted) {
                setInitializationAttempts((prev) => prev + 1);
              }
            }, delay);
          }
        } finally {
          if (mounted) {
            setIsInitializing(false);
          }
        }
      }
    };

    initStore();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    initialize,
    initialized,
    isInitializing,
    status,
    current_step,
    initializationAttempts,
    selected_plan,
  ]);

  if (!initialized || storeLoading || isInitializing) {
    const message = isInitializing
      ? `Initializing... (Attempt ${initializationAttempts + 1}/3)`
      : !initialized && status === 'authenticated'
        ? 'Loading your information...'
        : `${progress?.current_step || 'Preparing'} ${
            selected_plan ? `(${selected_plan} tier)` : ''
          } (${progress?.progress || 0}%)`;

    return (
      <LoadingStateWithProgress
        message={message}
        progress={progress?.progress || 0}
        isIndeterminate={!progress?.progress}
        tier={selected_plan}
      />
    );
  }

  if (storeError) {
    throw new Error(storeError.message || 'Failed to initialize onboarding', {
      cause: storeError,
    });
  }

  return null;
});

// Main page component with error boundary
export default function OnboardingPage() {
  const handleRecovery = async () => {
    const recoveryId = crypto.randomUUID();

    logger.info('Starting onboarding recovery', {
      recoveryId,
      tier: selected_plan,
    });

    try {
      // Get auth tokens
      const { tokens } = await validateSession();
      if (!tokens?.accessToken || !tokens?.idToken) {
        throw new Error('No valid session tokens');
      }

      const accessToken = tokens.accessToken.toString();
      const idToken = tokens.idToken.toString();

      await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: {
          'x-recovery-id': recoveryId,
          'x-subscription-tier': selected_plan,
          'Authorization': `Bearer ${accessToken}`,
          'X-Id-Token': idToken
        },
      });

      logger.info('Onboarding recovery successful', {
        recoveryId,
        tier: selected_plan,
      });
      return true;
    } catch (error) {
      logger.error('Onboarding recovery failed', {
        recoveryId,
        error: error.message,
        tier: selected_plan,
      });
      return false;
    }
  };

  return (
    <ErrorBoundary
      componentName="Onboarding"
      onReset={handleRecovery}
      FallbackComponent={OnboardingErrorFallback}
    >
      <OnboardingContent />
    </ErrorBoundary>
  );
}

// PropTypes definitions
OnboardingErrorFallback.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    stack: PropTypes.string,
  }),
  resetErrorBoundary: PropTypes.func.isRequired,
  stepNumber: PropTypes.number,
};

OnboardingContent.propTypes = {};
