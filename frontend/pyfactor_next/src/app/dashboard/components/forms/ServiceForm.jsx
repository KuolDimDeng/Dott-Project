import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControlLabel, 
  Button, 
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const ServiceForm = () => {
  const [service, setService] = useState({
    name: '',
    description: '',
    price: '',
    is_for_sale: true,
    is_for_rent: false,
    salesTax: '',
    duration: '',
    is_recurring: false,
    charge_period: 'hour',
    charge_amount: '',
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
        is_for_sale: true,
        is_for_rent: false,
        salesTax: '',
        duration: '',
        is_recurring: false,
        charge_period: 'hour',
        charge_amount: '',
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
          control={<Switch checked={service.is_for_sale} onChange={handleChange} name="is_for_sale" />}
          label="For Sale"
        />
        <FormControlLabel
          control={<Switch checked={service.is_for_rent} onChange={handleChange} name="is_for_rent" />}
          label="For Rent"
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
        <FormControl fullWidth margin="normal">
          <InputLabel>Charge Period</InputLabel>
          <Select name="charge_period" value={service.charge_period} onChange={handleChange}>
            <MenuItem value="hour">Hour</MenuItem>
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="year">Year</MenuItem>
          </Select>
        </FormControl>
        <TextField 
          label="Charge Amount" 
          name="charge_amount" 
          type="number" 
          value={service.charge_amount} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
        />
        <Button type="submit" variant="contained" color="primary">Create Service</Button>
      </form>
    </Box>
  );
};

export default ServiceForm;