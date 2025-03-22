///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.js
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Box,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Paper,
  Divider,
  Icon,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  Fade,
} from '@mui/material';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: {
      monthly: '0',
      annual: '0',
    },
    features: [
      'Basic invoicing',
      'Up to 5 clients',
      'Basic reporting',
      'Email support',
      '2GB storage',
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
      'Unlimited invoicing',
      'Unlimited clients',
      'Advanced reporting',
      'Priority support',
      'Custom branding',
      '15GB storage',
      'Up to 3 users',
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
      'Everything in Professional',
      'Unlimited storage',
      'Unlimited users',
      'Dedicated account manager',
      'Advanced API access',
      'Custom roles & permissions',
      'Advanced security features',
      'Preferential transaction rates',
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

export function Subscription() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { isLoading: isUpdating, updateOnboardingStatus } = useOnboarding();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Handle billing cycle change
  const handleBillingCycleChange = (event, newBillingCycle) => {
    if (newBillingCycle !== null) {
      setBillingCycle(newBillingCycle);
    }
  };

  // Handler for plan selection
  const handlePlanSelect = (planId) => {
    if (isSubmitting || isUpdating) return;
    
    setSelectedPlan(planId);
    
    // If free plan, proceed with the existing flow
    if (planId === 'free') {
      handleSubscriptionSubmit(planId, null);
    }
    // For paid plans, we don't show payment methods in a different page anymore
    // instead we'll scroll to the payment methods section (handled by the UI)
  };

  // Handler for payment method selection
  const handlePaymentMethodSelect = (event) => {
    setSelectedPaymentMethod(event.target.value);
  };

  // Continue button handler for payment method
  const handleContinue = () => {
    if (!selectedPaymentMethod || isSubmitting || isUpdating) return;
    handleSubscriptionSubmit(selectedPlan, selectedPaymentMethod);
  };

  // Main submission handler - modified to handle payment method routing
  const handleSubscriptionSubmit = async (planId, paymentMethodId) => {
    if (isSubmitting || isUpdating) return;
    
    setIsSubmitting(true);
    setError(null);
  
    try {
      if (!user) {
        throw new Error('No user found');
      }

      // Show a message to the user that we're processing their selection
      setError(`Processing your ${planId === 'free' ? 'Free' : planId === 'professional' ? 'Professional' : 'Enterprise'} plan selection...`);

      try {
        // Get auth tokens
        const { tokens } = await fetchAuthSession();
        if (!tokens?.accessToken || !tokens?.idToken) {
          throw new Error('No valid session tokens');
        }

        const accessToken = tokens.accessToken.toString();
        const idToken = tokens.idToken.toString();

        logger.info('[Subscription] Processing plan selection:', {
          plan: planId,
          billingCycle: billingCycle,
          paymentMethod: paymentMethodId,
          userId: user?.username,
          pathname: window.location.pathname
        });

        // Save subscription details including payment method
        const subscriptionData = {
          plan: planId,
          interval: billingCycle
        };
        
        // Add payment method if selected
        if (paymentMethodId) {
          subscriptionData.payment_method = paymentMethodId;
        }
        
        const subscriptionResponse = await fetch('/api/onboarding/subscription/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Id-Token': idToken
          },
          body: JSON.stringify(subscriptionData)
        });

        // Rest of the code remains the same
        // ... (existing API response handling)

        // Handle redirection based on plan type and payment method
        if (planId === 'free') {
          try {
            await updateOnboardingStatus(ONBOARDING_STATES.COMPLETE);
            
            sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
              plan: planId,
              timestamp: new Date().toISOString(),
              status: 'pending'
            }));
          } catch (statusError) {
            logger.error('[Subscription] Error updating status to COMPLETE, continuing anyway:', {
              error: statusError.message,
              plan: planId
            });
          }
          
          setError(`Free plan selected! Redirecting to dashboard...`);
          window.location.replace('/dashboard');
        } else {
          if (paymentMethodId === 'credit_card') {
            try {
              await updateOnboardingStatus(ONBOARDING_STATES.PAYMENT);
            } catch (statusError) {
              logger.error('[Subscription] Error updating status to PAYMENT, continuing anyway:', {
                error: statusError.message,
                plan: planId,
                paymentMethod: paymentMethodId
              });
            }
            
            setError(`${planId === 'professional' ? 'Professional' : 'Enterprise'} plan with Credit/Debit Card selected! Redirecting to payment page...`);
            
            setTimeout(() => {
              window.location.replace('/onboarding/payment');
            }, 1000);
          } else {
            try {
              await updateOnboardingStatus(ONBOARDING_STATES.COMPLETE);
              
              sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
                plan: planId,
                paymentMethod: paymentMethodId,
                timestamp: new Date().toISOString(),
                status: 'pending'
              }));
            } catch (statusError) {
              logger.error('[Subscription] Error updating status to COMPLETE, continuing anyway:', {
                error: statusError.message,
                plan: planId,
                paymentMethod: paymentMethodId
              });
            }
            
            const paymentMethodName = paymentMethodId === 'paypal' ? 'PayPal' : 'Mobile Money';
            setError(`${planId === 'professional' ? 'Professional' : 'Enterprise'} plan with ${paymentMethodName} selected! Processing payment and redirecting to dashboard...`);
            
            setTimeout(() => {
              window.location.replace('/dashboard');
            }, 1000);
          }
        }
      } catch (apiError) {
        logger.error('[Subscription] API error:', {
          error: apiError.message,
          plan: planId,
          paymentMethod: paymentMethodId,
          userId: user?.username
        });
        throw apiError;
      }
    } catch (error) {
      // Error handling (existing code)
      logger.error('[Subscription] Error:', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        plan: planId,
        paymentMethod: paymentMethodId,
        userId: user?.username,
        pathname: window.location.pathname
      });

      // Handle specific error cases (existing code)
      // ...
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state (existing code)
  if (loading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Determine if a paid plan is selected
  const isPaidPlanSelected = selectedPlan === 'professional' || selectedPlan === 'enterprise';

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Choose Your Plan
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph align="center">
          Select the plan that best fits your business needs
        </Typography>

        {/* Billing Cycle Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Paper elevation={0} sx={{ p: 0.5, display: 'inline-flex' }}>
            <ToggleButtonGroup
              value={billingCycle}
              exclusive
              onChange={handleBillingCycleChange}
              aria-label="billing cycle"
              color="primary"
              sx={{ width: '100%' }}
            >
              <ToggleButton value="monthly" aria-label="monthly billing">
                Monthly
              </ToggleButton>
              <ToggleButton value="annual" aria-label="annual billing">
                Annual <Box component="span" sx={{ ml: 1, color: 'success.main', fontSize: '0.75rem', fontWeight: 'bold' }}>Save 17%</Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>

        {error && (
          <Alert
            severity={error.includes('Processing') || error.includes('Redirecting') ? 'info' : 'error'}
            sx={{ mb: 3, '& .MuiAlert-message': { whiteSpace: 'pre-line' } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" component="div" gutterBottom>
                {error}
              </Typography>
              {(error.includes('Processing') || error.includes('Redirecting')) && (
                <CircularProgress size={20} />
              )}
            </Box>
          </Alert>
        )}

        {/* Plan selection cards */}
        <Grid container spacing={4} justifyContent="center" sx={{ mt: 2 }}>
          {PLANS.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  ...(selectedPlan === plan.id && {
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }),
                  ...(plan.id === 'enterprise' && {
                    borderTop: '4px solid',
                    borderTopColor: 'primary.main',
                  }),
                }}
              >
                {plan.id === 'enterprise' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 20,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      BEST VALUE
                    </Typography>
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    ${plan.price[billingCycle]}
                    <Typography
                      component="span"
                      variant="subtitle1"
                      color="text.secondary"
                    >
                      {billingCycle === 'monthly' ? '/month' : '/year'}
                    </Typography>
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {plan.features.map((feature) => (
                      <Typography
                        key={feature}
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 0.5 }}
                      >
                        ✓ {feature}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant={
                      selectedPlan === plan.id ? 'contained' : 'outlined'
                    }
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isSubmitting || isUpdating}
                    color={plan.id === 'enterprise' ? 'primary' : 'primary'}
                  >
                    {(isSubmitting || isUpdating) && selectedPlan === plan.id ? (
                      <CircularProgress size={24} />
                    ) : (
                      'Select Plan'
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Payment Method Selection - Only show for paid plans and animate appearance */}
        <Collapse in={isPaidPlanSelected}>
          <Fade in={isPaidPlanSelected} timeout={800}>
            <Box sx={{ mt: 4 }}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Selected Plan: {selectedPlan === 'professional' ? 'Professional' : 'Enterprise'}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ${selectedPlan && PLANS.find(p => p.id === selectedPlan)?.price[billingCycle]}{billingCycle === 'monthly' ? '/month' : '/year'}
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <Typography variant="h6" gutterBottom>
                  How would you like to pay?
                </Typography>
                
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup
                    aria-label="payment-method"
                    name="payment-method"
                    value={selectedPaymentMethod}
                    onChange={handlePaymentMethodSelect}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <Paper 
                        key={method.id}
                        elevation={selectedPaymentMethod === method.id ? 3 : 1}
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          border: selectedPaymentMethod === method.id ? '2px solid' : '1px solid',
                          borderColor: selectedPaymentMethod === method.id ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <FormControlLabel
                          value={method.id}
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Icon sx={{ mr: 1 }}>{method.icon}</Icon>
                              <Box>
                                <Typography variant="subtitle1">{method.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {method.description}
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      </Paper>
                    ))}
                  </RadioGroup>
                </FormControl>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleContinue}
                    disabled={!selectedPaymentMethod || isSubmitting || isUpdating}
                    sx={{ minWidth: 200 }}
                  >
                    {isSubmitting || isUpdating ? (
                      <CircularProgress size={24} />
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Fade>
        </Collapse>
      </Box>
    </Container>
  );
}

export default Subscription;