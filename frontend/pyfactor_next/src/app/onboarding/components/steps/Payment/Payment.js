///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Payment/Payment.js
'use client';

import React, { memo, useState, useEffect } from 'react';
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
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

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
  const { currentStep, isStepCompleted, getOnboardingState } = useOnboarding();
  const { user: userData } = useUser();
  const router = useRouter();
  
  // Get the updateOnboardingStatus function from the hook
  const { updateOnboardingStatus } = useOnboarding();
  
  // Log onboarding status on mount and update step if needed
  useEffect(() => {
    try {
      const onboardingState = getOnboardingState ? getOnboardingState() : 'unknown';
      const onboardingStepCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('onboardingStep='));
      const onboardingStatusCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('onboardedStatus='));
      
      // If current step is not 'payment', try to update it
      if (currentStep !== 'payment' && updateOnboardingStatus) {
        logger.debug('[Payment Component] Attempting to update step to payment from component');
        try {
          updateOnboardingStatus('PAYMENT');
        } catch (updateErr) {
          logger.error('[Payment Component] Failed to update step from component:', { error: updateErr.message });
        }
      }
      
      logger.debug('[Payment Component] Onboarding status check:', {
        currentStep,
        onboardingState,
        cookies: {
          onboardingStep: onboardingStepCookie ? onboardingStepCookie.split('=')[1] : 'not found',
          onboardedStatus: onboardingStatusCookie ? onboardingStatusCookie.split('=')[1] : 'not found', 
        },
        completedSteps: {
          businessInfo: isStepCompleted('businessinfo'),
          subscription: isStepCompleted('subscription'),
          payment: isStepCompleted('payment'),
          setup: isStepCompleted('setup'),
        }
      });
    } catch (err) {
      logger.error('[Payment Component] Error logging onboarding state:', { error: err.message });
    }
  }, [currentStep, isStepCompleted, getOnboardingState]);
  
  // Checkout state
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  // Load subscription data from sessionStorage - no router calls
  useEffect(() => {
    try {
      const pendingSubscription = sessionStorage.getItem('pendingSubscription');
      if (pendingSubscription) {
        const data = JSON.parse(pendingSubscription);
        logger.debug('[Payment Component] Loaded subscription data:', { data });
        
        // Validate the subscription plan
        const plan = data.plan?.toLowerCase();
        if (!plan || !['professional', 'enterprise'].includes(plan)) {
          logger.error('[Payment Component] Invalid subscription plan:', { 
            plan,
            fullData: data
          });
          setCheckoutError('Invalid subscription plan. Payment is only required for Professional and Enterprise tiers.');
          return;
        }
        
        setSubscriptionData(data);
      } else {
        logger.error('[Payment Component] No pending subscription found in sessionStorage');
        setCheckoutError('No subscription data found. Please select a plan first.');
      }
    } catch (e) {
      logger.error('[Payment Component] Error loading subscription data:', { error: e.message });
      setCheckoutError('Error loading subscription data');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);
  
  // If not a paid plan, set error flag
  useEffect(() => {
    if (!checkoutLoading && subscriptionData && subscriptionData.plan) {
      const normalizedPlan = subscriptionData.plan.toLowerCase();
      if (normalizedPlan !== 'professional' && normalizedPlan !== 'enterprise') {
        logger.error('[Payment Component] Not a paid plan:', { normalizedPlan });
        setCheckoutError('Invalid subscription plan. Payment is only required for Professional and Enterprise tiers.');
      }
    }
  }, [checkoutLoading, subscriptionData]);
  
  // If not credit card payment method, set flag for redirection
  useEffect(() => {
    if (!checkoutLoading && subscriptionData && subscriptionData.payment_method && subscriptionData.payment_method !== 'credit_card') {
      logger.debug('[Payment Component] Non-credit card payment method selected, setting redirect flag:', { 
        paymentMethod: subscriptionData.payment_method 
      });
      setCheckoutError('Non-credit card payment method selected');
    }
  }, [checkoutLoading, subscriptionData]);
  
  // Centralized redirect handler for all redirection scenarios
  useEffect(() => {
    if (checkoutError && !checkoutLoading) {
      if (checkoutError.includes('Invalid subscription plan') || 
          checkoutError.includes('No subscription data found')) {
        router.replace('/onboarding/subscription');
      } else if (checkoutError.includes('Non-credit card payment method')) {
        router.replace('/dashboard');
      }
    }
  }, [checkoutError, checkoutLoading, router]);
  
  // Get subscription details from stored data or user data - ensure we're using the proper plan
  // Prioritize session storage data over user attributes
  const subscriptionPlan = (subscriptionData && subscriptionData.plan) ? 
                           subscriptionData.plan.toLowerCase() : 
                           (userData?.attributes?.['custom:subscription_plan']?.toLowerCase() || 'professional');
                          
  // Check both billing_interval and interval properties since they might be inconsistent
  const billingCycle = subscriptionData?.billing_interval || 
                       subscriptionData?.interval ||
                       userData?.attributes?.['custom:billing_cycle'] || 
                       'monthly';
                       
  const paymentMethod = subscriptionData?.payment_method || 'credit_card';
  
  // Debug subscription info
  useEffect(() => {
    logger.debug('[Payment Component] Using subscription details:', {
      subscriptionPlan,
      billingCycle,
      paymentMethod,
      fromSessionStorage: !!subscriptionData,
      rawSubscriptionData: subscriptionData,
      fromUserAttributes: !!userData?.attributes?.['custom:subscription_plan']
    });
  }, [subscriptionPlan, billingCycle, paymentMethod, subscriptionData, userData]);
  
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
      
      // Store setup info for dashboard
      sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
        plan: subscriptionPlan,
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
        status: 'pending'
      }));
      
      await handlePaymentSuccess(paymentId);
      
      // Success message
      logger.info('[Payment] Payment successful, redirecting to dashboard');
      
      // Redirect will be handled by usePaymentForm
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
    if (['GH', 'KE', 'NG', 'ZA', 'TZ', 'UG', 'RW'].includes(userData?.businessCountry || 'US')) {
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
    else if (['US', 'CA'].includes(userData?.businessCountry || 'US')) {
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

  // Verify tier and step access with enhanced logging
  logger.debug('[Payment Component] Verifying payment access:', {
    subscriptionPlanCheck: {
      subscriptionPlan,
      isValidPlan: subscriptionPlan === 'professional' || subscriptionPlan === 'enterprise',
      rawSubscriptionData: subscriptionData,
    },
    stepCheck: {
      currentStep,
      isValidStep: currentStep === 'payment',
    },
    userData: {
      hasUserData: !!userData,
      userAttrs: userData?.attributes || {},
    },
    sessionPlan: subscriptionData?.plan || 'none',
  });
  
  // Only check plan type, not step since the step might be in transition
  if (subscriptionPlan !== 'professional' && subscriptionPlan !== 'enterprise') {
    logger.warn('[Payment Component] Invalid payment page access - wrong plan:', {
      subscriptionPlan,
      currentStep,
      reason: `Invalid plan: ${subscriptionPlan}`,
      userDataExists: !!userData,
      sessionStorageData: JSON.parse(sessionStorage.getItem('pendingSubscription') || 'null'),
    });

    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          Payment is only available for Professional and Enterprise tiers
        </Alert>
        <Typography variant="body1" sx={{ mt: 2 }}>
          You selected the <strong>{subscriptionPlan}</strong> plan, which doesn't require payment. 
          Please return to plan selection and choose either Professional or Enterprise tier if you'd like to proceed with payment.
        </Typography>
        <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
            Debug Info:
            Plan: {subscriptionPlan}
            Step: {currentStep}
            Session Storage: {sessionStorage.getItem('pendingSubscription') || 'null'}
          </Typography>
        </Box>
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

  // Verify payment method is credit_card
  if (paymentMethod !== 'credit_card') {
    return (
      <Container maxWidth="sm">
        <Alert severity="info" sx={{ mt: 2 }}>
          Redirecting to dashboard...
        </Alert>
        <CircularProgress sx={{ mt: 2 }} />
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
            
            {/* Payment Method Section */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Chip 
                icon={<CreditCardIcon />} 
                label="Credit/Debit Card" 
                color="primary"
                sx={{ mb: 1 }}
              />
            </Box>

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
          
          {/* Mock Credit Card Form */}
          <Box sx={{ mt: 3, mb: 4, width: '100%', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Payment Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Card Number</Typography>
              <Box 
                sx={{ 
                  border: '1px solid #ccc', 
                  borderRadius: 1, 
                  p: 1.5, 
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: '#fafafa'
                }}
              >
                <CreditCardIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography sx={{ color: 'text.secondary' }}>4242 4242 4242 4242</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', mb: 2 }}>
              <Box sx={{ flex: 1, mr: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Expiry Date</Typography>
                <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1.5, bgcolor: '#fafafa' }}>
                  <Typography sx={{ color: 'text.secondary' }}>12/29</Typography>
                </Box>
              </Box>
              <Box sx={{ flex: 1, ml: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>CVC</Typography>
                <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1.5, bgcolor: '#fafafa' }}>
                  <Typography sx={{ color: 'text.secondary' }}>123</Typography>
                </Box>
              </Box>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              This is a demo payment form. In production, a secure Stripe payment form would be displayed.
            </Typography>
          </Box>
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