// ProcurementManagement.jsx

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { axiosInstance } from '@/lib/axiosConfig';

const ProcurementManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [procurements, setProcurements] = useState([]);
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [newProcurement, setNewProcurement] = useState({
    vendor: '',
    date: new Date(),
    description: '',
    total_amount: 0,
    status: 'draft',
    items: [],
  });
  const [vendors, setVendors] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    fetchProcurements();
    fetchVendors();
  }, []);

  const fetchProcurements = async () => {
    try {
      const response = await axiosInstance.get('/api/procurements/');
      setProcurements(response.data);
    } catch (error) {
      console.error('Error fetching procurements:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewProcurement((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setNewProcurement((prev) => ({
      ...prev,
      date: date,
    }));
  };

  const handleCreateProcurement = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/procurements/create/', newProcurement);
      console.log('Procurement created:', response.data);
      fetchProcurements();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating procurement:', error);
    }
  };

  const handleProcurementSelect = (procurement) => {
    setSelectedProcurement(procurement);
    setActiveTab(1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Procurement Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Create Procurement
            </Typography>
            <form onSubmit={handleCreateProcurement}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Vendor</InputLabel>
                <Select name="vendor" value={newProcurement.vendor} onChange={handleInputChange}>
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DatePicker
                label="Date"
                value={newProcurement.date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <TextField
                label="Description"
                name="description"
                value={newProcurement.description}
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
                value={newProcurement.total_amount}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select name="status" value={newProcurement.status} onChange={handleInputChange}>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="submitted">Submitted</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" color="primary">
                Create Procurement
              </Button>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Procurement Details
            </Typography>
            {selectedProcurement ? (
              <Box>
                <TextField
                  label="Procurement Number"
                  value={selectedProcurement.procurement_number}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Vendor"
                  value={selectedProcurement.vendor}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Date"
                  type="date"
                  value={selectedProcurement.date}
                  fullWidth
                  margin="normal"
                  disabled
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Description"
                  value={selectedProcurement.description}
                  fullWidth
                  margin="normal"
                  disabled
                  multiline
                  rows={4}
                />
                <TextField
                  label="Total Amount"
                  value={selectedProcurement.total_amount}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Status"
                  value={selectedProcurement.status}
                  fullWidth
                  margin="normal"
                  disabled
                />
              </Box>
            ) : (
              <Typography>Select a procurement from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Procurement List
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Procurement Number</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {procurements.map((procurement) => (
                    <TableRow
                      key={procurement.id}
                      onClick={() => handleProcurementSelect(procurement)}
                    >
                      <TableCell>{procurement.procurement_number}</TableCell>
                      <TableCell>{procurement.vendor}</TableCell>
                      <TableCell>{new Date(procurement.date).toLocaleDateString()}</TableCell>
                      <TableCell>{procurement.total_amount}</TableCell>
                      <TableCell>{procurement.status}</TableCell>
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

export default ProcurementManagement;
