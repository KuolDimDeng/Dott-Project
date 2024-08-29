import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Button, Switch } from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const ServiceForm = () => {
  const [service, setService] = useState({
    name: '',
    description: '',
    price: '',
    sellEnabled: false,
    buyEnabled: false,
    salesTax: '',
    duration: '',
    is_recurring: false,
  });
  const [errors, setErrors] = useState({});
  const { addMessage } = useUserMessageContext();

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setService(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear the error for this field when the user starts typing
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!service.name.trim()) tempErrors.name = "Name is required";
    if (!service.price) tempErrors.price = "Price is required";
    return tempErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      const response = await axiosInstance.post('/api/services/create/', service);
      console.log('Service created successfully', response.data);
      addMessage('info', 'Service created successfully');
      // Reset form or navigate to service list
      setService({
        name: '',
        description: '',
        price: '',
        sellEnabled: false,
        buyEnabled: false,
        salesTax: '',
        duration: '',
        is_recurring: false,
      });
    } catch (error) {
      logger.error('Error creating service', error);
      addMessage('error', 'Error creating service: ' + (error.response?.data?.message || error.message));
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
          name="name" 
          value={service.name} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          error={!!errors.name}
          helperText={errors.name}
          required
        />
        <TextField 
          label="Description" 
          name="description" 
          value={service.description} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
        />
        <TextField 
          label="Price" 
          name="price" 
          type="number" 
          value={service.price} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          error={!!errors.price}
          helperText={errors.price}
          required
        />
        <FormControlLabel
          control={<Switch checked={service.sellEnabled} onChange={handleChange} name="sellEnabled" />}
          label="Sell Enabled"
        />
        <FormControlLabel
          control={<Switch checked={service.buyEnabled} onChange={handleChange} name="buyEnabled" />}
          label="Buy Enabled"
        />
        <TextField 
          label="Sales Tax" 
          name="salesTax" 
          type="number" 
          value={service.salesTax} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
        />
        <TextField 
          label="Duration (in minutes)" 
          name="duration" 
          type="number" 
          value={service.duration} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
        />
        <FormControlLabel
          control={<Switch checked={service.is_recurring} onChange={handleChange} name="is_recurring" />}
          label="Is Recurring"
        />
        <Button type="submit" variant="contained" color="primary">Create Service</Button>
      </form>
    </Box>
  );
};

export default ServiceForm;