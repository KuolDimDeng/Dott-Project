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
  Select,
  MenuItem,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';

const BankingReport = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();


  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    console.log('Selected account updated:', selectedAccount);
  }, [selectedAccount]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      console.log('Bank accounts response:', response.data);
      if (Array.isArray(response.data)) {
        setBankAccounts(response.data);
      } else if (response.data && Array.isArray(response.data.accounts)) {
        setBankAccounts(response.data.accounts);
      } else {
        console.error('Unexpected response format:', response.data);
        setBankAccounts([]);
        setError('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setBankAccounts([]);
      setError('Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching report for account:', selectedAccount);
      const response = await axiosInstance.get('/api/banking/report/', {
        params: {
          account_id: selectedAccount,
          start_date: startDate?.toISOString().split('T')[0],
          end_date: endDate?.toISOString().split('T')[0],
        },
      });
      console.log('Report data:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (event) => {
    const value = event.target.value;
    console.log('Account selected:', value);
    setSelectedAccount(value);
  };

  const handleGenerateReport = () => {
    console.log('Generate report clicked. Selected account:', selectedAccount);
    if (!selectedAccount) {
      setError('Please select a bank account');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    fetchReportData();
  };

  const handleExport = (format) => {
    // Implement export functionality (PDF or CSV)
    console.log(`Exporting report as ${format}`);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Typography variant="h4" gutterBottom>
          Banking Report
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Filters and Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Select
                fullWidth
                value={selectedAccount}
                onChange={handleAccountChange}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Bank Account</MenuItem>
                {Array.isArray(bankAccounts) && bankAccounts.length > 0 ? (
                  bankAccounts.map((account) => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name} - {account.mask}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No bank accounts available</MenuItem>
                )}
              </Select>
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => {
                  console.log('Start date changed:', newValue);
                  setStartDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => {
                  console.log('End date changed:', newValue);
                  setEndDate(newValue);
                }}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleGenerateReport} 
                fullWidth
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => handleExport('PDF')} sx={{ mr: 1 }} disabled={!reportData}>
              Export PDF
            </Button>
            <Button variant="outlined" onClick={() => handleExport('CSV')} disabled={!reportData}>
              Export CSV
            </Button>
          </Box>
        </Paper>

        {reportData && (
          <>
            {/* Header Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Report Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography>Bank: {reportData.bank_name}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography>Account: {reportData.account_number}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography>Beginning Balance: ${reportData.beginning_balance.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography>Ending Balance: ${reportData.ending_balance.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Transactions Section */}
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Check Number</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.check_number || '-'}</TableCell>
                      <TableCell align="right">{transaction.debit ? `$${transaction.debit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell align="right">{transaction.credit ? `$${transaction.credit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell align="right">${transaction.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Reconciliation Summary */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Reconciliation Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography>Outstanding Checks: ${reportData.outstanding_checks.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>Deposits in Transit: ${reportData.deposits_in_transit.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Summary Section */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography>Total Debits: ${reportData.total_debits.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography>Total Credits: ${reportData.total_credits.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography>Net Change: ${reportData.net_change.toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default BankingReport;