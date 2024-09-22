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

  const onSuccess = async (public_token, metadata) => {
    console.log("Plaid Link success. Exchanging public token for access token...");
    try {
      const response = await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      console.log("Token exchange successful:", response.data);
      fetchBankingAccounts();
      setSnackbar({ open: true, message: 'Bank account linked successfully', severity: 'success' });
    } catch (error) {
      console.error('Error exchanging token:', error);
      setError('Failed to link bank account. Please try again.');
      setSnackbar({ open: true, message: 'Failed to link bank account', severity: 'error' });
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => {
      console.log('Plaid Link exited', err, metadata);
    },
  });

  useEffect(() => {
    console.log("Component mounted. Initializing...");
    fetchBankingAccounts();
    getLinkToken();
  }, []);

  useEffect(() => {
    console.log("Link token updated:", linkToken);
  }, [linkToken]);

  useEffect(() => {
    console.log("Plaid Link ready state changed:", ready);
  }, [ready]);

  useEffect(() => {
    console.log("State updated:", {
      accountsCount: accounts.length,
      loading,
      linkTokenLoading,
      ready,
      linkToken: linkToken ? 'Set' : 'Not Set'
    });
  }, [accounts, loading, linkTokenLoading, ready, linkToken]);

  const fetchBankingAccounts = async () => {
    console.log("Fetching banking accounts...");
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      console.log("Raw API response:", response);
      console.log("Accounts data:", response.data);
      console.log("Accounts array:", response.data.accounts);
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
      } else {
        console.error("Unexpected accounts data structure:", response.data);
        setAccounts([]);
      }
      setSnackbar({ open: true, message: 'Accounts fetched successfully', severity: 'success' });
    } catch (error) {
      console.error('Error fetching banking accounts:', error);
      setError('Failed to fetch banking accounts. Please try again later.');
      setAccounts([]);
      setSnackbar({ open: true, message: 'Failed to fetch accounts', severity: 'error' });
    } finally {
      setLoading(false);
      console.log("Finished fetching accounts. Accounts state:", accounts);
      console.log("Loading state:", loading);
    }
  };

  const getLinkToken = async () => {
    console.log("Requesting link token from server...");
    setLinkTokenLoading(true);
    try {
      const response = await axiosInstance.post('/api/banking/create_link_token/');
      console.log('Link token received:', response.data);
      if (response.data && response.data.link_token) {
        setLinkToken(response.data.link_token);
      } else {
        console.error("Unexpected link token response:", response.data);
        setError('Failed to initialize bank link. Invalid server response.');
      }
    } catch (error) {
      console.error('Error getting link token:', error);
      setError('Failed to initialize bank link. Please try again later.');
    } finally {
      setLinkTokenLoading(false);
      console.log("Link token loading finished. linkTokenLoading state:", linkTokenLoading);
    }
  };


  useEffect(() => {
    console.log("Plaid Link ready state changed:", ready);
  }, [ready]);

  const handleSetupBankLink = () => {
    console.log("Setup Bank Link button clicked");
    console.log("Current states - ready:", ready, "linkToken:", linkToken, "loading:", loading, "linkTokenLoading:", linkTokenLoading);
    if (ready && linkToken) {
      console.log("Opening Plaid Link...");
      open();
    } else {
      console.log("Plaid Link not ready or no link token available");
      setError('Plaid Link is not ready. Please try again later.');
    }
  };

  const handleViewTransactions = async (accountId) => {
    console.log(`Fetching transactions for account ${accountId}...`);
    try {
      const response = await axiosInstance.get(`/api/banking/transactions/${accountId}/`);
      console.log('Transactions fetched:', response.data.transactions);
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

  console.log("Rendering BankingDashboard");
  console.log("Current states - loading:", loading, "linkTokenLoading:", linkTokenLoading, "ready:", ready, "linkToken:", linkToken);
  console.log("Button state conditions:", {
    ready: ready,
    loading: loading,
    linkTokenLoading: linkTokenLoading
  });

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
      ) : accounts && accounts.length > 0 ? (
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