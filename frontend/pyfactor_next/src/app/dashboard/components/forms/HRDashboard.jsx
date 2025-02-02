import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';

const HRDashboard = ({ section }) => {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        HR Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Employee Overview
            </Typography>
            {/* Add employee overview content here */}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent HR Activities
            </Typography>
            {/* Add recent activities content here */}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              HR Analytics
            </Typography>
            {/* Add HR analytics content here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HRDashboard;
