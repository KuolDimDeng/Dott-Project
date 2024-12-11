'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { axiosInstance } from '@/lib/axiosConfig';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const ExpensesManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [formData, setFormData] = useState({
    vendor: '',
    date: null,
    category: '',
    amount: '',
    description: '',
    payment_method: '',
  });
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axiosInstance.get('/api/expenses/');
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      addMessage('error', 'Failed to fetch expenses');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSelectedExpense(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      date: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/expenses/create/', formData);
      addMessage('success', 'Expense created successfully');
      fetchExpenses();
      setActiveTab(2); // Switch to list tab after creation
    } catch (error) {
      console.error('Error creating expense:', error);
      addMessage('error', 'Failed to create expense');
    }
  };

  const handleExpenseSelect = (expense) => {
    setSelectedExpense(expense);
    setActiveTab(1); // Switch to detail tab
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Expense Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create Expense" />
          <Tab label="Expense Detail" />
          <Tab label="Expense List" />
        </Tabs>

        {activeTab === 0 && (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button type="submit" variant="contained" sx={{ mt: 3 }}>
              Create Expense
            </Button>
          </Box>
        )}

        {activeTab === 1 && selectedExpense && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Expense Details</Typography>
            <Typography>Vendor: {selectedExpense.vendor}</Typography>
            <Typography>Date: {new Date(selectedExpense.date).toLocaleDateString()}</Typography>
            <Typography>Category: {selectedExpense.category}</Typography>
            <Typography>Amount: {selectedExpense.amount}</Typography>
            <Typography>Description: {selectedExpense.description}</Typography>
            <Typography>Payment Method: {selectedExpense.payment_method}</Typography>
          </Box>
        )}

        {activeTab === 2 && (
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.vendor}</TableCell>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{expense.amount}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleExpenseSelect(expense)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ExpensesManagement;
