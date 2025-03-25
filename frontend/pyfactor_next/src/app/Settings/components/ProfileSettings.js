// ProfileSettings.js
import React from 'react';
import { Box, Typography } from '@mui/material';

const ProfileSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return <Typography>Personal Information</Typography>;
      case 1:
        return <Typography>Password and Security</Typography>;
      case 2:
        return <Typography>Notifications</Typography>;
      case 3:
        return <Typography>Businesses</Typography>;
      case 4:
        return <Typography>Billing and Subscriptions</Typography>;
      default:
        return null;
    }
  };

  return <Box>{renderContent()}</Box>;
};

export default ProfileSettings;
