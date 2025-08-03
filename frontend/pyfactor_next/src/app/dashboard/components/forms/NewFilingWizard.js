'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Paper,
  Divider,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  Public as PublicIcon
} from '@mui/icons-material';

const steps = [
  'Select Country & Period',
  'Review Sales Data',
  'Choose Service Level',
  'Payment & Submit'
];

const NewFilingWizard = ({ onBack, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    country: '',
    region_code: '',
    period_type: 'quarterly',
    period_year: new Date().getFullYear(),
    period_month: null,
    period_quarter: null,
    filing_type: 'manual',
    special_instructions: ''
  });

  // Pricing and tax info
  const [taxInfo, setTaxInfo] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData.country) {
      fetchTaxInfo();
    }
  }, [formData.country, formData.region_code]);

  useEffect(() => {
    if (activeStep === 1) {
      fetchSalesData();
    }
  }, [activeStep, formData.period_type, formData.period_year, formData.period_month, formData.period_quarter]);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/taxes/countries', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchTaxInfo = async () => {
    try {
      const params = new URLSearchParams({
        country: formData.country,
        ...(formData.region_code && { region_code: formData.region_code })
      });
      
      const response = await fetch(`/api/taxes/info?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTaxInfo(data.tax_info);
      }
    } catch (error) {
      console.error('Error fetching tax info:', error);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        period_type: formData.period_type,
        year: formData.period_year.toString(),
        ...(formData.period_month && { month: formData.period_month.toString() }),
        ...(formData.period_quarter && { quarter: formData.period_quarter.toString() })
      });
      
      const response = await fetch(`/api/taxes/sales-data?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalesData(data.sales_data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    setConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    try {
      setPaymentLoading(true);
      setConfirmDialog(false);
      
      // Calculate filing fee
      const filingFee = formData.filing_type === 'online' 
        ? taxInfo?.online_filing_fee || 65 
        : taxInfo?.manual_filing_fee || 35;
      
      // Create filing request
      const filingData = {
        ...formData,
        filing_fee: filingFee,
        total_sales: salesData?.total_sales || 0,
        taxable_sales: salesData?.taxable_sales || 0,
        tax_collected: salesData?.tax_collected || 0,
        tax_rate: taxInfo?.rate || 0
      };
      
      const response = await fetch('/api/taxes/filings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(filingData)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Redirect to Stripe payment if needed
        if (data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          onComplete(data.filing);
        }
      } else {
        throw new Error('Failed to create filing');
      }
    } catch (error) {
      console.error('Error submitting filing:', error);
      alert('Failed to submit filing. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFilingFee = () => {
    if (!taxInfo) return 0;
    return formData.filing_type === 'online' 
      ? taxInfo.online_filing_fee || 65 
      : taxInfo.manual_filing_fee || 35;
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 0:
        return formData.country && formData.period_type && formData.period_year;
      case 1:
        return salesData !== null;
      case 2:
        return formData.filing_type;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Country</InputLabel>
                <Select
                  value={formData.country}
                  label="Country"
                  onChange={(e) => setFormData({...formData, country: e.target.value, region_code: ''})}
                >
                  {countries.map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {formData.country === 'US' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={formData.region_code}
                    label="State"
                    onChange={(e) => setFormData({...formData, region_code: e.target.value})}
                  >
                    <MenuItem value="CA">California</MenuItem>
                    <MenuItem value="NY">New York</MenuItem>
                    <MenuItem value="TX">Texas</MenuItem>
                    {/* Add more states */}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Filing Period</InputLabel>
                <Select
                  value={formData.period_type}
                  label="Filing Period"
                  onChange={(e) => setFormData({...formData, period_type: e.target.value})}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Year"
                value={formData.period_year}
                onChange={(e) => setFormData({...formData, period_year: parseInt(e.target.value)})}
                inputProps={{ min: 2020, max: new Date().getFullYear() }}
              />
            </Grid>
            
            {formData.period_type === 'monthly' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={formData.period_month || ''}
                    label="Month"
                    onChange={(e) => setFormData({...formData, period_month: e.target.value})}
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <MenuItem key={i+1} value={i+1}>
                        {new Date(0, i).toLocaleString('en', {month: 'long'})}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {formData.period_type === 'quarterly' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={formData.period_quarter || ''}
                    label="Quarter"
                    onChange={(e) => setFormData({...formData, period_quarter: e.target.value})}
                  >
                    <MenuItem value={1}>Q1 (Jan-Mar)</MenuItem>
                    <MenuItem value={2}>Q2 (Apr-Jun)</MenuItem>
                    <MenuItem value={3}>Q3 (Jul-Sep)</MenuItem>
                    <MenuItem value={4}>Q4 (Oct-Dec)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {taxInfo && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {taxInfo.tax_authority_name}
                  </Typography>
                  <Typography variant="body2">
                    Filing Frequency: {taxInfo.filing_frequency} | 
                    Due: {taxInfo.filing_day_of_month ? `${taxInfo.filing_day_of_month}th of month` : 'Varies'}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        );
        
      case 1:
        return (
          <Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading sales data...</Typography>
              </Box>
            ) : salesData ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Sales Data for {formData.period_type} {formData.period_year}
                    {formData.period_month && ` - ${new Date(0, formData.period_month - 1).toLocaleString('en', {month: 'long'})}`}
                    {formData.period_quarter && ` Q${formData.period_quarter}`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom>
                      Total Sales
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(salesData.total_sales)}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom>
                      Taxable Sales
                    </Typography>
                    <Typography variant="h4">
                      {formatCurrency(salesData.taxable_sales)}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary" gutterBottom>
                      Tax Collected
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(salesData.tax_collected)}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="success">
                    Data ready for filing. Click Next to continue.
                  </Alert>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="warning">
                No sales data found for the selected period.
              </Alert>
            )}
          </Box>
        );
        
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Choose Your Filing Service Level
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: formData.filing_type === 'manual' ? '2px solid' : '1px solid',
                  borderColor: formData.filing_type === 'manual' ? 'primary.main' : 'divider'
                }}
                onClick={() => setFormData({...formData, filing_type: 'manual'})}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Manual Filing
                    </Typography>
                    <Chip label="Popular" color="secondary" size="small" sx={{ ml: 'auto' }} />
                  </Box>
                  
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(taxInfo?.manual_filing_fee || 35)}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    We prepare your complete tax report with all calculations and forms. 
                    You file manually with the tax authority.
                  </Typography>
                  
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2">Complete tax calculations</Typography>
                    <Typography component="li" variant="body2">All required forms included</Typography>
                    <Typography component="li" variant="body2">Step-by-step filing instructions</Typography>
                    <Typography component="li" variant="body2">PDF report ready to print</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: formData.filing_type === 'online' ? '2px solid' : '1px solid',
                  borderColor: formData.filing_type === 'online' ? 'primary.main' : 'divider'
                }}
                onClick={() => setFormData({...formData, filing_type: 'online'})}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PublicIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Online Filing
                    </Typography>
                    {taxInfo?.online_filing_available && (
                      <Chip label="Available" color="success" size="small" sx={{ ml: 'auto' }} />
                    )}
                  </Box>
                  
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(taxInfo?.online_filing_fee || 65)}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Complete service - we prepare AND file your return directly 
                    with the government online portal.
                  </Typography>
                  
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    <Typography component="li" variant="body2">Everything in Manual Filing</Typography>
                    <Typography component="li" variant="body2">Direct online submission</Typography>
                    <Typography component="li" variant="body2">Government confirmation receipt</Typography>
                    <Typography component="li" variant="body2">Faster processing time</Typography>
                  </Box>
                  
                  {!taxInfo?.online_filing_available && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Online filing not available for this jurisdiction
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Instructions (Optional)"
                placeholder="Any special requirements or notes for your filing..."
                value={formData.special_instructions}
                onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
              />
            </Grid>
          </Grid>
        );
        
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Payment
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Country/Region</Typography>
                  <Typography variant="body1">
                    {countries.find(c => c.code === formData.country)?.name}
                    {formData.region_code && ` - ${formData.region_code}`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Filing Period</Typography>
                  <Typography variant="body1">
                    {formData.period_type} {formData.period_year}
                    {formData.period_month && ` - ${new Date(0, formData.period_month - 1).toLocaleString('en', {month: 'long'})}`}
                    {formData.period_quarter && ` Q${formData.period_quarter}`}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Service Type</Typography>
                  <Typography variant="body1">
                    {formData.filing_type === 'manual' ? 'Manual Filing' : 'Online Filing'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Filing Fee</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(getFilingFee())}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {salesData && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Tax Summary</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">Total Sales</Typography>
                    <Typography variant="body1">{formatCurrency(salesData.total_sales)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">Taxable Sales</Typography>
                    <Typography variant="body1">{formatCurrency(salesData.taxable_sales)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">Tax Collected</Typography>
                    <Typography variant="body1" color="primary">{formatCurrency(salesData.tax_collected)}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>What happens next:</strong>
                <br />• Payment will be processed securely via Stripe
                <br />• You'll receive an email confirmation
                <br />• Your tax report will be prepared within 1-2 business days
                <br />• {formData.filing_type === 'online' ? 'We will file directly with the tax authority' : 'You will receive filing instructions'}
              </Typography>
            </Alert>
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h5" component="h1" fontWeight="bold">
          File New Tax Return
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={isStepComplete(index)}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
        
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isStepComplete(activeStep) || paymentLoading}
              startIcon={paymentLoading ? <CircularProgress size={20} /> : <PaymentIcon />}
              sx={{ borderRadius: 2 }}
            >
              {paymentLoading ? 'Processing...' : `Pay ${formatCurrency(getFilingFee())} & Submit`}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepComplete(activeStep)}
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 2 }}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Filing Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to submit a tax filing for:
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • {countries.find(c => c.code === formData.country)?.name}
            {formData.region_code && ` - ${formData.region_code}`}
            <br />
            • {formData.period_type} {formData.period_year}
            {formData.period_month && ` - ${new Date(0, formData.period_month - 1).toLocaleString('en', {month: 'long'})}`}
            {formData.period_quarter && ` Q${formData.period_quarter}`}
            <br />
            • Service: {formData.filing_type === 'manual' ? 'Manual Filing' : 'Online Filing'}
            <br />
            • Fee: {formatCurrency(getFilingFee())}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmedSubmit}
            variant="contained"
            disabled={paymentLoading}
          >
            Confirm & Pay
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewFilingWizard;