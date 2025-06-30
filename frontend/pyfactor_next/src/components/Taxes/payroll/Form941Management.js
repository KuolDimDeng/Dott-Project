import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { format, startOfQuarter, endOfQuarter } from 'date-fns';

const Form941Management = () => {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showScheduleB, setShowScheduleB] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    quarter: Math.ceil(new Date().getMonth() / 3),
    year: new Date().getFullYear(),
    status: 'draft'
  });

  const steps = ['Select Period', 'Calculate', 'Review', 'Submit', 'Confirmation'];

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/form-941/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch forms');
      
      const data = await response.json();
      setForms(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateForm = async () => {
    setLoading(true);
    setValidationErrors([]);
    
    try {
      const response = await fetch('/api/taxes/payroll/form-941/calculate_quarter/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          quarter: formData.quarter,
          year: formData.year
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate form');
      }
      
      const data = await response.json();
      setSelectedForm(data);
      setFormData(data);
      setValidationErrors(data.validation_errors || []);
      setShowScheduleB(data.deposit_schedule === 'semiweekly');
      setActiveStep(2); // Move to review step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitToIRS = async () => {
    if (!selectedForm || !selectedForm.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/form-941/${selectedForm.id}/submit_to_irs/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }
      
      const data = await response.json();
      if (data.success) {
        setActiveStep(4);
        fetchForms(); // Refresh list
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (formId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/form-941/${formId}/check_status/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to check status');
      
      const data = await response.json();
      // Update form in list
      setForms(forms.map(f => f.id === formId ? { ...f, ...data } : f));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      draft: 'default',
      calculated: 'info',
      ready: 'warning',
      submitted: 'primary',
      accepted: 'success',
      rejected: 'error',
      amended: 'secondary'
    };
    return statusColors[status] || 'default';
  };

  const renderPeriodSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Filing Period
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Quarter</InputLabel>
            <Select
              value={formData.quarter}
              onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
              label="Quarter"
            >
              <MenuItem value={1}>Q1 (Jan - Mar)</MenuItem>
              <MenuItem value={2}>Q2 (Apr - Jun)</MenuItem>
              <MenuItem value={3}>Q3 (Jul - Sep)</MenuItem>
              <MenuItem value={4}>Q4 (Oct - Dec)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            InputProps={{
              inputProps: { min: 2020, max: new Date().getFullYear() + 1 }
            }}
          />
        </Grid>
      </Grid>
      <Box mt={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setActiveStep(1)}
          disabled={!formData.quarter || !formData.year}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );

  const renderCalculation = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Calculate Form 941
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        This will calculate your Form 941 based on payroll data for Q{formData.quarter} {formData.year}
      </Alert>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Period Details
              </Typography>
              <Typography variant="body2">
                Quarter: Q{formData.quarter} {formData.year}
              </Typography>
              <Typography variant="body2">
                Period: {format(startOfQuarter(new Date(formData.year, (formData.quarter - 1) * 3)), 'MMM d, yyyy')} - {format(endOfQuarter(new Date(formData.year, (formData.quarter - 1) * 3)), 'MMM d, yyyy')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="outlined"
          onClick={() => setActiveStep(0)}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CalculateIcon />}
          onClick={calculateForm}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Calculate Form'}
        </Button>
      </Box>
    </Box>
  );

  const renderReview = () => {
    if (!selectedForm) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Review Form 941
        </Typography>
        
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Validation Errors:</Typography>
            <List dense>
              {validationErrors.map((error, index) => (
                <ListItem key={index}>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Part 1: Answer these questions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Part 1: Answer these questions for this quarter
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PeopleIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Number of Employees
                        </Typography>
                        <Typography variant="h6">
                          {selectedForm.number_of_employees}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <MoneyIcon color="primary" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Wages, Tips & Compensation
                        </Typography>
                        <Typography variant="h6">
                          {formatCurrency(selectedForm.wages_tips_compensation)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Tax Calculations */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tax Type</TableCell>
                    <TableCell align="right">Taxable Wages</TableCell>
                    <TableCell align="right">Tax Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Federal Income Tax Withheld</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.wages_tips_compensation)}</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.federal_income_tax_withheld)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Social Security Tax</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.social_security_wages)}</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.social_security_tax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Medicare Tax</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.medicare_wages_tips)}</TableCell>
                    <TableCell align="right">{formatCurrency(selectedForm.medicare_tax)}</TableCell>
                  </TableRow>
                  {selectedForm.additional_medicare_tax > 0 && (
                    <TableRow>
                      <TableCell>Additional Medicare Tax</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">{formatCurrency(selectedForm.additional_medicare_tax)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>Total Tax</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right"><strong>{formatCurrency(selectedForm.total_tax_after_adjustments)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Deposit Schedule */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Part 2: Deposit Schedule
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Chip 
                    label={selectedForm.deposit_schedule === 'monthly' ? 'Monthly Depositor' : 'Semiweekly Depositor'}
                    color="primary"
                  />
                  {showScheduleB && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowScheduleB(true)}
                    >
                      View Schedule B
                    </Button>
                  )}
                </Box>
                
                {selectedForm.deposit_schedule === 'monthly' && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Month 1 Liability</Typography>
                      <Typography variant="h6">{formatCurrency(selectedForm.month1_liability)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Month 2 Liability</Typography>
                      <Typography variant="h6">{formatCurrency(selectedForm.month2_liability)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Month 3 Liability</Typography>
                      <Typography variant="h6">{formatCurrency(selectedForm.month3_liability)}</Typography>
                    </Grid>
                  </Grid>
                )}
                
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">Total Deposits for Quarter</Typography>
                  <Typography variant="h6">{formatCurrency(selectedForm.total_deposits)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Balance Due/Overpayment */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedForm.balance_due > 0 ? 'Balance Due' : 'Overpayment'}
                    </Typography>
                    <Typography variant="h6" color={selectedForm.balance_due > 0 ? 'error' : 'success'}>
                      {formatCurrency(selectedForm.balance_due > 0 ? selectedForm.balance_due : selectedForm.overpayment)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Filing Deadline</Typography>
                    <Typography variant="h6">
                      {format(new Date(selectedForm.due_date), 'MMMM d, yyyy')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box mt={3} display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={() => setActiveStep(1)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setActiveStep(3)}
            disabled={!selectedForm.is_valid}
          >
            Proceed to Submit
          </Button>
        </Box>
      </Box>
    );
  };

  const renderSubmit = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Submit Form 941
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 2 }}>
        Please review the following before submitting:
      </Alert>
      
      <List>
        <ListItem>
          <ListItemText 
            primary="All information is accurate and complete"
            secondary="You are responsible for the accuracy of this filing"
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="You have the authority to file this return"
            secondary="You must be authorized to file taxes for this business"
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Electronic signature agreement"
            secondary="By submitting, you agree to sign this return electronically"
          />
        </ListItem>
      </List>

      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="outlined"
          onClick={() => setActiveStep(2)}
        >
          Back to Review
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          onClick={submitToIRS}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit to IRS'}
        </Button>
      </Box>
    </Box>
  );

  const renderConfirmation = () => (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <CheckIcon color="success" sx={{ fontSize: 48 }} />
        <Typography variant="h5">
          Form 941 Submitted Successfully
        </Typography>
      </Box>
      
      {selectedForm && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Submission ID
            </Typography>
            <Typography variant="body1">
              {selectedForm.submission_id}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Tracking Number
            </Typography>
            <Typography variant="body1">
              {selectedForm.irs_tracking_number}
            </Typography>
          </Grid>
        </Grid>
      )}
      
      <Box mt={3}>
        <Button
          variant="contained"
          onClick={() => {
            setActiveStep(0);
            setSelectedForm(null);
            fetchForms();
          }}
        >
          File Another Form
        </Button>
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPeriodSelection();
      case 1:
        return renderCalculation();
      case 2:
        return renderReview();
      case 3:
        return renderSubmit();
      case 4:
        return renderConfirmation();
      default:
        return null;
    }
  };

  if (loading && forms.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Form 941 - Quarterly Federal Tax Return
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">File New Form 941</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchForms}
            >
              Refresh
            </Button>
          </Box>
          
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Previous Forms List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Previous Form 941 Filings
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total Tax</TableCell>
                  <TableCell>Filed Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      Q{form.quarter} {form.year}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={form.filing_status_display || form.status}
                        color={getStatusColor(form.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(form.total_tax_after_adjustments)}
                    </TableCell>
                    <TableCell>
                      {form.filing_date ? format(new Date(form.filing_date), 'MM/dd/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {form.status === 'submitted' && (
                          <Tooltip title="Check Status">
                            <IconButton
                              size="small"
                              onClick={() => checkStatus(form.id)}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Download PDF">
                          <IconButton size="small">
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {forms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No forms filed yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Schedule B Dialog */}
      <Dialog
        open={showScheduleB}
        onClose={() => setShowScheduleB(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Schedule B - Tax Liability for Semiweekly Schedule Depositors</DialogTitle>
        <DialogContent>
          {selectedForm?.schedule_b && (
            <Typography variant="body2">
              Schedule B data would be displayed here
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScheduleB(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Form941Management;