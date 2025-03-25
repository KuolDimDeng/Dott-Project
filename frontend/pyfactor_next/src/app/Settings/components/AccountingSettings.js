import React from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Button, Divider } from '@mui/material';

const AccountingSettings = ({ selectedTab }) => {
  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'NGN', label: 'NGN - Nigerian Naira' },
    { value: 'ZAR', label: 'ZAR - South African Rand' },
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK, EU)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  ];

  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Dates and Currency</Typography>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Currency Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Default Currency"
                    defaultValue="USD"
                  >
                    {currencies.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Currency Symbol Position"
                    select
                    defaultValue="before"
                  >
                    <MenuItem value="before">Before amount ($100.00)</MenuItem>
                    <MenuItem value="after">After amount (100.00$)</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>
            
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Date Format</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Date Format"
                    defaultValue="MM/DD/YYYY"
                  >
                    {dateFormats.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fiscal Year Start"
                    type="month"
                    defaultValue="2023-01"
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary">
                    Save Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Sales Tax</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Tax Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Default Tax</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Tax Name"
                          defaultValue="Sales Tax"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Rate (%)"
                          defaultValue="7.5"
                          type="number"
                          InputProps={{
                            endAdornment: <Typography variant="body1">%</Typography>,
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Additional Tax Rates</Typography>
                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          label="Tax Name"
                          defaultValue="State Tax"
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          label="Rate (%)"
                          defaultValue="4"
                          type="number"
                          InputProps={{
                            endAdornment: <Typography variant="body1">%</Typography>,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Button variant="outlined" color="error" sx={{ mt: 1 }}>
                          Remove
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Box sx={{ mt: 2, mb: 3 }}>
                    <Button variant="outlined" color="primary">
                      Add Tax Rate
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Tax Settings
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

export default AccountingSettings;
