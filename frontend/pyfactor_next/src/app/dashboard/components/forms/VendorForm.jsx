import React, { useState } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
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
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const initialState = {
  vendor_name: '',
  street: '',
  postcode: '',
  city: '',
  state: '',
  phone: '',
};

const VendorForm = () => {
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();
  ('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    try {
      const response = await axiosInstance.post('/api/vendors/create/', formData);
      console.log('Vendor created successfully', response.data);
      addMessage('info', 'Vendor created successfully');
      // Reset form data or redirect to vendor list page
    } catch (error) {
      logger.error('Error creating vendor', error);
      addMessage('error', 'Error creating vendor');
    }
  };

  const states = [
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming',
  ];

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Add a Vendor
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Vendor Name"
              name="vendor_name"
              value={formData.vendor_name}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Postcode"
              name="postcode"
              value={formData.postcode}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>State</InputLabel>
              <Select name="state" value={formData.state} onChange={handleChange} required>
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button variant="outlined" color="inherit" sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default VendorForm;
