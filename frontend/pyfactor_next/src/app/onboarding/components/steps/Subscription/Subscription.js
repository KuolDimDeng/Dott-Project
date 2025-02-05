'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
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
import { useAuth } from '@/hooks/useAuth';
import { updateUserAttributes } from '@/config/amplify';

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

export function Subscription({ onNext }) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { signOut } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanSelect = async (planId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Update user attributes in Cognito
      await updateUserAttributes({
        'custom:selected_plan': planId,
        'custom:onboarding': planId === 'free' ? 'setup' : 'payment'
      });

      // Update session to reflect new attributes
      await update();

      logger.debug('Plan selection updated successfully', {
        plan: planId,
        timestamp: new Date().toISOString()
      });

      onNext();
    } catch (error) {
      logger.error('Failed to update plan selection:', error);
      setError(error.message || 'Failed to select plan');

      if (error.code === 'NotAuthorizedException') {
        await signOut();
        router.push('/auth/signin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
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
        <Typography variant="body1" color="text.secondary" paragraph align="center">
          Select the plan that best fits your business needs
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
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
                    variant={selectedPlan === plan.id ? 'contained' : 'outlined'}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isLoading}
                  >
                    {isLoading && selectedPlan === plan.id ? (
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
