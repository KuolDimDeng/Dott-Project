import React from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Badge, Box, Menu, MenuItem, Typography, Avatar, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';

const menuBackgroundColor = '#f5f5f5';  // Light grey background

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

  const initials = userData ? getInitials(`${userData.first_name} ${userData.last_name}`) : '';

  return (
    <MuiAppBar position="fixed" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: mainBackground, height: '60px', color: textAppColor }}>
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        height: '60px', 
        minHeight: '60px',
        paddingLeft: '8px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Image
            src={logoPath}
            alt="PyFactor Logo"
            width={80}
            height={22}
            style={{ marginLeft: '-20px' }}
          />
        
        
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {userData && userData.business_name && (
            <Typography variant="h6" sx={{ mr: 2, whiteSpace: 'nowrap', alignItems: 'center', color: textAppColor }}>
              {userData.business_name}
            </Typography>
          )}
          {isShopifyConnected && (
            <Typography variant="body2" sx={{ color: 'lightgreen', mr: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
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
              }
            }}
          >
            {userData && (
              <>
                <MenuItem sx={{ pointerEvents: 'none', opacity: 0.7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <PersonIcon sx={{ mr: 1, color: mainBackground }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {userData.full_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {userData.occupation}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                {userData.is_staff && (
                  <MenuItem onClick={handleSendGlobalAlertClick}>Send Global Alert</MenuItem>
                )}
                <MenuItem 
                  onClick={handleTermsClick}
                  sx={{ 
                    justifyContent: 'left', 
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 128, 0.08)' 
                    } 
                  }}
                >
                  Terms
                </MenuItem>
                <MenuItem 
                  onClick={handlePrivacyClick}
                  sx={{ 
                    justifyContent: 'left', 
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 128, 0.08)' 
                    } 
                  }}
                >
                  Privacy
                </MenuItem>
                <MenuItem 
                  onClick={handleLogout}
                  sx={{ 
                    justifyContent: 'left', 
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 128, 0.08)' 
                    } 
                  }}
                >
                  Logout
                </MenuItem>
              </>
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
    </MuiAppBar>
  );
};

export default AppBar;