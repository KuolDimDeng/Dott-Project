
////Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/Step3.js
'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Container, Button, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { axiosInstance } from '@/lib/axiosConfig';  // Changed this import


// Initialize Stripe with your public key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const Step3Component = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, updateFormData, saveStep3Data } = useOnboarding();

  // Query to check if user should be on this page
  const { data: planData } = useQuery({
    queryKey: ['planCheck'],
    queryFn: async () => {
      if (formData.selectedPlan !== 'Professional') {
        router.push('/onboarding/step4');
        return null;
      }
      return formData;
    },
    enabled: !!formData.selectedPlan,
  });

  // Mutation for creating Stripe checkout session
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/checkout/create-session/', {
        billingCycle: formData.billingCycle,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ 
        sessionId: data.sessionId 
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      queryClient.invalidateQueries(['onboardingStatus']);
    },
  });

  const handlePayment = async () => {
    try {
      // Use saveStep3Data from context instead of local mutation
      await saveStep3Data({ paymentInitiated: true });
      await checkoutMutation.mutateAsync();
    } catch (error) {
      console.error('Payment process failed:', error);
    }
  };

  const { loading, error } = useOnboarding();  // Get loading and error states from context

  if (!planData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image 
            src="/static/images/Pyfactor.png" 
            alt="Pyfactor Logo" 
            width={150} 
            height={50} 
            priority 
          />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>
            Complete Your Subscription
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Professional Plan
          </Typography>
        </Box>

        {(error || checkoutMutation.error) && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {checkoutMutation.error?.message || error?.message || 'An error occurred during payment setup'}
          </Alert>
        )}

        <Box sx={{ width: '100%', mb: 4 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You've selected the Professional plan. Please complete your payment to continue.
          </Typography>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Total: ${formData.billingCycle === 'monthly' ? '15 per month' : '150 per year'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePayment}
          disabled={loading || checkoutMutation.isPending}
          sx={{ minWidth: 200 }}
        >
          {(loading || checkoutMutation.isPending) ? (
            <CircularProgress size={24} />
          ) : (
            'Complete Payment'
          )}
        </Button>

        <Button
          variant="text"
          onClick={() => router.push('/onboarding/step2')}
          disabled={loading || checkoutMutation.isPending}
          sx={{ mt: 2 }}
        >
          Back to Plan Selection
        </Button>
      </Container>
    </ThemeProvider>
  );
};


// Memoize the component
const Step3 = memo(Step3Component);

// Export the component
export default Step3;
