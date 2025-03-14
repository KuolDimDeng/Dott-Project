'use client';

import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

/**
 * KPI Dashboard Component
 * A simplified dashboard component that doesn't make heavy API calls
 */
function KPIDashboard({ userData }) {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {userData?.first_name || 'User'}!
      </Typography>
      
      <Typography variant="body1" paragraph>
        Your {userData?.subscription_type || 'free'} plan dashboard is ready.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Simple KPI cards that don't require API calls */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'primary.light',
            }}
          >
            <Typography variant="h5" component="div">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Tasks
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'success.light',
            }}
          >
            <Typography variant="h5" component="div">
              $0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revenue
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'warning.light',
            }}
          >
            <Typography variant="h5" component="div">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customers
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'info.light',
            }}
          >
            <Typography variant="h5" component="div">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Products
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Getting Started
        </Typography>
        <Typography variant="body1" paragraph>
          Your account is now set up and ready to use. Here are some things you can do:
        </Typography>
        <ul>
          <li>Add your first customer</li>
          <li>Create your first product</li>
          <li>Set up your business profile</li>
          <li>Explore the dashboard features</li>
        </ul>
      </Box>
    </Box>
  );
}

export default KPIDashboard;