import React from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Switch, FormControlLabel, Divider } from '@mui/material';

const BusinessSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>User Management</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Team Members</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body1">Kuol Deng (You)</Typography>
                    <Typography variant="body2" color="primary">Owner</Typography>
                  </Box>
                  <Divider />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary">
                    Invite Team Member
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Invoices and Estimates</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Invoice Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Invoice Prefix"
                    defaultValue="INV-"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Invoice Footer Text"
                    multiline
                    rows={3}
                    defaultValue="Thank you for your business!"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Automatically send payment reminders"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Payments</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Payment Methods</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Credit Card"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Bank Transfer"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Mobile Money"
                  />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary">
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Email Templates</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Customize Email Templates</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Invoice Email</Typography>
                    <TextField
                      fullWidth
                      label="Subject"
                      defaultValue="Invoice #{invoice_number} from {business_name}"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Body"
                      multiline
                      rows={5}
                      defaultValue="Dear {client_name},\n\nPlease find attached invoice #{invoice_number} for {amount}.\n\nThanks for your business!\n{business_name}"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2">Payment Reminder Email</Typography>
                    <TextField
                      fullWidth
                      label="Subject"
                      defaultValue="Payment Reminder: Invoice #{invoice_number}"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Body"
                      multiline
                      rows={5}
                      defaultValue="Dear {client_name},\n\nThis is a friendly reminder that invoice #{invoice_number} for {amount} is due on {due_date}.\n\nThanks,\n{business_name}"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Templates
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Custom Charge Settings</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Custom Charges</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Discounts</Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable Discounts"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Late Fees</Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable Late Fees"
                    />
                    <TextField
                      fullWidth
                      label="Default Late Fee Percentage"
                      defaultValue="5"
                      InputProps={{
                        endAdornment: <Typography variant="body1">%</Typography>,
                      }}
                      sx={{ mt: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2">Shipping</Typography>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Enable Shipping Charges"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  return <Box>{renderContent()}</Box>;
};

export default BusinessSettings;
