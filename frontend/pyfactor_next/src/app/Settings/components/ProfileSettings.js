// ProfileSettings.js
import React from 'react';
import { Box, Typography, TextField, Button, Grid, Avatar, Switch, FormControlLabel, Paper, Divider } from '@mui/material';

const ProfileSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <Box component="form">
            <Typography variant="h6" gutterBottom>Personal Information</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First Name" name="first_name" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last Name" name="last_name" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email" name="email" type="email" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Phone Number" name="phone_number" />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="primary">Save Changes</Button>
              </Grid>
            </Grid>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Password and Security</Typography>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Change Password</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Current Password" type="password" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="New Password" type="password" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Confirm New Password" type="password" />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">Update Password</Button>
                </Grid>
              </Grid>
            </Paper>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Two-Factor Authentication</Typography>
              <FormControlLabel
                control={<Switch />}
                label="Enable Two-Factor Authentication"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Enhance your account security by requiring a verification code in addition to your password when you sign in.
              </Typography>
            </Paper>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Notifications</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Email Notifications</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Invoice Payments"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive notifications when your clients pay invoices
                  </Typography>
                </Grid>
                <Divider sx={{ width: '100%', my: 2 }} />
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Invoice Reminders"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive notifications about unpaid invoices
                  </Typography>
                </Grid>
                <Divider sx={{ width: '100%', my: 2 }} />
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="System Updates"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive notifications about system updates and new features
                  </Typography>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary">Save Preferences</Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Businesses</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Your Businesses</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ mr: 2, bgcolor: '#0a3977' }}>B1</Avatar>
                <Box>
                  <Typography variant="subtitle1">Main Business</Typography>
                  <Typography variant="body2" color="text.secondary">Active</Typography>
                </Box>
                <Button variant="outlined" size="small" sx={{ ml: 'auto' }}>
                  Manage
                </Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Button variant="contained" color="primary">
                Add New Business
              </Button>
            </Paper>
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Billing and Subscriptions</Typography>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Current Plan</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" color="primary">Professional Plan</Typography>
                  <Typography variant="body2" color="text.secondary">
                    $19.99/month
                  </Typography>
                </Box>
                <Button variant="outlined" color="primary">
                  Upgrade Plan
                </Button>
              </Box>
            </Paper>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Payment Method</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body1">•••• •••• •••• 4242</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expires 12/2025
                  </Typography>
                </Box>
                <Button variant="text" color="primary" sx={{ ml: 'auto' }}>
                  Edit
                </Button>
              </Box>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  return <Box>{renderContent()}</Box>;
};

export default ProfileSettings;
