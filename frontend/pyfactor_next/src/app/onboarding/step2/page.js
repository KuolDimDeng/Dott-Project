
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/step2/page.js
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import {
  Box, Typography, Grid, Button, Card, CardContent, CardActions, Container, Divider, styled
} from '@mui/material';
import Image from 'next/image';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axios from 'axios';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const BillingToggle = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 30,
  padding: 3,
  position: 'relative',
  cursor: 'pointer',
  '& .MuiBillingToggle-option': {
    padding: '8px 20px',
    borderRadius: 28,
    zIndex: 1,
    transition: theme.transitions.create(['color', 'background-color'], { duration: 200 }),
    color: 'black',
  },
  '& .MuiBillingToggle-option.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

  // Function to make the API request
  const makeRequest = async (token, data) => {
    const apiUrl = 'http://localhost:8000';

    console.log("Making request with token:", token);
    const response = await fetch(`${apiUrl}/api/complete-onboarding/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    console.log("Response status:", response.status);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error response body:", errorBody);
      throw new Error(`Failed to complete onboarding. Status: ${response.status}, Body: ${errorBody}`);
    }

    return response;
  };

// Async helper function to handle subscription selection
const handleSubscription = async (session, plan, formData, billingCycle, refreshToken, setErrorMessage, router) => {
  console.log("Subscription selected:", plan);

  try {
      let currentToken = session.accessToken;

      // 1-minute buffer to check if the token is about to expire
      const tokenBufferTime = 60 * 1000; // 1-minute buffer
      if (new Date(session.expires) - tokenBufferTime <= new Date()) {
          console.log("Access token expired or about to expire, attempting to refresh...");
          currentToken = await refreshToken(session);
      }

      const onboardingData = {
          business: formData, // Make sure formData is accessible here
          selectedPlan: plan.title,
          billingCycle: billingCycle,
      };
      console.log("Onboarding data:", onboardingData);

      const response = await makeRequest(currentToken, onboardingData);
      const result = await response.json();
      console.log("Onboarding completed successfully:", result);

      // Redirect to the dashboard after successful onboarding
      router.push('/dashboard');
  } catch (error) {
      console.error('Onboarding completion error:', error);
      setErrorMessage('There was an error completing onboarding. Please try again.');
  }
};

const OnboardingStep2 = ({ nextStep, prevStep, formData }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { data: session, update } = useSession();  // session is handled by next-auth

  const handleBillingCycleChange = (cycle) => setBillingCycle(cycle);
  const apiUrl = 'http://localhost:8000';

  // Refresh token function
  const refreshToken = async (session) => {
    console.log("Attempting to refresh token...");
    try {
        const response = await fetch(`${apiUrl}/api/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh: session.refreshToken,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Token refresh successful:", data);
          return data.access;
        } else {
          const errorData = await response.text();
          console.error("Token refresh failed:", response.status, errorData);
          throw new Error(`Failed to refresh token: ${response.status} ${errorData}`);
        }
      } catch (error) {
        console.error("Error in refreshToken:", error);
        throw error;
      }
  };



  // Trigger the subscription selection asynchronously
  const handleSubscriptionSelect = (plan) => {
    handleSubscription(session, plan, formData, billingCycle, refreshToken, setErrorMessage, router);
  };

  const tiers = [
    {
      title: 'Basic',
      price: { monthly: '0', annual: '0' },
      description: ['1 user included', 'Track income and expenses', '2 GB of storage'],
      buttonText: 'Get started for free',
      buttonVariant: 'outlined',
    },
    {
      title: 'Professional',
      subheader: 'Recommended',
      price: { monthly: '15', annual: '150' },
      description: ['Unlimited users', 'Payroll processing', '20 GB of storage'],
      buttonText: 'Start Professional',
      buttonVariant: 'contained',
    },
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', py: 6, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
            <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
              STEP 2 OF 2
            </Typography>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Choose the plan that best suits you
            </Typography>

            <BillingToggle>
              <Box
                className={`MuiBillingToggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => handleBillingCycleChange('monthly')}
              >
                Monthly
              </Box>
              <Box
                className={`MuiBillingToggle-option ${billingCycle === 'annual' ? 'active' : ''}`}
                onClick={() => handleBillingCycleChange('annual')}
              >
                Annual
              </Box>
            </BillingToggle>
          </Box>

          {errorMessage && <Typography color="error">{errorMessage}</Typography>}

          <Grid container spacing={4}>
            {tiers.map((tier) => (
              <Grid item key={tier.title} xs={12} sm={6}>
                <Card sx={{ height: '100%', p: 4, borderRadius: 4 }}>
                  <CardContent>
                    <Typography variant="h4">{tier.title}</Typography>
                    <Typography variant="h3">
                      ${tier.price[billingCycle]} / {billingCycle === 'monthly' ? 'month' : 'year'}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    {tier.description.map((line) => (
                      <Box key={line} sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />
                        <Typography>{line}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant={tier.buttonVariant}
                      onClick={() => handleSubscriptionSelect(tier)}
                    >
                      {tier.buttonText}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button variant="outlined" onClick={prevStep}>
              Previous Step 1
            </Button>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default OnboardingStep2;
