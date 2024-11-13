'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Loading component
function LoadingState({ message }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="h6">
        {message}
      </Typography>
    </Box>
  );
}

// Error component
function ErrorState({ error, onRetry }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
      p={3}
    >
      <Alert
        severity="error"
        sx={{ width: '100%', maxWidth: 500 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
          >
            Try Again
          </Button>
        }
      >
        {error?.message || 'An error occurred'}
      </Alert>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
      >
        If the problem persists, please contact support.
      </Typography>
    </Box>
  );
}

// Payment verification hook
function usePaymentVerification(sessionId) {
  const router = useRouter();
  const { status } = useSession();

  return useQuery({
    queryKey: ['stripeSession', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID provided');
      const response = await axiosInstance.get(`/api/checkout/session/${sessionId}`);
      return response.data;
    },
    enabled: !!sessionId && status === 'authenticated',
    onSuccess: () => {
      toast.success('Payment verified successfully');
      router.push('/onboarding/step4');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to verify payment');
      logger.error('Stripe session verification failed:', error);
    },
    retry: 2,
    retryDelay: 1000
  });
}

// Main component content
function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { completeOnboarding } = useOnboarding();
  const sessionId = searchParams.get('session_id');

  // Use custom hook for payment verification
  const { 
    data: paymentData, 
    isLoading: isVerifying, 
    error: verificationError 
  } = usePaymentVerification(sessionId);

  // Mutation for completing onboarding
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('No session ID provided');
      await completeOnboarding({ sessionId });
    },
    onSuccess: () => {
      toast.success('Setup completed successfully!');
      router.push('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete setup');
      logger.error('Onboarding completion failed:', error);
    },
    retry: 1
  });

  // Effect to handle invalid access
  useEffect(() => {
    if (!sessionId) {
      logger.warn('No session ID provided');
      toast.error('Invalid payment session');
      router.push('/onboarding/step3');
      return;
    }

    logger.info('Session ID:', sessionId);
  }, [sessionId, router]);

  // Effect to handle session status
  useEffect(() => {
    if (status === 'unauthenticated') {
      logger.warn('User not authenticated');
      toast.error('Please sign in to continue');
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Effect to handle successful payment verification
  useEffect(() => {
    if (paymentData && !completeMutation.isSuccess) {
      logger.info('Payment verified, completing onboarding');
      completeMutation.mutate();
    }
  }, [paymentData, completeMutation]);

  // Loading states
  if (isVerifying || completeMutation.isPending) {
    return (
      <LoadingState 
        message={
          completeMutation.isPending 
            ? 'Completing your setup...' 
            : 'Verifying payment...'
        }
      />
    );
  }

  // Error states
  if (verificationError || completeMutation.error) {
    const error = verificationError || completeMutation.error;
    return (
      <ErrorState 
        error={error}
        onRetry={() => {
          logger.info('Retrying payment verification');
          router.push('/onboarding/step3');
        }}
      />
    );
  }

  // Return null when processing
  return null;
}

// Main export with error boundary
export default function OnboardingSuccess() {
  const router = useRouter();
  
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorState 
          error={error}
          onRetry={() => {
            logger.info('Resetting error state');
            resetError();
            router.push('/onboarding/step3');
          }}
        />
      )}
    >
      <OnboardingSuccessContent />
    </ErrorBoundary>
  );
}