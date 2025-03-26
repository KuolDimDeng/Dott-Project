'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Divider, 
  Card, 
  CardContent, 
  CardActions, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Tabs,
  Tab,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import StorageIcon from '@mui/icons-material/Storage';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ApiIcon from '@mui/icons-material/Api';
import SecurityIcon from '@mui/icons-material/Security';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

/**
 * Home Component
 * A simplified home component that doesn't make heavy API calls
 */
function Home({ userData }) {
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit_card');

  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };

  const handlePaymentMethodChange = (event) => {
    setSelectedPaymentMethod(event.target.value);
  };

  const handlePlanDetailsOpen = () => {
    setPlanDetailsOpen(true);
  };

  const handlePlanDetailsClose = () => {
    setPlanDetailsOpen(false);
  };

  const handleUpgradeDialogOpen = () => {
    setUpgradeDialogOpen(true);
  };

  const handleUpgradeDialogClose = () => {
    setUpgradeDialogOpen(false);
  };

  // Data for subscription plans
  const PLANS = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '0',
      description: 'Basic features for small businesses just getting started',
      features: [
        'Basic invoicing',
        'Up to 5 clients',
        'Basic reporting',
        'Email support',
        '2GB storage',
      ],
      limitations: [
        'Limited to 5 invoices per month',
        'No custom branding',
        'Basic reporting only',
        'No API access',
        'Single user only',
      ]
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '15',
      description: 'Advanced features for growing businesses',
      features: [
        'Unlimited invoicing',
        'Unlimited clients',
        'Advanced reporting',
        'Priority support',
        'Custom branding',
        '15GB storage',
        'Up to 3 users',
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '45',
      description: 'Full suite of tools for established businesses',
      features: [
        'Everything in Professional',
        'Unlimited storage',
        'Unlimited users',
        'Dedicated account manager',
        'Advanced API access',
        'Custom roles & permissions',
        'Advanced security features',
        'Preferential transaction rates',
      ]
    },
  ];

  // Find current user's plan
  const currentPlan = PLANS.find(plan => 
    plan.id === (userData?.subscription_type?.toLowerCase() || 'free')
  ) || PLANS[0];

  // Feature icons mapping
  const featureIcons = {
    'invoice': <CheckCircleOutlineIcon />,
    'clients': <PeopleAltIcon />,
    'reporting': <ShowChartIcon />,
    'support': <SupportAgentIcon />,
    'storage': <StorageIcon />,
    'users': <PeopleAltIcon />,
    'api': <ApiIcon />,
    'security': <SecurityIcon />,
  };

  // Helper function to get an icon for a feature
  const getFeatureIcon = (feature) => {
    if (feature.includes('invoic')) return featureIcons.invoice;
    if (feature.includes('client')) return featureIcons.clients;
    if (feature.includes('report')) return featureIcons.reporting;
    if (feature.includes('support')) return featureIcons.support;
    if (feature.includes('storage')) return featureIcons.storage;
    if (feature.includes('user')) return featureIcons.users;
    if (feature.includes('API')) return featureIcons.api;
    if (feature.includes('security')) return featureIcons.security;
    return <CheckCircleOutlineIcon />;
  };

  // Function to get plan color
  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  return (
    <Box sx={{ pt: 1.5, pb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Home
      </Typography>
      
      <Typography variant="body1" paragraph>
        Welcome to your Dott dashboard, {userData?.first_name || 'User'}!
      </Typography>
      
      {/* Subscription Expired Banner */}
      {userData?.subscription_expired && (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            bgcolor: 'error.light',
            borderLeft: '4px solid',
            borderColor: 'error.main',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'error.dark' }}>
            Your {userData.previous_plan} subscription has expired
          </Typography>
          <Typography variant="body1" paragraph>
            Your account has been downgraded to the Free plan. You now have limited access to features.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" color="error" onClick={handleUpgradeDialogOpen}>
              Renew Subscription
            </Button>
            <Button variant="outlined" color="error" onClick={handlePlanDetailsOpen}>
              View Plan Details
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Regular Plan Banner (shown when subscription is not expired) */}
      {!userData?.subscription_expired && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            bgcolor: 'primary.light',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Your {currentPlan.name} is active
          </Typography>
          <Typography variant="body1" paragraph>
            You have access to all the features included in your plan.
          </Typography>
          <Button variant="contained" color="primary" onClick={handlePlanDetailsOpen}>
            View Plan Details
          </Button>
        </Paper>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Getting Started
            </Typography>
            <Typography variant="body2" paragraph>
              Complete these steps to get the most out of your account:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Complete your business profile
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Add your first customer
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Create your first product or service
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2">
                  Explore the dashboard features
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Recent Updates
            </Typography>
            <Typography variant="body2" paragraph>
              No recent updates to display.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updates about your account and new features will appear here.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Plan Details Dialog */}
      <Dialog 
        open={planDetailsOpen} 
        onClose={handlePlanDetailsClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Your Subscription Details
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {currentPlan.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ mr: 1 }}>
                ${currentPlan.price}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per month
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              {currentPlan.description}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              <Chip icon={<CloudDoneIcon />} label="Active" color="success" variant="outlined" />
              <Chip icon={<VerifiedUserIcon />} label="Current Plan" color="primary" variant="outlined" />
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" gutterBottom>
            Features Included
          </Typography>
          <List>
            {currentPlan.features.map((feature) => (
              <ListItem key={feature}>
                <ListItemIcon>
                  {getFeatureIcon(feature)}
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>

          {currentPlan.id === 'free' && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Limitations on Free Plan
              </Typography>
              <List>
                {currentPlan.limitations.map((limitation) => (
                  <ListItem key={limitation}>
                    <ListItemText primary={limitation} />
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ mt: 3, mb: 1 }}>
                <Typography variant="body1" paragraph>
                  Upgrade now to unlock all features and remove limitations!
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleUpgradeDialogOpen}
                >
                  Upgrade Here
                </Button>
              </Box>
            </>
          )}

          {currentPlan.id === 'professional' && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ mt: 3, mb: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleUpgradeDialogOpen}
                >
                  Upgrade to Enterprise
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePlanDetailsClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Subscription Dialog */}
      <Dialog 
        open={upgradeDialogOpen} 
        onClose={handleUpgradeDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Upgrade Your Subscription
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Choose a plan that suits your business needs
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {currentPlan.id === 'free' 
              ? PLANS.filter(plan => plan.id !== 'free').map((plan) => (
                <Grid item xs={12} sm={6} key={plan.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderColor: getPlanColor(plan.id),
                      boxShadow: plan.id === 'enterprise' ? 2 : 0,
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="h2">
                        {plan.name}
                      </Typography>
                      <Typography variant="h5" sx={{ color: getPlanColor(plan.id) }} gutterBottom>
                        ${plan.price}
                        <Typography
                          component="span"
                          variant="subtitle2"
                          color="text.secondary"
                        >
                          /month
                        </Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {plan.description}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {plan.features.slice(0, 5).map((feature) => (
                          <Typography
                            key={feature}
                            variant="body2"
                            color="text.secondary"
                            sx={{ py: 0.5 }}
                          >
                            ✓ {feature}
                          </Typography>
                        ))}
                        {plan.features.length > 5 && (
                          <Typography
                            variant="body2"
                            color="primary"
                            sx={{ py: 0.5 }}
                          >
                            + {plan.features.length - 5} more features
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{ bgcolor: getPlanColor(plan.id), '&:hover': { bgcolor: getPlanColor(plan.id) } }}
                      >
                        Select {plan.name}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
              : currentPlan.id === 'professional' && (
                <Grid item xs={12} sm={12}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderColor: getPlanColor('enterprise'),
                      boxShadow: 2,
                    }}
                  >
                    {PLANS.find(plan => plan.id === 'enterprise') && (
                      <>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="h2">
                            {PLANS.find(plan => plan.id === 'enterprise').name}
                          </Typography>
                          <Typography variant="h5" color="primary" gutterBottom>
                            ${PLANS.find(plan => plan.id === 'enterprise').price}
                            <Typography
                              component="span"
                              variant="subtitle2"
                              color="text.secondary"
                            >
                              /month
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {PLANS.find(plan => plan.id === 'enterprise').description}
                          </Typography>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Upgrade Benefits from Professional Plan:
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            {PLANS.find(plan => plan.id === 'enterprise').features
                              .filter(feature => 
                                !PLANS.find(plan => plan.id === 'professional').features.includes(feature))
                              .map((feature) => (
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
                            variant="contained"
                            sx={{ bgcolor: getPlanColor('enterprise'), '&:hover': { bgcolor: getPlanColor('enterprise') } }}
                          >
                            Upgrade to Enterprise
                          </Button>
                        </CardActions>
                      </>
                    )}
                  </Card>
                </Grid>
              )
            }
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Payment Method
          </Typography>
          
          <Tabs value={paymentTab} onChange={handlePaymentTabChange} sx={{ mb: 2 }}>
            <Tab label="Credit/Debit Card" />
            <Tab label="PayPal" />
            <Tab label="Mobile Money" />
          </Tabs>
          
          {paymentTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    placeholder="MM/YY"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CVV"
                    placeholder="123"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cardholder Name"
                    placeholder="John Doe"
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {paymentTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                You will be redirected to PayPal to complete your payment after clicking the button below.
              </Typography>
            </Box>
          )}
          
          {paymentTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={selectedPaymentMethod}
                  onChange={handlePaymentMethodChange}
                >
                  <FormControlLabel 
                    value="mobile_money_mtn" 
                    control={<Radio />} 
                    label="MTN Mobile Money" 
                  />
                  <FormControlLabel 
                    value="mobile_money_airtel" 
                    control={<Radio />} 
                    label="Airtel Money" 
                  />
                  <FormControlLabel 
                    value="mobile_money_other" 
                    control={<Radio />} 
                    label="Other Mobile Money" 
                  />
                </RadioGroup>
              </FormControl>
              <TextField
                fullWidth
                label="Mobile Number"
                placeholder="Enter your mobile number"
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUpgradeDialogClose}>Cancel</Button>
          <Button variant="contained" color="primary">
            Complete Upgrade
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Home;