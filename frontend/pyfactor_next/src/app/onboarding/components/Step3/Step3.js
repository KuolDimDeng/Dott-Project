'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Container, Button, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';
import { ThemeProvider } from '@mui/material/styles';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { useInitialization } from '@/hooks/useInitialization';
import { logger } from '@/utils/logger';
import { useStep3Form } from './useStep3Form';
import { useToast } from '@/components/Toast/ToastProvider';
import { 
  STEP_METADATA, 
  STEP_NAMES,
  ERROR_TYPES,
  validateStep
} from '@/app/onboarding/components/registry';
import { 
  theme, 
  PaymentContainer, 
  LogoContainer, 
  PaymentDetails,
  PaymentSummary 
} from './Step3.styles';

const Step3Component = ({ metadata = STEP_METADATA[STEP_NAMES.STEP3] }) => {
  const toast = useToast();
  const router = useRouter();

  // Add error boundary for metadata
  if (!metadata) {
    logger.error('Step3: Missing metadata');
    return (
      <ErrorStep 
        error="Configuration error"
        stepNumber={3}
      />
    );
  }

  const { 
    formData,
    loading: storeLoading,
    error: storeError,
    saveStep,
    initialize
  } = useOnboarding();

  const {
    checkoutLoading,
    checkoutError,
    handlePayment,
    setCheckoutError
  } = useStep3Form(formData);

  // Combined loading state
  const isLoading = storeLoading || checkoutLoading;

  // Initialization
  const initialization = useInitialization({
    onInitialize: initialize,
    maxAttempts: 3,
    timeout: 10000,
    dependencies: [formData?.selectedPlan],
    onSuccess: async () => {
      if (formData?.selectedPlan !== 'Professional') {
        router.replace('/onboarding/step2');
      }
    },
    onError: (error) => {
      logger.error('Initialization failed:', error);
      toast.error('Failed to initialize payment setup');
    }
  });

  if (initialization.isInitializing) {
    return (
      <LoadingStateWithProgress 
        message="Initializing payment setup..."
      />
    );
  }

  return (
    <OnboardingErrorBoundary
      onRetry={async () => {
        try {
          await initialization.reset();
          setCheckoutError(null);
        } catch (error) {
          logger.error('Error recovery failed:', error);
          toast.error('Failed to recover from error');
        }
      }}
    >
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm">
          <PaymentContainer>
            <LogoContainer>
              <Image 
                src="/static/images/Pyfactor.png" 
                alt="Pyfactor Logo" 
                width={150} 
                height={50} 
                priority 
              />
              <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>
                {metadata.title}
              </Typography>
              <Typography variant="body1" sx={{ mb: 4 }}>
                {metadata.description}
              </Typography>
            </LogoContainer>

            {(storeError || checkoutError) && (
              <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                {checkoutError || storeError}
              </Alert>
            )}

            <PaymentDetails>
              <PaymentSummary>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  You've selected the Professional plan. Please complete your payment to continue.
                </Typography>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Total: ${formData.billingCycle === 'monthly' ? '15 per month' : '150 per year'}
                </Typography>
              </PaymentSummary>
            </PaymentDetails>

            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handlePayment}
              disabled={isLoading}
              sx={{ minWidth: 200 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Complete Payment'}
            </Button>

            <Button
              variant="text"
              onClick={() => router.push('/onboarding/step2')}
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              Back to Plan Selection
            </Button>
          </PaymentContainer>
        </Container>
      </ThemeProvider>
    </OnboardingErrorBoundary>
  );
};

// PropTypes for development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  Step3Component.propTypes = {
    metadata: PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      nextStep: PropTypes.string,
      prevStep: PropTypes.string
    })
  };
}

const Step3 = memo(Step3Component);

export default Step3;