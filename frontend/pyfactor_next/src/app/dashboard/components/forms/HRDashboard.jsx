'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, Tab, Tabs } from '@mui/material';
import EmployeeTaxManagement from './taxes/EmployeeTaxManagement';

/**
 * HR Dashboard Component
 * Handles different sections of HR management
 */
function HRDashboard({ section = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return (
          <>
            <Typography variant="h4" gutterBottom>
              HR Dashboard
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Employee Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No employee data to display.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Recent HR Activities
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No recent activities to display.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    HR Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No analytics data available.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        );
      case 'timesheets':
        return (
          <>
            <Typography variant="h4" gutterBottom>
              Timesheets
            </Typography>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Timesheet management will be available soon.
              </Typography>
            </Paper>
          </>
        );
      case 'taxes':
        return <EmployeeTaxManagement />;
      case 'benefits':
        return (
          <>
            <Typography variant="h4" gutterBottom>
              Employee Benefits
            </Typography>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Benefits management will be available soon.
              </Typography>
            </Paper>
          </>
        );
      case 'reports':
        return (
          <>
            <Typography variant="h4" gutterBottom>
              HR Reports
            </Typography>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                HR reports will be available soon.
              </Typography>
            </Paper>
          </>
        );
      default:
        return (
          <Typography variant="h4" gutterBottom>
            Unknown HR Section
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {renderSection()}
    </Box>
  );
}

export default HRDashboard;