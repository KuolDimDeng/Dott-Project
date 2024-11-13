// src/app/onboarding/page.js
'use client';

import dynamic from 'next/dynamic'; // Add this import
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';
import { ErrorBoundary } from '@/components/ErrorBoundary';


// Helper components
function LoadingState({ status }) {
  const router = useRouter(); // Add this hook

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
      <Typography variant="body2" color="textSecondary">
        {!router.isReady ? 'Initializing...' :
          status === 'loading' ? 'Checking authentication...' : 
          'Loading your onboarding progress...'}
      </Typography>
    </Box>
  );
}

function ErrorState({ error, onRetry }) {
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
      <Typography variant="h6" color="error" gutterBottom>
        Something went wrong
      </Typography>
      <Typography color="error" align="center">
        {error instanceof Error ? error.message : 'An error occurred'}
      </Typography>
      <Button 
        variant="contained" 
        onClick={onRetry}
        sx={{ mt: 2 }}
      >
        Try Again
      </Button>
    </Box>
  );
}


function OnboardingContent() {
  const router = useRouter();
  const { status } = useSession();
  const { 
    onboardingStatus,
    components,
    loading,
    error,
    refetchStatus,
    handleOnboardingRedirect,
    formData,
    validateStep
  } = useOnboarding();

  // Dynamic imports
const DynamicSteps = {
  Step1: dynamic(() => import('./components/steps/Step1')),
  Step2: dynamic(() => import('./components/steps/Step2')),
  Step3: dynamic(() => import('./components/steps/Step3')),
  Step4: dynamic(() => import('./components/steps/Step4'))
};

  // Navigation handler with validation
  const handleStepNavigation = useCallback(async (step, options = {}) => {
    const { replace = true, onComplete } = options;

    try {
      if (!validateStep(step)) {
        logger.warn(`Invalid step access attempt: ${step}`);
        handleOnboardingRedirect('step1');
        return;
      }

      const method = replace ? router.replace : router.push;
      await method(`/onboarding/${step}`, undefined, { shallow: true });
      onComplete?.();

    } catch (error) {
      logger.error(`Navigation error to step ${step}:`, error);
      toast.error('Navigation failed');
    }
  }, [router, validateStep, handleOnboardingRedirect]);

  // Authentication check
  useEffect(() => {
    if (!router.isReady) return;

    if (status === 'unauthenticated') {
      logger.info('Unauthenticated user, redirecting to signin');
      router.replace('/auth/signin');
    }
  }, [status, router.isReady]);

  // Step validation and redirect
  useEffect(() => {
    if (!router.isReady || !formData) return;

    const currentStep = onboardingStatus || 'step1';
    
    if (!validateStep(currentStep)) {
      logger.warn(`Invalid step access: ${currentStep}, redirecting to step 1`);
      handleOnboardingRedirect('step1');
      return;
    }

    // Handle completed onboarding
    if (onboardingStatus === 'complete') {
      logger.info('Onboarding complete, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [router.isReady, formData, onboardingStatus, validateStep]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (onboardingStatus !== 'complete') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [onboardingStatus]);

  // Error handling
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred during onboarding';
      toast.error(errorMessage);
      logger.error('Onboarding error:', error);
    }
  }, [error]);



  // Render loading state
  if (!router.isReady || loading || status === 'loading') {
    return <LoadingState status={status} />;
  }

  // Render error state
  if (error) {
    return <ErrorState error={error} onRetry={refetchStatus} />;
  }

  // Render current step
// src/app/onboarding/page.js

const renderStep = () => {
  const currentStep = onboardingStatus || 'step1';
  const StepComponent = components[`Step${currentStep.slice(-1)}`];
  
  return StepComponent ? (
    <StepComponent 
      onComplete={refetchStatus}
      formData={formData}
      loading={loading}
    />
  ) : null;
};



return (
  <Box 
    component="main"
    sx={{ 
      maxWidth: '100vw', 
      minHeight: '100vh', 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}
  >
    {renderStep()}
  </Box>
);
}

// Main export with error boundary
export default function Onboarding() {
return (
  <ErrorBoundary
    fallback={({ error, resetError }) => (
      <ErrorState 
        error={error} 
        onRetry={resetError} 
      />
    )}
  >
    <OnboardingContent />
  </ErrorBoundary>
);
}

// Loading component for dynamic imports
export function OnboardingLoading() {
return <LoadingState />;
}