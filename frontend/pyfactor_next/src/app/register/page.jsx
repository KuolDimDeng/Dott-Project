'use client'

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getData } from 'country-list';
import { FormControl, InputLabel, Select as MuiSelect, MenuItem } from '@mui/material';

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        PyFactor
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const defaultTheme = createTheme();

export default function RegistrationPage() {
  const [formData, setFormData] = useState({
    email: '',
    password1: '',
    password2: '',
    first_name: '',
    last_name: '',
    occupation: '',
    business_name: '',
    business_type: '',
    phone_number: '',
    street: '',
    postcode: '',
    state: '',
    country: '',
    subscription_type: '',
  });
  const router = useRouter();

  const countries = getData().map((country) => ({
    value: country.code,
    label: country.name,
  }));

  const BUSINESS_TYPES = [
    { value: 'COMMERCE', label: 'Commerce' },
    { value: 'CHARITY', label: 'Charity' },
    { value: 'HOSPITALITY', label: 'Hospitality' },
    { value: 'PROPERTY_MANAGEMENT', label: 'Property Management' },
    { value: 'TRANSPORTATION', label: 'Transportation' },
    { value: 'STORAGE', label: 'Storage' },
  ];

  const SUBSCRIPTION_CHOICES = [
    { value: 'free', label: 'Free' },
    { value: 'professional', label: 'Professional' },

  ];

  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    if (e.target) {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
    } else {
      setFormData({ ...formData, country: e.value });
    }
  };

  const handleSuccess = () => {
    setSuccessMessage('Registration successful!');
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };
  const Select = dynamic(() => import('react-select'), { ssr: false });


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/register/', formData);
      handleSuccess();
      router.push('/');
    } catch (error) {
      logger.error('Registration error:', error);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
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
                  required
                  fullWidth
                  id="business_name"
                  label="Business Name"
                  name="business_name"
                  autoComplete="business-name"
                  value={formData.business_name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="business_type-label">Business Type</InputLabel>
                  <MuiSelect
                    labelId="business_type-label"
                    id="business_type"
                    name="business_type"
                    value={formData.business_type}
                    label="Business Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="">Select Business Type</MenuItem>
                    {BUSINESS_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>
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
                  <Select
                    id="country-select"
                    name="country"
                    value={countries.find((c) => c.value === formData.country)}
                    onChange={(selectedOption) => handleChange(selectedOption)}
                    options={countries}
                    placeholder="Select Country"
                    isClearable
                  />
                </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="subscription_type-label">Subscription Type</InputLabel>
                  <MuiSelect
                    labelId="subscription_type-label"
                    id="subscription_type"
                    name="subscription_type"
                    value={formData.subscription_type}
                    label="Subscription Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="">Select Subscription Type</MenuItem>
                    {SUBSCRIPTION_CHOICES.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>
              </Grid>
            </Grid>
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Sign Up
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <Copyright sx={{ mt: 5 }} />
      </Container>
    </ThemeProvider>
  );
}