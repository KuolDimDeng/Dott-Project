import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, TextField, MenuItem } from '@mui/material';
import InvoicePreview from './InvoicePreview';
import InvoiceTemplateBuilder from './InvoiceTemplateBuilder';
import axiosInstance from './axiosConfig';

const InvoiceForm = () => {
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [logo, setLogo] = useState(null);
  const [accentColor, setAccentColor] = useState('#000000');
  const [template, setTemplate] = useState('Contemporary');
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
  });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [userDatabase, setUserDatabase] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchCustomers(userDatabase);
    }
  }, [userDatabase]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      console.log('User profile:', response.data); // Debugging line
      console.log('User database:', response.data.database_name); // Debugging line
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCustomers = async (database_name) => {
    try {
      console.log('Fetching customers from database:', database_name); // Debugging line
      const response = await axiosInstance.get('http://localhost:8000/api/customers/', {
        params: { database: database_name },
      });
      console.log('Fetched customers:', response.data); // Debugging line
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerChange = (event) => {
    setSelectedCustomer(event.target.value);
    const selectedCustomerData = customers.find((customer) => customer.id === event.target.value);
    if (selectedCustomerData) {
      setUserData({
        first_name: selectedCustomerData.first_name,
        last_name: selectedCustomerData.last_name,
        business_name: selectedCustomerData.customerName,
        address: selectedCustomerData.street,
        city: selectedCustomerData.city || '', // Set an empty string if city is null or undefined
        state: selectedCustomerData.billingState || '', // Set an empty string if state is null or undefined
        zip_code: selectedCustomerData.postcode,
        phone: selectedCustomerData.phone,
        email: selectedCustomerData.email,
      });
    }
  };

  const handleOpenTemplateBuilder = () => {
    const windowFeatures = 'width=800,height=600,resizable=yes,scrollbars=yes';
    const windowName = '_blank';
    const url = '/invoice-template-builder';
    window.open(url, windowName, windowFeatures);
  };

  const handleCloseTemplateBuilder = () => {
    setShowTemplateBuilder(false);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setLogo(URL.createObjectURL(file));
  };

  const handleAccentColorChange = (event) => {
    setAccentColor(event.target.value);
  };

  const handleTemplateChange = (event) => {
    setTemplate(event.target.value);
  };

  const handleAddInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleInvoiceItemChange = (index, field, value) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index][field] = value;
    setInvoiceItems(updatedItems);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Invoice
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            select
            label="Existing Customer"
            value={selectedCustomer}
            onChange={handleCustomerChange}
            fullWidth
          >
            <MenuItem value="">Select a customer</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>
                {customer.display_name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="First Name"
            value={userData.first_name}
            onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Last Name"
            value={userData.last_name}
            onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Business Name"
            value={userData.business_name}
            onChange={(e) => setUserData({ ...userData, business_name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Address"
            value={userData.address}
            onChange={(e) => setUserData({ ...userData, address: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="City"
            value={userData.city}
            onChange={(e) => setUserData({ ...userData, city: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="State"
            value={userData.state}
            onChange={(e) => setUserData({ ...userData, state: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Zip Code"
            value={userData.zip_code}
            onChange={(e) => setUserData({ ...userData, zip_code: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Phone"
            value={userData.phone}
            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={handleOpenTemplateBuilder}>
            Open Template Builder
          </Button>
        </Grid>
      </Grid>
      {showTemplateBuilder && (
        <InvoiceTemplateBuilder
          handleClose={handleCloseTemplateBuilder}
          userData={userData}
          logo={logo}
          accentColor={accentColor}
          template={template}
          invoiceItems={invoiceItems}
          handleLogoUpload={handleLogoUpload}
          handleAccentColorChange={handleAccentColorChange}
          handleTemplateChange={handleTemplateChange}
          handleAddInvoiceItem={handleAddInvoiceItem}
          handleInvoiceItemChange={handleInvoiceItemChange}
        />
      )}
      <InvoicePreview
        logo={logo}
        accentColor={accentColor}
        template={template}
        userData={userData}
        invoiceItems={invoiceItems}
      />
    </Box>
  );
};

export default InvoiceForm;
