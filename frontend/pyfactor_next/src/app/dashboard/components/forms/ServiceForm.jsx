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
  FormControl,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import axiosInstance from '../components/axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ServiceForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      addMessage('success', 'Service created successfully');
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
    <Paper elevation={3} sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
      <Box display="flex" alignItems="center" mb={2}>
        <MiscellaneousServicesIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Add a Service
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Create and manage your service offerings
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Name" 
              name="name" 
              value={service.name} 
              onChange={handleChange} 
              fullWidth 
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Price" 
              name="price" 
              type="number" 
              value={service.price} 
              onChange={handleChange} 
              fullWidth 
              error={!!errors.price}
              helperText={errors.price}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              label="Description" 
              name="description" 
              value={service.description} 
              onChange={handleChange} 
              fullWidth 
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={service.is_for_sale} onChange={handleChange} name="is_for_sale" />}
              label="For Sale"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={service.is_for_rent} onChange={handleChange} name="is_for_rent" />}
              label="For Rent"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Sales Tax (%)" 
              name="salesTax" 
              type="number" 
              value={service.salesTax} 
              onChange={handleChange} 
              fullWidth 
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Duration (in minutes)" 
              name="duration" 
              type="number" 
              value={service.duration} 
              onChange={handleChange} 
              fullWidth 
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={service.is_recurring} onChange={handleChange} name="is_recurring" />}
              label="Is Recurring"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Charge Period</InputLabel>
              <Select name="charge_period" value={service.charge_period} onChange={handleChange}>
                <MenuItem value="hour">Hour</MenuItem>
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="year">Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="Charge Amount" 
              name="charge_amount" 
              type="number" 
              value={service.charge_amount} 
              onChange={handleChange} 
              fullWidth 
            />
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button type="submit" variant="contained" color="primary" size="large">
                Create Service
              </Button>
              <Tooltip title="Learn more about service creation">
                <IconButton color="primary">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default ServiceForm;