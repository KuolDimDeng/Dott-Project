import React, { useState, useEffect } from 'react';
import { Button, Typography, Box, List, ListItem, ListItemText, CircularProgress, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePlaidLink } from 'react-plaid-link';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const BankingDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState(null);
  const [linkTokenLoading, setLinkTokenLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchBankingAccounts();
    getLinkToken();
  }, []);

  const fetchBankingAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      setAccounts(response.data.accounts || []);
      setSnackbar({ open: true, message: 'Accounts fetched successfully', severity: 'success' });
    } catch (error) {
      console.error('Error fetching banking accounts:', error);
      setError('Failed to fetch banking accounts. Please try again later.');
      setAccounts([]);
      setSnackbar({ open: true, message: 'Failed to fetch accounts', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getLinkToken = async () => {
    setLinkTokenLoading(true);
    try {
      const response = await axiosInstance.post('/api/banking/create_link_token/');
      console.log('Link token response:', response.data);
      setLinkToken(response.data.link_token);
    } catch (error) {
      console.error('Error getting link token:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      setError('Failed to initialize bank link. Please try again later.');
    } finally {
      setLinkTokenLoading(false);
    }
  };

  const onSuccess = async (public_token, metadata) => {
    try {
      await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      fetchBankingAccounts(); // Refresh accounts after linking
      setSnackbar({ open: true, message: 'Bank account linked successfully', severity: 'success' });
    } catch (error) {
      console.error('Error exchanging token:', error);
      setError('Failed to link bank account. Please try again.');
      setSnackbar({ open: true, message: 'Failed to link bank account', severity: 'error' });
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      // Handle success
      handleOnSuccess(public_token, metadata);
    },
    onExit: (err, metadata) => {
      // Handle exit
      console.log('Plaid Link exited', err, metadata);
    },
  });

  const handleOnSuccess = async (public_token, metadata) => {
    try {
      await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      console.log('Token exchange successful');
      fetchBankingAccounts(); // Refresh the accounts list
    } catch (error) {
      console.error('Error exchanging token:', error);
      setError('Failed to link bank account. Please try again.');
    }
  };

  const handleSetupBankLink = async () => {
    if (ready) {
      try {
        const response = await axiosInstance.get('/api/banking/create_link_token/');
        const { link_token } = response.data;
        open({ token: link_token });
      } catch (error) {
        console.error('Error getting link token:', error);
        setError('Failed to initialize bank link. Please try again later.');
      }
    }
  };

  const handleViewTransactions = async (accountId) => {
    try {
      const response = await axiosInstance.get(`/api/banking/transactions/${accountId}/`);
      console.log('Transactions:', response.data.transactions);
      // Handle the response, perhaps by setting state or opening a modal
      setSnackbar({ open: true, message: 'Transactions fetched successfully', severity: 'success' });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions. Please try again.');
      setSnackbar({ open: true, message: 'Failed to fetch transactions', severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Banking Dashboard
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleSetupBankLink}
          disabled={!ready || loading || linkTokenLoading}
        >
          Set Up Bank Account Link
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchBankingAccounts}
          disabled={loading}
        >
          Refresh Accounts
        </Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {loading ? (
        <CircularProgress />
      ) : accounts.length > 0 ? (
        <List>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              secondaryAction={
                <Button
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewTransactions(account.id)}
                >
                  View Transactions
                </Button>
              }
            >
              <ListItemText
                primary={account.name}
                secondary={`Balance: $${account.balances?.current || 'N/A'}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography>No accounts found. Link a bank account to get started.</Typography>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BankingDashboard;