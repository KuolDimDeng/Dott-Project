// src/app/dashboard/components/forms/EmployeePaymentMethod.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';

const EmployeePaymentMethod = ({ employeeId, countryCode }) => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (countryCode) {
      fetchPaymentProviders(countryCode);
    }
  }, [countryCode]);

  useEffect(() => {
    if (selectedProvider) {
      fetchProviderForm(selectedProvider);
    }
  }, [selectedProvider]);

  const fetchPaymentProviders = async (country) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/payments/providers/country/${country}/`);
      setProviders(response.data.providers);
      
      // Auto-select primary provider
      if (response.data.primary_provider) {
        setSelectedProvider(response.data.primary_provider);
      }
    } catch (error) {
      console.error('Error fetching payment providers:', error);
      setError('Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderForm = async (provider) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/payments/providers/${provider}/form/`);
      setFormFields(response.data.fields);
      
      // Initialize form values
      const initialValues = {};
      response.data.fields.forEach(field => {
        initialValues[field.name] = '';
      });
      setFormValues(initialValues);
    } catch (error) {
      console.error('Error fetching provider form:', error);
      setError('Failed to load payment form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await axiosInstance.post(`/api/employees/${employeeId}/payment-method/`, {
        provider: selectedProvider,
        details: formValues
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Error saving payment method:', error);
      setError(error.response?.data?.error || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Payment Method Setup
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Payment method saved successfully
        </Alert>
      )}
      
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Payment Provider</InputLabel>
        <Select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          disabled={loading}
        >
          {providers.map(provider => (
            <MenuItem key={provider.id} value={provider.id}>
              {provider.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedProvider && formFields.length > 0 && (
        <Box component="form" noValidate autoComplete="off">
          <Grid container spacing={2}>
            {formFields.map(field => (
              <Grid item xs={12} sm={6} key={field.name}>
                <TextField
                  label={field.label || field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  value={formValues[field.name] || ''}
                  onChange={handleInputChange}
                  required={field.required}
                  fullWidth
                  helperText={field.help_text || ''}
                />
              </Grid>
            ))}
          </Grid>
          
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Payment Method'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default EmployeePaymentMethod;