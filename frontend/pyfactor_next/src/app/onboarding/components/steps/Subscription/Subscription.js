///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.js
'use client';

import React, { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import { useSession } from 'next-auth/react';
import { Container, Grid, Typography, Button, Card, CardContent, CardActions, Box, CircularProgress } from '@mui/material';
import Image from 'next/image';
import { useToast } from '@/components/Toast/ToastProvider';
import { StepHeader } from '../../shared/StepHeader';
import { StepProgress } from '../../shared/StepProgress';
import { useSubscriptionForm } from './useSubscriptionForm';
import { BillingToggle, tiers } from './Subscription.styles';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { logger } from '@/utils/logger';
import { onboardingApi } from '@/services/api/onboarding';
import { persistenceService, STORAGE_KEYS } from '@/services/persistenceService';
import { generateRequestId } from '@/lib/authUtils';
import useOnboardingStore from '@/app/onboarding/store/onboardingStore';

const SubscriptionComponent = ({ metadata }) => {
  const { data: session, update } = useSession();
  const toast = useToast();
  const router = useRouter();
  const { current_step, updateFormData, onboardingManager } = useOnboarding();
  const [selected_plan, setLocalTier] = useState(null);
  const store = useOnboardingStore();
  
  const {
    methods,
    handleChange,
    isLoading,
    isSubmitting,
    setIsSubmitting,
    requestId
  } = useSubscriptionForm();

  useEffect(() => {
    logger.debug('Subscription component state:', {
      selected_plan,
      current_step,
      formState: methods.getValues(),
      isSubmitting,
      isLoading,
      requestId
    });
  }, [selected_plan, current_step, methods, isSubmitting, isLoading, requestId]);

  const handleTierSelect = async (tier) => {
    const requestId = generateRequestId();
    
    logger.debug('Tier selection initiated:', {
        requestId,
        tier,
        tierType: tier.type,
        currentStatus: session?.user?.onboarding_status
    });
    
    let toastId;
    try {
        // Input validation
        if (!tier.type || !['free', 'professional'].includes(tier.type)) {
            throw new Error('Invalid tier type');
        }

        const billingCycle = methods.watch('billing_cycle');
        if (!billingCycle) {
            throw new Error('Please select a billing cycle');
        }

        setIsSubmitting(true);
        toastId = toast.loading('Processing your selection...');

        // 1. First save subscription data
        const subscriptionData = {
            selected_plan: tier.type,
            billing_cycle: billingCycle,
            current_step: 'subscription',
            request_id: requestId
        };

        const saveResponse = await onboardingApi.saveSubscriptionPlan(subscriptionData);

        if (!saveResponse?.success) {
            throw new Error(saveResponse?.error || 'Failed to save subscription plan');
        }

        // 2. For free tier, first initiate setup
        if (tier.type === 'free') {
            // Start setup process
            const setupResponse = await onboardingApi.startSetup({
                plan: 'free',
                requestId
            });

            if (!setupResponse?.success) {
                throw new Error('Failed to start setup process');
            }

            // 3. Then update status
            await onboardingApi.updateStatus({
                current_step: 'setup',
                next_step: 'dashboard',
                selected_plan: 'free',
                request_id: requestId
            });

            // 4. Update session
            await update({
                ...session,
                user: {
                    ...session.user,
                    selected_plan: 'free',
                    onboarding_status: 'setup'
                }
            });

            if (toastId) {
                toast.dismiss(toastId);
                toast.success('Welcome! Your workspace is being prepared.');
            }

            // 5. Redirect to dashboard
            router.replace('/dashboard');
            return;
        }

        // For professional tier
        if (tier.type === 'professional') {
            await onboardingApi.updateStatus({
                current_step: 'subscription',
                next_step: 'payment',
                selected_plan: 'professional',
                request_id: requestId
            });

            if (toastId) {
                toast.dismiss(toastId);
                toast.success('Plan selected. Proceeding to payment...');
            }

            router.replace('/onboarding/payment');
            return;
        }

    } catch (error) {
        logger.error('Plan selection failed:', {
            requestId,
            error: error.message || 'Unknown error occurred',
            tierType: tier.type,
            stack: error.stack
        });

        if (toastId) {
            toast.dismiss(toastId);
        }
        toast.error(`Plan selection failed. Please try again.`);
        
        await persistenceService.clearData(STORAGE_KEYS.SUBSCRIPTION_DATA);
        setLocalTier(null);
        store.setTier(null);
        
    } finally {
        setIsSubmitting(false);
    }
};

  const handlePreviousStep = async () => {
    try {
      router.push('/onboarding/business-info');
    } catch (error) {
      logger.error('Navigation to previous step failed:', {
        error: error.message,
        requestId
      });
    }
  };

  const steps = [
    { label: 'Business Info', completed: true },
    { label: 'Subscription', current: true },
    { 
      label: 'Payment', 
      completed: false, 
      conditional: true, 
      showFor: ['professional']
    },
    { label: 'Setup', completed: false }
  ].filter(step => 
    (!step.conditional || (step.conditional && step.showFor.includes(methods.watch('selected_plan'))))
  );

  const getButtonDisabledState = () => {
    return isLoading || isSubmitting;
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        mt: 4,
        mb: 4
      }}>
        <Image
          src="/static/images/Pyfactor.png"
          alt="Pyfactor Logo"
          width={150}
          height={120}
          priority
        />
      </Box>

      <StepProgress steps={steps} current_step={2} />
      
      <StepHeader 
        title={metadata.title}
        description={metadata.description}
        current_step={2}
        totalSteps={steps.length}
        stepName="Subscription"
      />

      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <BillingToggle>
          <Box
            className={`MuiBillingToggle-option ${methods.watch('billing_cycle') === 'monthly' ? 'active' : ''}`}
            onClick={() => !isSubmitting && handleChange('billing_cycle', 'monthly')}
            sx={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            Monthly
          </Box>
          <Box
            className={`MuiBillingToggle-option ${methods.watch('billing_cycle') === 'annual' ? 'active' : ''}`}
            onClick={() => !isSubmitting && handleChange('billing_cycle', 'annual')}
            sx={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            Annual
          </Box>
        </BillingToggle>
      </Box>

      <Grid container spacing={4}>
        {tiers.map((tier) => (
          <Grid item key={tier.title} xs={12} sm={6}>
            <Card sx={{
              height: '100%',
              p: 4,
              borderRadius: 4,
              border: tier.subheader ? '2px solid #1976d2' : 'none',
            }}>
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
                  ${tier.price[methods.watch('billing_cycle') || 'monthly']}
                  <Typography variant="caption" sx={{ verticalAlign: 'super' }}>
                    /{methods.watch('billing_cycle') === 'annual' ? 'year' : 'month'}
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
                  disabled={getButtonDisabledState()}
                  sx={{
                    position: 'relative',
                    minHeight: 48,
                  }}
                >
                  {(isLoading || isSubmitting) ? (
                    <CircularProgress size={24} />
                  ) : (
                    tier.buttonText
                  )}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handlePreviousStep}
          disabled={getButtonDisabledState()}
        >
          Previous Step
        </Button>
      </Box>
    </Container>
  );
};

SubscriptionComponent.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    next_step: PropTypes.string,
    prevStep: PropTypes.string
  }).isRequired
};

const Subscription = memo(SubscriptionComponent);

export default Subscription;
