// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms/AddIncomeForm.jsx

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
  Modal,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import UnpaidInvoicesList from '../lists/UnpaidInvoicesList';  // Adjust the import path as needed


const AddIncomeForm = ({ onClose }) => {
  const [date, setDate] = useState(null);
  const [account, setAccount] = useState('');
  const [type, setType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [userDatabase, setUserDatabase] = useState('');
  const [showUnpaidInvoices, setShowUnpaidInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [error, setError] = useState(null);


  const { addMessage } = useUserMessageContext();

  const accountOptions = [
    'Cash on Hand',
    'Checking Account',
    'Savings Account',
    'Accounts Receivable',
    'Other Current Assets',
    'Fixed Assets',
    'Other Assets',
  ];

  const accountTypeOptions = [
    'Sales',
    'Accounts Receivable',
    'Owner Investment',
    'Other Income',
  ];

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (account === 'Cash on Hand' && type === 'Deposit' && accountType === 'Accounts Receivable') {
      fetchUnpaidInvoices();
    } else {
      setShowUnpaidInvoices(false);
      setSelectedInvoice(null);
    }
  }, [account, type, accountType]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
      addMessage('info', 'User profile loaded successfully');
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      addMessage('error', `Error fetching user profile: ${error.message}`);
      setError('Failed to load user profile');
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const response = await axiosInstance.get('/api/unpaid-invoices/');
      if (Array.isArray(response.data)) {
        setUnpaidInvoices(response.data);
      } else {
        console.error('Unexpected response format:', response.data);
        setUnpaidInvoices([]);
      }
      setShowUnpaidInvoices(true);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      addMessage('error', `Error fetching unpaid invoices: ${error.message}`);
      setError('Failed to load unpaid invoices');
      setUnpaidInvoices([]);
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

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setAmount(invoice.amount);
    setShowUnpaidInvoices(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date || !account || !type || !accountType || !amount) {
      setError('Please fill in all required fields');
      return;
    }

  
    const formattedDate = date.toISOString().split('T')[0];
  
    const formData = new FormData();
    formData.append('date', formattedDate);
    formData.append('account', account);
    formData.append('type', type);
    formData.append('account_type', accountType);
    formData.append('amount', amount);
    formData.append('notes', notes);
    if (receipt) {
      formData.append('receipt', receipt);
    }
    formData.append('database', userDatabase);
    if (selectedInvoice) {
      formData.append('invoice_id', selectedInvoice.id);
    }
  
    try {
      const response = await axiosInstance.post('http://localhost:8000/api/incomes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 201) {
        const data = response.data;
        logger.log('Income record created:', data);
        addMessage('info', 'Income record created successfully');
        onClose();
      }
    } catch (error) {
      logger.error('Error creating income record:', error);
      if (error.response) {
        logger.error('Error response data:', error.response.data);
        logger.error('Error response status:', error.response.status);
        logger.error('Error response headers:', error.response.headers);
        addMessage('error', `Error creating income record: ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        logger.error('Error request:', error.request);
        addMessage('error', 'Error creating income record: No response received from server');
      } else {
        logger.error('Error message:', error.message);
        addMessage('error', `Error creating income record: ${error.message}`);
      }
      setError('Failed to create income record');
    }
  };


  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

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
          {accountOptions.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
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
          {accountTypeOptions.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Amount"
        fullWidth
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
        }}
      />

      {selectedInvoice && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected Invoice: #{selectedInvoice.id} - ${selectedInvoice.amount}
        </Typography>
      )}

      <TextField
        label="Notes"
        fullWidth
        margin="normal"
        multiline
        rows={2}
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

      <Modal
        open={showUnpaidInvoices}
        onClose={() => setShowUnpaidInvoices(false)}
        aria-labelledby="unpaid-invoices-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          maxHeight: '80vh',
          overflow: 'auto',
        }}>
          <Typography id="unpaid-invoices-modal" variant="h6" component="h2">
            Select Unpaid Invoice
          </Typography>
          <UnpaidInvoicesList onSelect={handleInvoiceSelect} />
        </Box>
      </Modal>
    </Box>
  );
};

export default AddIncomeForm;