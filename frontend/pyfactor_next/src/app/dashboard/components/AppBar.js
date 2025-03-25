import React, { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Badge,
  Box,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  Tooltip,
  Collapse,
  Paper,
  Popover,
  Divider,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  Tabs,
  Tab,
  Link,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Image from 'next/image';
import logoPath from '/public/static/images/PyfactorDashboard.png';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardLanguageSelector from './LanguageSelector';

// Colors for menu and theme
const menuBackgroundColor = '#f0f3f9'; // Very light gray with blue tint

const AppBar = ({
  drawerOpen,
  handleDrawerToggle,
  userData,
  anchorEl,
  openMenu,
  handleClick,
  handleClose,
  handleAccountClick,
  handleSettingsClick,
  settingsAnchorEl,
  settingsMenuOpen,
  handleSettingsClose,
  handleIntegrationsClick,
  isShopifyConnected,
  handleUserProfileClick,
  handleAlertClick,
  handleDashboardClick,
  handleDeviceSettingsClick,
  handleSettingsOptionSelect,
  selectedSettingsOption,
  handleLogout,
  handleHelpClick,
  handlePrivacyClick,
  handleTermsClick,
  mainBackground,
  textAppColor,
  handleHomeClick,
}) => {
  // Generate initials from the first and last name
  const getInitials = (name) => {
    if (!name) return '';
    const [firstName, lastName] = name.split(' ');
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const initials = userData ? getInitials(`${userData?.first_name || ''} ${userData?.last_name || ''}`) : '';
  console.log('userData in AppBar:', {
    userData,
    business_name: userData?.business_name,
    subscription_type: userData?.subscription_type,
    full_data: JSON.stringify(userData, null, 2)
  });
  
  // Define getSubscriptionLabel function before using it
  const getSubscriptionLabel = (type) => {
    if (!type) return 'Free Plan';
    
    // Normalize the type to handle case variations
    const normalizedType = typeof type === 'string' ? type.toString().toLowerCase() : 'free';
    
    console.log('Normalized subscription type:', normalizedType);
    
    // Enhanced matching to handle more variations
    if (normalizedType.includes('pro')) {
      return 'Professional Plan';
    } else if (normalizedType.includes('ent')) {
      return 'Enterprise Plan';
    } else if (normalizedType.includes('basic')) {
      return 'Basic Plan';
    } else {
      return 'Free Plan';
    }
  };
  
  // Add enhanced logging for subscription data sources
  const userSubscriptionType = userData?.subscription_type;
  const cognitoSubplan = userData?.['custom:subplan'];
  const profileSubscription = userData?.subscription_plan;
  
  // Try multiple sources for the subscription plan with fallbacks
  const subscriptionType = userSubscriptionType || cognitoSubplan || profileSubscription || 'free';
  const displayLabel = getSubscriptionLabel(subscriptionType);
  
  console.log('Subscription debug info:', {
    userData_subscription_type: userSubscriptionType,
    cognito_subplan: cognitoSubplan,
    profile_subscription: profileSubscription,
    derived_type: subscriptionType,
    normalized_type: subscriptionType ? subscriptionType.toLowerCase() : null,
    display_label: displayLabel,
    user_full_data: userData
  });
  
  const [subscriptionMenuOpen, setSubscriptionMenuOpen] = useState(false);
  const [subscriptionAnchorEl, setSubscriptionAnchorEl] = useState(null);
  const [isSubscriptionMenuOpen, setIsSubscriptionMenuOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit_card');
  
  // State for window width to handle menu positioning
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Update window width on resize for responsive menu positioning
  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };

  const handlePaymentMethodChange = (event) => {
    setSelectedPaymentMethod(event.target.value);
  };

  const handleSubscriptionClick = (event) => {
    if (userData?.subscription_type !== 'professional' && 
        userData?.subscription_type !== 'enterprise') {
      setIsSubscriptionMenuOpen(!isSubscriptionMenuOpen);
      setSubscriptionAnchorEl(subscriptionAnchorEl ? null : event.currentTarget);
    }
  };

  const handleSubscriptionClose = () => {
    setSubscriptionAnchorEl(null);
  };

  const subscriptionOpen = Boolean(subscriptionAnchorEl);

  // Add subscription plans data
  const PLANS = [
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
      ],
    },
  ];

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#0a3977',
        height: '60px',
        color: '#ffffff',
        borderBottom: '2px solid #041e42',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '60px',
          minHeight: '60px',
          paddingLeft: { xs: '4px', sm: '8px' },
          paddingRight: { xs: '4px', sm: '8px' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Image
            src={logoPath}
            alt="Dott Logo"
            width={100}
            height={90}
            style={{ marginLeft: '-10px', objectFit: 'contain' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {userData && (
            <Paper
              elevation={3}
              sx={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                px: 2, 
                py: 1, 
                height: 'auto',
                backgroundColor: '#0a3977',
                color: '#ffffff',
                borderBottom: '2px solid #041e42',
                borderRadius: '4px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant="h6"
                sx={{ whiteSpace: 'nowrap', color: '#ffffff', lineHeight: 1, mr: 1 }}
              >
                {userData?.business_name || 'Business Name'}
              </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'column',
                    cursor: userData?.subscription_type !== 'professional' && 
                           userData?.subscription_type !== 'enterprise' ? 'pointer' : 'default',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1a5bc0', // Standard blue instead of light blue
                  }}
                  onClick={handleSubscriptionClick}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: '#ffffff', lineHeight: 2, pr: 0.5 }}
                  >
                    {displayLabel}
                  </Typography>
                  {userData?.subscription_type === 'free' && (
                    <Typography
                      variant="caption"
                      sx={{ 
                        color: '#ffffff', 
                        fontSize: '0.65rem',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        mb: 0.5
                      }}
                    >
                      Upgrade to Professional or Enterprise
                    </Typography>
                  )}
                  {(userData?.subscription_type === 'free') && (
                    <IconButton size="small" sx={{ padding: 0, ml: 0.5, color: '#ffffff' }}>
                      {subscriptionOpen ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Paper>
          )}
          {isShopifyConnected && (
            <Typography
              variant="body2"
              sx={{
                color: 'lightgreen',
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                height: '100%',
              }}
            >
              Connected to Shopify
            </Typography>
          )}
          <Tooltip title="Home">
            <IconButton
              sx={{ 
                display: { xs: 'none', sm: 'flex' }, // Hide on mobile 
                alignItems: 'center', 
                height: '100%', 
                color: '#ffffff', 
                mr: 1 
              }}
              onClick={handleHomeClick}
            >
              <HomeIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Open and close menu">
            <IconButton
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%', 
                color: '#ffffff',
                mr: { xs: 0.5, sm: 1 }
              }}
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ mr: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'block' } }}>
            <DashboardLanguageSelector />
          </Box>
          
          <Tooltip title="Help">
            <IconButton
              sx={{ display: 'flex', alignItems: 'center', height: '100%', color: '#ffffff' }}
              onClick={handleHelpClick}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%', 
                color: '#ffffff',
                p: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
              onClick={handleSettingsClick}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={handleClick}
            aria-controls={openMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              color: '#ffffff',
              p: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
                bgcolor: '#0a3977', // Match AppBar background color
                color: '#ffffff',  // White text color for initials
                border: `2px solid #ffffff`, // White border
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            id="user-menu"
            anchorEl={null}
            anchorReference="anchorPosition"
            anchorPosition={{ top: 60, left: windowWidth - 300 }}
            open={openMenu}
            onClose={handleClose}
            PaperProps={{
              elevation: 4,
              sx: {
                width: { xs: '250px', sm: '280px' },
                overflow: 'visible',
                backgroundImage: 'linear-gradient(to bottom, #f8f9fa, #ffffff)',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                mt: 0.5,
              },
            }}
          >
            {userData && (
              <Box>
                {/* Header with user info */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: '#f8f9fa',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        fontSize: 16,
                        bgcolor: '#0a3977', // Match AppBar background color
                        color: '#ffffff', // White text color for initials
                        border: '2px solid #ffffff', // White border
                        mr: 2
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {userData?.full_name || ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {userData?.email || ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#e3f2fd',
                    p: 1,
                    borderRadius: 1,
                    mt: 1
                  }}>
                    <Typography variant="caption" fontWeight="medium" color="primary.main">
                      {displayLabel}
                    </Typography>
                    {userData?.subscription_type === 'free' && (
                      <Button 
                        size="small" 
                        variant="text" 
                        color="primary" 
                        sx={{ ml: 'auto', fontSize: '0.7rem', p: 0.5 }}
                        onClick={(e) => {
                          handleClose();
                          handleSubscriptionClick(e);
                        }}
                      >
                        Upgrade
                      </Button>
                    )}
                  </Box>
                </Box>
                
                {/* Menu items */}
                <MenuItem
                  onClick={handleUserProfileClick || handleClose}
                  sx={{
                    py: 1.5,
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' },
                  }}
                >
                  <PersonIcon sx={{ mr: 2, color: '#1976d2' }} />
                  <Typography variant="body2">My Account</Typography>
                </MenuItem>
                
                <MenuItem
                  onClick={handleSettingsClick}
                  sx={{
                    py: 1.5,
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' },
                  }}
                >
                  <SettingsIcon sx={{ mr: 2, color: '#1976d2' }} />
                  <Typography variant="body2">Settings</Typography>
                </MenuItem>
                
                <MenuItem
                  onClick={handleHelpClick}
                  sx={{
                    py: 1.5,
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' },
                  }}
                >
                  <HelpOutlineIcon sx={{ mr: 2, color: '#1976d2' }} />
                  <Typography variant="body2">Help Center</Typography>
                </MenuItem>
                
                <Divider />
                
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    size="medium"
                    sx={{
                      textTransform: 'none',
                      backgroundColor: '#f44336',
                      '&:hover': { backgroundColor: '#d32f2f' },
                    }}
                  >
                    Sign out
                  </Button>
                </Box>
                
                <Divider />
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  px: 2, 
                  py: 1,
                  backgroundColor: '#f5f5f5',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                }}>
                  <Link 
                    href="#" 
                    color="inherit" 
                    underline="hover" 
                    variant="caption"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      handlePrivacyClick();
                    }}
                  >
                    Privacy
                  </Link>
                  <Link 
                    href="#" 
                    color="inherit" 
                    underline="hover" 
                    variant="caption"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      handleTermsClick();
                    }}
                  >
                    Terms
                  </Link>
                </Box>
              </Box>
            )}
          </Menu>
        </Box>
      </Toolbar>
      <SettingsMenu
        anchorEl={settingsAnchorEl}
        open={settingsMenuOpen}
        onClose={handleSettingsClose}
        onIntegrationsClick={handleIntegrationsClick}
        onDeviceSettingsClick={handleDeviceSettingsClick}
        onOptionSelect={handleSettingsOptionSelect}
        selectedOption={selectedSettingsOption}
        backgroundColor={menuBackgroundColor}
      />

      <Popover
        open={subscriptionOpen}
        anchorEl={subscriptionAnchorEl}
        onClose={handleSubscriptionClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Upgrade Your Subscription
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Choose a plan that suits your business needs
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {PLANS.map((plan) => (
              <Grid item xs={12} sm={6} key={plan.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: plan.id === 'enterprise' ? '#0a3977' : '#1a5bc0',
                    boxShadow: plan.id === 'enterprise' ? 2 : 0,
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2">
                      {plan.name}
                    </Typography>
                    <Typography variant="h5" color="primary" gutterBottom>
                      ${plan.price}
                      <Typography
                        component="span"
                        variant="subtitle2"
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
                      variant="contained"
                      color="primary"
                    >
                      Select {plan.name}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
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
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary">
              Complete Upgrade
            </Button>
          </Box>
        </Box>
      </Popover>
    </MuiAppBar>
  );
};

export default AppBar;
