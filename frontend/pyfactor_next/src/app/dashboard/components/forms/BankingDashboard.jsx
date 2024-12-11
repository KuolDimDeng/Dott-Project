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
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import { axiosInstance } from '@/lib/axiosConfig';
import NextLink from 'next/link';

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
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [connectedBank, setConnectedBank] = useState(null);
  const theme = useTheme();

  const fetchBankingAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
        if (response.data.accounts.length > 0) {
          setConnectedBank(response.data.accounts[0].name.split(' ')[0]); // Assuming the bank name is the first word in the account name
        } else {
          setConnectedBank(null);
        }
      } else {
        setAccounts([]);
        setConnectedBank(null);
      }
    } catch (error) {
      console.error('Error fetching banking accounts:', error);
      setError('Failed to fetch banking accounts. Please try again later.');
      setConnectedBank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    if (!connectedBank) {
      setTransactions([]);
      return;
    }
    try {
      const response = await axiosInstance.get('/api/banking/recent-transactions/', {
        params: { limit: 10 },
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
  }, [connectedBank]);

  useEffect(() => {
    fetchBankingAccounts();
  }, [fetchBankingAccounts]);

  useEffect(() => {
    fetchRecentTransactions();
  }, [fetchRecentTransactions]);

  const handleDownload = async () => {
    if (!connectedBank) {
      setError('Please connect a bank account before downloading transactions.');
      return;
    }
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

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AccountBalanceIcon sx={{ mr: 2, fontSize: 40 }} />
        Banking Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{ ml: 6, mb: 3, color: 'text.secondary' }}>
        Manage your accounts, download transactions, and view recent activity
      </Typography>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
        Connected Bank: {connectedBank || 'None'}
        {!connectedBank && (
          <Typography component="span" variant="body1" sx={{ ml: 2 }}>
            Please link a banking institution
            <NextLink href="/connect-bank" passHref>
              <Link sx={{ ml: 1 }}>here</Link>
            </NextLink>
            .
          </Typography>
        )}
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
                <Typography>
                  No accounts found. Please connect a bank account to get started.
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchBankingAccounts}>
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
                disabled={!connectedBank}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                disabled={!connectedBank}
              />
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                disabled={!connectedBank || !startDate || !endDate}
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
                disabled={!connectedBank}
              />
              {connectedBank ? (
                <TableContainer component={Paper}>
                  <Table sx={{ minWidth: 650 }} aria-label="transactions table">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Description</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Date</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Amount</strong>
                        </TableCell>
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
                            <TableCell align="right">
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">${transaction.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>Please connect a bank account to view recent transactions.</Typography>
              )}
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchRecentTransactions}
                disabled={!connectedBank}
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
