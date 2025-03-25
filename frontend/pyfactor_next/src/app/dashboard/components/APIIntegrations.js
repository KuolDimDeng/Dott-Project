// src/app/dashboard/components/APIIntegrations.js
import React from 'react';
import { Typography, Box, Link, Paper, Grid, Divider } from '@mui/material';

const APIIntegrations = ({ onECommerceClick, onCRMClick }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API & Integrations
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              E-Commerce Platform API
            </Typography>
            <Link
              href="#"
              onClick={onECommerceClick}
              sx={{ cursor: 'pointer', display: 'block', mt: 1 }}
            >
              Click here
            </Link>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              CRM API
            </Typography>
            <Link href="#" onClick={onCRMClick} sx={{ cursor: 'pointer', display: 'block', mt: 1 }}>
              Click here
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default APIIntegrations;
