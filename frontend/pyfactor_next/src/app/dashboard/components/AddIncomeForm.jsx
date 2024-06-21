import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axiosInstance from './axiosConfig';

const AddIncomeForm = ({ onClose, accounts }) => {
  const [date, setDate] = useState(null);
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [amount, setAmount] = useState('');
  const [salesTax, setSalesTax] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data);
      console.log('User database:', response.data.database_name);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleAccountChange = (e) => {
    const selectedAccount = e.target.value;
    console.log('Selected account value:', selectedAccount);
    setAccount(selectedAccount);
    console.log('Selected account ID:', selectedAccount);
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
    formData.append('sales_tax', salesTax);
    formData.append('notes', notes);
    if (receipt) {
      formData.append('receipt', receipt);
    }
    formData.append('database', userDatabase);
  
    console.log('Form data:', formData);
  
    try {
      const response = await axiosInstance.post('http://localhost:8000/api/incomes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 201) {
        const data = response.data;
        console.log('Income record created:', data);
        onClose();
      }
    } catch (error) {
      console.error('Error creating income record:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
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
          renderInput={(params) => (
            <TextField {...params} fullWidth margin="normal" />
          )}
        />
      </LocalizationProvider>

      <FormControl fullWidth margin="normal">
        <InputLabel>Account</InputLabel>
        <Select value={account} onChange={handleAccountChange}>
          <MenuItem value="Cash on Hand">Cash on Hand</MenuItem>
          <MenuItem value="Checking Account">Checking Account</MenuItem>
          <MenuItem value="Savings Account">Savings Account</MenuItem>
          <MenuItem value="Petty Cash">Petty Cash</MenuItem>
          <MenuItem value="Accounts Receivable">Accounts Receivable</MenuItem>
          <MenuItem value="Other Current Assets">Other Current Assets</MenuItem>
          <MenuItem value="Fixed Assets">Fixed Assets</MenuItem>
          <MenuItem value="Accounts Payable">Accounts Payable</MenuItem>
          <MenuItem value="Credit Card">Credit Card</MenuItem>
          <MenuItem value="Other Current Liabilities">Other Current Liabilities</MenuItem>
          <MenuItem value="Long Term Liabilities">Long Term Liabilities</MenuItem>
          <MenuItem value="Owner's Equity">Owner's Equity</MenuItem>
          <MenuItem value="Income">Income</MenuItem>
          <MenuItem value="Other Income">Other Income</MenuItem>
          <MenuItem value="Cost of Goods Sold">Cost of Goods Sold</MenuItem>
          <MenuItem value="Expenses">Expenses</MenuItem>
          <MenuItem value="Other Expenses">Other Expenses</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Type</InputLabel>
        <Select value={type} onChange={handleTypeChange}>
          <MenuItem value="Deposit">Deposit</MenuItem>
          <MenuItem value="Withdrawal">Withdrawal</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Account Type</InputLabel>
        <Select value={accountType} onChange={handleAccountTypeChange}>
          <MenuItem value="Sales">Sales</MenuItem>
          <MenuItem value="Accounts Receivable">Accounts Receivable</MenuItem>
          <MenuItem value="Accounts Payable">Accounts Payable</MenuItem>
          <MenuItem value="Payroll Liabilities">Payroll Liabilities</MenuItem>
          <MenuItem value="Owner Investment">Owner Investment</MenuItem>
          <MenuItem value="Owner Drawings">Owner Drawings</MenuItem>
          <MenuItem value="Owner Equity">Owner Equity</MenuItem>
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
        label="Sales Tax"
        fullWidth
        margin="normal"
        value={salesTax}
        onChange={(e) => setSalesTax(e.target.value)}
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

export default AddIncomeForm;