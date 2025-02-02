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
import logoPath from '/public/static/images/Pyfactor.png';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  handleSendGlobalAlertClick,
  handleSettingsOptionSelect,
  selectedSettingsOption,
  handleLogout,
  handleHelpClick,
  handlePrivacyClick,
  handleTermsClick,
  mainBackground,
  textAppColor,
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

  const getSubscriptionLabel = (type) => {
    switch (type) {
      case 'professional':
        return 'Professional Plan';
      case 'basic':
        return 'Basic Plan';
      default:
        return 'Free Plan';
    }
  };

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        height: '60px',
        color: textAppColor,
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
          paddingLeft: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Image
            src={logoPath}
            alt="PyFactor Logo"
            width={100}
            height={80}
            style={{ marginLeft: '-20px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {userData && (
            <Paper
              elevation={0}
              sx={{
                mr: 2,
                pl: 1.5,
                pr: 0.5,
                py: 0.5,
                ml: -0.5,
                backgroundColor: '#ffffff',
                border: '#1976d2',
                borderRadius: '5px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant="h6"
                sx={{ whiteSpace: 'nowrap', color: textAppColor, lineHeight: 1, mr: 1 }}
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
                    backgroundColor: '#90caf9',
                  }}
                  onClick={handleSubscriptionClick}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: textAppColor, lineHeight: 2, pr: 0.5 }}
                  >
                    {getSubscriptionLabel(userData?.subscription_type)}
                  </Typography>
                  {userData?.subscription_type !== 'professional' && (
                    <IconButton size="small" sx={{ padding: 0, ml: 0.5, color: textAppColor }}>
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
          <Tooltip title="Open and close menu">
            <IconButton
              sx={{ display: 'flex', alignItems: 'center', height: '100%', color: textAppColor }}
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Help">
            <IconButton
              sx={{ display: 'flex', alignItems: 'center', height: '100%', color: textAppColor }}
              onClick={handleHelpClick}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              sx={{ display: 'flex', alignItems: 'center', height: '100%', color: textAppColor }}
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
            sx={{ display: 'flex', alignItems: 'center', height: '100%', color: textAppColor }}
          >
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 14,
                bgcolor: mainBackground,
                color: textAppColor,
                border: `2px solid ${textAppColor}`,
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
                userData?.is_staff && (
                  <MenuItem key="global-alert" onClick={handleSendGlobalAlertClick}>Send Global Alert</MenuItem>
                ),
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
