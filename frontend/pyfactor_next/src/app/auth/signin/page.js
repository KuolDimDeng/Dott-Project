'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Container
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { GoogleLoginButton, AppleLoginButton } from 'react-social-login-buttons';
import { signIn, useSession } from "next-auth/react";
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
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
      defaultProps: {
        variant: 'filled',
      },
    },
  },
});

// Form validation schema
const schema = object({
  email: string([
    minLength(1, 'Email is required'),
    email('Please enter a valid email address')
  ]),
  password: string([
    minLength(1, 'Password is required'),
    minLength(5, 'Password must be at least 5 characters long'),
  ]),
});

export default function SignIn() {
  // State management
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Hooks
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Authentication state handling
  useEffect(() => {
    const handleAuthState = async () => {
      if (status === 'authenticated' && session?.user) {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get('/api/onboarding/status/', {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`
            }
          });
          
          const status = response.data?.onboarding_status;
          router.push(status === 'complete' ? '/dashboard' : `/onboarding/${status || 'step1'}`);
        } catch (err) {
          logger.error('Error checking onboarding status:', err);
          router.push('/onboarding/step1');
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleAuthState();
  }, [status, session, router]);

  // Mutations
  const credentialsLoginMutation = useMutation({
    mutationFn: async (credentials) => {
      logger.info('Initiating credentials login');
      const result = await signIn('credentials', {
        redirect: false,
        ...credentials
      });
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['session']);
      setError(null);
      reset();
    },
    onError: (error) => {
      logger.error('Credentials login failed:', error);
      setError(error.message || 'Login failed. Please try again.');
    }
  });

  // Event handlers
  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const onSubmit = async (data) => {
    try {
      setError(null);
      await credentialsLoginMutation.mutateAsync(data);
    } catch (err) {
      logger.error('Form submission failed:', err);
      setError(err.message || 'An error occurred during login.');
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      setError(null);
      setIsLoading(true);
      await signIn(provider, {
        callbackUrl: '/onboarding/step1',
        redirect: true
      });
    } catch (err) {
      logger.error(`${provider} login failed:`, err);
      setError(`${provider} login failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Main render
  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        {/* Left side - Marketing content */}
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
              style={{ objectFit: 'contain' }}
              onError={(e) => {
                logger.error('Image failed to load:', e);
                e.target.src = '/static/images/fallback.png';
              }}
            />
          </Box>
        </Grid>

        {/* Right side - Login form */}
        <Grid 
          item 
          xs={12} 
          sm={8} 
          md={6} 
          component={Paper} 
          elevation={6} 
          square 
          sx={{ 
            height: '100vh', 
            overflow: 'auto',
            backgroundColor: 'background.paper' 
          }}
        >
          <Container maxWidth="sm">
            <Box
              sx={{
                my: 8,
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
                  style={{ objectFit: 'contain' }}
                  onError={(e) => {
                    logger.error('Logo failed to load:', e);
                    e.target.src = '/static/images/fallback-logo.png';
                  }}
                />
              </Box>

              <Typography component="h1" variant="h5" sx={{ color: 'primary.main', mb: 3 }}>
                Sign in
              </Typography>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 2, 
                    mb: 2, 
                    width: '100%' 
                  }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <Box 
                component="form" 
                onSubmit={handleSubmit(onSubmit)} 
                noValidate 
                sx={{ 
                  width: '100%',
                  mt: 1 
                }}
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
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type={isPasswordShown ? 'text' : 'password'}
                      id="password"
                      autoComplete="current-password"
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
                      disabled={credentialsLoginMutation.isPending}
                    />
                  )}
                />

                <Button 
                  type="submit" 
                  fullWidth 
                  variant="contained" 
                  disabled={credentialsLoginMutation.isPending}
                  sx={{ 
                    mt: 3, 
                    mb: 2,
                    height: 48
                  }}
                >
                  {credentialsLoginMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  width: '100%', 
                  mt: 1, 
                  mb: 2 
                }}>
                  <Link href="/auth/signup" passHref>
                    <Typography 
                      variant="body2" 
                      component="span" 
                      sx={{ 
                        cursor: 'pointer', 
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      Sign up with Email
                    </Typography>
                  </Link>
                  <Link href="/auth/forgot-password" passHref>
                    <Typography 
                      variant="body2" 
                      component="span" 
                      sx={{ 
                        cursor: 'pointer', 
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      Forgot Password?
                    </Typography>
                  </Link>
                </Box>

                <Box sx={{ mt: 3 }}>
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
          </Container>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}