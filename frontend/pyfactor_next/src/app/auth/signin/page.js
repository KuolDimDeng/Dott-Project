////Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/signin/page.js

'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextField, Grid, Box, Paper, Typography, InputAdornment, IconButton, CircularProgress} from '@mui/material';
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
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';
import Link from 'next/link';


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
  const { checkOnboardingStatus } = useOnboarding(); // Get checkOnboardingStatus from context

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
    const handleRedirect = async () => {
      if (status === 'authenticated') {
        console.log('Checking onboarding status');
        await checkOnboardingStatus(); // Check onboarding status when authenticated
      }
    };
    
    handleRedirect();
  }, [status, checkOnboardingStatus]); // Add checkOnboardingStatus as a dependency

  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const onSubmit = async (data) => {
    console.log('Form submitted:', data);
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
    console.log(`Initiating ${provider} login`);
    try {
      const result = await signIn(provider, { callbackUrl: '/dashboard' });
      console.log(`Login successful with ${provider}`);
      
      if (result?.error) {
        console.error(`Error during ${provider} login:`, result.error);
        setErrorState(`${provider} login failed. ${result.error}`);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error(`Error during ${provider} login:`, error);
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

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1, mb: 2 }}>
                        <Link href="/auth/signup" passhref>
                          <Typography variant="body2" component="span" sx={{ cursor: 'pointer', color: 'primary.main' }}>
                            Sign up with Email
                          </Typography>
                        </Link>
                        <Link href="/auth/forgot-password" passhref>
                          <Typography variant="body2" component="span" sx={{ cursor: 'pointer', color: 'primary.main' }}>
                            Forgot Password?
                          </Typography>
                        </Link>
                      </Box>

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