// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/BankingDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  TextField,
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import { usePlaidLink } from 'react-plaid-link';
import axiosInstance from '../components/axiosConfig';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const BankingDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBankingAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching banking accounts:', error);
      setError('Failed to fetch banking accounts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/banking/recent-transactions/', {
        params: { limit: 10 }
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      setError('Failed to fetch recent transactions. Please try again later.');
    }
  }, []);

  useEffect(() => {
    fetchBankingAccounts();
    fetchRecentTransactions();
    getLinkToken();
  }, [fetchBankingAccounts, fetchRecentTransactions]);

  const getLinkToken = async () => {
    try {
      const response = await axiosInstance.post('/api/banking/create_link_token/');
      if (response.data && response.data.link_token) {
        setLinkToken(response.data.link_token);
      } else {
        setError('Failed to initialize bank link. Invalid server response.');
      }
    } catch (error) {
      console.error('Error getting link token:', error);
      setError('Failed to initialize bank link. Please try again later.');
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log("Plaid Link success. Exchanging public token for access token...");
      exchangePublicToken(public_token);
    },
  });

  const exchangePublicToken = async (public_token) => {
    try {
      await axiosInstance.post('/api/banking/exchange_token/', { public_token });
      fetchBankingAccounts();
    } catch (error) {
      console.error('Error exchanging token:', error);
      setError('Failed to link bank account. Please try again.');
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/download-transactions/', {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading transactions:', error);
      setError('Failed to download transactions. Please try again.');
    }
  };

  const filteredTransactions = transactions.filter(transaction => 
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AccountBalanceIcon sx={{ mr: 2, fontSize: 40 }} />
        Banking Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{ ml: 6, mb: 3, color: 'text.secondary' }}>
        Manage your accounts, download transactions, and view recent activity
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bank Accounts
              </Typography>
              {accounts.length > 0 ? (
                <List>
                  {accounts.map((account) => (
                    <ListItem key={account.account_id}>
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
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => ready && open()}
                disabled={!ready}
              >
                Set Up Bank Account Link
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchBankingAccounts}
              >
                Refresh Accounts
              </Button>
            </CardActions>
          </StyledCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Download Transactions
              </Typography>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                disabled={!startDate || !endDate}
                fullWidth
              >
                Download Transactions
              </Button>
            </CardActions>
          </StyledCard>
        </Grid>
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="transactions table">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell align="right"><strong>Date</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {transaction.description}
                          </TableCell>
                          <TableCell align="right">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                          <TableCell align="right">${transaction.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No transactions found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRecentTransactions}
              >
                Refresh Transactions
              </Button>
            </CardActions>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BankingDashboard;