'use client'
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
  Paper,
  useTheme
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axiosInstance from '@/lib/axiosConfig';;
import { useUserMessageContext } from '@/contexts/UserMessageContext';


const BillForm = () => {
  const [vendor, setVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [billDate, setBillDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [posoNumber, setPosoNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState(null);
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();



  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    console.log('Vendors:', vendors);
  }, [vendors]);

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const response = await axiosInstance.get('/api/vendors/');
      console.log('Vendors response:', response.data);
      setVendors(response.data);
      setVendorsError(null);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendorsError('Failed to load vendors. Please try again.');
    } finally {
      setVendorsLoading(false);
    }
  };

  const handleVendorChange = (event, newValue) => {
    setVendor(newValue);
  };

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([...items, { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const billData = {
      vendor: vendor.id,
      currency,
      bill_date: billDate,
      due_date: dueDate,
      poso_number: posoNumber,
      totalAmount, totalAmount,
      notes,
      items,
    };

    try {
      const response = await axiosInstance.post('/api/bills/create/', billData);
      console.log('Bill created:', response.data);
      addMessage('info', 'Bill created successfully');
      
      // Handle success (e.g., show a success message, redirect, etc.)
    } catch (error) {
      console.error('Error creating bill:', error);
      addMessage('error', 'Error creating bill');
      // Handle error (e.g., show an error message)
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        Add Bill
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => `${option.vendor_name} (${option.vendor_number})`}
              value={vendor}
              onChange={handleVendorChange}
              loading={vendorsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Vendor"
                  required
                  error={!!vendorsError}
                  helperText={vendorsError}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  {option.vendor_name} ({option.vendor_number})
                </li>
              )}
              noOptionsText={vendorsLoading ? "Loading..." : "No vendors found"}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select value={currency} onChange={handleCurrencyChange}>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                {/* Add more currency options as needed */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Bill Date"
                value={billDate}
                onChange={(newValue) => setBillDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="P.O./S.O."
              value={posoNumber}
              onChange={(e) => setPosoNumber(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Total Amount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        {/* Add items section here */}

        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="outlined" color="inherit" sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default BillForm;