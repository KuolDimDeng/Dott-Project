// PurchaseReturnsManagement.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';

const PurchaseReturnsManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [selectedPurchaseReturn, setSelectedPurchaseReturn] = useState(null);
  const theme = useTheme();

  const [newPurchaseReturn, setNewPurchaseReturn] = useState({
    purchase_order: '',
    date: new Date(),
    reason: '',
    total_amount: 0,
    status: 'pending',
    items: [],
  });

  useEffect(() => {
    fetchPurchaseReturns();
  }, []);

  const fetchPurchaseReturns = async () => {
    try {
      const response = await axiosInstance.get('/api/purchase-returns/');
      setPurchaseReturns(response.data);
    } catch (error) {
      console.error('Error fetching purchase returns:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewPurchaseReturn(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setNewPurchaseReturn(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleCreatePurchaseReturn = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/purchase-returns/', newPurchaseReturn);
      console.log('Purchase return created:', response.data);
      fetchPurchaseReturns();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating purchase return:', error);
    }
  };

  const handlePurchaseReturnSelect = (purchaseReturn) => {
    setSelectedPurchaseReturn(purchaseReturn);
    setActiveTab(1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
    <Typography variant="h4" gutterBottom>
          Purchase Returns Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Create Purchase Return</Typography>
            <form onSubmit={handleCreatePurchaseReturn}>
              <TextField
                label="Purchase Order"
                name="purchase_order"
                value={newPurchaseReturn.purchase_order}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <DatePicker
                label="Date"
                value={newPurchaseReturn.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <TextField
                label="Reason"
                name="reason"
                value={newPurchaseReturn.reason}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <TextField
                label="Total Amount"
                name="total_amount"
                type="number"
                value={newPurchaseReturn.total_amount}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={newPurchaseReturn.status}
                  onChange={handleInputChange}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" color="primary">Create Purchase Return</Button>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Purchase Return Details</Typography>
            {selectedPurchaseReturn ? (
              <Box>
                <TextField label="Return Number" value={selectedPurchaseReturn.return_number} fullWidth margin="normal" disabled />
                <TextField label="Purchase Order" value={selectedPurchaseReturn.purchase_order} fullWidth margin="normal" disabled />
                <TextField label="Date" type="date" value={selectedPurchaseReturn.date} fullWidth margin="normal" disabled InputLabelProps={{ shrink: true }} />
                <TextField label="Reason" value={selectedPurchaseReturn.reason} fullWidth margin="normal" disabled multiline rows={4} />
                <TextField label="Total Amount" value={selectedPurchaseReturn.total_amount} fullWidth margin="normal" disabled />
                <TextField label="Status" value={selectedPurchaseReturn.status} fullWidth margin="normal" disabled />
              </Box>
            ) : (
              <Typography>Select a purchase return from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Purchase Returns List</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Return Number</TableCell>
                    <TableCell>Purchase Order</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseReturns.map((purchaseReturn) => (
                    <TableRow key={purchaseReturn.id} onClick={() => handlePurchaseReturnSelect(purchaseReturn)}>
                      <TableCell>{purchaseReturn.return_number}</TableCell>
                      <TableCell>{purchaseReturn.purchase_order}</TableCell>
                      <TableCell>{new Date(purchaseReturn.date).toLocaleDateString()}</TableCell>
                      <TableCell>{purchaseReturn.total_amount}</TableCell>
                      <TableCell>{purchaseReturn.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default PurchaseReturnsManagement;