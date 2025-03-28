'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import ConfigureAmplify from '@/components/ConfigureAmplify';
import NextLink from 'next/link';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Container, Paper, Divider } from '@/components/ui/TailwindComponents';

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
      
      // Add a timeout to prevent UI from getting stuck indefinitely
      const signUpPromise = signUp({
        email: formData.email,
        username: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      // Create a timeout promise that rejects after 15 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Sign up request timed out. Please try again.'));
        }, 15000); // 15 seconds timeout
      });
      
      // Race the signUp promise against the timeout
      const result = await Promise.race([signUpPromise, timeoutPromise]);
      
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
        
        // Set a flag to indicate that a verification code was sent during signup
        try {
          localStorage.setItem('signupCodeSent', 'true');
          localStorage.setItem('signupCodeTimestamp', Date.now().toString());
          logger.debug('[SignUp] Set verification code flags in localStorage');
        } catch (e) {
          logger.error('[SignUp] Error setting verification code flags:', e.message);
        }
        
        // Delay to show success message
        setTimeout(() => {
          // Use string URL format which is more reliable
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
        }, REDIRECT_DELAY);
      } else {
        // Handle error
        if (result.code === 'UsernameExistsException') {
          setError('An account with this email already exists. Please sign in or reset your password.');
        } else {
          setError(result.error || 'Failed to create account. Please try again.');
        }
        setIsRedirecting(false);
      }
    } catch (error) {
      logger.error('[SignUp] Error during sign-up:', { error: error.message, stack: error.stack });
      setError(error.message || 'An unexpected error occurred. Please try again.');
      setIsRedirecting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box className="min-h-screen py-12 flex flex-col justify-center">
        <ConfigureAmplify />
        
        <div className="text-center mb-8">
          <Typography variant="h4" component="h1" className="mb-2">
            Create your account
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Start your business journey with us
          </Typography>
        </div>
        
        <Paper className="p-8 rounded-lg">
          {isRedirecting && success ? (
            <div className="text-center py-6">
              <CircularProgress size="large" className="mb-4" />
              <Typography variant="body1" className="text-green-600">
                {success}
              </Typography>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              
              <div className="flex flex-col md:flex-row gap-4">
                <TextField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
                
                <TextField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </div>
              
              <TextField
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                fullWidth
              />
              
              <TextField
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                fullWidth
                helperText="At least 8 characters with uppercase, lowercase, number and special character"
              />
              
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                fullWidth
              />
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting || authLoading}
                className="py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <CircularProgress size="small" className="mr-2" />
                    <span>Creating Account...</span>
                  </div>
                ) : 'Create Account'}
              </Button>
              
              {/* Add debug info in development only */}
              {process.env.NODE_ENV === 'development' && isSubmitting && (
                <Typography variant="caption" className="text-gray-500 mt-2 text-center block">
                  Processing... Please wait.
                </Typography>
              )}

              <Divider className="my-6" />
              
              <div className="text-center">
                <Typography variant="body2" className="mb-2">
                  Already have an account?{' '}
                  <NextLink href="/auth/signin" className="text-primary-main hover:underline">
                    Sign in
                  </NextLink>
                </Typography>
                
                <Typography variant="body2">
                  Need to verify your email?{' '}
                  <NextLink href="/auth/verify-email" className="text-primary-main hover:underline">
                    Enter verification code
                  </NextLink>
                </Typography>
              </div>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
}