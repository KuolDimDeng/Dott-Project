'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  useTheme,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

const BillManagement = ({ newBill: isNewBill = false }) => {
  const [tabValue, setTabValue] = useState(isNewBill ? 0 : 2);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [vendors, setVendors] = useState([]);
  const theme = useTheme();

  const [formData, setFormData] = useState({
    vendor: null,
    currency: 'USD',
    bill_date: null,
    due_date: null,
    poso_number: '',
    total_amount: 0,
    notes: '',
    items: [{ category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 }],
  });

  const toast = useToast();

  useEffect(() => {
    fetchBills();
    fetchVendors();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axiosInstance.get('/api/bills/');
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to fetch bills');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    }
  };

  const calculateTotalAmount = (items) => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedBill(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleVendorChange = (event, newValue) => {
    setFormData((prevData) => ({
      ...prevData,
      vendor: newValue,
    }));
  };

  const handleDateChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    const totalAmount = calculateTotalAmount(updatedItems);
    setFormData((prevData) => ({
      ...prevData,
      items: updatedItems,
      totalAmount: totalAmount,
    }));
  };
  const handleAddItem = () => {
    setFormData((prevData) => ({
      ...prevData,
      items: [
        ...prevData.items,
        { category: '', description: '', quantity: 1, price: 0, tax: 0, amount: 0 },
      ],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const billData = {
        ...formData,
        vendor: formData.vendor.id,
        items: formData.items.map((item) => ({
          ...item,
          amount: item.quantity * item.price,
        })),
      };
      const response = await axiosInstance.post('/api/bills/create/', billData);
      toast.success('Bill created successfully');
      fetchBills();
      setTabValue(2); // Switch to list tab after creation
    } catch (error) {
      console.error('Error creating bill:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      toast.error('Failed to create bill');
    }
  };

  const handleBillSelect = (bill) => {
    setSelectedBill(bill);
    setTabValue(1); // Switch to detail tab
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        Bill Management
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Create Bill" />
          <Tab label="Bill Detail" />
          <Tab label="Bill List" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={vendors}
                getOptionLabel={(option) => `${option.vendor_name} (${option.vendor_number})`}
                value={formData.vendor}
                onChange={handleVendorChange}
                renderInput={(params) => <TextField {...params} label="Vendor" required />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select name="currency" value={formData.currency} onChange={handleInputChange}>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Bill Date"
                  value={formData.bill_date}
                  onChange={(newValue) => handleDateChange('bill_date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={formData.due_date}
                  onChange={(newValue) => handleDateChange('due_date', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="P.O./S.O."
                name="poso_number"
                value={formData.poso_number}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                name="notes"
                multiline
                rows={4}
                value={formData.notes}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
          </Grid>

          {formData.items.map((item, index) => (
            <Grid container spacing={2} key={index} sx={{ mt: 2 }}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Category"
                  value={item.category}
                  onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Price"
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Amount"
                  type="number"
                  value={item.amount}
                  InputProps={{
                    readOnly: true,
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>
          ))}

          <Button onClick={handleAddItem} sx={{ mt: 2 }}>
            Add Item
          </Button>

          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button variant="contained" color="primary" type="submit">
              Create Bill
            </Button>
          </Box>
        </Box>
      )}

      {tabValue === 1 && selectedBill && (
        <Box>
          <Typography variant="h6">Bill Details</Typography>
          <Typography>Bill Number: {selectedBill.bill_number}</Typography>
          <Typography>Vendor: {selectedBill.vendor_name || 'N/A'}</Typography>
          <Typography>
            Total Amount: {selectedBill.totalAmount} {selectedBill.currency}
          </Typography>
          <Typography>
            Bill Date: {new Date(selectedBill.bill_date).toLocaleDateString()}
          </Typography>
          <Typography>Due Date: {new Date(selectedBill.due_date).toLocaleDateString()}</Typography>
          <Typography>P.O./S.O.: {selectedBill.poso_number}</Typography>
          <Typography>Notes: {selectedBill.notes}</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Items
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedBill.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bill Number</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Bill Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>{bill.bill_number}</TableCell>
                  <TableCell>{bill.vendor_name || 'N/A'}</TableCell>
                  <TableCell>
                    {bill.totalAmount} {bill.currency}
                  </TableCell>
                  <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleBillSelect(bill)}>View Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BillManagement;
