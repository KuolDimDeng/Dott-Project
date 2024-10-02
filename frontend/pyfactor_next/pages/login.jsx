'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
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

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        Pyfactor LLC
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

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

  const handleClickShowPassword = () => setIsPasswordShown((show) => !show);

  const onSubmit = async (data) => {
    try {
      logger.info('Sending login request', { email: data.email });
      const response = await axiosInstance.post('/api/token/', data);
      logger.info('Received response from server', { status: response.status });
      
      if (response.status === 200 && response.data.access) {
        const token = response.data.access;
        localStorage.setItem('token', token);
        if (response.data.refresh) {
          localStorage.setItem('refreshToken', response.data.refresh);
        }
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        router.push('/dashboard');
      } else {
        setErrorState({ message: 'Invalid response from server' });
        logger.warn('Invalid response from server', { status: response.status });
      }
    } catch (error) {
      setErrorState({ message: 'Failed to login. Please check your credentials.' });
      logger.error('Error during login', { error: error.message });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
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
            backgroundColor: '#e3f2fd', // Light blue background
            p: 4, // Add padding to the container
          }}
        >
          <Box
            sx={{
              width: '100%',
              mb: 4, // Margin bottom to separate text from image
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: "bold", color: 'black', mb: 2 }}>
              Get Paid Effortlessly
            </Typography>
      
            <ul style={{ listStyleType: 'none', padding: 0, color: "black"}}>
              <li>✅ <strong>Create professional invoices</strong> with ease.</li>
              <li>✅ <strong>Get paid quickly</strong>: Accept credit cards, mobile money, bank transfers, or Apple Pay.</li>
              <li>✅ <strong>Faster payouts</strong> – receive payments within 1-2 business days.</li>
         
            </ul>
       
          </Box>
          <Box
            sx={{
              width: '80%',
              height: '50%', // Reduced height to accommodate the text
              position: 'relative',
            }}
          >
            <Image
              src="/static/images/Payment-With-Card-2--Streamline-Brooklyn.png"
              alt="Productive workspace"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>
        </Grid>
        {/* Right side - Sign In Form */}
        <Grid item xs={12} sm={8} md={6} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Pyfactor Logo at the Top */}
            <Box sx={{ mb: 2 }}>
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={50}
                priority
              />
            </Box>
           
            <Typography component="h1" variant="h5" sx={{ color: 'primary.main' }}>
              Sign in
            </Typography>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
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
                    name="email"
                    autoComplete="email"
                    autoFocus
                    variant="filled"
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      errorState && setErrorState(null);
                    }}
                    error={!!errors.email || !!errorState}
                    helperText={errors?.email?.message || errorState?.message}
                    InputLabelProps={{
                      sx: {
                        color: 'black',
                        '&.Mui-focused': {
                          color: 'black',
                        },
                      },
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#e6f3ff', // Very light blue
                        '&:hover': {
                          backgroundColor: '#d9edff', // Slightly darker on hover
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#e6f3ff',
                        },
                        '&:before, &:after': {
                          borderBottom: 'none', // Remove the default underline
                        },
                        '& input': {
                          borderRadius: '12px', // Round the corners of the input itself
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                rules={{ required: true }}
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
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      errorState && setErrorState(null);
                    }}
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
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputLabelProps={{
                      sx: {
                        color: 'black',
                        '&.Mui-focused': {
                          color: 'black',
                        },
                      },
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#e6f3ff', // Very light blue
                        '&:hover': {
                          backgroundColor: '#d9edff', // Slightly darker on hover
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#e6f3ff',
                        },
                        '&:before, &:after': {
                          borderBottom: 'none', // Remove the default underline
                        },
                        '& input': {
                          borderRadius: '12px', // Round the corners of the input itself
                        },
                      },
                    }}
                  />
                )}
              />
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Remember me"
                sx={{
                  color: 'text.primary',
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Sign In
              </Button>
              <Grid container>
                <Grid item xs>
                  <Link href="/forgot-password" passHref>
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
                      Forgot password?
                    </Typography>
                  </Link>
                </Grid>
                <Grid item>
                  <Link href="/register" passHref>
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
                      {"Don't have an account? Register here"}
                    </Typography>
                  </Link>
                </Grid>
              </Grid>
              <Typography
                variant="body2"
                align="center"
                sx={{
                  mt: 2,
                  color: 'text.secondary',
                }}
              >
                Having trouble signing in? Contact{' '}
                <Link href="/support" passHref>
                  <Typography component="span" sx={{ textDecoration: 'underline', color: 'primary.main' }}>
                    customer support
                  </Typography>
                </Link>
              </Typography>
              <Typography
                variant="body2"
                align="center"
                sx={{
                  mt: 2,
                  color: 'text.secondary',
                }}
              >
                By continuing, you are indicating that you have read and agree to the{' '}
                <Link href="/terms-of-use" passHref>
                  <Typography component="span" sx={{ textDecoration: 'underline', color: 'primary.main' }}>
                    Terms of Use
                  </Typography>
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" passHref>
                  <Typography component="span" sx={{ textDecoration: 'underline', color: 'primary.main' }}>
                    Privacy Policy
                  </Typography>
                </Link>
                .
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};