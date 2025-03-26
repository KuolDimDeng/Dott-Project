import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Updated import for Next.js 14
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
  useTheme,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  InputAdornment,
  Chip
} from '@mui/material';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import NoteIcon from '@mui/icons-material/Note';
import ModernFormLayout from '@/app/components/ModernFormLayout';

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

const CustomerForm = ({ mode = 'create' }) => {
  const router = useRouter(); // Using the Next.js 14 App Router
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    logger.info('[CustomerForm] Component mounted');
  }, [router]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      logger.info('[CustomerForm] Submitting customer data:', formData);
      
      try {
        const response = await axiosInstance.post('/api/customers/', formData);
        logger.info('[CustomerForm] Customer created successfully:', response.data);
        toast.success('Customer created successfully');
        
        // Navigate to the dashboard or customer details
        router.push('/dashboard/customers');
      } catch (error) {
        logger.error('[CustomerForm] Error creating customer:', error);
        let errorMessage = 'Failed to create customer';
        
        if (error.response) {
          logger.error('[CustomerForm] Error response:', error.response.status, error.response.data);
          errorMessage += ` (${error.response.status})`;
          if (error.response.data && error.response.data.detail) {
            errorMessage += `: ${error.response.data.detail}`;
          }
        }
        
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, router, toast]
  );

  const handleCancel = () => {
    router.back();
  };

  // Basic Info Tab Content
  const renderBasicInfoTab = () => (
    <>
      <Grid item xs={12} md={6}>
        <TextField
          label="Business Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter business name"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BusinessIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          Primary Contact
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="First Name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter first name"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Last Name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter last name"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="name@example.com"
          type="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="(123) 456-7890"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="www.example.com"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LanguageIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Enter any additional notes about this customer"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                <NoteIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
    </>
  );

  // Billing Tab Content
  const renderBillingTab = () => (
    <>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="currency-label">Currency</InputLabel>
          <Select
            labelId="currency-label"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            label="Currency"
          >
            <MenuItem value="USD">USD - US Dollar</MenuItem>
            <MenuItem value="EUR">EUR - Euro</MenuItem>
            <MenuItem value="GBP">GBP - British Pound</MenuItem>
            <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
            <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Invoices for this customer will default to this currency.
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
          Billing Address
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Country"
          name="billingCountry"
          value={formData.billingCountry}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter country"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Province/State/Region"
          name="billingState"
          value={formData.billingState}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter state or province"
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
          Shipping Information
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Ship To Name"
          name="shipToName"
          value={formData.shipToName}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="Enter recipient name"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Country"
          name="shippingCountry"
          value={formData.shippingCountry}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="Enter country"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Province/State/Region"
          name="shippingState"
          value={formData.shippingState}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="Enter state or province"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Shipping Phone"
          name="shippingPhone"
          value={formData.shippingPhone}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          placeholder="(123) 456-7890"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12}>
        <TextField
          label="Delivery Instructions"
          name="deliveryInstructions"
          value={formData.deliveryInstructions}
          onChange={handleChange}
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Enter special delivery instructions, if any"
        />
      </Grid>
    </>
  );

  // Address Tab Content
  const renderAddressTab = () => (
    <>
      <Grid item xs={12} md={12}>
        <TextField
          label="Street Address"
          name="street"
          value={formData.street}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter street address"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <HomeIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter city"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          label="Postal/ZIP Code"
          name="postcode"
          value={formData.postcode}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          placeholder="Enter postal code"
        />
      </Grid>
    </>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: '60px',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              minHeight: '60px',
            }
          }}
        >
          <Tab label="Basic Information" />
          <Tab label="Billing & Shipping" />
          <Tab label="Address" />
        </Tabs>
      </Paper>

      <ModernFormLayout
        title="Create New Customer"
        subtitle="Add a customer to your business contacts"
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Save Customer"
        startIcon={<SaveIcon />}
        footer={
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2, borderRadius: '8px', textTransform: 'none' }}
          >
            Cancel
          </Button>
        }
      >
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          </Grid>
        )}
        
        {activeTab === 0 && renderBasicInfoTab()}
        {activeTab === 1 && renderBillingTab()}
        {activeTab === 2 && renderAddressTab()}
      </ModernFormLayout>
    </Box>
  );
};

export default CustomerForm;
