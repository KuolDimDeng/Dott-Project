'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, TextField, Grid, Box, Paper, Typography, 
  InputAdornment, IconButton, CircularProgress, Alert, Container 
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { logger } from '@/utils/logger';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { GoogleLoginButton, AppleLoginButton } from 'react-social-login-buttons';
import { signIn, useSession } from "next-auth/react";
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig';

// Simplified theme
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '20px',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'filled' },
    },
  },
});


// Form validation schema with Zod
const signInSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(5, 'Password must be at least 5 characters long'),
});

export default function SignIn() {
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle authenticated state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setIsLoading(true);
      axiosInstance.get('/api/onboarding/status/', {
        headers: { Authorization: `Bearer ${session.user.accessToken}` }
      })
        .then(response => {
          const status = response.data?.onboarding_status;
          router.push(status === 'complete' ? '/dashboard' : `/onboarding/${status || 'step1'}`);
        })
        .catch(() => router.push('/onboarding/step1'))
        .finally(() => setIsLoading(false));
    }
  }, [status, session, router]);

  // Login mutation
  const credentialsLoginMutation = useMutation({
    mutationFn: async (credentials) => {
      const result = await signIn('credentials', {
        redirect: false,
        ...credentials
      });
      
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['session']);
      setError(null);
      reset();
    },
    onError: (error) => {
      setError(error.message || 'Login failed. Please try again.');
    }
  });

  // Social login handler
  const handleSocialLogin = (provider) => {
    setError(null);
    setIsLoading(true);
    signIn(provider, {
      callbackUrl: '/onboarding/step1',
      redirect: true
    }).catch(() => {
      setError(`${provider} login failed. Please try again.`);
      setIsLoading(false);
    });
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        {/* Marketing Section - Hidden on mobile */}
        <Grid
          item
          xs={false}
          sm={4}
          md={6}
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#e3f2fd',
            p: 4,
          }}
        >
          <Box sx={{ width: '100%', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Get Paid Effortlessly
            </Typography>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>✅ Create professional invoices with ease</li>
              <li>✅ Accept multiple payment methods</li>
              <li>✅ Fast payouts within 1-2 business days</li>
            </ul>
          </Box>
          <Image
            src="/static/images/Payment-With-Card-2--Streamline-Brooklyn.png"
            alt="Payment illustration"
            width={300}
            height={300}
            priority
            style={{ objectFit: 'contain' }}
          />
        </Grid>

        {/* Sign In Form */}
        <Grid 
          item 
          xs={12} 
          sm={8} 
          md={6} 
          component={Paper} 
          square 
          sx={{ 
            px: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto'
          }}
        >
          <Box sx={{ my: 8, width: '100%', maxWidth: 'sm' }}>
            {/* Logo */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit((data) => credentialsLoginMutation.mutate(data))}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    margin="normal"
                    fullWidth
                    label="Email Address"
                    autoComplete="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={credentialsLoginMutation.isPending}
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
                    fullWidth
                    label="Password"
                    type={isPasswordShown ? 'text' : 'password'}
                    autoComplete="current-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={credentialsLoginMutation.isPending}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setIsPasswordShown(!isPasswordShown)}
                            edge="end"
                          >
                            {isPasswordShown ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={credentialsLoginMutation.isPending}
                sx={{ mt: 3, mb: 2, height: 48 }}
              >
                {credentialsLoginMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Links */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mb: 3 
            }}>
              <Link href="/auth/signup">
                <Typography 
                  variant="body2" 
                  color="primary"
                  sx={{ '&:hover': { textDecoration: 'underline' } }}
                >
                  Create account
                </Typography>
              </Link>
              <Link href="/auth/forgot-password">
                <Typography 
                  variant="body2" 
                  color="primary"
                  sx={{ '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Typography>
              </Link>
            </Box>

            {/* Social Login */}
            <Box sx={{ mt: 4 }}>
              <GoogleLoginButton
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                style={{ 
                  marginBottom: '10px',
                  borderRadius: '20px',
                  background: '#fff'
                }}
              />
              <AppleLoginButton
                onClick={() => handleSocialLogin('apple')}
                disabled={isLoading}
                style={{ borderRadius: '20px' }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}

