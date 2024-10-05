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

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

// Define BillingToggle using styled
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

const OnboardingStep2 = ({ nextStep, prevStep, formData }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { data: session } = useSession();  // session is handled by next-auth

  const handleBillingCycleChange = (cycle) => setBillingCycle(cycle);

  const handleSubscriptionSelect = async (tier) => {
    try {
      console.log('Subscription selected:', tier);
      
      // Example: collect the subscription data
      const subscriptionData = {
        selectedPlan: tier.title,
        billingCycle: billingCycle,
        formData: formData,  // Add any form data that needs to be sent
      };

      // Log the session for debugging
      console.log("Session data:", session);

      if (!session) {
        setErrorMessage("You must be authenticated to select a plan.");
        return;
      }

      const token = session.accessToken;

      // Example API call to submit the subscription
      const response = await fetch('http://localhost:8000/api/complete-onboarding/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Onboarding success:", result);

      // Redirect to the dashboard after successful onboarding
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      setErrorMessage('There was an error completing the onboarding process. Please try again.');
    }
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
