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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import Image from 'next/image';
import logoPath from '/public/static/images/PyfactorDashboard.png';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardLanguageSelector from './LanguageSelector';

const menuBackgroundColor = '#e3f2fd'; // Light grey background

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

  const handleSubscriptionClick = (event) => {
    if (userData?.subscription_type !== 'professional') {
      setIsSubscriptionMenuOpen(!isSubscriptionMenuOpen);
      setSubscriptionAnchorEl(subscriptionAnchorEl ? null : event.currentTarget);
    }
  };

  const handleSubscriptionClose = () => {
    setSubscriptionAnchorEl(null);
  };

  const subscriptionOpen = Boolean(subscriptionAnchorEl);

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#0d47a1',
        height: '60px',
        color: '#ffffff',
        borderBottom: '2px solid #bbdefb',
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
            alt="PyFactor Logo"
            width={100}
            height={40}
            style={{ marginLeft: '-10px', objectFit: 'contain' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {userData && (
            <Paper
              elevation={0}
              sx={{
                mr: { xs: 0.5, sm: 2 },
                pl: { xs: 1, sm: 1.5 },
                pr: { xs: 0.5, sm: 0.5 },
                py: 0.5,
                ml: -0.5,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '5px',
                display: { xs: 'none', md: 'block' }, // Hide on small screens
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
                    cursor: userData?.subscription_type !== 'professional' ? 'pointer' : 'default',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#4169E1',
                  }}
                  onClick={handleSubscriptionClick}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: '#ffffff', lineHeight: 2, pr: 0.5 }}
                  >
                    {displayLabel}
                  </Typography>
                  {userData?.subscription_type !== 'professional' && (
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
              sx={{ display: 'flex', alignItems: 'center', height: '100%', color: '#ffffff' }}
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
            sx={{ display: 'flex', alignItems: 'center', height: '100%', color: '#ffffff' }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 14,
                bgcolor: mainBackground,
                color: '#000080',
                border: `2px solid #ffffff`,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                width: '150px',
                backgroundColor: menuBackgroundColor,
              },
            }}
          >
            {userData ? [
                <MenuItem key="user-info" sx={{ pointerEvents: 'none', opacity: 0.7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <PersonIcon sx={{ mr: 1, color: 'blue' }} />
                    <Box
                      sx={{
                        mr: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ whiteSpace: 'nowrap', color: textAppColor, fontSize: '15px' }}
                      >
                        {userData?.full_name || ''}
                      </Typography>
                      <Typography variant="caption" sx={{ color: textAppColor, opacity: 0.7 }}>
                        {userData?.occupation || ''}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>,
                <MenuItem
                  key="terms"
                  onClick={handleTermsClick}
                  sx={{
                    justifyContent: 'center',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 128, 0.08)',
                    },
                  }}
                >
                  Terms of Service
                </MenuItem>,
                <MenuItem
                  key="privacy"
                  onClick={handlePrivacyClick}
                  sx={{
                    justifyContent: 'center',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 128, 0.08)',
                    },
                  }}
                >
                  Privacy
                </MenuItem>,
                <MenuItem
                  key="logout"
                  onClick={handleLogout}
                  sx={{
                    justifyContent: 'center',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 128, 0.08)',
                    },
                  }}
                >
                  Logout
                </MenuItem>
            ].filter(Boolean) : null}
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
      >
        <Box sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="body2">
            Upgrade to the Professional Plan here for more features
          </Typography>
          {/* You can add a button or link here for the upgrade action */}
        </Box>
      </Popover>
    </MuiAppBar>
  );
};

export default AppBar;
