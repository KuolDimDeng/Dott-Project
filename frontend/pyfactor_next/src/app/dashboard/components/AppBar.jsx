import React from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Badge, Box, Menu, MenuItem, Typography, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import DateTime from './components/DateTime';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';

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
}) => {

  // Generate initials from the first and last name
  const getInitials = (name) => {
    if (!name) return '';
    const [firstName, lastName] = name.split(' ');
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const initials = userData ? getInitials(`${userData.first_name} ${userData.last_name}`) : '';

  return (
    <MuiAppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#000080', height: '60px'}}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', minHeight: '60px'}}>
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
            <MenuIcon />
          </IconButton>
          <IconButton color="inherit" aria-label="home" onClick={handleDashboardClick} sx={{ ml: 0.5, display: 'flex', alignItems: 'center', height: '100%' }}>
            <HomeIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Image
              src={logoPath}
              alt="PyFactor Logo"
              width={90}
              height={22}
              style={{ marginLeft: '-8px' }}
            />
          </Box>

          {userData && userData.business_name && (
            <Typography variant="h6" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
              {userData.business_name}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
            <DateTime />
          </Box>
          {isShopifyConnected && (
            <Typography variant="body2" sx={{ color: 'lightgreen', mr: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
              Connected to Shopify
            </Typography>
          )}
          <IconButton color="inherit" onClick={handleAlertClick} sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <HelpOutlineIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleSettingsClick} sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <SettingsIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleClick}
            aria-controls={openMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
            sx={{ display: 'flex', alignItems: 'center', height: '100%', p: 0 }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 16,
                bgcolor: '#000080',
                color: '#fff',
                border: '2px solid white',
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
          >
            {userData && (
              <div>
                <MenuItem disabled>{userData.full_name}</MenuItem>
                <MenuItem disabled>{userData.occupation}</MenuItem>
                <MenuItem disabled>{userData.business_name}</MenuItem>
                <MenuItem onClick={handleUserProfileClick}>Profile Settings</MenuItem>
                <MenuItem onClick={handleAccountClick}>Account</MenuItem>
                {userData.is_staff && (
                  <MenuItem onClick={handleSendGlobalAlertClick}>Send Global Alert</MenuItem>
                )}
              </div>
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
      />
    </MuiAppBar>
  );
};

export default AppBar;