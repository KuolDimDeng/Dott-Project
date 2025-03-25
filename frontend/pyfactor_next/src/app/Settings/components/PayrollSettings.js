import React from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Button, FormControlLabel, Switch } from '@mui/material';

const PayrollSettings = ({ selectedTab }) => {
  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Business Profile</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Business Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Business Name"
                    defaultValue="Juba Cargo Village"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employer Identification Number (EIN)"
                    placeholder="XX-XXXXXXX"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Business Address"
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Business Profile
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Company Signatory</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Authorized Signatory Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    defaultValue="Kuol"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    defaultValue="Deng"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Title/Position"
                    defaultValue="Owner"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    defaultValue="kuoldimdeng@outlook.com"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Signatory Information
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Source Bank Account</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Payroll Funding Account</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    placeholder="Enter bank name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Type"
                    select
                    defaultValue="checking"
                  >
                    <MenuItem value="checking">Checking</MenuItem>
                    <MenuItem value="savings">Savings</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Account Number"
                    placeholder="Enter account number"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Routing Number"
                    placeholder="Enter routing number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Bank Information
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Tax Profile</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Tax Filing Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tax Filing Status"
                    select
                    defaultValue="quarterly"
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="annually">Annually</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tax Year Start Month"
                    select
                    defaultValue="1"
                  >
                    {[...Array(12)].map((_, i) => {
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return (
                        <MenuItem key={i} value={i + 1}>
                          {monthNames[i]}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Automatically calculate payroll taxes"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Tax Profile
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Payroll Setup</Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Payroll Schedule</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pay Frequency"
                    select
                    defaultValue="biweekly"
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Bi-Weekly</MenuItem>
                    <MenuItem value="semimonthly">Semi-Monthly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pay Day"
                    select
                    defaultValue="friday"
                  >
                    <MenuItem value="monday">Monday</MenuItem>
                    <MenuItem value="tuesday">Tuesday</MenuItem>
                    <MenuItem value="wednesday">Wednesday</MenuItem>
                    <MenuItem value="thursday">Thursday</MenuItem>
                    <MenuItem value="friday">Friday</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Process payroll automatically"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Send pay stubs to employees automatically"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="primary">
                    Save Payroll Setup
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

export default PayrollSettings;
