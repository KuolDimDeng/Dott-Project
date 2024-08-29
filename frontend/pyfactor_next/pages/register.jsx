'use client';

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { countries } from 'countries-list';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';



const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const countryOptions = Object.entries(countries).map(([code, country]) => ({
  value: code,
  label: country.name
}));

const SUBSCRIPTION_CHOICES = [
  { value: 'free', label: 'Free' },
  { value: 'professional', label: 'Professional' },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password1: '',
    password2: '',
    first_name: '',
    last_name: '',
    occupation: '',
    phone_number: '',
    street: '',
    postcode: '',
    state: '',
    country: '',
    subscription_type: '',
    business_name: '',
    business_type: '',
    business_address: '',
    business_phone_number: '',
    business_email: '',
  });
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState('');
 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/register/', formData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        handleSuccess();
      } else {
        console.error('Registration successful but no token received');
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Set error state or display error message to user
    }
  };

  
  const handleSuccess = () => {
    setSuccessMessage('Registration successful!');
    setTimeout(() => {
      setSuccessMessage('');
      router.push('/dashboard');
    }, 2000);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Container component="main" maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
          <CssBaseline />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Sign up
            </Typography>
            {successMessage && (
              <Typography variant="body2" color="success.main" align="center">
                {successMessage}
              </Typography>
            )}
            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoComplete="given-name"
                    name="first_name"
                    required
                    fullWidth
                    id="first_name"
                    label="First Name"
                    autoFocus
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="last_name"
                    label="Last Name"
                    name="last_name"
                    autoComplete="family-name"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="password1"
                    label="Password"
                    type="password"
                    id="password1"
                    autoComplete="new-password"
                    value={formData.password1}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="password2"
                    label="Confirm Password"
                    type="password"
                    id="password2"
                    autoComplete="new-password"
                    value={formData.password2}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="occupation"
                    label="Occupation"
                    name="occupation"
                    autoComplete="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="phone_number"
                    label="Phone Number"
                    name="phone_number"
                    autoComplete="tel"
                    value={formData.phone_number}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="street"
                    label="Street"
                    name="street"
                    autoComplete="street-address"
                    value={formData.street}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="postcode"
                    label="Postcode"
                    name="postcode"
                    autoComplete="postal-code"
                    value={formData.postcode}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="state"
                    label="State"
                    name="state"
                    autoComplete="address-level1"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="country-select-label">Country</InputLabel>
                    <Select
                      labelId="country-select-label"
                      id="country-select"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      label="Country"
                    >
                      {countryOptions.map((country) => (
                        <MenuItem key={country.value} value={country.value}>
                          {country.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="subscription_type-label">Subscription Type</InputLabel>
                    <Select
                      labelId="subscription_type-label"
                      id="subscription_type"
                      name="subscription_type"
                      value={formData.subscription_type}
                      label="Subscription Type"
                      onChange={handleChange}
                    >
                      {SUBSCRIPTION_CHOICES.map((choice) => (
                        <MenuItem key={choice.value} value={choice.value}>
                          {choice.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography component="h2" variant="h6">
                    Business Information
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="business_name"
                    label="Business Name"
                    name="business_name"
                    autoComplete="organization"
                    value={formData.business_name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="business-type-label">Business Type</InputLabel>
                    <Select
                      labelId="business-type-label"
                      id="business_type"
                      name="business_type"
                      value={formData.business_type}
                      label="Business Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="ecommerce">E-commerce</MenuItem>
                      <MenuItem value="service">Service</MenuItem>
                      <MenuItem value="retail">Retail</MenuItem>
                      {/* Add more business types as needed */}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="business_address"
                    label="Business Address"
                    name="business_address"
                    autoComplete="street-address"
                    value={formData.business_address}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="business_phone_number"
                    label="Business Phone Number"
                    name="business_phone_number"
                    autoComplete="tel"
                    value={formData.business_phone_number}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="business_email"
                    label="Business Email"
                    name="business_email"
                    autoComplete="email"
                    value={formData.business_email}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                Sign Up
              </Button>
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link href="/login" variant="body2">
                    Already have an account? Sign in
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
