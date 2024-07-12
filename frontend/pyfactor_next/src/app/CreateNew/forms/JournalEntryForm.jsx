// src/app/dashboard/components/forms/JournalEntryForm.jsx

// JournalEntryForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const JournalEntryForm = ({ onClose }) => {
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([
    { account: '', type: 'debit', amount: '' },
    { account: '', type: 'credit', amount: '' },
  ]);
  const [accounts, setAccounts] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    console.log('JournalEntryForm mounted');
    fetchUserProfile();
    fetchAccounts();
  }, []);
  
  useEffect(() => {
    console.log('Accounts state updated:', accounts);
  }, [accounts]);


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
    }
  };


  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await axiosInstance.get('/api/accounts/');
      console.log('API Response:', response);
      console.log('Accounts data:', response.data);
      if (Array.isArray(response.data) && response.data.length > 0) {
        setAccounts(response.data);
      } else {
        console.error('Unexpected or empty accounts data:', response.data);
        addMessage('error', 'Unexpected or empty accounts data');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      console.error('Error status:', error.response ? error.response.status : 'No status');
      console.error('Error headers:', error.response ? error.response.headers : 'No headers');
      logger.error('Error fetching accounts:', error);
      addMessage('error', `Failed to fetch accounts: ${error.message}`);
    }
  };


  const handleAddEntry = () => {
    setEntries([...entries, { account: '', type: 'debit', amount: '' }]);
  };

  const handleRemoveEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement form submission logic here
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Date"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
        />
      </LocalizationProvider>
      <TextField
        label="Description"
        fullWidth
        margin="normal"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {entries.map((entry, index) => (
        <Grid container spacing={2} key={index} alignItems="center">
          <Grid item xs={4}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Account</InputLabel>
            <Select
                value={entry.account}
                onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
            >
                {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                    {account.name}
                </MenuItem>
                ))}
            </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={entry.type}
                onChange={(e) => handleEntryChange(index, 'type', e.target.value)}
              >
                <MenuItem value="debit">Debit</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              margin="normal"
              value={entry.amount}
              onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
            />
          </Grid>
          <Grid item xs={2}>
            <IconButton onClick={() => handleRemoveEntry(index)} color="error">
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
      <Button startIcon={<AddIcon />} onClick={handleAddEntry} sx={{ mt: 2 }}>
        Add Entry
      </Button>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="primary">
          Save Journal Entry
        </Button>
      </Box>
    </Box>
  );
};

export default JournalEntryForm;