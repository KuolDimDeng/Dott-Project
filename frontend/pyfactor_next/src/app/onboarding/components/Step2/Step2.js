// /src/app/onboarding/components/Step2/Step2.js
'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import Image from 'next/image';
import { useToast } from '@/components/Toast/ToastProvider';
import { useStep2Form } from './useStep2Form';
import { useInitialization } from '@/hooks/useInitialization';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { theme, BillingToggle, tiers } from './Step2.styles';
import { logger } from '@/utils/logger';
import { persistenceService } from '@/services/persistenceService';
import { ErrorStep } from '@/components/ErrorStep';
import { APP_CONFIG } from '@/config';
import {
  STEP_METADATA,
  STEP_NAMES,
  ERROR_TYPES,
  validateStep,
} from '@/app/onboarding/components/registry';
import { axiosInstance } from '@/lib/axiosConfig'; // Add this import at the top

const Step2Component = ({ metadata = STEP_METADATA[STEP_NAMES.STEP2] }) => {
  // 1. Basic React hooks
  const { data: session, status: sessionStatus } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // 2. Custom hooks
  const {
    formData: savedFormData,
    saveProgress,
    saving,
    lastSaved,
  } = useOnboardingProgress('step2');

  const { methods, handleChange, saveDraft, loadLatestDraft, validateForm } =
    useStep2Form(savedFormData);

  const {
    formData: storeFormData,
    loading: storeLoading,
    error: storeError,
    saveStep,
    initialize,
    progress,
  } = useOnboarding(methods);

  // 3. Initialization hook
  const initialization = useInitialization({
    onInitialize: initialize,
    maxAttempts: 3,
    timeout: 10000,
    dependencies: [session?.user?.id, storeFormData],
    onSuccess: async () => {
      let toastId;
      try {
        toastId = toast.loading('Loading your saved data...');
        const draft = await loadLatestDraft();

        if (draft) {
          await Promise.all(
            Object.entries(draft).map(([key, value]) =>
              methods.setValue(key, value, {
                shouldValidate: true,
                shouldDirty: false,
                shouldTouch: false,
              })
            )
          );

          toast.update(toastId, {
            render: 'Saved data restored successfully',
            type: 'success',
            isLoading: false,
            autoClose: 2000,
          });
        } else {
          methods.setValue('billingCycle', 'monthly', { shouldValidate: true });
          toast.dismiss(toastId);
        }
      } catch (error) {
        logger.error('Failed to load draft:', error);
        if (toastId) {
          toast.update(toastId, {
            render: 'Failed to load your saved data',
            type: 'error',
            isLoading: false,
            autoClose: 3000,
          });
        }
        methods.reset({
          billingCycle: 'monthly',
          selectedPlan: '',
        });
      }
    },
    onError: (error) => {
      logger.error('Initialization failed:', error);
      toast.error('Failed to initialize. Please try again.');
    },
  });

  // 4. Derived state
  const isLoading =
    initialization.isInitializing ||
    storeLoading ||
    saving ||
    !session ||
    methods.formState.isSubmitting ||
    isSubmitting;

  // 5. Effects
  useLoadingTimeout(initialization.isInitializing, () => {
    initialization.reset();
  });

  useEffect(() => {
    logger.debug('Form state:', {
      formState: methods.formState,
      values: methods.getValues(),
      currentStep: progress.currentStep,
    });
  }, [methods, progress.currentStep]);

  useEffect(() => {
    logger.debug('Loading state:', {
      initialization: initialization.isInitializing,
      storeLoading,
      saving,
      sessionExists: !!session,
      formSubmitting: methods.formState.isSubmitting,
      isSubmitting,
      resultingLoadingState: isLoading,
    });
  }, [
    initialization.isInitializing,
    storeLoading,
    saving,
    session,
    methods.formState.isSubmitting,
    isSubmitting,
    isLoading,
  ]);

  useEffect(() => {
    const cleanupForm = async () => {
      try {
        if (methods.formState.isDirty && !isSubmitting) {
          await saveDraft(methods.getValues());
          logger.info('Form state saved during cleanup');
        }
      } catch (error) {
        logger.error('Failed to save form state during cleanup:', error);
      }
    };

    return () => {
      cleanupForm().catch((error) => {
        logger.error('Cleanup failed:', error);
      });
    };
  }, [methods, saveDraft, isSubmitting, methods.formState.isDirty]);

  // 6. Handler Functions
  const handleSubmissionError = useCallback(
    (error, toastId) => {
      logger.error('Subscription selection failed:', {
        error,
        formState: methods.formState,
        currentValues: methods.getValues(),
      });

      const errorMessage =
        error.response?.status === 400
          ? 'Invalid form data'
          : error.response?.status === 401
            ? 'Please sign in again'
            : error.response?.status === 403
              ? 'Not authorized to perform this action'
              : error.message || 'Failed to save plan selection';

      if (toastId) {
        toast.update(toastId, {
          render: errorMessage,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.error(errorMessage);
      }

      saveDraft(methods.getValues())
        .then(() => logger.info('Draft saved after error'))
        .catch((draftError) => logger.error('Failed to save error draft:', draftError));
    },
    [methods, toast, saveDraft]
  );

  const handleSubscriptionSelect = useCallback(
    async (tier) => {
      logger.debug('Subscription selected:', tier);
      let toastId;

      try {
        if (isSubmitting) {
          logger.debug('Save already in progress, skipping');
          return;
        }

        setIsSubmitting(true);
        toastId = toast.loading('Saving your selection...');

        // Save form values first
        await Promise.all([
          methods.setValue('selectedPlan', tier.title),
          methods.setValue('billingCycle', methods.getValues('billingCycle') || 'monthly'),
        ]);

        const subscriptionData = {
          selectedPlan: tier.title,
          billingCycle: methods.getValues('billingCycle') || 'monthly',
        };

        // Make direct API call with proper error handling
        const response = await axiosInstance.post('/api/onboarding/save-step2/', subscriptionData);

        // Backend is successfully saving, so check for response.data
        if (response?.data) {
          await persistenceService.clearData('step2-form_drafts');

          toast.update(toastId, {
            render: 'Plan selected successfully',
            type: 'success',
            isLoading: false,
            autoClose: 2000,
          });

          // Navigate based on plan type
          const nextRoute =
            tier.title === 'Basic' ? '/onboarding/step4/setup' : '/onboarding/step3';

          logger.debug('Navigating to:', { nextRoute, plan: tier.title });
          await router.push(nextRoute);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (error) {
        logger.error('Save operation failed:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        toast.update(toastId, {
          render: error.response?.data?.message || error.message || 'Failed to save plan selection',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [methods, isSubmitting, router, toast]
  );

  const handleTierSelect = useCallback(
    (tier) => {
      if (isLoading || isSubmitting) return;
      handleSubscriptionSelect(tier);
    },
    [isLoading, isSubmitting, handleSubscriptionSelect]
  );

  // Add this with your other handler functions
  const handlePreviousStep = useCallback(async () => {
    try {
      // Save any unsaved changes before navigating
      if (methods.formState.isDirty) {
        await saveDraft(methods.getValues());
      }

      // Navigate to previous step
      await router.push('/onboarding/step1');
    } catch (error) {
      logger.error('Navigation failed:', error);
      toast.error('Failed to navigate to previous step');
    }
  }, [methods, saveDraft, router, toast]);

  // 7. Early returns for auth and loading states
  if (sessionStatus === 'unauthenticated') {
    router.replace('/auth/signin');
    return null;
  }

  if (initialization.isInitializing || !session) {
    return (
      <LoadingStateWithProgress
        message={initialization?.status === 'pending' ? 'Initializing...' : 'Loading...'}
      />
    );
  }

  if (initialization.error || storeError) {
    return (
      <ErrorStep
        error={initialization.error || storeError}
        stepNumber={2}
        onRetry={() => initialization.reset()}
      />
    );
  }

  // 8. Main render
  return (
    <OnboardingErrorBoundary
      onRetry={async () => {
        try {
          await initialization.reset();
          const draft = await loadLatestDraft();
          if (draft) {
            Object.entries(draft).forEach(([key, value]) => {
              methods.setValue(key, value);
            });
          }
        } catch (error) {
          logger.error('Error recovery failed:', error);
          toast.error('Failed to recover form data');
        }
      }}
    >
      <ThemeProvider theme={theme}>
        <Container maxWidth="lg" sx={{ minHeight: '100vh', py: 6 }}>
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Image
              src="/static/images/Pyfactor.png"
              alt="Pyfactor Logo"
              width={150}
              height={50}
              priority
            />
            <Typography variant="h6" color="primary">
              {metadata.title}
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              {metadata.description}
            </Typography>

            {/* Billing Toggle */}
            <BillingToggle>
              <Box
                className={`MuiBillingToggle-option ${methods.watch('billingCycle') === 'monthly' ? 'active' : ''}`}
                onClick={() => !isSubmitting && handleChange('billingCycle', 'monthly')}
                sx={{ opacity: isSubmitting ? 0.5 : 1 }}
              >
                Monthly
              </Box>
              <Box
                className={`MuiBillingToggle-option ${methods.watch('billingCycle') === 'annual' ? 'active' : ''}`}
                onClick={() => !isSubmitting && handleChange('billingCycle', 'annual')}
                sx={{ opacity: isSubmitting ? 0.5 : 1 }}
              >
                Annual
              </Box>
            </BillingToggle>
          </Box>

          {/* Error Alert */}
          {storeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {storeError}
            </Alert>
          )}

          {/* Plan Cards */}
          <Grid container spacing={4}>
            {tiers.map((tier) => (
              <Grid item key={tier.title} xs={12} sm={6}>
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    borderRadius: 4,
                    border: tier.subheader ? '2px solid #1976d2' : 'none',
                  }}
                >
                  <CardContent>
                    <Typography variant="h5" component="div" gutterBottom>
                      {tier.title}
                    </Typography>
                    {tier.subheader && (
                      <Typography color="primary" sx={{ mb: 2 }}>
                        {tier.subheader}
                      </Typography>
                    )}
                    <Typography variant="h4" component="div" sx={{ mb: 2 }}>
                      ${tier.price[methods.watch('billingCycle') || 'monthly']}
                      <Typography variant="caption" sx={{ verticalAlign: 'super' }}>
                        /{methods.watch('billingCycle') === 'annual' ? 'year' : 'month'}
                      </Typography>
                    </Typography>
                    {tier.description.map((line) => (
                      <Typography
                        component="li"
                        variant="subtitle1"
                        align="left"
                        key={line}
                        sx={{ mt: 1 }}
                      >
                        ✓ {line}
                      </Typography>
                    ))}
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant={tier.buttonVariant}
                      onClick={() => handleTierSelect(tier)}
                      disabled={isLoading || isSubmitting}
                      sx={{
                        position: 'relative',
                        minHeight: 48,
                      }}
                    >
                      {isLoading || isSubmitting ? (
                        <CircularProgress
                          size={24}
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-12px',
                            marginLeft: '-12px',
                          }}
                        />
                      ) : (
                        tier.buttonText
                      )}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handlePreviousStep}
              disabled={isLoading || isSubmitting}
            >
              Previous Step
            </Button>
          </Box>

          {/* Last Saved Indicator */}
          {lastSaved && (
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mt: 2, textAlign: 'center', display: 'block' }}
            >
              Last saved: {new Date(lastSaved).toLocaleTimeString()}
            </Typography>
          )}
        </Container>
      </ThemeProvider>
    </OnboardingErrorBoundary>
  );
};

// PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');

  Step2Component.propTypes = {
    metadata: PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      nextStep: PropTypes.string,
      prevStep: PropTypes.string,
    }).isRequired,
  };
}

// Create memoized version
const Step2 = memo(Step2Component, (prevProps, nextProps) => {
  return prevProps.metadata === nextProps.metadata;
});

export default Step2;
