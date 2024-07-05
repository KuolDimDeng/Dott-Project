import React, { useState } from 'react';
import { Box, Typography, TextField, FormControlLabel, Checkbox, Button, Switch } from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';



const ServiceForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [sellEnabled, setSellEnabled] = useState(false);
  const [buyEnabled, setBuyEnabled] = useState(false);
  const [salesTax, setSalesTax] = useState(0);
  const [error, setError] = useState(null);
  const { addMessage } = useUserMessageContext();

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

  const handleChange = (event) => {
    const { name, value, checked } = event.target;
    setProduct(prevState => ({
      ...prevState,
      [name]: name === 'sellEnabled' || name === 'buyEnabled' ? checked : value
    }));
  };


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
      addMessage('info', 'Service created successfully');
      // Reset form fields or navigate to the service list page
    } catch (error) {
      logger.error('Error creating service', error);
      addMessage('error', 'Error creating service');
      // Handle error condition
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add a Service
      </Typography>
      <form onSubmit={handleSubmit}>
      <TextField label="Name" name="name" value={service.name} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Description" name="description" value={service.description} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Price" name="price" type="number" value={service.price} onChange={handleChange} fullWidth margin="normal" />
      <FormControlLabel
        control={<Switch checked={service.sellEnabled} onChange={handleChange} name="sellEnabled" />}
        label="Sell Enabled"
      />
      <FormControlLabel
        control={<Switch checked={service.buyEnabled} onChange={handleChange} name="buyEnabled" />}
        label="Buy Enabled"
      />
      <TextField label="Sales Tax" name="salesTax" type="number" value={service.salesTax} onChange={handleChange} fullWidth margin="normal" />
      <TextField label="Duration (in minutes)" name="duration" type="number" value={service.duration} onChange={handleChange} fullWidth margin="normal" />
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