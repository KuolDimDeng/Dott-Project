'use client';

import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';

/**
 * Home Component
 * A simplified home component that doesn't make heavy API calls
 */
function Home({ userData }) {
  return (
    <Box sx={{ pt: 1.5, pb: 2 }}>
      <Typography variant="h4" gutterBottom>
        Home
      </Typography>
      
      <Typography variant="body1" paragraph>
        Welcome to your home page, {userData?.first_name || 'User'}!
      </Typography>
      
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: 'primary.light',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Your {userData?.subscription_type || 'free'} plan is active
        </Typography>
        <Typography variant="body1" paragraph>
          You have access to all the features included in your plan.
        </Typography>
        <Button variant="contained" color="primary">
          View Plan Details
        </Button>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Getting Started
            </Typography>
            <Typography variant="body2" paragraph>
              Complete these steps to get the most out of your account:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Complete your business profile
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Add your first customer
                </Typography>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Create your first product or service
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2">
                  Explore the dashboard features
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Recent Updates
            </Typography>
            <Typography variant="body2" paragraph>
              No recent updates to display.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updates about your account and new features will appear here.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;