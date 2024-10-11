
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/signup_Email/page.js
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button, TextField, Grid, Box, Paper, Typography, Container,
  InputAdornment, IconButton, Alert
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';
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

const schema = object({
  email: string([minLength(1, 'This field is required'), email('Email is invalid')]),
  password1: string([
    minLength(1, 'This field is required'),
    minLength(8, 'Password must be at least 8 characters long'),
  ]),
  password2: string([minLength(1, 'This field is required')]),
});

export default function SignInEmail() {
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
  } = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password1: '',
      password2: '',
    },
  });

  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const onSubmit = async (data) => {
    if (data.password1 !== data.password2) {
      setError('password2', { 
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }

    try {
      logger.info('Sending registration request', { email: data.email });
      const response = await axiosInstance.post('/api/register/', {
        email: data.email,
        password1: data.password1,
        password2: data.password2,
      });
      
      if (response.status === 201) {
        setSuccessMessage('Registration successful. Please check your email to confirm your account.');
        setErrorState(null);
      } else {
        setErrorState({ message: 'Unexpected response from server' });
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.email) {
        setError('email', {
          type: 'manual',
          message: error.response.data.email[0]
        });
      } else {
        setErrorState({ message: 'Failed to register. Please try again.' });
      }
      logger.error('Error during registration', { error: error.message });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        {/* Left side */}
        <Grid
          item
          xs={false}
          sm={4}
          md={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#e3f2fd',
            p: 4,
          }}
        >
          <Box sx={{ height: '20%' }} />
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: "bold", color: 'black', mb: 2 }}>
              Join Dott Today!
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <ul style={{ listStyleType: 'none', padding: 0, color: "black"}}>
              <li>✅ <strong>Easy setup</strong> - Get started in minutes.</li>
              <li>✅ <strong>Secure platform</strong> - Your data is safe with us.</li>
              <li>✅ <strong>24/7 support</strong> - We're here to help you succeed.</li>
            </ul>
          </Box>

          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
            mt: -2,
          }}>
            <Image
              src="/static/images/Being-Productive-3--Streamline-Brooklyn.png"
              alt="Work from home illustration"
              width={350}
              height={350}
              objectFit="contain"
              priority
            />
          </Box>
        </Grid>

        {/* Right side - Sign Up Form */}
        <Grid item xs={12} sm={8} md={6} component={Paper} elevation={6} square>
          <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 4,
          }}>
            <Box sx={{ height: '20%' }} />
  
            {/* Pyfactor Logo */}
            <Box sx={{ mb: 4 }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={50}
                priority
              />
            </Box>
  
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}>
              <Typography component="h1" variant="h5" sx={{ color: 'primary.main', mb: 2 }}>
                Sign up with Email
              </Typography>
  
              {successMessage && (
                <Alert severity="success" sx={{ mt: 2, width: '100%', mb: 2 }}>
                  {successMessage}
                </Alert>
              )}
  
              {errorState && (
                <Alert severity="error" sx={{ mt: 2, width: '100%', mb: 2 }}>
                  {errorState.message}
                </Alert>
              )}
  
              <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1, width: '100%' }}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      autoComplete="email"
                      autoFocus
                      variant="filled"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
  
                <Controller
                  name="password1"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      required
                      fullWidth
                      name="password1"
                      label="Password"
                      type={isPasswordShown ? 'text' : 'password'}
                      id="password1"
                      autoComplete="new-password"
                      variant="filled"
                      error={!!errors.password1}
                      helperText={errors.password1?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={handleClickShowPassword}
                              onMouseDown={(e) => e.preventDefault()}
                              aria-label="toggle password visibility"
                            >
                              {isPasswordShown ? <i className="ri-eye-off-line" /> : <i className="ri-eye-line" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />

                <Controller
                  name="password2"
                  control={control}
                  rules={{ 
                    required: true,
                    validate: (value) => value === getValues('password1') || 'Passwords do not match'
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      margin="normal"
                      required
                      fullWidth
                      name="password2"
                      label="Confirm Password"
                      type={isPasswordShown ? 'text' : 'password'}
                      id="password2"
                      autoComplete="new-password"
                      variant="filled"
                      error={!!errors.password2}
                      helperText={errors.password2?.message}
                    />
                  )}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  Sign Up
                </Button>
  
                <Grid container justifyContent="flex-end">
                  <Grid item>
                    <Link href="/auth/signin" passHref>
                      <Typography
                        variant="body2"
                        sx={{
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                          },
                        }}
                      >
                        Already have an account? Sign in
                      </Typography>
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}