
////Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/SignUp.js
'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextField, Grid, Box, Paper, Typography, CircularProgress, Link, Alert } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';

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
    minLength(8, 'Password must be at least 8 characters long'),
  ]),
  confirmPassword: string([minLength(1, 'This field is required')]),
});

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      logger.debug('Submitting sign-up data:', data);
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      logger.debug('Sign-up API response status:', response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sign up failed');
      }
  
      const result = await response.json();
      logger.debug('Sign-up API response:', result);
  
      setUserEmail(data.email);
      setIsSignupComplete(true);
      logger.info('Sign-up process completed successfully');
    } catch (error) {
      logger.error('Error during sign up:', error);
      setErrorState(error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  
  };

  const renderForm = () => (
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
            type="password"
            id="password"
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors?.password?.message}
          />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            error={!!errors.confirmPassword || (password && field.value && password !== field.value)}
            helperText={
              errors?.confirmPassword?.message || 
              (password && field.value && password !== field.value ? 'Passwords do not match' : '')
            }
          />
        )}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2, borderRadius: '20px', textTransform: 'none' }}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
      </Button>

      {errorState && (
        <Typography color="error" align="center">
          {errorState}
        </Typography>
      )}

      <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Link href="/auth/signin">
          <Typography variant="body2" component="span" sx={{ cursor: 'pointer', color: 'primary.main' }}>
            Already have an account? Sign In
          </Typography>
        </Link>


      </Box>
    </Box>
  );

  const renderConfirmation = () => (
    <Box sx={{ mt: 4, textAlign: 'center' }}>
      <Alert severity="success" sx={{ mb: 2 }}>
        Sign up successful!
      </Alert>
      <Typography variant="body1" paragraph>
        A confirmation email has been sent to <strong>{userEmail}</strong>.
      </Typography>
      <Typography variant="body1" paragraph>
        Please check your email inbox, or Junk, and click on the confirmation link to activate your account.
      </Typography>
      <Button
        variant="contained"
        onClick={() => router.push('/auth/signin')}
        sx={{ mt: 2, borderRadius: '20px', textTransform: 'none' }}
      >
        Go to Sign In
      </Button>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
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

            <Typography component="h1" variant="h5">
              Sign Up
            </Typography>

            {isSignupComplete ? renderConfirmation() : renderForm()}
          </Box>
        </Grid>
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
              Streamline Your Business
            </Typography>

            <ul style={{ listStyleType: 'none', padding: 0, color: 'black' }}>
              <li>✅ <strong>Effortless invoicing</strong> for freelancers and small businesses.</li>
              <li>✅ <strong>Track expenses</strong> and manage your cash flow with ease.</li>
              <li>✅ <strong>Generate reports</strong> to gain insights into your business performance.</li>
            </ul>
          </Box>
          <Box sx={{ width: '80%', height: '50%', position: 'relative' }}>
            <Image
              src="/static/images/Product-Launch-2--Streamline-Brooklyn.png"
              alt="Business management illustration"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}