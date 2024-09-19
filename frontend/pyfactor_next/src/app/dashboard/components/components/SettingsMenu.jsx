import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledMenuItem = styled(MenuItem)({
  backgroundColor: 'white',
  color: 'navy',
  '&:hover': {
    backgroundColor: 'navy',
    color: 'white',
  },
});

const SettingsMenu = ({ anchorEl, open, onClose, onIntegrationsClick, onDeviceSettingsClick }) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <StyledMenuItem>User Profile</StyledMenuItem>
      <StyledMenuItem>Business Settings</StyledMenuItem>
      <StyledMenuItem>Notification Preferences</StyledMenuItem>
      <StyledMenuItem>Security Settings</StyledMenuItem>
      <StyledMenuItem onClick={onIntegrationsClick}> API & Integrations</StyledMenuItem>
      <StyledMenuItem>Billing & Subscription</StyledMenuItem>
      <StyledMenuItem>Theme & Appearance</StyledMenuItem>
      <StyledMenuItem>Data Management</StyledMenuItem>
      <StyledMenuItem>Team Management</StyledMenuItem>
      <StyledMenuItem>Audit Log</StyledMenuItem>
      <StyledMenuItem>Tax Settings</StyledMenuItem>
      <StyledMenuItem>Currency Settings</StyledMenuItem>
      <StyledMenuItem>Reporting Preferences</StyledMenuItem>
      <StyledMenuItem>Email Templates</StyledMenuItem>
      <StyledMenuItem>Product/Service Catalog</StyledMenuItem>
      <StyledMenuItem>Payment Gateway Settings</StyledMenuItem>
      <StyledMenuItem onClick={onDeviceSettingsClick}>Device Settings</StyledMenuItem>

      {/* Add more menu items here as needed */}
    </Menu>
  );
};

export default SettingsMenu;
