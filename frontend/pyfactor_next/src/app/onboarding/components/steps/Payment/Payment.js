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
  Paper,
  Fade,
  Zoom,
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
  CardDetailsSection,
  CardField,
  PricingSummary,
  PaymentActionButton,
} from './Payment.styles';
import { useOnboarding } from '@/hooks/useOnboarding';
import { logger } from '@/utils/logger';
import PublicIcon from '@mui/icons-material/Public';
import PaymentsIcon from '@mui/icons-material/Payments';
import InventoryIcon from '@mui/icons-material/Inventory';
import SecurityIcon from '@mui/icons-material/Security';
import GroupsIcon from '@mui/icons-material/Groups';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockIcon from '@mui/icons-material/Lock';
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
  }, [currentStep, isStepCompleted, getOnboardingState, updateOnboardingStatus]);
  
  // Checkout state
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
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
    setProcessingPayment(true);
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
      setProcessingPayment(false);
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
        <Box component="ul">
          <Box component="li">
            <Typography variant="body2">Up to 3 users</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Advanced inventory management with forecasting</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Global payments with reduced transaction fees</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">15 GB of storage</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Advanced reporting and analytics</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">AI-powered business insights</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Priority support</Typography>
          </Box>
        </Box>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <Box component="ul">
          <Box component="li">
            <Typography variant="body2">Unlimited users</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Everything in Professional plan</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Preferential transaction fees</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Unlimited storage</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Custom roles & permissions</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">Dedicated account manager</Typography>
          </Box>
          <Box component="li">
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
        <Box component="ul">
          <Box component="li">
            <Typography variant="body2">Payroll & Tax processing</Typography>
          </Box>
          <Box component="li">
            <Typography variant="body2">HR & CRM modules</Typography>
          </Box>
        </Box>
      );
    } else if (subscriptionPlan === 'enterprise') {
      return (
        <Box component="ul">
          <Box component="li">
            <Typography variant="body2">Full Payroll & Tax processing included</Typography>
          </Box>
          <Box component="li">
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
        sx={{ m: 0.5 }}
      />,
      <Chip 
        key="inventory"
        icon={<InventoryIcon />} 
        label="Advanced Inventory" 
        color="primary" 
        variant="outlined"
        sx={{ m: 0.5 }}
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
          sx={{ m: 0.5 }}
        />,
        <Chip 
          key="teams"
          icon={<GroupsIcon />} 
          label="Unlimited Users" 
          color="primary" 
          variant="outlined"
          sx={{ m: 0.5 }}
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
        <Alert 
          severity="error" 
          sx={{ 
            mt: 4, 
            mb: 3, 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          Payment is only available for Professional and Enterprise tiers
        </Alert>
        <Paper
          elevation={2}
          sx={{
            p: 4,
            borderRadius: 3,
            mb: 4
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Plan Selection Issue
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You selected the <strong>{subscriptionPlan}</strong> plan, which doesn't require payment. 
            Please return to plan selection and choose either Professional or Enterprise tier if you'd like to proceed with payment.
          </Typography>
          
          <Button
            variant="contained"
            onClick={handleBack}
            disabled={isLoading || checkoutLoading}
            fullWidth
            sx={{ 
              py: 1.5, 
              borderRadius: 2,
              fontWeight: 500
            }}
          >
            Back to Plan Selection
          </Button>
        </Paper>
      </Container>
    );
  }

  // Verify payment method is credit_card
  if (paymentMethod !== 'credit_card') {
    return (
      <Container maxWidth="sm">
        <Alert 
          severity="info" 
          sx={{ 
            mt: 4,
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>Redirecting to dashboard...</Typography>
            <CircularProgress size={20} sx={{ ml: 2 }} />
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <StepProgress steps={steps} />

      <PaymentContainer>
        <LogoContainer>
          <Image
            src="/static/images/Pyfactor.png"
            alt="Dott Logo"
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
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              width: '100%', 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            {checkoutError}
          </Alert>
        )}

        <PaymentDetails tier={subscriptionPlan}>
          <PaymentSummary tier={subscriptionPlan}>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} Plan
              </Typography>
              <Chip 
                label={billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
                color="primary"
                sx={{ 
                  mb: 1, 
                  px: 2,
                  borderRadius: 4,
                  fontWeight: 'medium'
                }}
              />
              {billingCycle === 'annual' && (
                <Chip 
                  size="small" 
                  label="Save 17%" 
                  color="success"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 'bold',
                    borderRadius: 4,
                  }}
                />
              )}
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Payment Method Section */}
            <Fade in={true} timeout={800}>
              <Box sx={{ 
                mb: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                p: 2, 
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.04)',
              }}>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
                  Payment Method
                </Typography>
                <Chip 
                  icon={<CreditCardIcon />} 
                  label="Credit/Debit Card" 
                  color="primary"
                  sx={{ fontWeight: 'medium' }}
                />
              </Box>
            </Fade>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
              {getPlanChips()}
            </Box>

            {getRegionalPaymentMethods()}

            <Box sx={{ mb: 4, mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                Your {subscriptionPlan === 'professional' ? 'Professional' : 'Enterprise'} plan includes:
              </Typography>
              {getPlanFeatures()}
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                {subscriptionPlan === 'professional' 
                  ? 'Available add-ons at discounted rates:' 
                  : 'Included add-ons:'}
              </Typography>
              {getPlanAddOns()}
            </Box>

            <Divider sx={{ mb: 3, mt: 3 }} />

            <PricingSummary>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: 'primary.main', mb: 1 }}>
                  ${getPricing(subscriptionPlan, billingCycle)}{' '}
                  <Typography component="span" variant="h6" sx={{ fontWeight: 'normal' }}>
                    {billingCycle === 'monthly' ? '/month' : '/year'}
                  </Typography>
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {billingCycle === 'monthly' ? 'Monthly subscription' : 'Annual subscription'}
                </Typography>
                {billingCycle === 'annual' && (
                  <Typography variant="subtitle2" color="success.main" sx={{ mt: 1, fontWeight: 'medium' }}>
                    You save ${subscriptionPlan === 'professional' 
                      ? ((15 * 12) - 150) 
                      : ((45 * 12) - 450)} per year
                  </Typography>
                )}
              </Box>
            </PricingSummary>
            
            <Zoom in={true} timeout={500}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
                <Chip 
                  icon={<LockIcon />}
                  label="Secure Payment"
                  variant="outlined"
                  size="small"
                  sx={{ m: 0.5 }}
                />
                <Chip 
                  icon={<CheckCircleOutlineIcon />}
                  label="Cancel Anytime"
                  variant="outlined"
                  size="small"
                  sx={{ m: 0.5 }}
                />
                <Chip 
                  icon={<AccountBalanceIcon />}
                  label="Invoice Available"
                  variant="outlined"
                  size="small"
                  sx={{ m: 0.5 }}
                />
              </Box>
            </Zoom>
          </PaymentSummary>
          
          {/* Credit Card Form - Enhanced */}
          <Fade in={true} timeout={1000}>
            <CardDetailsSection>
              <Typography variant="h6" fontWeight="medium" sx={{ mb: 3 }}>
                Payment Details
              </Typography>
              
              <CardField>
                <CreditCardIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography sx={{ fontWeight: 'medium' }}>4242 4242 4242 4242</Typography>
              </CardField>
              
              <Box sx={{ display: 'flex', mb: 1 }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>Expiry Date</Typography>
                  <CardField>
                    <Typography>12/29</Typography>
                  </CardField>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>CVC</Typography>
                  <CardField>
                    <Typography>123</Typography>
                  </CardField>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                <LockIcon sx={{ color: 'success.main', fontSize: '0.9rem', mr: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  This is a demo payment form. In production, a secure Stripe payment form would be displayed.
                </Typography>
              </Box>
            </CardDetailsSection>
          </Fade>
        </PaymentDetails>

        <PaymentActionButton>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePaymentSubmit}
            disabled={isLoading || checkoutLoading}
            sx={{ 
              minWidth: 250, 
              py: 1.5, 
              px: 4,
              fontSize: '1.1rem', 
              fontWeight: 'bold',
              borderRadius: 3,
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              }
            }}
          >
            {(isLoading || checkoutLoading) ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                {processingPayment ? 'Processing...' : 'Loading...'}
              </Box>
            ) : (
              'Complete Payment'
            )}
          </Button>
        </PaymentActionButton>

        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={isLoading || checkoutLoading}
          sx={{ 
            mt: 1, 
            borderRadius: 2,
            px: 3,
          }}
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