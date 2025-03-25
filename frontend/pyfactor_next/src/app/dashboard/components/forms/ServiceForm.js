import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormLabel,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  Link,
  Snackbar,
  Alert,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const ServiceForm = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [service, setService] = useState({
    name: '',
    description: '',
    price: '',
    saleType: 'sale',
    salesTax: '',
    duration: '',
    is_recurring: false,
    charge_period: 'hour',
    charge_amount: '',
  });
  const [errors, setErrors] = useState({});
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setService((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!service.name.trim()) tempErrors.name = 'Name is required';
    if (service.saleType === 'sale' && !service.price) tempErrors.price = 'Price is required';
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
      // Using the new API endpoint from the inventory module
      const response = await axiosInstance.post('/api/inventory/services/create/', service);
      console.log('Service created successfully', response.data);
      setSnackbarSeverity('success');
      setSnackbarMessage('Service created successfully');
      setOpenSnackbar(true);
      setService({
        name: '',
        description: '',
        price: '',
        saleType: 'sale',
        salesTax: '',
        duration: '',
        is_recurring: false,
        charge_period: 'hour',
        charge_amount: '',
      });
    } catch (error) {
      logger.error('Error creating service', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Error creating service: ' + (error.response?.data?.message || error.message));
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <MiscellaneousServicesIcon
          sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }}
        />
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
            <FormControl component="fieldset">
              <FormLabel component="legend">Service Type</FormLabel>
              <RadioGroup
                row
                aria-label="saleType"
                name="saleType"
                value={service.saleType}
                onChange={handleChange}
              >
                <FormControlLabel value="sale" control={<Radio />} label="For Sale" />
                <FormControlLabel value="rent" control={<Radio />} label="For Rent" />
              </RadioGroup>
            </FormControl>
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
          {service.saleType === 'sale' && (
            <>
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
            </>
          )}
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
          {service.saleType === 'rent' && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Charge Period</InputLabel>
                  <Select
                    name="charge_period"
                    value={service.charge_period}
                    onChange={handleChange}
                  >
                    <MenuItem value="hour">Hour</MenuItem>
                    <MenuItem value="day">Day</MenuItem>
                    <MenuItem value="week">Week</MenuItem>
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
            </>
          )}
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

      {service.saleType === 'rent' && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Create a custom rental plan{' '}
            <Link href="/settings/business-settings/custom-charge-settings">here</Link> and use when
            making a sales transaction.
          </Typography>
        </Box>
      )}

      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ServiceForm;
