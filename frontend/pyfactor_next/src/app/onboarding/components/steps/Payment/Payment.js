///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/Payment.js
'use client';

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Container, Button, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepNavigation } from '@/app/onboarding/components/shared/StepNavigation';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { usePaymentForm } from './usePaymentForm';
import { PaymentContainer, LogoContainer, PaymentDetails, PaymentSummary } from './Payment.styles';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { logger } from '@/utils/logger';

const PaymentComponent = ({ metadata }) => {
  const { canNavigateToStep } = useOnboarding();
  
  const {
    formData,
    checkoutLoading,
    checkoutError,
    handlePayment,
    handlePreviousStep,
    isLoading,
    requestId,
    selectedTier,
    billingCycle
  } = usePaymentForm();

  // Make steps dynamic based on tier and validation
  const steps = [
    { label: 'Business Info', current: false, completed: true },
    { label: 'Subscription', current: false, completed: true },
    ...(selectedTier === 'professional' ? [
      { label: 'Payment', current: true, completed: false, isAccessible: canNavigateToStep('payment') }
    ] : []),
    { 
      label: 'Setup', 
      current: false, 
      completed: false,
      isAccessible: canNavigateToStep('setup')
    }
  ];

  const handlePaymentSubmit = async () => {
    try {
      if (!canNavigateToStep('setup')) {
        logger.warn('Payment submission blocked - cannot proceed to setup', {
          requestId,
          currentStep: 'payment',
          nextStep: 'setup'
        });
        return;
      }

      await handlePayment();

    } catch (error) {
      logger.error('Payment submission failed:', {
        requestId,
        error: error.message
      });
    }
  };

  // Verify tier and step access
  if (selectedTier !== 'professional' || !canNavigateToStep('payment')) {
    logger.warn('Invalid payment page access:', {
      requestId,
      selectedTier,
      canAccessPayment: canNavigateToStep('payment')
    });
    
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          Payment is only required for Professional tier
        </Alert>
        <Button
          variant="contained"
          onClick={handlePreviousStep}
          disabled={!canNavigateToStep('subscription')}
          sx={{ mt: 2 }}
        >
          Back to Plan Selection
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <StepProgress steps={steps} />
      
      <PaymentContainer>
        <LogoContainer>
          <Image
            src="/static/images/Pyfactor.png"
            alt="Pyfactor Logo"
            width={150}
            height={50}
            priority
          />
          <StepHeader 
            title={metadata.title}
            description={metadata.description}
            currentStep={3}
            totalSteps={selectedTier === 'professional' ? 4 : 3}
            stepName="Payment"
          />
        </LogoContainer>

        {checkoutError && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {checkoutError}
          </Alert>
        )}

        <PaymentDetails>
          <PaymentSummary>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Professional Plan - {billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Billing
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Plan includes:
              </Typography>
              <ul>
                <li>Unlimited users</li>
                <li>Payroll processing</li>
                <li>20 GB of storage</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
                <li>Custom reporting</li>
                <li>API access</li>
              </ul>
            </Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Total: ${getPricing()} {billingCycle === 'monthly' ? 'per month' : 'per year'}
            </Typography>
          </PaymentSummary>
        </PaymentDetails>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePaymentSubmit}
          disabled={isLoading || checkoutLoading || !canNavigateToStep('setup')}
          sx={{ minWidth: 200 }}
        >
          {(isLoading || checkoutLoading) ? (
            <CircularProgress size={24} />
          ) : (
            'Complete Payment'
          )}
        </Button>

        <Button
          variant="text"
          onClick={handlePreviousStep}
          disabled={isLoading || checkoutLoading || !canNavigateToStep('subscription')}
          sx={{ mt: 2 }}
        >
          Back to Plan Selection
        </Button>
      </PaymentContainer>
    </Container>
  );
};

PaymentComponent.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    nextStep: PropTypes.string,
    prevStep: PropTypes.string
  }).isRequired
};

const Payment = memo(PaymentComponent);

export default Payment;