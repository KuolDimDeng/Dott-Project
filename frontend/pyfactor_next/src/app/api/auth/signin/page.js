///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/signin/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, TextField, Grid, Box, Paper, Typography, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { GoogleLoginButton, FacebookLoginButton, AppleLoginButton } from 'react-social-login-buttons';
import { signIn, useSession } from "next-auth/react";

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
  password: string([
    minLength(1, 'This field is required'),
    minLength(5, 'Password must be at least 5 characters long'),
  ]),
});

export default function SignIn() {
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    console.log('Session:', session);
    if (status === 'authenticated') {
      if (session.user.isOnboarded) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding/step1');
      }
    }
  }, [session, status, router]);
  console.log('-------------------------------------------');
  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const onSubmit = async (data) => {
    console.log('Form submitted:', data);
    console.log('-------------------------------------------');
    setIsLoading(true);
    try {
      logger.info('Initiating login');
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setErrorState(result.error);
        logger.error('Login failed', { error: result.error });
      } else {
        logger.info('Login successful');
        if (result.url) {
          router.push(result.url);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      logger.error('Error during login', { error: error.message });
      setErrorState('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      console.log(`Initiating ${provider} login`);
      logger.info(`Initiating ${provider} login`);
      
      // Log the parameters being passed to signIn
      console.log('signIn parameters:', { provider, options: { redirect: false } });
      
      const result = await signIn(provider, { redirect: false });
      
      console.log('signIn result:', result);  // Log the entire result object
  
      if (!result) {
        throw new Error('Login failed: No result returned');
      }
  
      if (result.error) {
        console.error(`Error during ${provider} login:`, result.error);
        logger.error(`${provider} login failed`, { error: result.error });
        setErrorState(`${provider} login failed. ${result.error}`);
      } else {
        logger.info(`${provider} login successful, redirecting...`);
        if (result.url) {
          router.push(result.url);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
        console.error(`Error during ${provider} login:`, error);
        logger.error(`Unexpected error during ${provider} login`, { 
          error: error.message, 
          stack: error.stack,
          provider: provider
        });
      setErrorState(`An unexpected error occurred during ${provider} login. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') return <CircularProgress />;
  if (status === 'authenticated') return null;


  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        <Grid
          item
          xs={false}
          sm={4}
          md={6}
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
              Get Paid Effortlessly
            </Typography>

            <ul style={{ listStyleType: 'none', padding: 0, color: 'black' }}>
              <li>✅ <strong>Create professional invoices</strong> with ease.</li>
              <li>✅ <strong>Get paid quickly</strong>: Accept credit cards, mobile money, bank transfers, or Apple Pay.</li>
              <li>✅ <strong>Faster payouts</strong> – receive payments within 1-2 business days.</li>
            </ul>
          </Box>
          <Box sx={{ width: '80%', height: '50%', position: 'relative' }}>
            <Image
              src="/static/images/Payment-With-Card-2--Streamline-Brooklyn.png"
              alt="Productive workspace"
              width={300}
              height={300}
              priority
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={8} md={6} component={Paper} elevation={6} square sx={{ height: '100vh', overflow: 'auto' }}>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={40}
                priority
              />
            </Box>

            <Typography component="h1" variant="h5" sx={{ color: 'primary.main' }}>
              Sign in
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1, width: '100%' }}>
              <Controller
                name="email"
                control={control}
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
                    helperText={errors?.email?.message}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={isPasswordShown ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    variant="filled"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={handleClickShowPassword}
                            onMouseDown={(e) => e.preventDefault()}
                            aria-label="toggle password visibility"
                          >
                            {isPasswordShown ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                )}
              />

            <Button 
                      type="submit" 
                      fullWidth 
                      variant="contained" 
                      disabled={isLoading}
                      sx={{ 
                        mt: 3, 
                        mb: 2, 
                        borderRadius: '20px',
                        textTransform: 'none'
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                    </Button>

                    {errorState && (
                      <Typography color="error" align="center">
                        {errorState}
                      </Typography>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <GoogleLoginButton 
                        onClick={() => handleSocialLogin('google')} 
                        disabled={isLoading}
                        style={{ 
                          marginBottom: '10px', 
                          borderRadius: '20px',
                          background: '#e3f2fd',
                          color: '#000'
                        }}
                        text={isLoading ? 'Loading...' : 'Sign in with Google'}
                      />
                      <FacebookLoginButton 
                        onClick={() => handleSocialLogin('facebook')} 
                        disabled={isLoading}
                        style={{ 
                          marginBottom: '10px', 
                          borderRadius: '20px'
                        }}
                        text={isLoading ? 'Loading...' : 'Sign in with Facebook'}
                      />
                      <AppleLoginButton 
                        onClick={() => handleSocialLogin('apple')}
                        disabled={isLoading}
                        style={{ 
                          borderRadius: '20px'
                        }}
                        text={isLoading ? 'Loading...' : 'Sign in with Apple'}
                      />
                    </Box>
                  </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}