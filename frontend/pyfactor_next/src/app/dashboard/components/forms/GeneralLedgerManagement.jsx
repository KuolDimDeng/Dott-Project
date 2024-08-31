import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, MenuItem, Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axiosInstance from '../components/axiosConfig';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useUserMessageContext } from '@/contexts/UserMessageContext';



const GeneralLedgerManagement = () => {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [summary, setSummary] = useState([]);
  const { addMessage } = useUserMessageContext();
  const [generalLedgerEntries, setGeneralLedgerEntries] = useState([]);
  const [generalLedgerSummary, setGeneralLedgerSummary] = useState([]);


  useEffect(() => {
    fetchAccounts();
    fetchGeneralLedgerSummary();
    fetchGeneralLedger();  // Add this line
  }, []);

  useEffect(() => {
    console.log('Effect triggered. Selected account:', selectedAccount);
    fetchGeneralLedger();
  }, [selectedAccount, startDate, endDate]);

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/chart-of-accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchGeneralLedger = async () => {
    try {
      const response = await axiosInstance.get('/api/general-ledger/', {
        params: {
          account_id: selectedAccount,
          start_date: startDate,
          end_date: endDate
        }
      });
      setGeneralLedgerEntries(response.data);
      setLedgerEntries(response.data);  // Add this line
    } catch (error) {
      console.error('Error fetching general ledger:', error);
    }
  };
  
  const fetchGeneralLedgerSummary = async () => {
    try {
      const response = await axiosInstance.get('/api/general-ledger-summary/');
      setGeneralLedgerSummary(response.data);
      setSummary(response.data);  // Add this line
    } catch (error) {
      console.error('Error fetching general ledger summary:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>

    <Box>
      <Typography variant="h4" gutterBottom>General Ledger</Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Account"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <MenuItem value="">All Accounts</MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>{account.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
          {generalLedgerEntries.map((entry) => (
                <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.account_name}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.reference}</TableCell>
                <TableCell align="right">{entry.debit_amount}</TableCell>
                <TableCell align="right">{entry.credit_amount}</TableCell>
                <TableCell align="right">{entry.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Account Balances Summary</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Number</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.map((item) => (
              <TableRow key={item.account_id}>
                <TableCell>{item.account_number}</TableCell>
                <TableCell>{item.account_name}</TableCell>
                <TableCell align="right">{item.balance}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
    </LocalizationProvider>

  );
};

export default GeneralLedgerManagement;