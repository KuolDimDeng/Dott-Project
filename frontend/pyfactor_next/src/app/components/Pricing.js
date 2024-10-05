'use client';

import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const tiers = [
  {
    title: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    description: [
      '1 user included',
      'Track income and expenses',
      'Mobile money payments (Africa, India, etc.)',
      '2 GB of storage',
      'Basic reporting and analytics',
      'Standard email support',
    ],
    buttonText: 'Get started for free',
    buttonVariant: 'outlined',
  },
  {
    title: 'Professional',
    subheader: 'Recommended',
    price: {
      monthly: '15',
      annual: '150',
    },
    description: [
      'Unlimited users',
      'Payroll processing (self-service)',
      'Track unlimited income & expenses',
      'Automated invoicing and reminders',
      '20 GB of storage',
      'Advanced reporting and analytics',
      'Custom integrations & API access',
      'Accept payments via Stripe, PayPal, and mobile money (MTN, Venmo, Airtel, etc.)',
      'Priority support',
    ],
    buttonText: 'Start Professional',
    buttonVariant: 'contained',
  },
];

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
    transition: theme.transitions.create(['color', 'background-color'], {
      duration: 200,
    }),
  },
  '& .MuiBillingToggle-option.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

const FeatureComparison = styled(Box)(({ theme }) => ({
  backgroundColor: '#F0F8FF', // Very light blue background
  padding: theme.spacing(8, 0),
  borderRadius: theme.shape.borderRadius,
}));

const FeatureRow = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2, 0),
  '&:nth-of-type(even)': {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
}));

const PlanColumn = styled(Grid)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}));

const FeatureCheck = styled(CheckIcon)(({ theme }) => ({
  color: theme.palette.success.main,
}));

const FeatureClose = styled(CloseIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const features = [
  { name: "Track income and expenses", starter: true, pro: true },
  { name: "Mobile money payments", starter: true, pro: true },
  { name: "Send automated invoices and reminders", starter: false, pro: true },
  { name: "Payroll processing (self-service)", starter: false, pro: true },
  { name: "Advanced reporting and analytics", starter: false, pro: true },
  { name: "Custom integrations and API access", starter: false, pro: true },
  { name: "Accept Stripe, PayPal, and more", starter: false, pro: true },
  { name: "20 GB of storage", starter: false, pro: true },
];
function CompareFeatures() {
  return (
    <FeatureComparison>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" gutterBottom >
          Compare Full Plan Features
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" align="left" fontWeight="bold">Features</Typography>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="h6" align="center" fontWeight="bold">Basic</Typography>
            <Box mt={2} display="flex" justifyContent="center">
              <Button variant="outlined" color="primary" size="large">
                Select Basic
              </Button>
            </Box>
          </Grid>
          <Grid item xs={6} md={4}>
            <Typography variant="h6" align="center" fontWeight="bold">Professional</Typography>
            <Box mt={2} display="flex" justifyContent="center">
              <Button variant="contained" color="primary" size="large">
                Select Professional
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Box mt={6}>
          {features.map((feature, index) => (
            <FeatureRow container key={index}>
              <Grid item xs={12} md={4}>
                <Typography variant="body1">{feature.name}</Typography>
              </Grid>
              <Grid item xs={6} md={4} align="center">
                {feature.starter ? <FeatureCheck /> : <FeatureClose />}
              </Grid>
              <Grid item xs={6} md={4} align="center">
                {feature.pro ? <FeatureCheck /> : <FeatureClose />}
              </Grid>
            </FeatureRow>
          ))}
        </Box>
        <Box mt={6}>
          <Typography variant="body2" align="center">
            Prices do not include applicable tax. Subscriptions auto-renew. Cancel anytime.
          </Typography>
        </Box>
      </Container>
    </FeatureComparison>
  );
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = React.useState('monthly');

  const handleBillingCycleChange = (cycle) => {
    setBillingCycle(cycle);
  };

  return (
    <>
      <Container
        id="pricing"
        sx={{
          pt: { xs: 8, sm: 16 },
          pb: { xs: 8, sm: 16 },
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 6, sm: 8 },
        }}
      >
        <Box
          sx={{
            width: { sm: '100%', md: '70%' },
            textAlign: 'center',
          }}
        >
          <Typography component="h2" variant="h3" color="text.primary" fontWeight="bold" mb={2}>
            Simple, transparent pricing
          </Typography>
          <Typography variant="h5" color="text.secondary">
            Choose the plan that's right for your business
          </Typography>
        </Box>
        
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

        <Grid container spacing={4} alignItems="center" justifyContent="center">
          {tiers.map((tier) => (
            <Grid item key={tier.title} xs={12} sm={6} md={6}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 4,
                  borderRadius: 4,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 22px 40px 4px rgba(0, 0, 0, 0.1)',
                  },
                  ...(tier.title === 'Professional' && {
                    background: 'linear-gradient(135deg, #1976d2, #064988)',
                    color: 'white',
                  }),
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      mb: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h4" component="h3" fontWeight="bold">
                      {tier.title}
                    </Typography>
                    {tier.subheader && (
                      <Chip
                        icon={<AutoAwesomeIcon />}
                        label={tier.subheader}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: '#1976d2',
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      mb: 2,
                    }}
                  >
                    <Typography component="h4" variant="h3" fontWeight="bold">
                      ${tier.price[billingCycle]}
                    </Typography>
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 3, opacity: 0.3 }} />
                  {tier.description.map((line) => (
                    <Box
                      key={line}
                      sx={{
                        py: 1,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircleRoundedIcon sx={{ color: tier.title === 'Professional' ? 'white' : 'primary.main' }} />
                      <Typography variant="body1">
                        {line}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
                <CardActions sx={{ mt: 4 }}>
                  <Button
                    fullWidth
                    variant={tier.buttonVariant}
                    color={tier.title === 'Professional' ? 'secondary' : 'primary'}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      ...(tier.title === 'Professional' && {
                        color: '#1976d2',
                        backgroundColor: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }),
                    }}
                  >
                    {tier.buttonText}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      <CompareFeatures />
    </>
  );
}
