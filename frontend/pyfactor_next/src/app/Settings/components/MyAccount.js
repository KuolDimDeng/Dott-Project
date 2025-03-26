import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Alert,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

const MyAccount = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  
  const handleUpgradeClick = () => {
    router.push('/onboarding/subscription');
  };

  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  const renderAccountInfo = () => {
    return (
      <Box>
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: '#0a3977',
                color: '#ffffff',
                fontSize: 24,
                mr: 2,
              }}
            >
              {userData?.first_name?.charAt(0)}{userData?.last_name?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h5">{userData?.full_name || 'User'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {userData?.email || 'user@example.com'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Business Name
              </Typography>
              <Typography variant="body1">{userData?.business_name || 'My Business'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Subscription Plan
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label={userData?.subscription_type === 'enterprise' 
                    ? 'Enterprise Plan' 
                    : userData?.subscription_type === 'professional' 
                      ? 'Professional Plan' 
                      : 'Free Plan'} 
                  color={userData?.subscription_type === 'free' ? 'default' : 'primary'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                {userData?.subscription_type === 'free' && (
                  <Button size="small" variant="outlined" color="primary" onClick={handleUpgradeClick}>
                    Upgrade
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Phone Number
              </Typography>
              <Typography variant="body1">{userData?.phone_number || 'Not provided'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Account Created
              </Typography>
              <Typography variant="body1">
                {userData?.created_at 
                  ? new Date(userData.created_at).toLocaleDateString() 
                  : 'Not available'}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<PersonIcon />}
              onClick={() => router.push('/settings/profile')}
            >
              Edit Profile
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderSubscriptionManagement = () => {
    // Get current plan features based on subscription type
    const getPlanFeatures = (planType) => {
      switch(planType) {
        case 'enterprise':
          return [
            'Unlimited Invoices',
            'Unlimited Clients',
            'Advanced Reporting',
            'Premium Support',
            'Unlimited Storage',
            'Unlimited Users',
            'API Access',
            'Enhanced Security'
          ];
        case 'professional':
          return [
            'Up to 1000 Invoices',
            'Up to 500 Clients',
            'Standard Reporting',
            'Priority Support',
            '50GB Storage',
            'Up to 10 Users',
            'Basic API Access',
            'Standard Security'
          ];
        default: // Free plan
          return [
            'Up to 5 Invoices',
            'Up to 3 Clients',
            'Basic Reporting',
            'Community Support',
            '1GB Storage',
            '1 User',
            'No API Access',
            'Basic Security'
          ];
      }
    };

    const currentPlanFeatures = getPlanFeatures(userData?.subscription_type);
    const currentPlanType = userData?.subscription_type || 'free';

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Current Subscription
        </Typography>
        
        <Card sx={{ mb: 3, border: '1px solid', borderColor: getPlanColor(currentPlanType) }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ color: getPlanColor(currentPlanType) }}>
                {userData?.subscription_type === 'enterprise' 
                  ? 'Enterprise Plan' 
                  : userData?.subscription_type === 'professional' 
                    ? 'Professional Plan' 
                    : 'Free Plan'}
              </Typography>
              <Chip 
                label="Active" 
                sx={{ 
                  bgcolor: getPlanColor(currentPlanType),
                  color: 'white',
                }}
                size="small"
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Plan Features:
            </Typography>
            
            <Grid container spacing={1}>
              {currentPlanFeatures.map((feature, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon sx={{ mr: 1, color: getPlanColor(currentPlanType) }} fontSize="small" />
                    <Typography variant="body2">{feature}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
          <CardActions>
            {userData?.subscription_type === 'free' ? (
              <Button 
                variant="contained" 
                sx={{ 
                  bgcolor: getPlanColor('professional'),
                  '&:hover': { bgcolor: getPlanColor('professional') }
                }}
                fullWidth
                onClick={handleUpgradeClick}
              >
                Upgrade Plan
              </Button>
            ) : (
              <>
                <Button 
                  variant="outlined" 
                  sx={{ 
                    color: getPlanColor(currentPlanType),
                    borderColor: getPlanColor(currentPlanType),
                  }}
                >
                  Manage Subscription
                </Button>
                <Button variant="outlined" color="secondary" sx={{ ml: 1 }}>
                  View Billing History
                </Button>
              </>
            )}
          </CardActions>
        </Card>
        
        {userData?.subscription_type === 'free' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid', borderColor: getPlanColor('professional') }}>
                <CardContent>
                  <Typography variant="h6">Professional Plan</Typography>
                  <Typography variant="h4" sx={{ my: 2, color: getPlanColor('professional') }}>
                    $19.99<Typography variant="caption">/mo</Typography>
                  </Typography>
                  <List dense>
                    {getPlanFeatures('professional').map((feature, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon sx={{ color: getPlanColor('professional') }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      bgcolor: getPlanColor('professional'),
                      '&:hover': { bgcolor: getPlanColor('professional') }
                    }}
                    fullWidth
                    onClick={handleUpgradeClick}
                  >
                    Upgrade
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ border: '1px solid', borderColor: getPlanColor('enterprise') }}>
                <CardContent>
                  <Typography variant="h6">Enterprise Plan</Typography>
                  <Typography variant="h4" sx={{ my: 2, color: getPlanColor('enterprise') }}>
                    $49.99<Typography variant="caption">/mo</Typography>
                  </Typography>
                  <List dense>
                    {getPlanFeatures('enterprise').map((feature, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon sx={{ color: getPlanColor('enterprise') }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      bgcolor: getPlanColor('enterprise'),
                      '&:hover': { bgcolor: getPlanColor('enterprise') }
                    }}
                    fullWidth
                    onClick={handleUpgradeClick}
                  >
                    Upgrade
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    );
  };

  const renderBillingHistory = () => {
    // Mock data for billing history
    const billingHistory = [
      { id: 1, date: '2023-03-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
      { id: 2, date: '2023-02-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
      { id: 3, date: '2023-01-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
    ];

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Billing History
        </Typography>
        
        {billingHistory.length > 0 ? (
          <Paper elevation={1}>
            <List>
              {billingHistory.map((item) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemIcon>
                      <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${item.plan} Plan - $${item.amount}`} 
                      secondary={new Date(item.date).toLocaleDateString()}
                    />
                    <Chip 
                      label={item.status} 
                      color={item.status === 'Paid' ? 'success' : 'warning'} 
                      size="small"
                    />
                    <Button size="small" sx={{ ml: 2 }}>
                      Download
                    </Button>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        ) : (
          <Alert severity="info">
            No billing history available.
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Account
      </Typography>
      
      <Tabs 
        value={selectedTab} 
        onChange={handleTabChange}
        sx={{ mb: 3 }}
      >
        <Tab label="Account Info" icon={<PersonIcon />} iconPosition="start" />
        <Tab label="Subscription" icon={<CreditCardIcon />} iconPosition="start" />
        <Tab label="Billing History" icon={<HistoryIcon />} iconPosition="start" />
      </Tabs>
      
      {selectedTab === 0 && renderAccountInfo()}
      {selectedTab === 1 && renderSubscriptionManagement()}
      {selectedTab === 2 && renderBillingHistory()}
    </Box>
  );
};

export default MyAccount; 