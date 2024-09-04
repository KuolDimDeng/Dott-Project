import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const AccountBalances = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchAccountBalances();
  }, []);

  const fetchAccountBalances = async () => {
    try {
      const response = await axiosInstance.get('/api/reports/account-balances/');
      setAccounts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching account balances:', error);
      addMessage('error', 'Failed to fetch account balances');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Account Balances
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account Number</TableCell>
                <TableCell>Account Name</TableCell>
                <TableCell>Account Type</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.account_number}>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.account_type}</TableCell>
                  <TableCell align="right">{formatCurrency(account.balance)}</TableCell>
                  <TableCell>{account.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AccountBalances;