///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.js
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import { fetchAuthSession, updateUserAttributes } from 'aws-amplify/auth';
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
    logger.debug('[Subscription] Plan selected:', { planId, planId_lc: planId.toLowerCase() });
    setSelectedPlan(planId);
    // If Free, submit immediately
    if (planId.toLowerCase() === 'free') {
      handleSubscriptionSubmit(planId, 'monthly', null);
    }
  };

  // Handler for payment method selection
  const handlePaymentMethodSelect = (event) => {
    setSelectedPaymentMethod(event.target.value);
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
        paymentMethod
      });

      // Make plan ID consistent by always using lowercase
      const normalizedPlanId = planId.toLowerCase();

      // If free plan, no payment needed
      if (normalizedPlanId === 'free') {
        // ... existing code ...
      } else {
        // For paid plans (Professional, Enterprise)
        logger.debug('[Subscription] Setting up paid plan:', {
          planId: normalizedPlanId,
          billingInterval,
          paymentMethod
        });

        // Set an error message indicating the selected plan
        setError(`Setting up ${normalizedPlanId} plan...`);

        // Make sure to store with consistent property names and normalized values
        sessionStorage.setItem(
          'pendingSubscription',
          JSON.stringify({
            plan: normalizedPlanId,
            billing_interval: billingInterval,
            interval: billingInterval, // Include both for compatibility
            payment_method: paymentMethod,
            paymentMethod: paymentMethod, // Include both for compatibility
            timestamp: new Date().toISOString()
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
      {/* Billing Cycle Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 0.5, 
            display: 'inline-flex', 
            borderRadius: 3,
            backgroundColor: '#f0f4f8',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            aria-label="billing cycle"
            color="primary"
            sx={{ 
              width: '100%',
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: 3,
                fontWeight: 500,
                py: 1,
                px: 3
              }
            }}
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
          severity={error.includes('Setting up') || error.includes('Processing') || error.includes('Redirecting') ? 'info' : 'error'}
          sx={{ 
            mb: 4, 
            '& .MuiAlert-message': { whiteSpace: 'pre-line' },
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" component="div">
              {error}
            </Typography>
            {(error.includes('Setting up') || error.includes('Processing') || error.includes('Redirecting')) && (
              <CircularProgress size={20} />
            )}
          </Box>
        </Alert>
      )}

      {/* Plan selection cards */}
      <Grid container spacing={4} justifyContent="center">
        {PLANS.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                borderRadius: 3,
                overflow: 'visible', // Allow elements to overflow for the badge
                boxShadow: selectedPlan === plan.id 
                  ? '0 8px 24px rgba(0,0,0,0.12)' 
                  : '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                transform: selectedPlan === plan.id ? 'translateY(-8px)' : 'none',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.15)',
                },
                ...(selectedPlan === plan.id && {
                  border: '2px solid',
                  borderColor: 'primary.main',
                }),
              }}
            >
              {/* Popular badge */}
              {plan.id === 'professional' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 24,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 1
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    POPULAR
                  </Typography>
                </Box>
              )}
              
              {/* Best value badge */}
              {plan.id === 'enterprise' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 24,
                    backgroundColor: 'primary.dark',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 1
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    BEST VALUE
                  </Typography>
                </Box>
              )}
              
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Typography gutterBottom variant="h5" component="h2" fontWeight={600}>
                  {plan.name}
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom fontWeight={700}>
                  ${plan.price[billingCycle]}
                  <Typography
                    component="span"
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{ ml: 0.5, fontWeight: 400 }}
                  >
                    {billingCycle === 'monthly' ? '/month' : '/year'}
                  </Typography>
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mt: 2 }}>
                  {plan.features.map((feature) => (
                    <Box 
                      key={feature}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        py: 0.75,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(0,0,0,0.06)',
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          color: 'success.main', 
                          display: 'flex', 
                          mr: 1.5,
                          fontSize: '1.2rem',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✓
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  fullWidth
                  variant={selectedPlan === plan.id ? 'contained' : 'outlined'}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isSubmitting || isUpdating}
                  color="primary"
                  sx={{ 
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    boxShadow: selectedPlan === plan.id ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'
                  }}
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
      </Container>
  );
}

export default Subscription;