// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/step3/page.js

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Container, Button, CircularProgress } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useOnboarding } from '../contexts/onboardingContext';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const OnboardingStep3 = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { formData, updateFormData, saveStep3Data } = useOnboarding();

  useEffect(() => {
    if (formData.selectedPlan !== 'Professional') {
      router.push('/onboarding/step4');
    }
  }, [formData.selectedPlan, router]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Here you would typically integrate with a payment provider
      // For this example, we'll just simulate a payment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // After successful payment, save the data and move to the next step
      await saveStep3Data({ paymentCompleted: true });
      router.push('/onboarding/step4');
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle payment failure (show error message, etc.)
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>Complete Your Subscription</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>Professional Plan</Typography>
        </Box>
        <Box sx={{ width: '100%', mb: 4 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You've selected the Professional plan. Please complete your payment to continue.
          </Typography>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Total: ${formData.billingCycle === 'monthly' ? '15/month' : '150/year'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Complete Payment'}
        </Button>
      </Container>
    </ThemeProvider>
  );
};

export default OnboardingStep3;