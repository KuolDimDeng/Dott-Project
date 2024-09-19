'use client'
import React from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Badge, Box, Menu, MenuItem, InputBase, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import SearchIcon from '@mui/icons-material/Search';
import DateTime from './components/DateTime';
import SettingsMenu from './components/SettingsMenu';
import HomeIcon from '@mui/icons-material/Home';
import PrinterIcon from '@mui/icons-material/Print';
import BluetoothIcon from '@mui/icons-material/Bluetooth';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.common.white,
  marginRight: theme.spacing(2),
  marginLeft: theme.spacing(3),
  width: 'auto',
  [theme.breakpoints.up('sm')]: {
    width: 'calc(20ch * 1.4)',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.primary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: theme.palette.text.primary,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: 'calc(20ch * 1.4)',
    },
  },
}));

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
  handleSettingsMenuClose, 
  handleIntegrationsClick,
  isShopifyConnected,
  handleUserProfileClick,
  handleAlertClick,
  handleDashboardClick,
  handleDeviceSettingsClick,
  handleSendGlobalAlertClick,
}) => {
  return (
    <MuiAppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="home"
            onClick={handleDashboardClick}
            sx={{ ml: 0.5}}
          >
            <HomeIcon />
          </IconButton>
          <Image src={logoPath} alt="PyFactor Logo" width={120} height={30} style={{ marginLeft: '-8px' }}/>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ 'aria-label': 'search' }}
            />
          </Search>
          <Box sx={{ ml: 2 }}>
            <DateTime />
          </Box>
          {isShopifyConnected && (
            <Typography variant="body2" sx={{ color: 'lightgreen', mr: 2 }}>
              Connected to Shopify
            </Typography>
          )}
         <IconButton color="inherit" onClick={handleAlertClick}>
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit">
            <HelpOutlineIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleClick} aria-controls={openMenu ? 'user-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined}>
            <AccountCircleIcon />
          </IconButton>
          <Menu id="user-menu" anchorEl={anchorEl} open={openMenu} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
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
        onClose={handleSettingsMenuClose}
        onIntegrationsClick={handleIntegrationsClick}
        onDeviceSettingsClick={handleDeviceSettingsClick}
      />
    </MuiAppBar>
  );
};

export default AppBar;