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
  useTheme,
} from '@mui/material';
import axiosInstance from '@/lib/axiosConfig';;

const VendorManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const theme = useTheme();

  const [formData, setFormData] = useState({
    vendor_name: '',
    street: '',
    postcode: '',
    city: '',
    state: '',
    phone: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axiosInstance.get('/api/vendors/');
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedVendor(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/vendors/create/', formData);
      fetchVendors();
      setFormData({
        vendor_name: '',
        street: '',
        postcode: '',
        city: '',
        state: '',
        phone: '',
      });
      setTabValue(2); // Switch to list tab after creation
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setTabValue(1); // Switch to detail tab
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>Vendor Management</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Create Vendor" />
          <Tab label="Vendor Detail" />
          <Tab label="Vendor List" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vendor Name"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Postcode"
                name="postcode"
                value={formData.postcode}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary">
                Create Vendor
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {tabValue === 1 && selectedVendor && (
        <Box>
          <Typography variant="h6">Vendor Details</Typography>
          <Typography>Vendor Number: {selectedVendor.vendor_number}</Typography>
          <Typography>Vendor Name: {selectedVendor.vendor_name}</Typography>
          <Typography>Street: {selectedVendor.street}</Typography>
          <Typography>Postcode: {selectedVendor.postcode}</Typography>
          <Typography>City: {selectedVendor.city}</Typography>
          <Typography>State: {selectedVendor.state}</Typography>
          <Typography>Phone: {selectedVendor.phone}</Typography>
        </Box>
      )}

      {tabValue === 2 && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor Number</TableCell>
                <TableCell>Vendor Name</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>{vendor.vendor_number}</TableCell>
                  <TableCell>{vendor.vendor_name}</TableCell>
                  <TableCell>{vendor.city}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleVendorSelect(vendor)}>View Details</Button>
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

export default VendorManagement;