import React from 'react';
import { Box, Typography, TextField, Button, Grid } from '@mui/material';

const PayrollSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return <BusinessProfile />;
      case 1:
        return <CompanySignatory />;
      case 2:
        return <SourceBankAccount />;
      case 3:
        return <TaxProfile />;
      case 4:
        return <PayrollSetup />;
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

const BusinessProfile = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Business Profile</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Business Name" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Business Address" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Business Phone" />
      </Grid>
    </Grid>
  </Box>
);

const CompanySignatory = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Company Signatory</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Signatory Name" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Signatory Title" />
      </Grid>
    </Grid>
  </Box>
);

const SourceBankAccount = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Source Bank Account</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Bank Name" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Account Number" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Routing Number" />
      </Grid>
    </Grid>
  </Box>
);

const TaxProfile = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Tax Profile</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Tax ID" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Tax Rate" />
      </Grid>
    </Grid>
  </Box>
);

const PayrollSetup = () => (
  <Box>
    <Typography variant="h6" gutterBottom>Payroll Setup</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Pay Period" />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Pay Date" />
      </Grid>
    </Grid>
  </Box>
);

export default PayrollSettings;