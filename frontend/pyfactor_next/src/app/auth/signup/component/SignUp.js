'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  TextField,
  Grid,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Link,
  Alert,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';


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

// Function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const [resendStatus, setResendStatus] = useState({
    loading: false,
    error: null,
    success: false
  });


  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password1: '',
      password2: '',
    },
  });

  const password1 = watch('password1');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      logger.debug('Submitting sign-up data:', data);

      const response = await fetch('/api/auth/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password1: data.password1,
          password2: data.password2,
        }),
      });

      logger.debug('Sign-up API response status:', response.status);

      const result = await response.json();

      if (!response.ok) {
        // Check if it's a duplicate email error
        if (result.error === 'An account with this email already exists') {
          setErrorState('An account with this email already exists. Please sign in or use a different email.');
          return;
        }
        throw new Error(result.error || 'An error occurred during signup');
      }

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


  // Add resend handler
  const handleResendVerification = async () => {
    setResendStatus({ loading: true, error: null, success: false });
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      setResendStatus(prev => ({ ...prev, loading: false, success: true }));
      toast.success('Verification email resent successfully!');
    } catch (error) {
      setResendStatus({ loading: false, error: error.message, success: false });
      toast.error(error.message);
    }
  };


  const renderForm = () => (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ mt: 1, width: '100%' }}
    >
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
        name="password1"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            name="password1"
            label="Password"
            type="password"
            id="password1"
            autoComplete="new-password"
            error={!!errors.password1}
            helperText={errors?.password1?.message}
          />
        )}
      />

      <Controller
        name="password2"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            name="password2"
            label="Confirm Password"
            type="password"
            id="password2"
            error={!!errors.password2 || (password1 && field.value && password1 !== field.value)}
            helperText={
              errors?.password2?.message ||
              (password1 && field.value && password1 !== field.value
                ? 'Passwords do not match'
                : '')
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
          <Typography
            variant="body2"
            component="span"
            sx={{ cursor: 'pointer', color: 'primary.main' }}
          >
            Already have an account? Sign In
          </Typography>
        </Link>
      </Box>
    </Box>
  );

    // Update renderConfirmation
    const renderConfirmation = () => (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Sign up successful!
        </Alert>
        <Typography variant="body1" paragraph>
          A confirmation email has been sent to <strong>{userEmail}</strong>.
        </Typography>
        
        <Button
          variant="contained"
          onClick={handleResendVerification}
          disabled={resendStatus.loading}
          sx={{ mt: 2, mr: 2 }}
        >
          {resendStatus.loading ? <CircularProgress size={24} /> : 'Resend Email'}
        </Button>
  
        <Button
          variant="outlined"
          onClick={() => router.push('/auth/signin')}
          sx={{ mt: 2 }}
        >
          Go to Sign In
        </Button>
  
        {resendStatus.error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {resendStatus.error}
          </Typography>
        )}
      </Box>
    );
  

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        <Grid
          item
          xs={12}
          sm={8}
          md={6}
          component={Paper}
          elevation={6}
          square
          sx={{ height: '100vh', overflow: 'auto' }}
        >
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
              <li>
                ✅ <strong>Effortless invoicing</strong> for freelancers and small businesses.
              </li>
              <li>
                ✅ <strong>Track expenses</strong> and manage your cash flow with ease.
              </li>
              <li>
                ✅ <strong>Generate reports</strong> to gain insights into your business
                performance.
              </li>
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
