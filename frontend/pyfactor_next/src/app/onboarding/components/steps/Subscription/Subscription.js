'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { ONBOARDING_STATES } from '@/app/onboarding/state/OnboardingStateManager';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
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
} from '@mui/material';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/hooks/useOnboarding';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    features: [
      'Basic invoicing',
      'Up to 5 clients',
      'Basic reporting',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '29',
    features: [
      'Unlimited invoicing',
      'Unlimited clients',
      'Advanced reporting',
      'Priority support',
      'Custom branding',
      'Team collaboration',
      'API access',
    ],
  },
];

export function Subscription() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { isLoading: isUpdating, handleStepCompletion } = useOnboarding();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlanSelect = async (planId) => {
    if (isSubmitting || isUpdating) return;
    
    setIsSubmitting(true);
    setError(null);
    setSelectedPlan(planId);
  
    try {
      if (!user) {
        throw new Error('No user found');
      }

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
          userId: user?.username
        });

        // First update onboarding state
        await handleStepCompletion(ONBOARDING_STATES.SUBSCRIPTION, {
          plan: planId,
          interval: 'monthly',
          isVerified: false
        });

        // Save subscription details first
        const subscriptionResponse = await fetch('/api/onboarding/subscription/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Id-Token': idToken
          },
          body: JSON.stringify({
            plan: planId,
            interval: 'monthly'
          })
        });

        if (!subscriptionResponse.ok) {
          const error = await subscriptionResponse.json();
          throw new Error(error.message || 'Failed to save subscription');
        }

        const subscriptionResult = await subscriptionResponse.json();
        logger.info('[Subscription] Plan saved successfully:', {
          plan: planId,
          result: subscriptionResult
        });

        // Update onboarding state
        await handleStepCompletion(ONBOARDING_STATES.SUBSCRIPTION, {
          plan: planId,
          interval: 'monthly',
          isVerified: true
        });

        // Handle redirection based on plan type
        if (planId === 'free') {
          logger.info('[Subscription] Free plan selected, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          logger.info('[Subscription] Paid plan selected, redirecting to payment');
          router.push('/onboarding/payment');
        }
      } catch (apiError) {
        logger.error('[Subscription] API error:', {
          error: apiError.message,
          plan: planId,
          userId: user?.username
        });
        throw apiError; // Re-throw to be caught by outer catch
      }
  
      logger.debug('Plan selection updated successfully', {
        plan: planId,
        timestamp: new Date().toISOString(),
      });
  
      // handleStepCompletion will handle the navigation
    } catch (error) {
      logger.error('[Subscription] Error:', {
        error: error.message,
        plan: planId,
        userId: user?.username
      });

      // Handle specific error cases
      if (error.message.includes('401') || error.message.includes('session')) {
        setError('Your session has expired. Please sign in again.');
        try {
          await logout();
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1000);
        } catch (logoutError) {
          logger.error('Failed to logout:', logoutError);
          router.push('/auth/signin');
        }
        return;
      }

      // Handle backend service errors
      if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        setError('Backend service is not running. Please start the backend server.');
      } else if (error.message.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError(error.message || 'Failed to save subscription. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Choose Your Plan
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          paragraph
          align="center"
        >
          Select the plan that best fits your business needs
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              '& .MuiAlert-message': {
                whiteSpace: 'pre-line'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" component="div" gutterBottom>
                {error}
              </Typography>
              {error.includes('Redirecting') && (
                <CircularProgress size={20} />
              )}
            </Box>
            {error.includes('Backend service is not running') && (
              <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 1 }}>
                Please start the backend server by running these commands in a new terminal:
                {'\n1. cd backend/pyfactor'}
                {'\n2. python manage.py runserver'}
              </Typography>
            )}
          </Alert>
        )}

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
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    ${plan.price}
                    <Typography
                      component="span"
                      variant="subtitle1"
                      color="text.secondary"
                    >
                      /month
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
      </Box>
    </Container>
  );
}

export default Subscription;
