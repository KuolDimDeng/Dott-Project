'use client';

import React from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { 
  TextField, Select, MenuItem, FormControl, InputLabel, Typography, 
  Button, Container, Grid, Paper, Box, CircularProgress, Alert 
} from '@mui/material';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';
import { countries } from '@/app/countryList/page';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const schema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  businessName: yup.string().required('Business name is required'),
  industry: yup.string().required('Industry is required'),
  country: yup.string().required('Country is required'),
  legalStructure: yup.string().required('Legal structure is required'),
  dateFounded: yup.date().required('Date founded is required').max(new Date(), 'Date cannot be in the future'),
});

const OnboardingStep1 = ({ onComplete }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, updateFormData } = useOnboarding();

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      ...formData,
      country: formData.country || '',
      legalStructure: formData.legalStructure || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      businessName: formData.businessName || '',
      industry: formData.industry || '',
      dateFounded: formData.dateFounded || new Date().toISOString().split('T')[0],
    },
  });

  const step1Mutation = useMutation({
    mutationFn: async (data) => {
      const response = await axiosInstance.post('/api/onboarding/save-step1/', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      updateFormData(variables);
      queryClient.invalidateQueries(['onboardingStatus']);
      router.push('/onboarding/step2');
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      console.error('Error saving step 1 data:', error);
    }
  });

  const onSubmit = async (data) => {
    try {
      let formattedDate;
      if (data.dateFounded instanceof Date) {
        formattedDate = data.dateFounded.toISOString().split('T')[0];
      } else if (typeof data.dateFounded === 'string') {
        formattedDate = data.dateFounded.split('T')[0];
      } else {
        console.error('Invalid date format:', data.dateFounded);
        formattedDate = null;
      }
  
      const onboardingData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: session?.user?.email,
        businessName: data.businessName,
        industry: data.industry,
        country: data.country,
        legalStructure: data.legalStructure,
        dateFounded: formattedDate,
      };
      
      await step1Mutation.mutateAsync(onboardingData);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  if (!session) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Please sign in to access onboarding.</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        <Grid item xs={12} sm={6} component={Paper} elevation={6} square sx={{ height: '100vh', overflow: 'auto' }}>
          <Container component="main" maxWidth="sm">
            <Box sx={{ my: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
              <Typography variant="h6" color="primary" gutterBottom>STEP 1 OF 2</Typography>
              <Typography component="h2" variant="h5" gutterBottom>Welcome to Dott!</Typography>
              
              {step1Mutation.isError && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {step1Mutation.error?.message || 'An error occurred while saving your data'}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 3, width: '100%' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="firstName"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <TextField
                          {...restField}
                          onChange={onChange}
                          value={value || ''}
                          fullWidth
                          label="First Name"
                          error={!!errors.firstName}
                          helperText={errors.firstName?.message}
                          disabled={step1Mutation.isPending}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="lastName"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <TextField
                          {...restField}
                          onChange={onChange}
                          value={value || ''}
                          fullWidth
                          label="Last Name"
                          error={!!errors.lastName}
                          helperText={errors.lastName?.message}
                          disabled={step1Mutation.isPending}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="businessName"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <TextField
                          {...restField}
                          onChange={onChange}
                          value={value || ''}
                          fullWidth
                          label="What's your business name?"
                          error={!!errors.businessName}
                          helperText={errors.businessName?.message}
                          disabled={step1Mutation.isPending}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="industry"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <FormControl fullWidth error={!!errors.industry}>
                          <InputLabel>Select your industry</InputLabel>
                          <Select
                            {...restField}
                            onChange={onChange}
                            value={value || ''}
                            label="Select your industry"
                            disabled={step1Mutation.isPending}
                          >
                            <MenuItem value="" disabled>Select an industry</MenuItem>
                            {businessTypes.map((type) => (
                              <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                          </Select>
                          {errors.industry && <Typography color="error">{errors.industry.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="country"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <FormControl fullWidth error={!!errors.country}>
                          <InputLabel>Where is your business located?</InputLabel>
                          <Select
                            {...restField}
                            onChange={onChange}
                            value={value || ''}
                            label="Where is your business located?"
                            disabled={step1Mutation.isPending}
                          >
                            <MenuItem value="" disabled>Select a country</MenuItem>
                            {countries.map((country) => (
                              <MenuItem key={country.code} value={country.code}>{country.name}</MenuItem>
                            ))}
                          </Select>
                          {errors.country && <Typography color="error">{errors.country.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="legalStructure"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <FormControl fullWidth error={!!errors.legalStructure}>
                          <InputLabel>What is the legal structure of your business?</InputLabel>
                          <Select
                            {...restField}
                            onChange={onChange}
                            value={value || ''}
                            label="Legal Structure"
                            disabled={step1Mutation.isPending}
                          >
                            <MenuItem value="" disabled>Select a legal structure</MenuItem>
                            {legalStructures.map((structure) => (
                              <MenuItem key={structure} value={structure}>{structure}</MenuItem>
                            ))}
                          </Select>
                          {errors.legalStructure && <Typography color="error">{errors.legalStructure.message}</Typography>}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name="dateFounded"
                      control={control}
                      render={({ field: { onChange, value, ...restField } }) => (
                        <TextField
                          {...restField}
                          onChange={onChange}
                          value={value || ''}
                          fullWidth
                          label="When was your business founded?"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          error={!!errors.dateFounded}
                          helperText={errors.dateFounded?.message}
                          disabled={step1Mutation.isPending}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary" 
                      fullWidth 
                      disabled={step1Mutation.isPending}
                    >
                      {step1Mutation.isPending ? <CircularProgress size={24} /> : 'Next'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Container>
        </Grid>
        <Grid
          item
          xs={12}
          sm={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#e3f2fd',
            p: 4,
            height: '100vh',
          }}
        >
          <Box sx={{ width: '100%', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'black', mb: 2 }}>
              Boost Your Productivity
            </Typography>
            <ul style={{ listStyleType: 'none', padding: 0, color: 'black' }}>
              <li>✅ <strong>Streamline your workflow</strong> with our intuitive tools.</li>
              <li>✅ <strong>Track your progress</strong> and achieve your goals faster.</li>
              <li>✅ <strong>Collaborate seamlessly</strong> with your team members.</li>
            </ul>
          </Box>
          <Box sx={{ width: '80%', height: '50%', position: 'relative' }}>
            <Image
              src="/static/images/Being-Productive-3--Streamline-Brooklyn.png"
              alt="Productive workspace"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default OnboardingStep1;