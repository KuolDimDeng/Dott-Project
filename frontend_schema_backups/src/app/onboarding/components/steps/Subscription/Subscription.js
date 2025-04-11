'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import { fetchAuthSession, updateUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { toast } from 'react-hot-toast';
import { useEnhancedOnboarding } from '@/hooks/useEnhancedOnboarding';
import { 
  Box, 
  Container, 
  Alert, 
  CircularProgress, 
  Typography, 
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  Fade
} from '@/components/ui/TailwindComponents';

const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    features: [
      'Income and expense tracking',
      'Invoice creation',
      'Automated invoice reminders',
      'Basic inventory tracking',
      'Limited bank account integration (2 accounts)',
      'Basic financial reporting',
      'Mobile app access',
      '2GB storage',
      'Expense categorization',
      'Limited multi-currency support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: {
      monthly: '15',
      annual: '150',
    },
    features: [
      'Multiple users',
      'Bank account integration (up to 10 accounts)',
      'Advanced financial reporting',
      'Advanced inventory management',
      'Mobile Point of Sale (mPOS)',
      'AI-powered business insights',
      'Priority support',
      'Multi-currency support',
      'Reduced transaction fees',
      '30GB storage',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: {
      monthly: '45',
      annual: '450',
    },
    features: [
      'Unlimited bank accounts',
      'Custom financial reporting',
      'Custom inventory categories',
      'Unlimited storage',
      'Advanced forecasting',
      'Custom API access',
      'Dedicated account manager',
      'White-label payment solutions',
      'Advanced inventory forecasting',
      'Lowest transaction fees (1%)',
    ],
  },
];

const PAYMENT_METHODS = [
  {
    id: 'credit_card',
    name: 'Credit/Debit Card',
    description: 'Pay securely with your card via Stripe',
    icon: 'credit_card',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: 'account_balance_wallet',
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    description: 'Pay using your mobile money account',
    icon: 'smartphone',
  },
];

export function Subscription({ metadata }) {
  const router = useRouter();
  const { user, loading: sessionLoading, logout } = useSession();
  const { isLoading: isUpdating, updateOnboardingStatus } = useOnboarding();
  const { updateState, isLoading: isEnhancedLoading, navigateToNextStep } = useEnhancedOnboarding();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: ''
  });
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentTab, setPaymentTab] = useState(0);

  // Initialize component with business data from metadata or cookies
  useEffect(() => {
    try {
      // Log what metadata we received with safe value handling
      logger.info('[Subscription] Processing metadata:', {
        hasMetadata: !!metadata,
        businessName: metadata?.businessName || 'Not provided',
        businessType: metadata?.businessType || 'Not provided',
        isFormSubmission: !!metadata?.formSubmission,
        source: metadata?.formSubmission ? 'URL params' : 
               (metadata?.fromCookies ? 'Cookies' : 
               (metadata?.fromUserAttributes ? 'User attributes' : 'Unknown'))
      });

      if (!metadata) {
        throw new Error("No metadata provided to subscription component");
      }
      
      // If coming directly from business-info form or we have business data
      if (metadata.businessName) {
        setBusinessData({
          businessName: metadata.businessName || '',
          businessType: metadata.businessType || ''
        });
        
        logger.info('[Subscription] Successfully initialized with business data');

        // Ensure onboarding cookies are set consistently
        if (typeof document !== 'undefined') {
          try {
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 7);
            
            document.cookie = `onboardingStep=subscription; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `onboardedStatus=business_info; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `businessName=${encodeURIComponent(metadata.businessName)}; path=/; expires=${expiration.toUTCString()}`;
            if (metadata.businessType) {
              document.cookie = `businessType=${encodeURIComponent(metadata.businessType)}; path=/; expires=${expiration.toUTCString()}`;
            }
          } catch (e) {
            logger.error('[Subscription] Error setting cookies:', e);
          }
        }
      } else if (metadata.noBusinessData) {
        // Show an error but don't block rendering completely
        logger.error('[Subscription] No business data found in any source');
        setError('Missing business information. Please go back and complete the business info step first.');
      }
    } catch (error) {
      logger.error('[Subscription] Error initializing component:', error);
      setError('Error initializing subscription page. Please try again or go back to the previous step.');
    } finally {
      // Always complete initialization to avoid leaving component in loading state
      setInitializing(false);
    }
  }, [metadata]);

  // Show loading state when initializing
  if (initializing) {
    return (
      <Container maxWidth="md">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <CircularProgress className="mb-2" />
          <Typography variant="body1" color="textSecondary">
            Loading subscription options...
          </Typography>
        </div>
      </Container>
    );
  }

  // More user-friendly error state for missing business info
  if (error && error.includes('Missing business information')) {
    return (
      <Container maxWidth="md">
        <div className="my-4">
          <Alert 
            severity="warning"
            className="mb-3"
          >
            {error}
          </Alert>
          <Typography variant="body1" className="mb-3">
            We need your business information to show you the right subscription options.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => router.push('/onboarding/business-info')}
            className="mt-1"
          >
            Go Back to Business Info
          </Button>
        </div>
      </Container>
    );
  }

  // Loading state for session if we're still waiting for user data
  if (sessionLoading && !businessData.businessName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <CircularProgress className="mb-2" />
        <Typography variant="body1" color="textSecondary">
          Verifying account information...
        </Typography>
      </div>
    );
  }

  // Handle billing cycle change
  const handleBillingCycleChange = (event, newBillingCycle) => {
    if (newBillingCycle !== null) {
      setBillingCycle(newBillingCycle);
    }
  };

  const handlePlanSelection = async (plan) => {
    setSelectedPlan(plan);
    setSubmitting(true);

    try {
      logger.debug('[Subscription] Plan selected:', plan);
      
      // Update state and get navigation in one call using enhanced onboarding hook
      await updateState('subscription', {
        selectedPlan: plan.id,
        pricingTier: plan.tier,
        planType: plan.type,
        price: plan.price
      });
      
      logger.debug('[Subscription] State updated successfully');
      toast.success(`${plan.name} plan selected successfully!`);
      
      // Navigate to the next step using the enhanced onboarding hook
      await navigateToNextStep('subscription', {
        selectedPlan: plan.id,
        pricingTier: plan.tier
      });
    } catch (error) {
      logger.error('[Subscription] Plan selection failed:', error);
      toast.error('Failed to process your selection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler for payment method selection
  const handlePaymentMethodChange = (event) => {
    setSelectedPaymentMethod(event.target.value);
  };

  // Handle payment tab change
  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };

  // Continue button handler for payment method
  const handleContinue = () => {
    if (!selectedPaymentMethod || isSubmitting || isUpdating) return;
    handleSubscriptionSubmit(selectedPlan, billingCycle, selectedPaymentMethod);
  };

  // Main submission handler - modified to handle payment method routing
  const handleSubscriptionSubmit = async (planId, billingInterval, paymentMethod) => {
    setIsSubmitting(true);
    setError(null);
    try {
      logger.debug('[Subscription] Submitting subscription:', {
        planId,
        planId_lc: planId.toLowerCase(),
        billingInterval,
        paymentMethod,
        businessData
      });

      // Make plan ID consistent by always using lowercase
      const normalizedPlanId = planId.toLowerCase();

      // Save the subscription plan to cookies regardless of plan type
      if (typeof document !== 'undefined') {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 7); // 7 days
        
        document.cookie = `subscriptionPlan=${normalizedPlanId}; path=/; expires=${expiration.toUTCString()}`;
        document.cookie = `subscriptionInterval=${billingInterval}; path=/; expires=${expiration.toUTCString()}`;
      }

      // If free plan, no payment needed
      if (normalizedPlanId === 'free') {
        // Set loading/status message
        setError('Setting up free plan...');
        
        try {
          // Store in sessionStorage with consistent property names
          sessionStorage.setItem(
            'pendingSubscription',
            JSON.stringify({
              plan: normalizedPlanId,
              billing_interval: billingInterval,
              interval: billingInterval,
              timestamp: new Date().toISOString(),
              businessName: businessData.businessName,
              businessType: businessData.businessType
            })
          );
          
          // Set pending schema setup in sessionStorage for the dashboard to pick up
          // The dashboard will handle showing content while setup happens in background
          sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
            plan: 'free',
            timestamp: new Date().toISOString(),
            source: 'subscription_page',
            backgroundSetup: true // Flag indicating setup should happen in background
          }));
          
          // Store the business info in cookies
          if (typeof document !== 'undefined') {
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 7); // 7 days
            
            // Set our state to SUBSCRIPTION
            document.cookie = `onboardingStep=setup; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `onboardedStatus=subscription; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `subplan=${normalizedPlanId}; path=/; expires=${expiration.toUTCString()}`;
          }
          
          // Update Cognito attributes via the API with more comprehensive set of attributes
          await updateUserAttributes({
            userAttributes: {
              'custom:subplan': normalizedPlanId,
              'custom:onboarding': 'subscription',
              'custom:setupdone': 'false',
              'custom:updated_at': new Date().toISOString(),
              'custom:businessName': businessData.businessName,
              'custom:businessType': businessData.businessType
            }
          });
          
          // MODIFIED: Ensure tenant is set up before redirecting
          setError('Setting up your account, please wait...');
          
          // Call the API to initialize tenant setup and wait for it to complete
          const setupResponse = await fetch('/api/onboarding/subscription/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plan: normalizedPlanId,
              interval: billingInterval,
              background_setup: false,  // Changed to false to wait for completion
              business_name: businessData.businessName,
              business_type: businessData.businessType
            }),
          });
          
          if (!setupResponse.ok) {
            const errorData = await setupResponse.json();
            logger.error('[Subscription] Tenant setup failed:', errorData);
            throw new Error(errorData.message || 'Failed to set up your account');
          }
          
          const setupData = await setupResponse.json();
          logger.info('[Subscription] Tenant setup completed:', setupData);
          
          // Verify that tenant was created successfully before continuing
          const tenantVerifyResponse = await fetch('/api/auth/verify-tenant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tenantId: setupData.tenantId || setupData.data?.tenantId,
              userId: user?.sub,
              email: user?.email,
            })
          });
          
          if (!tenantVerifyResponse.ok) {
            const errorData = await tenantVerifyResponse.json();
            logger.error('[Subscription] Tenant verification failed:', errorData);
            throw new Error(errorData.message || 'Failed to verify your account');
          }
          
          const tenantData = await tenantVerifyResponse.json();
          logger.info('[Subscription] Tenant verified successfully:', tenantData);
          
          // Update setup status
          if (typeof document !== 'undefined') {
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 7);
            document.cookie = `setupCompleted=true; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `onboardedStatus=COMPLETE; path=/; expires=${expiration.toUTCString()}`;
            document.cookie = `tenantId=${tenantData.tenantId}; path=/; expires=${expiration.toUTCString()}`;
          }
          
          // Set success message
          setError('Redirecting to dashboard...');
          
          // Small delay to ensure cookies are set before redirect
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } catch (e) {
          logger.error('[Subscription] Free plan setup failed:', e);
          setError(`Failed to set up free plan: ${e.message}`);
          setIsSubmitting(false);
        }
      } else {
        // For paid plans (Professional, Enterprise)
        logger.debug('[Subscription] Setting up paid plan:', {
          planId: normalizedPlanId,
          billingInterval,
          paymentMethod
        });

        // Set an error message indicating the selected plan
        setError(`Setting up ${normalizedPlanId} plan...`);

        // Store the business info in cookies for paid plans too
        if (typeof document !== 'undefined') {
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7); // 7 days
          
          document.cookie = `onboardingStep=payment; path=/; expires=${expiration.toUTCString()}`;
          document.cookie = `onboardedStatus=subscription; path=/; expires=${expiration.toUTCString()}`;
          document.cookie = `subplan=${normalizedPlanId}; path=/; expires=${expiration.toUTCString()}`;
        }
        
        // Update Cognito attributes for paid plans
        await updateUserAttributes({
          userAttributes: {
            'custom:subplan': normalizedPlanId,
            'custom:onboarding': 'payment',
            'custom:setupdone': 'false',
            'custom:updated_at': new Date().toISOString(),
            'custom:businessName': businessData.businessName,
            'custom:businessType': businessData.businessType,
            'custom:subscriptioninterval': billingInterval
          }
        });

        // Make sure to store with consistent property names and normalized values
        sessionStorage.setItem(
          'pendingSubscription',
          JSON.stringify({
            plan: normalizedPlanId,
            billing_interval: billingInterval,
            interval: billingInterval, // Include both for compatibility
            payment_method: paymentMethod,
            paymentMethod: paymentMethod, // Include both for compatibility
            timestamp: new Date().toISOString(),
            businessName: businessData.businessName,
            businessType: businessData.businessType
          })
        );
        
        // Debug: Log the stored subscription
        const storedData = sessionStorage.getItem('pendingSubscription');
        logger.debug('[Subscription] Stored subscription data:', {
          raw: storedData,
          parsed: JSON.parse(storedData)
        });

        // Redirect to payment page
        router.push('/onboarding/payment');
      }
    } catch (e) {
      logger.error('[Subscription] Error submitting subscription:', { error: e.message });
      setError(`An error occurred: ${e.message}`);
      setIsSubmitting(false);
    }
  };

  // Function to get plan color based on id
  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  // Determine if a paid plan is selected
  const isPaidPlanSelected = selectedPlan === 'professional' || selectedPlan === 'enterprise';

  return (
    <Container maxWidth="lg">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex p-1 bg-gray-100 rounded-lg border border-gray-200">
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            className="w-full"
          >
            <ToggleButton value="monthly" className="rounded-lg font-medium py-2 px-6">
              Monthly
            </ToggleButton>
            <ToggleButton value="annual" className="rounded-lg font-medium py-2 px-6">
              Annual <span className="ml-1 text-xs font-bold text-green-600">Save 17%</span>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>

      {error && (
        <Alert
          severity={error.includes('Setting up') || error.includes('Processing') || error.includes('Redirecting') ? 'info' : 'error'}
          className="mb-8 whitespace-pre-line rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Typography variant="subtitle1" component="div">
              {error}
            </Typography>
            {(error.includes('Setting up') || error.includes('Processing') || error.includes('Redirecting')) && (
              <CircularProgress size="small" />
            )}
          </div>
        </Alert>
      )}

      {/* Plan selection cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center">
        {PLANS.map((plan) => (
          <div key={plan.id} className="col-span-1">
            <Card
              className={`h-full flex flex-col relative overflow-visible rounded-xl transition-all duration-300 ${
                selectedPlan === plan.id 
                  ? `border-2 border-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-500 shadow-lg transform -translate-y-2` 
                  : 'shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              {/* Popular badge */}
              {plan.id === 'professional' && (
                <div
                  className="absolute -top-3 right-6 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md z-10"
                >
                  POPULAR
                </div>
              )}
              
              {/* Best value badge */}
              {plan.id === 'enterprise' && (
                <div
                  className="absolute -top-3 right-6 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-md z-10"
                >
                  BEST VALUE
                </div>
              )}
              
              <CardContent className="flex-grow p-6">
                <Typography variant="h5" component="h2" className="font-semibold">
                  {plan.name}
                </Typography>
                <Typography variant="h4" className={`text-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-600 font-bold`}>
                  ${plan.price[billingCycle]}
                  <Typography
                    component="span"
                    variant="subtitle1"
                    className="ml-1 text-gray-500 font-normal"
                  >
                    {billingCycle === 'monthly' ? '/month' : '/year'}
                  </Typography>
                </Typography>
                
                <Divider className="my-4" />
                
                <div className="mt-4">
                  {plan.features.map((feature) => (
                    <div 
                      key={feature}
                      className="flex items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className={`text-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'green'}-500 mr-3 font-bold`}>
                        ✓
                      </span>
                      <Typography variant="body2" className="text-gray-700">
                        {feature}
                      </Typography>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardActions className="p-6 pt-0">
                <Button
                  fullWidth
                  variant={selectedPlan === plan.id ? 'contained' : 'outlined'}
                  onClick={() => handlePlanSelection(plan)}
                  disabled={submitting || isUpdating}
                  className={`py-3 rounded-lg text-base font-medium ${
                    selectedPlan === plan.id 
                      ? `bg-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-600 hover:bg-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-700 text-white shadow-md` 
                      : `text-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-600 border-${plan.id === 'professional' ? 'purple' : plan.id === 'enterprise' ? 'indigo' : 'blue'}-600`
                  }`}
                >
                  {(submitting || isUpdating) && selectedPlan === plan.id ? (
                    <CircularProgress size="small" />
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </CardActions>
            </Card>
          </div>
        ))}
      </div>

      {/* Payment Method Selection - Only show for paid plans and animate appearance */}
      <Collapse in={isPaidPlanSelected}>
        <Fade in={isPaidPlanSelected} timeout={800}>
          <div className="mt-8">
            <Card className="p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <Typography variant="h6">
                  Selected Plan: {selectedPlan === 'professional' ? 'Professional' : 'Enterprise'}
                </Typography>
                <Typography variant="h6" className="text-primary-600">
                  ${selectedPlan && PLANS.find(p => p.id === selectedPlan)?.price[billingCycle]}{billingCycle === 'monthly' ? '/month' : '/year'}
                </Typography>
              </div>
              
              <Divider className="mb-6" />
              
              <Typography variant="h6" className="mb-4">
                How would you like to pay?
              </Typography>
              
              <FormControl className="w-full">
                <RadioGroup
                  name="payment-method"
                  value={selectedPaymentMethod}
                  onChange={handlePaymentMethodChange}
                  className="space-y-4"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <div 
                      key={method.id}
                      className={`p-4 border rounded-lg transition-all ${
                        selectedPaymentMethod === method.id 
                          ? 'border-primary-500 shadow-md' 
                          : 'border-gray-200 shadow-sm'
                      }`}
                    >
                      <FormControlLabel
                        value={method.id}
                        control={<Radio />}
                        label={
                          <div className="flex items-center ml-2">
                            <span className="mr-3 text-gray-500">
                              {method.icon === 'credit_card' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              )}
                              {method.icon === 'account_balance_wallet' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              )}
                              {method.icon === 'smartphone' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                            </span>
                            <div>
                              <Typography variant="subtitle1">{method.name}</Typography>
                              <Typography variant="body2" className="text-gray-500">
                                {method.description}
                              </Typography>
                            </div>
                          </div>
                        }
                        className="w-full m-0"
                      />
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              
              <div className="flex justify-end mt-6">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleContinue}
                  disabled={!selectedPaymentMethod || submitting || isUpdating}
                  className="min-w-[200px]"
                >
                  {submitting || isUpdating ? (
                    <CircularProgress size="small" />
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </Fade>
      </Collapse>
    </Container>
  );
}

export default Subscription;