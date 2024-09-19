// src/app/login/page.js
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { Controller, useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { object, minLength, string, email } from 'valibot';
import { logger } from '@/utils/logger';
import axiosInstance from '@/app/dashboard/components/axiosConfig';

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
        PyFactor
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
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container component="main" maxWidth="xs" sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
          <CssBaseline />
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: 3,
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
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
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      errorState && setErrorState(null);
                    }}
                    error={!!errors.email || !!errorState}
                    helperText={errors?.email?.message || errorState?.message}
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
                  />
                )}
              />
              <FormControlLabel
                control={<Checkbox value="remember" color="primary" />}
                label="Remember me"
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
                    <Typography variant="body2" sx={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      Forgot password?
                    </Typography>
                  </Link>
                </Grid>
                <Grid item>
                  <Link href="/register" passHref>
                    <Typography variant="body2" sx={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      {"Don't have an account? Register here"}
                    </Typography>
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
          <Copyright sx={{ mt: 8, mb: 4 }} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}