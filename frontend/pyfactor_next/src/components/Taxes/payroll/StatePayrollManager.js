import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  MapPinIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const StatePayrollManager = () => {
  const [loading, setLoading] = useState(false);
  const [stateAccounts, setStateAccounts] = useState([]);
  const [stateFilings, setStateFilings] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);
  const [showWithholdingCalc, setShowWithholdingCalc] = useState(false);
  const [withholdingData, setWithholdingData] = useState({
    employee_id: '',
    gross_pay: '',
    pay_date: new Date().toISOString().split('T')[0],
    state_code: ''
  });

  // State configurations for major states
  const stateConfigs = {
    CA: { name: 'California', hasSUI: true, hasSDI: true, hasPIT: true },
    NY: { name: 'New York', hasSUI: true, hasSDI: true, hasPIT: true },
    TX: { name: 'Texas', hasSUI: true, hasSDI: false, hasPIT: false },
    FL: { name: 'Florida', hasSUI: true, hasSDI: false, hasPIT: false },
    PA: { name: 'Pennsylvania', hasSUI: true, hasSDI: false, hasPIT: true },
    IL: { name: 'Illinois', hasSUI: true, hasSDI: false, hasPIT: true }
  };

  useEffect(() => {
    fetchStateAccounts();
    fetchStateFilings();
  }, []);

  const fetchStateAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state-accounts/active_states/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setStateAccounts(data);
    } catch (error) {
      console.error('Error fetching state accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStateFilings = async () => {
    try {
      const response = await fetch('/api/taxes/payroll/state-filings/by_state/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setStateFilings(data);
    } catch (error) {
      console.error('Error fetching state filings:', error);
    }
  };

  const validateAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state/validate-accounts/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      console.error('Error validating accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayrollRun = async (payrollRunId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxes/payroll/state/process/${payrollRunId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setProcessingResult(data);
    } catch (error) {
      console.error('Error processing payroll run:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWithholding = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/state/withholding/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(withholdingData)
      });
      const data = await response.json();
      
      // Show results in a dialog
      alert(`
        State Withholding Calculation Results:
        State: ${data.state_code}
        Gross Pay: $${data.gross_pay}
        State Income Tax: $${data.state_withholding}
        Employer SUI Tax: $${data.employer_taxes.sui_tax || 0}
        Employee SDI/Other: $${data.employee_taxes.total_employee_tax || 0}
        Total Employee Tax: $${data.total_employee_tax}
      `);
    } catch (error) {
      console.error('Error calculating withholding:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStateForms = async (stateCode, quarter, year) => {
    setLoading(true);
    try {
      const periodStart = `${year}-${(quarter - 1) * 3 + 1}-01`;
      const periodEnd = quarter === 4 
        ? `${year}-12-31` 
        : `${year}-${quarter * 3 + 1}-01`;

      const response = await fetch('/api/taxes/payroll/state/generate-forms/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state_code: stateCode,
          period_start: periodStart,
          period_end: periodEnd
        })
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Forms generated successfully for ${stateCode}`);
      }
    } catch (error) {
      console.error('Error generating forms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <MapPinIcon className="h-6 w-6 mr-2 text-blue-600" />
                  <Typography variant="h5">State Payroll Tax Management</Typography>
                </Box>
              }
              action={
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<DocumentCheckIcon className="h-5 w-5" />}
                    onClick={validateAccounts}
                    sx={{ mr: 1 }}
                  >
                    Validate Accounts
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CurrencyDollarIcon className="h-5 w-5" />}
                    onClick={() => setShowWithholdingCalc(true)}
                  >
                    Calculate Withholding
                  </Button>
                </Box>
              }
            />
          </Card>
        </Grid>

        {/* State Accounts Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Active State Accounts" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>State</TableCell>
                      <TableCell>Account Number</TableCell>
                      <TableCell>SUI Rate</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stateAccounts.map((account) => (
                      <TableRow key={account.state_code}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Chip 
                              label={account.state_code} 
                              size="small" 
                              color="primary"
                              sx={{ mr: 1 }}
                            />
                            {stateConfigs[account.state_code]?.name}
                          </Box>
                        </TableCell>
                        <TableCell>{account.employer_number}</TableCell>
                        <TableCell>{(account.experience_rate * 100).toFixed(3)}%</TableCell>
                        <TableCell>
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* State Tax Features */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="State Tax Features" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>State</TableCell>
                      <TableCell align="center">Income Tax</TableCell>
                      <TableCell align="center">SUI</TableCell>
                      <TableCell align="center">SDI/PFL</TableCell>
                      <TableCell align="center">Local Taxes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(stateConfigs).map(([code, config]) => (
                      <TableRow key={code}>
                        <TableCell>{config.name}</TableCell>
                        <TableCell align="center">
                          {config.hasPIT ? 
                            <CheckCircleIcon className="h-5 w-5 text-green-600" /> : 
                            <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell align="center">
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        </TableCell>
                        <TableCell align="center">
                          {config.hasSDI ? 
                            <CheckCircleIcon className="h-5 w-5 text-green-600" /> : 
                            <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell align="center">
                          {code === 'NY' || code === 'PA' ? 
                            <CheckCircleIcon className="h-5 w-5 text-green-600" /> : 
                            <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Validation Results */}
        {validationResults && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Account Validation Results" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Alert severity="success">
                      <Typography variant="h6">{validationResults.valid?.length || 0}</Typography>
                      <Typography variant="body2">Valid Accounts</Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={4}>
                    <Alert severity="error">
                      <Typography variant="h6">{validationResults.invalid?.length || 0}</Typography>
                      <Typography variant="body2">Invalid Accounts</Typography>
                    </Alert>
                  </Grid>
                  <Grid item xs={4}>
                    <Alert severity="warning">
                      <Typography variant="h6">{validationResults.missing?.length || 0}</Typography>
                      <Typography variant="body2">Missing Handlers</Typography>
                    </Alert>
                  </Grid>
                </Grid>
                
                {validationResults.invalid?.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>Issues Found:</Typography>
                    {validationResults.invalid.map((issue, index) => (
                      <Alert key={index} severity="error" sx={{ mb: 1 }}>
                        <strong>{issue.state}:</strong> {issue.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent State Filings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Recent State Filings" 
              action={
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Filter State</InputLabel>
                  <Select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    label="Filter State"
                  >
                    <MenuItem value="">All States</MenuItem>
                    {Object.entries(stateConfigs).map(([code, config]) => (
                      <MenuItem key={code} value={code}>{config.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            />
            <CardContent>
              {Object.entries(stateFilings).map(([state, filings]) => (
                (!selectedState || selectedState === state) && (
                  <Box key={state} mb={3}>
                    <Typography variant="h6" gutterBottom>
                      {stateConfigs[state]?.name || state}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Period</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Total Wages</TableCell>
                            <TableCell align="right">Withholding</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filings.slice(0, 3).map((filing) => (
                            <TableRow key={filing.id}>
                              <TableCell>{filing.period}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={filing.status} 
                                  size="small"
                                  color={filing.status === 'completed' ? 'success' : 'warning'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                ${Number(filing.total_wages).toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                ${Number(filing.total_withholding).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Download Form">
                                  <IconButton size="small">
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View Details">
                                  <IconButton size="small">
                                    <DocumentTextIcon className="h-4 w-4" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Withholding Calculator Dialog */}
      <Dialog 
        open={showWithholdingCalc} 
        onClose={() => setShowWithholdingCalc(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Calculate State Withholding</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Employee ID"
                value={withholdingData.employee_id}
                onChange={(e) => setWithholdingData({
                  ...withholdingData,
                  employee_id: e.target.value
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Gross Pay"
                type="number"
                value={withholdingData.gross_pay}
                onChange={(e) => setWithholdingData({
                  ...withholdingData,
                  gross_pay: e.target.value
                })}
                InputProps={{
                  startAdornment: '$'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pay Date"
                type="date"
                value={withholdingData.pay_date}
                onChange={(e) => setWithholdingData({
                  ...withholdingData,
                  pay_date: e.target.value
                })}
                InputLabelProps={{
                  shrink: true
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={withholdingData.state_code}
                  onChange={(e) => setWithholdingData({
                    ...withholdingData,
                    state_code: e.target.value
                  })}
                  label="State"
                >
                  {Object.entries(stateConfigs).map(([code, config]) => (
                    <MenuItem key={code} value={code}>{config.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWithholdingCalc(false)}>Cancel</Button>
          <Button 
            onClick={calculateWithholding}
            variant="contained"
            disabled={loading || !withholdingData.employee_id || !withholdingData.gross_pay}
          >
            Calculate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {loading && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="rgba(0, 0, 0, 0.5)"
          zIndex={9999}
        >
          <CircularProgress />
        </Box>
      )}
    </div>
  );
};

export default StatePayrollManager;