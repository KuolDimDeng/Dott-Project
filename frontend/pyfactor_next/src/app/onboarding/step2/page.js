// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/step2/page.js

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { Box, Typography, Grid, Button, Card, CardContent, CardActions, Container, Divider, styled, CircularProgress } from '@mui/material';
import Image from 'next/image';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useOnboarding } from '../contexts/onboardingContext';


const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
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

const OnboardingStep2 = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const router = useRouter();
  const { data: session, status } = useSession();
  const { formData, goToPrevStep, completeOnboarding, loading, error } = useOnboarding();

  const handleBillingCycleChange = (cycle) => setBillingCycle(cycle);

  const handleSubscriptionSelect = async (tier) => {
    try {
      const subscriptionData = {
        ...formData,
        selectedPlan: tier.title,
        billingCycle: billingCycle
      };
      await completeOnboarding(subscriptionData);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
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

  if (status === "loading" || loading) return <CircularProgress />;
  if (!session) return <Typography>Please sign in to access onboarding.</Typography>;

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ minHeight: '100vh', py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
          <Typography variant="h6" color="primary">STEP 2 OF 2</Typography>
          <Typography variant="h4">Choose the plan that best suits you</Typography>
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
        {error && <Typography color="error" align="center" sx={{ mb: 2 }}>{error}</Typography>}
        
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
                      <CheckCircleRoundedIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography>{line}</Typography>
                    </Box>
                  ))}
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant={tier.buttonVariant}
                    onClick={() => handleSubscriptionSelect(tier)}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : tier.buttonText}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button variant="outlined" onClick={goToPrevStep} disabled={loading}>
            Previous Step
          </Button>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default OnboardingStep2;