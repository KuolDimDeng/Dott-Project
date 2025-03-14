'use client';

import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

/**
 * Main Dashboard Component
 * A simplified dashboard component that doesn't make heavy API calls
 */
function MainDashboard({ userData }) {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h4" gutterBottom>
        Main Dashboard
      </Typography>
      
      <Typography variant="body1" paragraph>
        Welcome to your main dashboard, {userData?.first_name || 'User'}!
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Simple dashboard cards that don't require API calls */}
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
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No recent activity to display.
            </Typography>
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
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No new notifications.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
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
              Quick Actions
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'primary.light',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <Typography variant="body1">Add Customer</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'success.light',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'success.main',
                      color: 'white',
                    },
                  }}
                >
                  <Typography variant="body1">Create Invoice</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'warning.light',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'warning.main',
                      color: 'white',
                    },
                  }}
                >
                  <Typography variant="body1">Add Product</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'info.light',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'info.main',
                      color: 'white',
                    },
                  }}
                >
                  <Typography variant="body1">View Reports</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default MainDashboard;