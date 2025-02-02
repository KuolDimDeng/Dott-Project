///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signin/page.js
// src/app/auth/signin/page.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react'; // Add useCallback here
import { signIn, useSession, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Button,
  TextField,
  Grid,
  Box,
  Paper,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  ArrowBack as ArrowBackIcon // Rename to avoid conflicts
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { logger } from '@/utils/logger';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { GoogleLoginButton, AppleLoginButton } from 'react-social-login-buttons';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { axiosInstance } from '@/lib/axiosConfig';
import { toast } from 'react-toastify';
import { 
  validateUserState, 
  validateAndRouteUser,
  createErrorHandler, // Add this import
  handleAuthFlow // Add this import if not already imported
} from '@/lib/authUtils';
import { TroubleshootOutlined } from '@mui/icons-material';
import { RoutingManager } from '@/lib/routingManager';
import { AuthLoadingState } from '@/components/LoadingState';
import { OnboardingProvider } from '@/app/onboarding/contexts/OnboardingContext';



// Theme configuration (same as before)
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

// Form validation schema
const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(5, 'Password must be at least 5 characters long'),
});

export default function SignInPage() {
  // State management
  const mounted = useRef(true);
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified')
  const verificationError = searchParams.get('verificationError');




  // Hooks
  const router = useRouter();
  const requestIdRef = useRef(crypto.randomUUID());
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { handleOnboardingRedirect } = useOnboarding();

  // Initialize component
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

    // Add verification success notification
    useEffect(() => {
      if (verified) {
        setError(null);
        toast.success('Email successfully verified! You can now sign in.');
      }
    }, [verified]);
  
    useEffect(() => {
      if (verificationError) {
        setError(`Verification failed: ${verificationError}`);
      }
    }, [verificationError]);

  // Form management
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

  useEffect(() => {
    if (!isInitialized || status === 'loading') return;
  
    const checkAuth = async () => {
        // Don't show error for unauthenticated state - this is normal
        if (status === 'unauthenticated') {
          logger.debug('User is unauthenticated', { 
            status, 
            pathname: window.location.pathname 
          });
          return;
        }

        // Only continue if we have required parameters
        if (!router) {
          console.error('Router not initialized');
          return;
        }

      const requestId = crypto.randomUUID();
    
      logger.debug('Running checkAuth', {
        requestId,
        status,
        sessionExists: !!session,
        hasToken: !!session?.user?.accessToken,
        pathname: window.location.pathname,
      });
    
      // First check if we have both authenticated status and access token
      if (status === 'authenticated' && session?.user?.accessToken) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token/verify/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.accessToken}`,
              'Content-Type': 'application/json'
            },
            // Add token to request body as well
            body: JSON.stringify({
              token: session.user.accessToken
            }),
            credentials: 'include'
          });
    
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token verification failed: ${errorText}`);
          }
    
          logger.info('Token verified successfully', { requestId });
    
          if (window.location.pathname === '/auth/signin') {
            const redirectPath = session.user.onboarding_status === 'complete' 
              ? '/dashboard' 
              : `/onboarding/${session.user.onboarding_status || 'business-info'}`;
            
            router.replace(redirectPath);
            logger.info('Redirecting user', { requestId, redirectPath });
          }
        } catch (error) {
          logger.error('Auth check failed', {
            requestId,
            error: error.message,
            stack: error.stack,
          });
        }
      }
    };
    
  
    checkAuth();
  }, [isInitialized, status, session, router]);
 
    // Update handle login
    const handleLogin = async (credentials = {}) => {
      const requestId = crypto.randomUUID();
      
      logger.info('Starting login attempt', { 
        requestId,
        hasCredentials: !!Object.keys(credentials).length 
      });
    
      try {
        setIsLoading(true);
        setError(null);
    
        // Handle credentials sign-in
        logger.debug('Initiating credentials sign-in', {
          requestId,
          hasEmail: !!credentials.email
        });
    
        const signInResult = await signIn('credentials', {
          redirect: false,
          ...credentials
        });
    
        if (signInResult?.error) {
          throw new Error(signInResult.error);
        }
    
        const newSession = await getSession();
    
        if (!newSession?.user) {
          logger.error('No session established', { requestId });
          throw new Error('Failed to establish session');
        }
    
        logger.info('Session established', {
          requestId,
          onboarding_status: newSession.user.onboarding_status,
          isComplete: newSession.user.isComplete,
          email: newSession.user.email
        });
    
        // Handle redirection using onboarding context
        handleOnboardingRedirect(newSession.user.onboarding_status);
    
      } catch (error) {
        logger.error('Login failed', {
          requestId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack
        });
        
        setError(determineErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

// Update handleValidationError with better context
const handleValidationError = useCallback(async (error, context = {}) => {
  const errorHandler = createErrorHandler(router, logger);
  const requestId = requestIdRef.current;

  logger.error('Validation error occurred', {
    requestId,
    errorMessage: error.message,
    errorCode: error.code,
    errorType: error.name,
    context
  });

  return errorHandler(error, requestId, {
    component: 'SignInPage',
    ...context
  });
}, [router]);

  // Helper function to determine error messages
  const determineErrorMessage = useCallback((error) => {
    if (error.message.includes('Email not verified')) {
      return 'EMAIL_NOT_VERIFIED';
    }
    if (error.message.includes('timeout')) {
      return 'Login timed out. Please try again.';
    }
    if (error.message.includes('Failed to establish session')) {
      return 'Could not complete login. Please try again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (error.message === 'CredentialsSignin') {
      return 'Invalid email or password. Please try again.';
    }
    return error.message || 'Login failed. Please try again.';
  }, []);

    // Add resend handler
    const handleResendVerification = async () => {
      const email = control._formValues.email;
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) throw new Error('Failed to resend verification');
        toast.success('Verification email resent successfully');
      } catch (error) {
        toast.error(error.message);
      }
    };
  

  // Single mutation for credentials login
  const credentialsLoginMutation = useMutation({
    mutationFn: (credentials) => handleLogin(credentials)
  });
  // Simplified social login handler
// In SignInPage component
const handleSocialLogin = async (provider) => {
  const requestId = crypto.randomUUID();
  
  logger.debug('Starting social login:', {
    requestId,
    provider
  });

  try {
    setIsLoading(true);
    setError(null);

    // Call signIn with specific options for state handling
    const result = await signIn(provider, {
      redirect: true,
      callbackUrl: '/onboarding/business-info'
    });

    // Let NextAuth handle the redirect
    
  } catch (error) {
    logger.error('Social login failed:', {
      requestId,
      error: error.message,
      provider
    });
    setError('Authentication failed. Please try again.');
    setIsLoading(false);
  }
};

  // Loading states
  const showLoading = !isInitialized || status === 'loading' || isLoading;

  const loadingMessage = !isInitialized
    ? 'Initializing...'
    : status === 'loading'
      ? 'Checking authentication...'
      : 'Loading your information...';
  
  // Remove isAuthenticating check since it's redundant
  if (showLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="textSecondary">
          {loadingMessage}
        </Typography>
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
            overflow: 'auto',
          }}
        >
          <Box sx={{ my: 8, width: '100%', maxWidth: 'sm' }}>
            {/* Logo */}
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Logo"
                width={150}
                height={130}
                priority
              />
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                mt: 1,
                fontWeight: 600,
                color: '#1976d2' // matches your primary color
              }}
            >
              Sign In
            </Typography>
          </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
              {error === 'EMAIL_NOT_VERIFIED' && (
                <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
                  Email not verified. Please check your inbox.
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={handleResendVerification}
                    sx={{ ml: 1 }}
                  >
                    Resend Verification
                  </Button>
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
                {credentialsLoginMutation.isPending ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </form>

            {/* Links */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
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
                  background: '#fff',
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
