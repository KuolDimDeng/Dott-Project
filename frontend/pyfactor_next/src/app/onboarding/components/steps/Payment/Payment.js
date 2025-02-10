'use client';

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Container,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepNavigation } from '@/app/onboarding/components/shared/StepNavigation';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { usePaymentForm } from './usePaymentForm';
import {
  PaymentContainer,
  LogoContainer,
  PaymentDetails,
  PaymentSummary,
} from './Payment.styles';
import { useOnboarding } from '@/hooks/useOnboarding';
import { logger } from '@/utils/logger';

// Pricing function
const getPricing = (billingCycle = 'monthly') => {
  return billingCycle === 'monthly' ? '29' : '290';
};

const PaymentComponent = ({ metadata }) => {
  const { handlePaymentSuccess, handleBack, isLoading, user } =
    usePaymentForm();

  const { currentStep, isStepCompleted } = useOnboarding();
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const subscriptionPlan = user?.subscriptionPlan;
  const billingCycle = user?.preferences?.billingCycle || 'monthly';

  const steps = [
    {
      label: 'Business Info',
      current: false,
      completed: isStepCompleted('businessinfo'),
    },
    {
      label: 'Subscription',
      current: false,
      completed: isStepCompleted('subscription'),
    },
    ...(subscriptionPlan === 'professional'
      ? [
          {
            label: 'Payment',
            current: currentStep === 'payment',
            completed: isStepCompleted('payment'),
          },
        ]
      : []),
    {
      label: 'Setup',
      current: currentStep === 'setup',
      completed: isStepCompleted('setup'),
    },
  ];

  const handlePaymentSubmit = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // Here you would typically integrate with your payment provider (e.g., Stripe)
      // For now, we'll simulate a successful payment
      const paymentId = `pay_${Date.now()}`;
      await handlePaymentSuccess(paymentId);
    } catch (error) {
      logger.error('Payment submission failed:', error);
      setCheckoutError(error.message || 'Failed to process payment');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Verify tier and step access
  if (subscriptionPlan !== 'professional' || currentStep !== 'payment') {
    logger.warn('Invalid payment page access:', {
      subscriptionPlan,
      currentStep,
    });

    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          Payment is only required for Professional tier
        </Alert>
        <Button
          variant="contained"
          onClick={handleBack}
          disabled={isLoading || checkoutLoading}
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
            current_step={3}
            totalSteps={subscriptionPlan === 'professional' ? 4 : 3}
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
              Professional Plan -{' '}
              {billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Billing
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
              Total: ${getPricing(billingCycle)}{' '}
              {billingCycle === 'monthly' ? 'per month' : 'per year'}
            </Typography>
          </PaymentSummary>
        </PaymentDetails>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePaymentSubmit}
          disabled={isLoading || checkoutLoading}
          sx={{ minWidth: 200 }}
        >
          {isLoading || checkoutLoading ? (
            <CircularProgress size={24} />
          ) : (
            'Complete Payment'
          )}
        </Button>

        <Button
          variant="text"
          onClick={handleBack}
          disabled={isLoading || checkoutLoading}
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
    next_step: PropTypes.string,
    prevStep: PropTypes.string,
  }).isRequired,
};

const Payment = memo(PaymentComponent);

export default Payment;
