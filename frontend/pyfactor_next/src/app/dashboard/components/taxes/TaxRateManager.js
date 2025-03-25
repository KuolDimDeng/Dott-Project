// components/taxes/TaxRatesManager.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';

const TaxRatesManager = () => {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxRates, setTaxRates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  useEffect(() => {
    fetchStates();
  }, []);
  
  useEffect(() => {
    if (selectedState) {
      fetchTaxRates();
    }
  }, [selectedState, taxYear]);
  
  const fetchStates = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/taxes/states/');
      setStates(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching states:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching states',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const fetchTaxRates = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/api/taxes/states/${selectedState}/tax_rates/`, {
        params: { tax_year: taxYear }
      });
      setTaxRates(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching tax rates',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const handleOpenDialog = (rate = null) => {
    setCurrentRate(rate || {
      state: selectedState,
      tax_year: taxYear,
      effective_date: new Date().toISOString().split('T')[0],
      is_flat_rate: true,
      rate_value: 0,
      filing_status: 'single'
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentRate(null);
  };
  
  const handleSaveRate = async () => {
    try {
      setIsLoading(true);
      
      // Format the data
      const rateData = {
        ...currentRate,
        rate_value: parseFloat(currentRate.rate_value),
        income_min: currentRate.income_min ? parseFloat(currentRate.income_min) : null,
        income_max: currentRate.income_max ? parseFloat(currentRate.income_max) : null,
      };
      
      if (currentRate.id) {
        // Update existing rate
        await axiosInstance.put(`/api/taxes/tax-rates/${currentRate.id}/`, rateData);
        setSnackbar({
          open: true,
          message: 'Tax rate updated successfully',
          severity: 'success'
        });
      } else {
        // Create new rate
        await axiosInstance.post('/api/taxes/tax-rates/', rateData);
        setSnackbar({
          open: true,
          message: 'Tax rate created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      fetchTaxRates();
    } catch (error) {
      console.error('Error saving tax rate:', error);
      setSnackbar({
        open: true,
        message: 'Error saving tax rate',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setCurrentRate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderServiceType = (state) => {
    if (state.service_type === 'full') {
      return <Chip color="primary" label="Full-Service" />;
    } else {
      return <Chip color="secondary" label="Self-Service" />;
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tax Rates Manager
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>State</InputLabel>
              <Select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                label="State"
              >
                <MenuItem value="">Select a State</MenuItem>
                {states.map(state => (
                    <MenuItem key={state.id} value={state.id}>
                        {state.name} ({state.code})
                        {state.full_service_enabled && <Chip 
                        size="small" 
                        label="Full Service" 
                        color="primary" 
                        sx={{ ml: 1 }} 
                        />}
                        {renderServiceType(state)}
                    </MenuItem>
                    ))}

              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              label="Tax Year"
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Button 
              variant="contained" 
              onClick={() => handleOpenDialog()}
              disabled={!selectedState}
              fullWidth
            >
              Add New Tax Rate
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {selectedState && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Filing Status</TableCell>
                <TableCell>Tax Type</TableCell>
                <TableCell>Rate</TableCell>
                <TableCell>Income Range</TableCell>
                <TableCell>Effective Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxRates.length > 0 ? (
                taxRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      {rate.filing_status.replace('_', ' ').charAt(0).toUpperCase() + 
                       rate.filing_status.replace('_', ' ').slice(1)}
                    </TableCell>
                    <TableCell>{rate.is_flat_rate ? 'Flat Rate' : 'Progressive'}</TableCell>
                    <TableCell>{(rate.rate_value * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {rate.is_flat_rate 
                        ? 'All Income' 
                        : rate.income_max 
                          ? `$${rate.income_min.toLocaleString()} - $${rate.income_max.toLocaleString()}`
                          : `$${rate.income_min.toLocaleString()}+`
                      }
                    </TableCell>
                    <TableCell>{new Date(rate.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleOpenDialog(rate)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No tax rates found for this state and year.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentRate?.id ? 'Edit Tax Rate' : 'Add New Tax Rate'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Filing Status</InputLabel>
                <Select
                  name="filing_status"
                  value={currentRate?.filing_status || 'single'}
                  onChange={handleInputChange}
                  label="Filing Status"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married_joint">Married Filing Jointly</MenuItem>
                  <MenuItem value="married_separate">Married Filing Separately</MenuItem>
                  <MenuItem value="head_household">Head of Household</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="effective_date"
                label="Effective Date"
                type="date"
                value={currentRate?.effective_date || ''}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_flat_rate"
                    checked={currentRate?.is_flat_rate || false}
                    onChange={handleInputChange}
                  />
                }
                label="Flat Tax Rate"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="rate_value"
                label="Tax Rate (decimal)"
                type="number"
                value={currentRate?.rate_value || 0}
                onChange={handleInputChange}
                fullWidth
                inputProps={{ step: 0.0001, min: 0, max: 1 }}
                helperText="Enter as decimal (e.g., 0.05 for 5%)"
              />
            </Grid>
            
            {!currentRate?.is_flat_rate && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="income_min"
                    label="Minimum Income"
                    type="number"
                    value={currentRate?.income_min || ''}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="income_max"
                    label="Maximum Income (leave blank for highest bracket)"
                    type="number"
                    value={currentRate?.income_max || ''}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveRate} variant="contained" disabled={isLoading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaxRatesManager;