import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SearchIcon from '@mui/icons-material/Search';
import axiosInstance from '../components/axiosConfig';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 440,
  marginTop: theme.spacing(3),
}));

const BankTransactionPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const theme = useTheme();


  const fetchBankAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setError('Failed to fetch bank accounts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const fetchTransactions = async () => {
    if (!selectedAccount || !startDate || !endDate) {
      setError('Please select an account and date range.');
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/banking/transactions/', {
        params: {
          account_id: selectedAccount,
          start_date: startDate,
          end_date: endDate,
        },
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AccountBalanceIcon sx={{ mr: 2, fontSize: 40 }} />
        Bank Transactions
      </Typography>

      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel id="bank-account-select-label">Bank Account</InputLabel>
        <Select
          labelId="bank-account-select-label"
          id="bank-account-select"
          value={selectedAccount}
          label="Bank Account"
          onChange={handleAccountChange}
        >
          {accounts.map((account) => (
            <MenuItem key={account.account_id} value={account.account_id}>
              {account.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          onClick={fetchTransactions}
          startIcon={<SearchIcon />}
          disabled={loading}
        >
          Fetch Transactions
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <CircularProgress sx={{ mt: 3 }} />
      ) : (
        <StyledTableContainer component={Paper}>
          <Table stickyHeader aria-label="transactions table">
            <TableHead>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right">${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </StyledTableContainer>
      )}
    </Box>
  );
};

export default BankTransactionPage;