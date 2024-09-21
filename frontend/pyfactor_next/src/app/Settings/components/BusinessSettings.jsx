import React from 'react';
import { Box, Typography, TextField, Button, Grid } from '@mui/material';
import CustomChargeSettings from './CustomChargeSettings';

const BusinessSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return <UserManagement />;
      case 1:
        return <InvoicesAndEstimates />;
      case 2:
        return <Payments />;
      case 3:
        return <EmailTemplates />;
      case 4:
        return <CustomChargeSettings />;
      default:
        return null;
    }
  };

  return (
    <Box>
      {renderContent()}
    </Box>
  );
};

const UserManagement = () => (
  <Box>
    <Typography variant="h6" gutterBottom>User Management</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Add User Email" />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained">Add User</Button>
      </Grid>
    </Grid>
  </Box>
);

const InvoicesAndEstimates = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Invoices and Estimates</Typography>
    {/* Add form fields for invoice and estimate settings */}
  </Box>
);

const Payments = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Payments</Typography>
    {/* Add form fields for payment settings */}
  </Box>
);

const EmailTemplates = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Email Templates</Typography>
    {/* Add form fields for email template customization */}
  </Box>
);

export default BusinessSettings;