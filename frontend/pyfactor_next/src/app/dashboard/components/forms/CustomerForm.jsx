// src/app/dashboard/components/CustomerForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../components/axiosConfig';
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
} from '@mui/material';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';



const initialState = {
  customerName: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  website: '',
  notes: '',
  currency: 'USD',
  billingCountry: '',
  billingState: '',
  shipToName: '',
  shippingCountry: '',
  shippingState: '',
  shippingPhone: '',
  deliveryInstructions: '',
  street: '',
  postcode: '',
  city: '',
};

const CustomerForm = ({ router }) => {
  console.log('CustomerForm router:', router);

  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const { addMessage } = useUserMessageContext();

  useEffect(() => {
    console.log('CustomerForm component mounted');
    console.log('CustomerForm router:', router);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    try {
      const response = await axiosInstance.post('http://localhost:8000/api/create-customer/', formData);
      console.log('Customer created successfully', response.data);
      addMessage('info', 'Customer created successfully');
      //router.push('/dashboard/customers');
    } catch (error) {
      logger.error('Error creating customer', error);
      addMessage('error', 'Error creating customer');
    }
  }, [formData, router]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>New Customer</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionTitle title="Basic Information" />
            <CustomTextField label="Customer" name="customerName" value={formData.customerName} onChange={handleChange} required />
            <SectionTitle title="Primary Contact" />
            <CustomTextField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
            <CustomTextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required />
            <CustomTextField label="Email" name="email" value={formData.email} onChange={handleChange} required type="email" />
            <CustomTextField label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
            <CustomTextField label="Website" name="website" value={formData.website} onChange={handleChange} />
            <CustomTextField label="Notes" name="notes" value={formData.notes} onChange={handleChange} multiline rows={4} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionTitle title="Billing" />
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select name="currency" value={formData.currency} onChange={handleChange}>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body1" gutterBottom>Invoices for this customer will default to this currency.</Typography>
            <CustomTextField label="Country" name="billingCountry" value={formData.billingCountry} onChange={handleChange} required />
            <CustomTextField label="Province, State, or Region" name="billingState" value={formData.billingState} onChange={handleChange} required />
            <CustomTextField label="Ship To" name="shipToName" value={formData.shipToName} onChange={handleChange} />
            <CustomTextField label="Country" name="shippingCountry" value={formData.shippingCountry} onChange={handleChange} />
            <CustomTextField label="Province, State, or Region" name="shippingState" value={formData.shippingState} onChange={handleChange} />
            <CustomTextField label="Phone" name="shippingPhone" value={formData.shippingPhone} onChange={handleChange} />
            <CustomTextField label="Delivery Instructions" name="deliveryInstructions" value={formData.deliveryInstructions} onChange={handleChange} multiline rows={4} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionTitle title="Address Information" />
            <CustomTextField label="Street" name="street" value={formData.street} onChange={handleChange} required />
            <CustomTextField label="City" name="city" value={formData.city} onChange={handleChange} required />
            <CustomTextField label="Postcode" name="postcode" value={formData.postcode} onChange={handleChange} required />
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="outlined" color="inherit" sx={{ mr: 2 }}>Cancel</Button>
          <Button variant="contained" color="primary" type="submit">Save</Button>
        </Box>
      </form>
    </Box>
  );
};

const SectionTitle = ({ title }) => (
  <Typography variant="h6" gutterBottom>{title}</Typography>
);

const CustomTextField = ({ label, name, value, onChange, ...props }) => (
  <Box mb={2}>
    <TextField label={label} name={name} value={value} onChange={onChange} fullWidth {...props} />
  </Box>
);

export default CustomerForm;