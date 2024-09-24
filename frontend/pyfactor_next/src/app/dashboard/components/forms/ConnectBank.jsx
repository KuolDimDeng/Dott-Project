import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Snackbar,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Link,
} from '@mui/material';
import { usePlaidLink } from 'react-plaid-link';
import axiosInstance from '../components/axiosConfig';

const ConnectBank = () => {
  const [region, setRegion] = useState('');
  const [africanOption, setAfricanOption] = useState('');
  const [africanBankProvider, setAfricanBankProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [connectedBankInfo, setConnectedBankInfo] = useState(null);

  const handleRegionChange = (event) => {
    setRegion(event.target.value);
    setAfricanOption('');
    setAfricanBankProvider('');
  };

  const handleAfricanOptionChange = (event) => {
    setAfricanOption(event.target.value);
    setAfricanBankProvider('');
  };

  const handleAfricanBankProviderChange = (event) => {
    setAfricanBankProvider(event.target.value);
  };

  const getProviderForRegion = (region) => {
    switch (region) {
      case 'America':
        return 'plaid';
      case 'Europe':
        return 'tink';
      case 'Africa':
        return africanOption === 'Mobile Money' ? 'africas_talking' : africanBankProvider;
      case 'Asia':
        return 'salt_edge';
      default:
        return 'unknown';
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    const provider = getProviderForRegion(region);
    try {
      const payload = { region, provider };
      if (region === 'Africa') {
        payload.sub_option = africanOption;
        if (africanOption === 'Banks') {
          payload.bank_provider = africanBankProvider;
        }
      }

      const response = await axiosInstance.post('/api/banking/create_link_token/', payload);
      
      if (response.data.link_token) {
        setLinkToken(response.data.link_token);
      } else if (response.data.auth_url) {
        // Handle non-Plaid providers that return an auth URL
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error creating link token:', err);
      setError('Failed to initialize bank connection. Please try again.');
      setSnackbar({ open: true, message: 'Failed to connect bank', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log("Bank connection successful");
      exchangePublicToken(public_token);
    },
    onExit: (err, metadata) => {
      console.log("Plaid Link exited", err, metadata);
      if (err) {
        setSnackbar({ open: true, message: 'Failed to connect bank', severity: 'error' });
      }
    },
    onEvent: (eventName, metadata) => {
      console.log("Plaid Link event", eventName, metadata);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const exchangePublicToken = async (public_token) => {
    try {
      const response = await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      if (response.data.success) {
        setConnectedBankInfo(response.data.bank_info);
        setSnackbar({ 
          open: true, 
          message: 'Bank connected successfully', 
          severity: 'success' 
        });
      } else {
        throw new Error('Failed to exchange token');
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to connect bank. Please try again.', 
        severity: 'error' 
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Connect Your Bank
        </Typography>
        
        {!connectedBankInfo ? (
          <>
            <Typography variant="body1" paragraph>
              Please choose the region where your bank is located. This helps us provide you with the most appropriate connection method for your bank.
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Your Region</InputLabel>
              <Select value={region} onChange={handleRegionChange}>
                <MenuItem value="America">America</MenuItem>
                <MenuItem value="Europe">Europe</MenuItem>
                <MenuItem value="Africa">Africa</MenuItem>
                <MenuItem value="Asia">Asia</MenuItem>
              </Select>
            </FormControl>

            {region === 'Africa' && (
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">Choose a connection method</FormLabel>
                <RadioGroup value={africanOption} onChange={handleAfricanOptionChange}>
                  <FormControlLabel value="Mobile Money" control={<Radio />} label="Mobile Money" />
                  <FormControlLabel value="Banks" control={<Radio />} label="Traditional Banks" />
                </RadioGroup>
              </FormControl>
            )}

            {region === 'Africa' && africanOption === 'Banks' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Bank Provider</InputLabel>
                <Select value={africanBankProvider} onChange={handleAfricanBankProviderChange}>
                  <MenuItem value="Mono">Mono</MenuItem>
                  <MenuItem value="Stitch">Stitch</MenuItem>
                </Select>
              </FormControl>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleConnect}
              disabled={!region || (region === 'Africa' && (!africanOption || (africanOption === 'Banks' && !africanBankProvider))) || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Connect'}
            </Button>
          </>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom color="primary">
              Successfully Connected!
            </Typography>
            <Typography variant="body1" paragraph>
              You are now connected to {connectedBankInfo.institution_name}.
            </Typography>
            <List>
              {connectedBankInfo.accounts.map((account, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={`Account: ${account.name}`} 
                    secondary={`Type: ${account.type}, Balance: $${account.balances.current.toFixed(2)}`} 
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              You can now view your transactions and account details in the Banking Dashboard.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              component={Link}
              href="/dashboard/banking"
            >
              Go to Banking Dashboard
            </Button>
          </Box>
        )}
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConnectBank;