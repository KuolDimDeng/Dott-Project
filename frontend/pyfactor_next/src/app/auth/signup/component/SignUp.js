'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import { signIn } from '@/config/amplifyUnified';

export default function SignUp() {
  const { signUp, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength (Cognito default requirements)
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        throw new Error(
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        );
      }

      // Validate name fields according to Cognito constraints (1-256 chars)
      if (!formData.firstName || formData.firstName.length > 256) {
        throw new Error('First name must be between 1 and 256 characters');
      }
      if (!formData.lastName || formData.lastName.length > 256) {
        throw new Error('Last name must be between 1 and 256 characters');
      }

      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      const { getDefaultAttributes } = await import('@/utils/userAttributes');
      const timestamp = new Date().toISOString();
      
      // Get default attributes and merge with custom ones
      const initialAttributes = {
        ...getDefaultAttributes(),
        'custom:firstname': formData.firstName,
        'custom:lastname': formData.lastName,
        'custom:onboarding': 'NOT_STARTED',
        'custom:userrole': 'OWNER',
        'custom:acctstatus': 'PENDING',
        'custom:created_at': timestamp,
        'custom:updated_at': timestamp,
        'custom:lastlogin': timestamp,
        'custom:subplan': 'FREE',
        'custom:subscriptioninterval': 'MONTHLY',
        'custom:attrversion': '1.0.0',
        'custom:setupdone': 'FALSE',
        'custom:payverified': 'FALSE',
        
      };

      logger.debug('Signing up with attributes:', {
        ...initialAttributes,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        // Don't log the password
      });
      
      logger.debug('Calling signUp function with user data');
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      logger.debug('SignUp function returned result:', {
        success: result.success,
        hasError: !!result.error,
        errorMessage: result.error,
        errorCode: result.code
      });

      if (result.success) {
        // Always redirect to verify-email after signup
        setError('');
        setSuccess('Account created successfully! Check your email for verification code. You will be redirected to the verification page in 10 seconds...');
        setTimeout(() => {
          router.push('/auth/verify-email?email=' + encodeURIComponent(formData.email));
        }, 10000); // Increased to 10 seconds to give user more time
      } else {
        throw new Error(result.error || 'Failed to sign up');
      }
    } catch (error) {
      logger.error('Sign up error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      // Display a more user-friendly error message
      if (error.code) {
        logger.debug('Sign up error code:', error.code);
      }
      
      // Check for specific error types
      let errorMessage = 'Failed to sign up. Please try again or contact support if the problem persists.';
      
      if (error.code === 'UsernameExistsException' || error.message?.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please try signing in instead.';
      } else if (error.code === 'InvalidParameterException' && error.message?.includes('password')) {
        errorMessage = 'Password does not meet requirements. Please ensure it has at least 8 characters including uppercase, lowercase, numbers, and special characters.';
      } else if (error.code === 'InvalidParameterException') {
        errorMessage = 'One or more fields contain invalid values. Please check your information and try again.';
      } else if (error.code === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.message?.includes('network') || error.code === 'NetworkError') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        // Use the original error message if available
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Log the user-friendly error message
      logger.debug('Displaying error to user:', errorMessage);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Sign Up
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="firstName"
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isLoading}
            inputProps={{
              maxLength: 256,
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="lastName"
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isLoading}
            inputProps={{
              maxLength: 256,
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>

          <Box sx={{ mt: 2 }}>
            <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="primary" align="center">
                Already have an account? Sign In
              </Typography>
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
