import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useApi } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const AddExpenseForm = ({ onClose }) => {
  const [date, setDate] = useState(null);
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [amount, setAmount] = useState('');
  const [salesTaxPercentage, setSalesTaxPercentage] = useState('');
  const [calculatedSalesTax, setCalculatedSalesTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (amount && salesTaxPercentage) {
      const taxAmount = (parseFloat(amount) * parseFloat(salesTaxPercentage)) / 100;
      setCalculatedSalesTax(taxAmount.toFixed(2));
    } else {
      setCalculatedSalesTax(0);
    }
  }, [amount, salesTaxPercentage]);

  const fetchUserProfile = async () => {
    try {
      const response = await useApi.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
      addMessage('info', 'User profile loaded successfully');
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      addMessage('error', `Error fetching user profile: ${error.message}`);
    }
  };

  const handleAccountChange = (e) => {
    setAccount(e.target.value);
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  const handleAccountTypeChange = (e) => {
    setAccountType(e.target.value);
  };

  const handleReceiptChange = (e) => {
    setReceipt(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedDate = date.toISOString().split('T')[0];

    const formData = new FormData();
    formData.append('date', formattedDate);
    formData.append('account', account);
    formData.append('type', type);
    formData.append('account_type', accountType);
    formData.append('amount', amount);
    formData.append('sales_tax_percentage', salesTaxPercentage);
    formData.append('sales_tax_amount', calculatedSalesTax);
    formData.append('notes', notes);
    if (receipt) {
      formData.append('receipt', receipt);
    }
    formData.append('database', userDatabase);

    logger.log('Form data:', formData);

    try {
      const response = await useApi.post('http://localhost:8000/api/expenses/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        const data = response.data;
        logger.log('Expense record created:', data);
        addMessage('info', 'Expense record created successfully');
        onClose();
      }
    } catch (error) {
      logger.error('Error creating expense record:', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
        logger.error('Error response status:', error.response.status);
        logger.error('Error response headers:', error.response.headers);
        addMessage(
          'error',
          `Error creating expense record: ${error.response.data.message || 'Unknown error'}`
        );
      } else if (error.request) {
        logger.error('Error request:', error.request);
        addMessage('error', 'Error creating expense record: No response received from server');
      } else {
        logger.error('Error message:', error.message);
        addMessage('error', `Error creating expense record: ${error.message}`);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Date"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
        />
      </LocalizationProvider>

      <FormControl fullWidth margin="normal">
        <InputLabel>Account</InputLabel>
        <Select value={account} onChange={handleAccountChange}>
          <MenuItem value="Cash on Hand">Cash on Hand</MenuItem>
          <MenuItem value="Checking Account">Checking Account</MenuItem>
          <MenuItem value="Savings Account">Savings Account</MenuItem>
          <MenuItem value="Credit Card">Credit Card</MenuItem>
          <MenuItem value="Accounts Payable">Accounts Payable</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Type</InputLabel>
        <Select value={type} onChange={handleTypeChange}>
          <MenuItem value="Withdrawal">Withdrawal</MenuItem>
          <MenuItem value="Deposit">Deposit</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Account Type</InputLabel>
        <Select value={accountType} onChange={handleAccountTypeChange}>
          <MenuItem value="Expense">Expense</MenuItem>
          <MenuItem value="Accounts Payable">Accounts Payable</MenuItem>
          <MenuItem value="Utilities">Utilities</MenuItem>
          <MenuItem value="Rent">Rent</MenuItem>
          <MenuItem value="Supplies">Supplies</MenuItem>
          <MenuItem value="Payroll">Payroll</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Amount"
        fullWidth
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <TextField
        label="Sales Tax Percentage"
        fullWidth
        margin="normal"
        value={salesTaxPercentage}
        onChange={(e) => setSalesTaxPercentage(e.target.value)}
        type="number"
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
        }}
      />

      <TextField
        label="Calculated Sales Tax"
        fullWidth
        margin="normal"
        value={calculatedSalesTax}
        InputProps={{
          readOnly: true,
        }}
      />

      <TextField
        label="Notes"
        fullWidth
        margin="normal"
        multiline
        rows={4}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Box mt={2}>
        <input
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          id="receipt-upload"
          type="file"
          onChange={handleReceiptChange}
        />
        <label htmlFor="receipt-upload">
          <Button variant="contained" color="primary" component="span">
            Upload Receipt
          </Button>
        </label>
      </Box>

      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button variant="contained" color="primary" type="submit">
          Save
        </Button>
        <Button variant="text" onClick={onClose} sx={{ ml: 1 }}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default AddExpenseForm;
