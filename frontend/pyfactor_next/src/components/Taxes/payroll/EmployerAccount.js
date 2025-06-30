import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const EmployerAccount = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);
  const [verifyingEIN, setVerifyingEIN] = useState(false);
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  
  const [account, setAccount] = useState({
    ein: '',
    ein_verified: false,
    eftps_enrolled: false,
    eftps_pin: '',
    state_accounts: {},
    federal_deposit_schedule: 'monthly',
    previous_year_liability: '',
    tax_contact_name: '',
    tax_contact_email: '',
    tax_contact_phone: '',
    has_poa: false,
    poa_firm_name: '',
    poa_caf_number: ''
  });

  const [originalAccount, setOriginalAccount] = useState(null);

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch account');
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setAccount(data.results[0]);
        setOriginalAccount(data.results[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(account)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save account');
      }
      
      const data = await response.json();
      setAccount(data);
      setOriginalAccount(data);
      setEditing(false);
      setSuccess('Account settings saved successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyEIN = async () => {
    if (!account.ein) return;
    
    setVerifyingEIN(true);
    setError(null);
    
    try {
      const response = await fetch('/api/taxes/payroll/employer-account/verify_ein/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ ein: account.ein })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify EIN');
      }
      
      const data = await response.json();
      if (data.valid) {
        setAccount({ ...account, ein: data.ein, ein_verified: true });
        setSuccess('EIN verified successfully');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingEIN(false);
    }
  };

  const handleCancel = () => {
    setAccount(originalAccount);
    setEditing(false);
  };

  const formatEIN = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
    }
    return cleaned;
  };

  const handleEINChange = (e) => {
    const formatted = formatEIN(e.target.value);
    setAccount({ ...account, ein: formatted, ein_verified: false });
  };

  const addStateAccount = () => {
    if (!selectedState) return;
    
    const newStateAccounts = {
      ...account.state_accounts,
      [selectedState]: {
        account_number: '',
        access_code: '',
        enabled: true
      }
    };
    
    setAccount({ ...account, state_accounts: newStateAccounts });
    setSelectedState('');
    setShowStateDialog(false);
  };

  const updateStateAccount = (state, field, value) => {
    const newStateAccounts = {
      ...account.state_accounts,
      [state]: {
        ...account.state_accounts[state],
        [field]: value
      }
    };
    
    setAccount({ ...account, state_accounts: newStateAccounts });
  };

  const removeStateAccount = (state) => {
    const newStateAccounts = { ...account.state_accounts };
    delete newStateAccounts[state];
    setAccount({ ...account, state_accounts: newStateAccounts });
  };

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  if (loading && !account.ein) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Employer Tax Account Settings
        </Typography>
        <Box>
          {editing ? (
            <>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveAccount}
                disabled={loading}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditing(true)}
            >
              Edit Settings
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Federal Tax Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Federal Tax Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employer Identification Number (EIN)"
                value={account.ein}
                onChange={handleEINChange}
                disabled={!editing}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {account.ein_verified ? (
                        <Tooltip title="EIN Verified">
                          <VerifiedIcon color="success" />
                        </Tooltip>
                      ) : account.ein && editing ? (
                        <Button
                          size="small"
                          onClick={verifyEIN}
                          disabled={verifyingEIN}
                        >
                          {verifyingEIN ? <CircularProgress size={20} /> : 'Verify'}
                        </Button>
                      ) : null}
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!editing}>
                <InputLabel>Federal Deposit Schedule</InputLabel>
                <Select
                  value={account.federal_deposit_schedule}
                  onChange={(e) => setAccount({ ...account, federal_deposit_schedule: e.target.value })}
                  label="Federal Deposit Schedule"
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="semiweekly">Semi-Weekly</MenuItem>
                  <MenuItem value="next_day">Next Day</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Previous Year Tax Liability"
                value={account.previous_year_liability}
                onChange={(e) => setAccount({ ...account, previous_year_liability: e.target.value })}
                disabled={!editing}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                helperText="Used to determine deposit schedule"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={account.eftps_enrolled}
                    onChange={(e) => setAccount({ ...account, eftps_enrolled: e.target.checked })}
                    disabled={!editing}
                  />
                }
                label="EFTPS Enrolled"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* State Tax Accounts */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              State Tax Accounts
            </Typography>
            {editing && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowStateDialog(true)}
              >
                Add State
              </Button>
            )}
          </Box>
          
          {Object.keys(account.state_accounts).length > 0 ? (
            <List>
              {Object.entries(account.state_accounts).map(([state, data]) => (
                <ListItem key={state} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={state} size="small" color="primary" />
                        {data.enabled ? (
                          <CheckIcon color="success" fontSize="small" />
                        ) : (
                          <CloseIcon color="error" fontSize="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      editing ? (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Account Number"
                              value={data.account_number || ''}
                              onChange={(e) => updateStateAccount(state, 'account_number', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Access Code"
                              type="password"
                              value={data.access_code || ''}
                              onChange={(e) => updateStateAccount(state, 'access_code', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={data.enabled}
                                  onChange={(e) => updateStateAccount(state, 'enabled', e.target.checked)}
                                />
                              }
                              label="Active"
                            />
                          </Grid>
                        </Grid>
                      ) : (
                        `Account: ${data.account_number ? '****' + data.account_number.slice(-4) : 'Not configured'}`
                      )
                    }
                  />
                  {editing && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => removeStateAccount(state)}>
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No state tax accounts configured
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Tax Contact Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tax Contact Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact Name"
                value={account.tax_contact_name}
                onChange={(e) => setAccount({ ...account, tax_contact_name: e.target.value })}
                disabled={!editing}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact Email"
                type="email"
                value={account.tax_contact_email}
                onChange={(e) => setAccount({ ...account, tax_contact_email: e.target.value })}
                disabled={!editing}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Contact Phone"
                value={account.tax_contact_phone}
                onChange={(e) => setAccount({ ...account, tax_contact_phone: e.target.value })}
                disabled={!editing}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Power of Attorney */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Power of Attorney
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={account.has_poa}
                onChange={(e) => setAccount({ ...account, has_poa: e.target.checked })}
                disabled={!editing}
              />
            }
            label="Power of Attorney on File"
          />
          
          {account.has_poa && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Firm Name"
                  value={account.poa_firm_name}
                  onChange={(e) => setAccount({ ...account, poa_firm_name: e.target.value })}
                  disabled={!editing}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="CAF Number"
                  value={account.poa_caf_number}
                  onChange={(e) => setAccount({ ...account, poa_caf_number: e.target.value })}
                  disabled={!editing}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Add State Dialog */}
      <Dialog open={showStateDialog} onClose={() => setShowStateDialog(false)}>
        <DialogTitle>Add State Tax Account</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select State</InputLabel>
            <Select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              label="Select State"
            >
              {states
                .filter(state => !account.state_accounts[state])
                .map(state => (
                  <MenuItem key={state} value={state}>{state}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStateDialog(false)}>Cancel</Button>
          <Button onClick={addStateAccount} disabled={!selectedState}>Add State</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployerAccount;