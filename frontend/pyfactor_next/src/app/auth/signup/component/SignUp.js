'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, TextField, Typography, Link, Alert, CircularProgress, Container, Paper, Divider } from '@mui/material';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import ConfigureAmplify from '@/components/ConfigureAmplify';

const REDIRECT_DELAY = 1500; // Delay before redirect after successful signup

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    logger.debug('[SignUp] Component mounted', {
      referrer: document.referrer,
      hasEmailParam: !!searchParams.get('email')
    });

    // Check for email parameter
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setFormData(prev => ({
        ...prev,
        email: emailParam
      }));
    }

    return () => {
      logger.debug('[SignUp] Component unmounting');
    };
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    logger.debug('[SignUp] Form field updated:', { 
      field: name,
      length: value.length,
      isEmpty: value.length === 0
    });

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      logger.debug('[SignUp] Clearing previous error');
      setError('');
    }
  };

  const validateForm = () => {
    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength (Cognito default requirements)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
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

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const checkExistingEmail = async (email) => {
    try {
      logger.debug('[SignUp] Checking if email already exists:', { email });
      
      const emailCheckResponse = await fetch('/api/auth/check-existing-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      logger.debug('[SignUp] Email check response status:', { 
        status: emailCheckResponse.status,
        ok: emailCheckResponse.ok
      });
      
      if (!emailCheckResponse.ok) {
        if (emailCheckResponse.status === 401) {
          logger.error('[SignUp] Email check failed - authentication required:', { 
            status: emailCheckResponse.status 
          });
          throw new Error('Email verification service requires authentication. Please try again later.');
        } else {
          logger.error('[SignUp] Email check failed with status:', { 
            status: emailCheckResponse.status 
          });
          throw new Error(`Failed to check email (status ${emailCheckResponse.status}). Please try again.`);
        }
      }
      
      const emailCheckResult = await emailCheckResponse.json();
      
      logger.debug('[SignUp] Email check result:', emailCheckResult);
      
      return emailCheckResult;
    } catch (error) {
      logger.error('[SignUp] Error checking email:', { 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsRedirecting(false);

    logger.debug('[SignUp] Form submission started:', {
      email: formData.email,
      hasPassword: !!formData.password,
      formComplete: !!(formData.email && formData.password && formData.firstName && formData.lastName && formData.confirmPassword)
    });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, check if the email already exists
      const emailCheckResult = await checkExistingEmail(formData.email);
      
      if (emailCheckResult.exists) {
        // Email already exists - inform user and redirect to sign in
        setError('An account with this email already exists. Redirecting to sign in page...');
        setTimeout(() => {
          router.push('/auth/signin?email=' + encodeURIComponent(formData.email));
        }, REDIRECT_DELAY);
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
            logger.debug('[SignUp] Added email to local storage:', { email: formData.email });
          }
        }
      } catch (e) {
        logger.error('[SignUp] Error storing email in localStorage:', { error: e.message });
        // Continue with signup even if local storage fails
      }

      logger.debug('[SignUp] Signing up with attributes:', {
        ...initialAttributes,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        // Don't log the password
      });
      
      logger.debug('[SignUp] Calling signUp function with user data');
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      logger.debug('[SignUp] SignUp function returned result:', {
        success: result.success,
        hasError: !!result.error,
        errorMessage: result.error,
        errorCode: result.code
      });

      if (result.success) {
        // Set success and redirecting state
        setError('');
        setSuccess('Account created successfully! Redirecting to email verification page...');
        setIsRedirecting(true);
        
        // Delay to show success message
        setTimeout(() => {
          // Use string URL format which is more reliable
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
        }, REDIRECT_DELAY);
      } else {
        throw new Error(result.error || 'Failed to sign up');
      }
    } catch (error) {
      logger.error('[SignUp] Sign up error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
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
      logger.debug('[SignUp] Displaying error to user:', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting || isRedirecting;

  return (
    <>
      <ConfigureAmplify />
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
            maxWidth: 500,
            mx: 'auto',
            p: 3,
            pt: 6,
            mb: 4
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create Your Account
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
            Join Dott and take control of your business operations
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoFocus
                  inputProps={{
                    maxLength: 256,
                  }}
                />

                <TextField
                  required
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isLoading}
                  inputProps={{
                    maxLength: 256,
                  }}
                />
              </Box>

              <TextField
                required
                fullWidth
                id="email"
                name="email"
                label="Email Address"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                sx={{ mb: 2 }}
              />

              <TextField
                required
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                sx={{ mb: 2 }}
              />

              <TextField
                required
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isLoading}
                sx={{ 
                  py: 1.5, 
                  fontSize: '1rem',
                  position: 'relative'
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={24} color="inherit" />
                    {isRedirecting ? 'Redirecting...' : 'Creating Account...'}
                  </Box>
                ) : (
                  'Create Account'
                )}
              </Button>
            </Box>
          </Paper>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" gutterBottom>
              Already have an account?
            </Typography>
            <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
              <Button 
                color="secondary" 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 1 }}
              >
                Sign In
              </Button>
            </Link>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              By creating an account, you agree to our{' '}
              <Link href="/terms" color="primary" underline="hover">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" color="primary" underline="hover">
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
}