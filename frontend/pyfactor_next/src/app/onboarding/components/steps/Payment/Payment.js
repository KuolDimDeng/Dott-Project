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
  Chip,
  Divider,
} from '@mui/material';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
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
import PublicIcon from '@mui/icons-material/Public';
import PaymentsIcon from '@mui/icons-material/Payments';
import InventoryIcon from '@mui/icons-material/Inventory';
import SecurityIcon from '@mui/icons-material/Security';
import GroupsIcon from '@mui/icons-material/Groups';

// Pricing function
const getPricing = (plan, billingCycle = 'monthly') => {
  if (plan === 'professional') {
    return billingCycle === 'monthly' ? '15' : '150';
  } else if (plan === 'enterprise') {
    return billingCycle === 'monthly' ? '45' : '450';
  }
  return '0';
};

const PaymentComponent = ({ metadata }) => {
  const { handlePaymentSuccess, handleBack, isLoading, user } =
    usePaymentForm();

  const { currentStep, isStepCompleted } = useOnboarding();
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const subscriptionPlan = user?.subscriptionPlan;
  const billingCycle = user?.preferences?.billingCycle || 'monthly';
  const businessCountry = user?.businessCountry || 'US';

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
    ...(subscriptionPlan === 'professional' || subscriptionPlan === 'enterprise'
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

  // Get region-specific payment methods
  const getRegionalPaymentMethods = () => {
    // Africa
    if (['GH', 'KE', 'NG', 'ZA', 'TZ', 'UG', 'RW'].includes(businessCountry)) {
      return (
        <>
          <Chip 
            size="small" 
            icon={<PaymentsIcon />} 
            label="Mobile Money Support" 
            color="primary" 
            variant="outlined"
            sx={{ my: 1, mr: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            Includes M-Pesa, MTN, Airtel Money, and other local options
            {subscriptionPlan === 'enterprise' && ' with preferential rates'}
          </Typography>
        </>
      );
    }
    // North America
    else if (['US', 'CA'].includes(businessCountry)) {
      return (
        <Chip 
          size="small" 
          icon={<PaymentsIcon />} 
          label={subscriptionPlan === 'enterprise' ? "Advanced Invoice Factoring" : "Invoice Factoring Available"} 
          color="primary" 
          variant="outlined"
          sx={{ my: 1 }}
        />
      );
    }
    return null;
  };

  // Get plan-specific features
  const getPlanFeatures = () => {
    if (subscriptionPlan === 'professional') {
      return (
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Up to 3 users</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Advanced inventory management with forecasting</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Global payments with reduced transaction fees</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">15 GB of storage</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Advanced reporting and analytics</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">AI-powered business insights</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Priority support</Typography>
          </Box>
        </Box>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Unlimited users</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Everything in Professional plan</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Preferential transaction fees</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Unlimited storage</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Custom roles & permissions</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Dedicated account manager</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Advanced security features</Typography>
          </Box>
        </Box>
      );
    }
    return null;
  };

  // Get plan-specific add-ons
  const getPlanAddOns = () => {
    if (subscriptionPlan === 'professional') {
      return (
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Payroll & Tax processing</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">HR & CRM modules</Typography>
          </Box>
        </Box>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Full Payroll & Tax processing included</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Integrated HR & CRM modules</Typography>
          </Box>
        </Box>
      );
    }
    return null;
  };

  // Get plan-specific icons
  const getPlanChips = () => {
    const chips = [
      <Chip 
        key="global"
        icon={<PublicIcon />} 
        label="Global Business Solution" 
        color="primary" 
        variant="outlined"
        sx={{ mx: 1, mb: 1 }}
      />,
      <Chip 
        key="inventory"
        icon={<InventoryIcon />} 
        label="Advanced Inventory" 
        color="primary" 
        variant="outlined"
        sx={{ mx: 1, mb: 1 }}
      />
    ];
    
    if (subscriptionPlan === 'enterprise') {
      chips.push(
        <Chip 
          key="security"
          icon={<SecurityIcon />} 
          label="Enhanced Security" 
          color="primary" 
          variant="outlined"
          sx={{ mx: 1, mb: 1 }}
        />,
        <Chip 
          key="teams"
          icon={<GroupsIcon />} 
          label="Unlimited Users" 
          color="primary" 
          variant="outlined"
          sx={{ mx: 1, mb: 1 }}
        />
      );
    }
    
    return chips;
  };

  // Verify tier and step access
  if ((subscriptionPlan !== 'professional' && subscriptionPlan !== 'enterprise') || currentStep !== 'payment') {
    logger.warn('Invalid payment page access:', {
      subscriptionPlan,
      currentStep,
    });

    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          Payment is only required for Professional and Enterprise tiers
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
            totalSteps={subscriptionPlan === 'free' ? 3 : 4}
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
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} Plan
              </Typography>
              <Chip 
                label={billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
                color="primary"
                sx={{ mb: 1 }}
              />
              {billingCycle === 'annual' && (
                <Chip 
                  size="small" 
                  label="Save 17%" 
                  color="success"
                  sx={{ mb: 1 }}
                />
              )}
            </Box>
            
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, flexWrap: 'wrap' }}>
              {getPlanChips()}
            </Box>

            {getRegionalPaymentMethods()}

            <Box sx={{ mb: 3, mt: 2 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                Your {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} plan includes:
              </Typography>
              {getPlanFeatures()}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                {subscriptionPlan === 'professional' 
                  ? 'Available add-ons at discounted rates:' 
                  : 'Included add-ons:'}
              </Typography>
              {getPlanAddOns()}
            </Box>

            <Divider sx={{ mb: 2, mt: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {billingCycle === 'monthly' ? 'Monthly subscription' : 'Annual subscription'}
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                ${getPricing(subscriptionPlan, billingCycle)}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="h5" fontWeight="bold" align="center">
                Total: ${getPricing(subscriptionPlan, billingCycle)}{' '}
                {billingCycle === 'monthly' ? '/month' : '/year'}
              </Typography>
              {billingCycle === 'annual' && (
                <Typography variant="body2" color="success.main" align="center">
                  You save ${subscriptionPlan === 'professional' 
                    ? ((15 * 12) - 150) 
                    : ((45 * 12) - 450)} per year
                </Typography>
              )}
            </Box>
          </PaymentSummary>
        </PaymentDetails>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePaymentSubmit}
          disabled={isLoading || checkoutLoading}
          sx={{ minWidth: 200, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
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