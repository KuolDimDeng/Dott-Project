// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.js
'use client';

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Grid, Typography, Button, Card, CardContent, CardActions, Box, CircularProgress } from '@mui/material';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress'; 
import { useSubscriptionForm } from './useSubscriptionForm';
import { BillingToggle, tiers } from './Subscription.styles';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { logger } from '@/utils/logger';

const SubscriptionComponent = ({ metadata }) => {
  const [selectedTier, setSelectedTier] = useState(null);
  const { canNavigateToStep } = useOnboarding();

  const {
    methods,
    handleChange,
    handleSubscriptionSelect,
    isLoading,
    isSubmitting,
    handlePreviousStep,
    requestId
  } = useSubscriptionForm();

  const handleTierSelect = async (tier) => {
    try {
      const nextStep = tier.type === 'professional' ? 'payment' : 'setup';
      const canNavigate = canNavigateToStep(nextStep);

      logger.debug('Tier selection attempted:', {
        requestId,
        tier: tier.type,
        nextStep,
        canNavigate
      });

      if (!canNavigate) {
        logger.warn('Navigation blocked - invalid step transition', {
          requestId,
          currentStep: 'subscription',
          nextStep
        });
        return;
      }

      setSelectedTier(tier.type);
      await handleSubscriptionSelect(tier);

    } catch (error) {
      logger.error('Tier selection failed:', {
        requestId,
        error: error.message,
        tier: tier.type
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
    (!step.conditional || (step.conditional && step.showFor.includes(methods.watch('selectedPlan'))))
  );

  const getButtonDisabledState = (tier) => {
    return isLoading || isSubmitting;
  };
  
  return (
    <Container maxWidth="lg">
      <StepProgress 
        steps={steps} 
        currentStep={2}
      />      
      <StepHeader 
        title={metadata.title}
        description={metadata.description}
        currentStep={2}
        totalSteps={steps.length}
        stepName="Subscription"
      />

      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Image
          src="/static/images/Pyfactor.png"
          alt="Pyfactor Logo"
          width={150}
          height={50}
          priority
        />

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
                  disabled={getButtonDisabledState(tier)}
                  sx={{
                    position: 'relative',
                    minHeight: 48,
                  }}
                >
                  {isLoading || isSubmitting ? (
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
          disabled={isLoading || isSubmitting || !canNavigateToStep('business-info')}
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
    nextStep: PropTypes.string,
    prevStep: PropTypes.string
  }).isRequired
};

const Subscription = memo(SubscriptionComponent);

export default Subscription;