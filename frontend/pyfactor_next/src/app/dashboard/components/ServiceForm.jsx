import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox, Button } from '@mui/material';
import axiosInstance from './axiosConfig';

const ServiceForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [sellEnabled, setSellEnabled] = useState(false);
  const [buyEnabled, setBuyEnabled] = useState(false);
  const [salesTax, setSalesTax] = useState(0);
  const [error, setError] = useState(null);


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        name,
        description,
        price,
        sellEnabled,
        buyEnabled,
        salesTax,
      };
      console.log('Service data:', serviceData);
      const response = await axiosInstance.post('http://localhost:8000/api/create-service/', serviceData);
      console.log('Service created successfully', response.data);
      // Reset form fields or navigate to the service list page
    } catch (error) {
      console.error('Error creating service', error);
      setError('Failed to create service. Please try again.');
      // Handle error condition
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add a Service
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Description"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <TextField
          label="Price"
          variant="outlined"
          fullWidth
          type="number"
          margin="normal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={sellEnabled}
              onChange={(e) => setSellEnabled(e.target.checked)}
              name="sellEnabled"
            />
          }
          label="Sell this"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={buyEnabled}
              onChange={(e) => setBuyEnabled(e.target.checked)}
              name="buyEnabled"
            />
          }
          label="Buy this"
        />
        <TextField
          label="Sales Tax (%)"
          variant="outlined"
          fullWidth
          type="number"
          margin="normal"
          value={salesTax}
          onChange={(e) => setSalesTax(e.target.value)}
          required
        />
        <Button variant="contained" color="primary" type="submit" fullWidth>
          Add Service
        </Button>
      </form>
    </Box>
  );
};

export default ServiceForm;