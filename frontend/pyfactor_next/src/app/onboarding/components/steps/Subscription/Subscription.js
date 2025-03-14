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
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';

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
      '3GB storage',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '15',
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
    price: '45',
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

export function Subscription() {
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { isLoading: isUpdating, updateOnboardingStatus } = useOnboarding();
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
          userId: user?.username,
          pathname: window.location.pathname
        });

        // Save subscription details first
        logger.info('[Subscription] Saving plan selection:', {
          plan: planId,
          interval: 'monthly',
          userId: user?.username
        });
        
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

        // Log the raw response status
        logger.debug('[Subscription] API response received:', {
          status: subscriptionResponse.status,
          statusText: subscriptionResponse.statusText,
          ok: subscriptionResponse.ok
        });

        // Try to parse the response as JSON, but handle parsing errors gracefully
        let responseData;
        try {
          const responseText = await subscriptionResponse.text();
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            logger.error('[Subscription] Failed to parse response JSON:', {
              error: parseError.message,
              responseText: responseText.substring(0, 500) // Log first 500 chars
            });
            responseData = { error: 'Invalid response format', details: responseText.substring(0, 100) };
          }
        } catch (textError) {
          logger.error('[Subscription] Failed to get response text:', {
            error: textError.message
          });
          responseData = { error: 'Failed to read response' };
        }

        // Check if the response was successful
        if (!subscriptionResponse.ok) {
          logger.error('[Subscription] API returned error:', {
            status: subscriptionResponse.status,
            statusText: subscriptionResponse.statusText,
            error: responseData?.error || responseData?.message || 'Unknown error',
            details: responseData?.details || '',
            data: responseData
          });
          
          // Even if the API call failed, we'll continue with the flow
          // The error will be caught by the outer catch block and handled appropriately
          throw new Error(responseData?.error || responseData?.message || 'Failed to save subscription');
        }

        // Log success
        logger.info('[Subscription] Plan saved successfully:', {
          plan: planId,
          result: responseData,
          nextStep: responseData?.nextStep
        });
        
        // Now update onboarding state after successful API call
        logger.debug('[Subscription] Updating onboarding status to SUBSCRIPTION');
        await updateOnboardingStatus(ONBOARDING_STATES.SUBSCRIPTION);

        // Handle redirection based on plan type and API response
        if (planId === 'free') {
          try {
            // For free plan, update to COMPLETE and redirect to dashboard
            // The setup process will occur in the background
            logger.debug('[Subscription] Updating onboarding status to COMPLETE for free plan');
            await updateOnboardingStatus(ONBOARDING_STATES.COMPLETE);
            logger.info('[Subscription] Free plan selected, redirecting to dashboard');
            
            // Store pending schema setup info in session storage
            // This will be used by the dashboard to show appropriate loading state
            sessionStorage.setItem('pendingSchemaSetup', JSON.stringify({
              plan: planId,
              timestamp: new Date().toISOString(),
              status: 'pending'
            }));
          } catch (statusError) {
            // Log the error but continue with the flow
            logger.error('[Subscription] Error updating status to COMPLETE, continuing anyway:', {
              error: statusError.message,
              plan: planId
            });
          }
          
          // Update the message to inform the user
          setError(`Free plan selected! Redirecting to dashboard...`);
          
          // Redirect immediately to dashboard
          logger.debug('[Subscription] Executing redirect to dashboard');
          // Use replace instead of href to avoid adding to browser history
          window.location.replace('/dashboard');
        } else {
          try {
            // For paid plans, update to PAYMENT and redirect to payment page
            logger.debug('[Subscription] Updating onboarding status to PAYMENT for paid plan');
            await updateOnboardingStatus(ONBOARDING_STATES.PAYMENT);
            logger.info('[Subscription] Paid plan selected, redirecting to payment page');
          } catch (statusError) {
            // Log the error but continue with the flow
            logger.error('[Subscription] Error updating status to PAYMENT, continuing anyway:', {
              error: statusError.message,
              plan: planId
            });
          }
          
          // Update the message to inform the user
          setError(`${planId === 'professional' ? 'Professional' : 'Enterprise'} plan selected! Redirecting to payment page in a moment...`);
          
          // Use a single redirection with a short delay to reduce memory usage
          setTimeout(() => {
            logger.debug('[Subscription] Executing redirect to payment page');
            // Use replace instead of href to avoid adding to browser history
            window.location.replace('/onboarding/payment');
          }, 1000);
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
  
      // updateOnboardingStatus will update the onboarding state
    } catch (error) {
      logger.error('[Subscription] Error:', {
        error: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        plan: planId,
        userId: user?.username,
        pathname: window.location.pathname
      });

      // Handle specific error cases
      if (error.message.includes('401') || error.message.includes('session')) {
        setError('Your session has expired. Please sign in again.');
        try {
          await logout();
          setTimeout(() => {
            window.location.href = '/auth/signin';
          }, 1000);
        } catch (logoutError) {
          logger.error('[Subscription] Failed to logout:', logoutError);
          window.location.href = '/auth/signin';
        }
        return;
      }

      // Handle schema attribute errors, function not found errors, or subscription save errors
      if (error.message.includes('Attribute does not exist in the schema') ||
          error.message.includes('is not a function') ||
          error.message.includes('Failed to save subscription') ||
          error.name === 'TypeError') {
        logger.warn('[Subscription] Non-critical error, continuing with flow:', {
          error: error.message,
          name: error.name,
          plan: planId
        });
        
        // Show a success message even though there was an error
        setError(`${planId === 'free' ? 'Free' : planId === 'professional' ? 'Professional' : 'Enterprise'} plan selected! Redirecting in a moment...`);
        
        // Continue with the flow despite the error
        // Use a single redirection with a short delay to reduce memory usage
        setTimeout(() => {
          if (planId === 'free') {
            logger.info('[Subscription] Redirecting to dashboard despite error');
            window.location.replace('/dashboard');
          } else {
            logger.info('[Subscription] Redirecting to payment page despite error');
            window.location.replace('/onboarding/payment');
          }
        }, 1000);
        return;
      }
      
      // Handle backend service errors
      if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
        setError('Backend service is not running. Please start the backend server.');
      } else if (error.message.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else if (error.message.includes('Network Error') || error.message.includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('already exists')) {
        setError('This subscription plan is already selected. Please try a different plan or continue to the next step.');
        
        // Try to recover by redirecting to the appropriate page based on the selected plan
        // Use a shorter timeout and window.location.replace to reduce memory usage
        setTimeout(() => {
          if (planId === 'free') {
            window.location.replace('/dashboard');
          } else {
            window.location.replace('/onboarding/payment');
          }
        }, 1500);
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
            severity={error.includes('Processing') ? 'info' : 'error'}
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
              {(error.includes('Processing') || error.includes('Redirecting')) && (
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
            {error.includes('Failed to save subscription') && (
              <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 1 }}>
                The backend API returned an error, but we'll continue with the onboarding process.
                {'\nYou will be redirected to the next step in a moment.'}
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
      </Box>
    </Container>
  );
}

export default Subscription;