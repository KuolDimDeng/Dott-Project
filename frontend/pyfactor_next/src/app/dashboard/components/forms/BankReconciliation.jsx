import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import axiosInstance from '../components/axiosConfig';


const BankReconciliation = () => {
  const [bankAccount, setBankAccount] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [beginningBalance, setBeginningBalance] = useState(0);
  const [endingBalance, setEndingBalance] = useState(0);
  const [bookBalance, setBookBalance] = useState(0);
  const [difference, setDifference] = useState(0);
  const [adjustedBalance, setAdjustedBalance] = useState(0);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bookTransactions, setBookTransactions] = useState([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([]);
  const [bankFees, setBankFees] = useState(0);
  const [interestEarned, setInterestEarned] = useState(0);
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();


  useEffect(() => {
    fetchConnectedBanks();
  }, []);

  useEffect(() => {
    if (bankAccount && startDate && endDate) {
      fetchBankTransactions();
      fetchBookTransactions();
    }
  }, [bankAccount, startDate, endDate]);



  useEffect(() => {
    // Calculate difference and adjusted balance
    const calculatedDifference = endingBalance - bookBalance;
    setDifference(calculatedDifference);
    setAdjustedBalance(bookBalance + bankFees + interestEarned);
  }, [endingBalance, bookBalance, bankFees, interestEarned]);


  const fetchConnectedBanks = async () => {
    try {
      const response = await axiosInstance.get('/api/banking/accounts/');
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        setConnectedBanks(response.data.accounts);
      } else {
        setConnectedBanks([]);
      }
    } catch (error) {
      console.error('Error fetching connected banks:', error);
    }
  };

  const fetchBankTransactions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/banking/transactions/', {
        params: {
          account_id: bankAccount,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });
      if (response.data.transactions && Array.isArray(response.data.transactions)) {
        setBankTransactions(response.data.transactions);
      } else {
        setBankTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookTransactions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/general-ledger/', {
        params: {
          account_id: bankAccount,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });
      if (response.data && Array.isArray(response.data)) {
        setBookTransactions(response.data);
      } else {
        setBookTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching book transactions:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleMatch = (bankIndex, bookIndex) => {
    // Logic to match transactions
  };

  const handleAddMissingTransaction = () => {
    // Logic to add missing transaction
  };

  const handleSaveDraft = () => {
    // Logic to save draft
  };

  const handleFinalize = () => {
    // Logic to finalize reconciliation
  };

  const handleGenerateReport = () => {
    // Logic to generate report
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AccountBalanceIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Bank Reconciliation
          </Typography>
        </Box>
        <Typography variant="subtitle1" gutterBottom sx={{ ml: 7, mb: 3, color: 'text.secondary' }}>
          Manage bank reconciliation
        </Typography>

        {/* Header/Overview Section */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>Select Bank Account</MenuItem>
              {connectedBanks.map((account) => (
                <MenuItem key={account.account_id} value={account.account_id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Ending Balance"
              type="number"
              value={endingBalance}
              onChange={(e) => setEndingBalance(Number(e.target.value))}
            />
          </Grid>
        </Grid>

        {/* Reconciliation Summary */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reconciliation Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography>Book Balance: ${bookBalance.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography>Difference: ${difference.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography>Adjusted Balance: ${adjustedBalance.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Transactions List */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Bank Transactions
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bankTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                        <TableCell>{transaction.status || 'Pending'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                    Book Transactions
                </Typography>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {bookTransactions.map((transaction, index) => (
                            <TableRow key={index}>
                            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                            <TableCell>{transaction.status || 'Posted'}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    </TableContainer>
                )}
                </Grid>
        </Grid>

      {/* Adjustment Section */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Adjustments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Fees"
                type="number"
                value={bankFees}
                onChange={(e) => setBankFees(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Interest Earned"
                type="number"
                value={interestEarned}
                onChange={(e) => setInterestEarned(Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleAddMissingTransaction}>
                Add Missing Transaction
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Unmatched Transactions */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Unmatched Transactions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unmatchedTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.amount}</TableCell>
                    <TableCell>{transaction.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Finalize Section */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <Button variant="contained" onClick={handleFinalize}>
          Finalize & Reconcile
        </Button>
        <Button variant="outlined" onClick={handleGenerateReport}>
          Generate Report
        </Button>
      </Box>

      {/* Discrepancy Alerts */}
      {difference !== 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          There is a discrepancy of ${Math.abs(difference).toFixed(2)} in your reconciliation. Please review your transactions.
        </Alert>
      )}
    </Box>
    </LocalizationProvider>
  );
};

export default BankReconciliation;