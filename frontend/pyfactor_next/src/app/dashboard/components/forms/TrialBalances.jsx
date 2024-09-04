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
  Alert,
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const TrialBalance = () => {
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const fetchTrialBalance = async () => {
    try {
      const response = await axiosInstance.get('/api/reports/trial-balance/');
      console.log("Trial balance response:", response.data);
      setTrialBalanceData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trial balance:', error.response?.data || error.message);
      addMessage('error', 'Failed to fetch trial balance');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trial Balance
      </Typography>
      {trialBalanceData && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Account Number</TableCell>
                  <TableCell>Account Name</TableCell>
                  <TableCell>Account Type</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trialBalanceData.accounts.map((account) => (
                  <TableRow key={account.account_number}>
                    <TableCell>{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.account_type}</TableCell>
                    <TableCell align="right">{formatCurrency(account.debit_balance)}</TableCell>
                    <TableCell align="right">{formatCurrency(account.credit_balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>{formatCurrency(trialBalanceData.total_debits)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatCurrency(trialBalanceData.total_credits)}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {trialBalanceData.is_balanced ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              The trial balance is balanced. Total Debits equal Total Credits.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mt: 2 }}>
              The trial balance is not balanced. Please review your entries.
            </Alert>
          )}
        </>
      )}
    </Box>
  );
};

export default TrialBalance;