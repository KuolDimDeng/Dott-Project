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
      // First, check if the email already exists
      logger.debug('Checking if email already exists:', { email: formData.email });
      
      // Email check in separate try-catch to handle specific errors
      try {
        const emailCheckResponse = await fetch('/api/auth/check-existing-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });
        
        logger.debug('Email check response status:', { 
          status: emailCheckResponse.status,
          ok: emailCheckResponse.ok
        });
        
        if (!emailCheckResponse.ok) {
          if (emailCheckResponse.status === 401) {
            logger.error('Email check failed - authentication required:', { 
              status: emailCheckResponse.status 
            });
            throw new Error('Email verification service requires authentication. Please try again later.');
          } else {
            logger.error('Email check failed with status:', { 
              status: emailCheckResponse.status 
            });
            throw new Error(`Failed to check email (status ${emailCheckResponse.status}). Please try again.`);
          }
        }
        
        const emailCheckResult = await emailCheckResponse.json();
        
        logger.debug('Email check result:', emailCheckResult);
        
        if (emailCheckResult.exists) {
          // Email already exists - inform user and redirect to sign in
          setError('An account with this email already exists. Redirecting to sign in page...');
          setTimeout(() => {
            router.push('/auth/signin?email=' + encodeURIComponent(formData.email));
          }, 3000);
          return;
        }
      } catch (emailCheckError) {
        logger.error('Error checking email:', { 
          error: emailCheckError.message,
          stack: emailCheckError.stack
        });
        setError(emailCheckError.message || 'Failed to check if email exists. Please try again.');
        return;
      }
      
      // Email doesn't exist, proceed with sign up
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
      
      // Store the email in localStorage to remember it was registered
      try {
        if (typeof window !== 'undefined') {
          const storedEmails = localStorage.getItem('existingEmails') || '[]';
          const emailsList = JSON.parse(storedEmails);
          
          if (!emailsList.includes(formData.email.toLowerCase())) {
            emailsList.push(formData.email.toLowerCase());
            localStorage.setItem('existingEmails', JSON.stringify(emailsList));
            logger.debug('Added email to local storage:', { email: formData.email });
          }
        }
      } catch (e) {
        logger.error('Error storing email in localStorage:', { error: e.message });
        // Continue with signup even if local storage fails
      }

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
        setSuccess('Account created successfully! Redirecting to email verification page...');
        
        // Use string URL format which is more reliable
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
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
