import appCache from '../utils/appCache';

'use client';

import React, { useState, useEffect } from 'react';
import { appCache } from '../utils/appCache';
import { useRouter, useSearchParams } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { useAuth } from '@/hooks/auth';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';
import ConfigureAmplify from '@/components/ConfigureAmplify';
import NextLink from 'next/link';
import { appCache } from '../utils/appCache';
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
    businessName: '',
    businessType: 'Other',
    country: 'US',
    legalStructure: 'Sole Proprietorship',
    acceptTerms: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug logs for button state
  useEffect(() => {
    logger.debug('[SignUp] Button state:', {
      isSubmitting,
      authLoading,
      isButtonDisabled: isSubmitting || authLoading,
      error: !!error
    });
  }, [isSubmitting, authLoading, error]);

  // Safety mechanism to ensure form doesn't get stuck in submitting state
  useEffect(() => {
    if (isSubmitting) {
      // Auto-reset submission state after 10 seconds if stuck
      const timeout = setTimeout(() => {
        if (isSubmitting) {
          logger.debug('[SignUp] Auto-resetting submission state after timeout');
          setIsSubmitting(false);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [isSubmitting]);

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
    
    // Reset any stuck loading states on mount
    setIsSubmitting(false);

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
      // Debug validation
      logger.debug('[SignUp] Validating form:', {
        passwordMatch: formData.password === formData.confirmPassword,
        passwordLength: formData.password?.length || 0,
        hasFirstName: !!formData.firstName,
        hasLastName: !!formData.lastName,
        hasEmail: !!formData.email
      });
    
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
      logger.debug('[SignUp] Form validation failed:', { error: error.message });
      return false;
    }
  };

  const checkExistingEmail = async (email) => {
    try {
      logger.debug('[SignUp] Checking if email already exists:', { email });
      
      // Make the API call to check if the email exists
      const response = await fetch('/api/auth/check-existing-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      logger.debug('[SignUp] Email check response status:', { 
        status: response.status, 
        ok: response.ok 
      });
      
      // If the request was not successful
      if (!response.ok) {
        logger.debug('[SignUp] Email check failed with status:', { status: response.status });
        
        // For server errors, default to continuing with signup
        // This is better than blocking user registration due to a check failure
        if (response.status >= 500) {
          return { exists: false };
        }
        
        throw new Error(`Failed to check email (status ${response.status}). Please try again.`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      logger.debug('[SignUp] Email check result:', data);
      
      // Return the result, with a fallback to false if the API doesn't provide a clear answer
      return { exists: data.exists === true };
    } catch (error) {
      logger.error('[SignUp] Error checking email:', {
        error: error.message,
        stack: error.stack,
      });
      
      // In case of any error, allow the registration to proceed
      // The backend will validate the email uniqueness during signup anyway
      return { exists: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      logger.debug('[SignUp] Submission already in progress, ignoring duplicate submit');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    logger.debug('[SignUp] Form submission started:', {
      email: formData.email,
      hasPassword: !!formData.password,
      formComplete: !!formData.email && !!formData.password && !!formData.firstName && !!formData.lastName
    });

    try {
      logger.debug('[SignUp] Submitting sign-up data');
      setIsSubmitting(true);
      
      // Validate form fields
      if (!validateForm()) {
        logger.debug('[SignUp] Form validation failed, aborting submission');
        setIsSubmitting(false);
        return;
      }
      
      // Check if email already exists
      let emailExists = false;
      try {
        const emailCheckResult = await checkExistingEmail(formData.email);
        emailExists = emailCheckResult.exists;
      } catch (emailCheckError) {
        // Log the error but continue with signup
        logger.debug('[SignUp] Error during email check, continuing with signup:', { 
          error: emailCheckError.message 
        });
        // We'll let Cognito handle any duplicate email errors
      }
      
      // If email exists, show a specific error message
      if (emailExists) {
        setError('This email is already registered. Please sign in instead.');
        setIsSubmitting(false);
        return;
      }
      
      // Proceed with signup using the auth context
      const signUpData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.businessName,
        businessType: formData.businessType,
        country: formData.country,
        legalStructure: formData.legalStructure
      };
      
      logger.debug('[SignUp] Proceeding with signup for:', { 
        email: signUpData.email, 
        hasName: !!signUpData.firstName 
      });
      
      // Call the sign-up method from useAuth
      const result = await signUp(signUpData);
      
      if (!result.success) {
        throw new Error(result.error || 'Sign up failed');
      }
      
      logger.debug('[SignUp] Signup successful, redirecting to verification page');
      
      // Set success message and indicate redirecting state
      setSuccess('Account created! Please check your email for a verification code.');
      setIsRedirecting(true);
      
      // Store information for verification page
      try {
        // Initialize app cache if needed
        if (typeof window !== 'undefined') {
          if (!appCache.getAll()) appCache.getAll() = {};
          if (!appCache.getAll().auth) appCache.getAll().auth = {};
          
          // Store verification data in app cache
          appCache.set('auth.signupCodeSent', true);
          appCache.set('auth.signupCodeTimestamp', Date.now());
          appCache.set('auth.signupEmail', formData.email);
          
          // Store in sessionStorage as fallback for older code
          try {
            sessionStorage.setItem('signupCodeSent', 'true');
            sessionStorage.setItem('signupCodeTimestamp', Date.now().toString());
            sessionStorage.setItem('signupEmail', formData.email);
          } catch (e) {
            // Ignore sessionStorage errors
          }
          
          // Log what we're storing
          logger.debug('[SignUp] Stored verification data:', {
            email: formData.email,
            appCache: {
              signupCodeSent: true,
              signupTimestamp: Date.now(),
              hasEmail: !!formData.email
            }
          });
        }
      } catch (e) {
        logger.error('[SignUp] Error storing verification data:', e);
        // Ignore storage errors
      }
      
      // Redirect to the verification page
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, REDIRECT_DELAY);
      
    } catch (error) {
      logger.error('[SignUp] Error during sign-up:', { 
        error: error.message, 
        stack: error.stack 
      });
      
      // Set appropriate error message
      if (error.message.includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.message.includes('password')) {
        setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character.');
      } else {
        setError(error.message || 'An error occurred during sign up. Please try again.');
      }
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
              
              {/* Button state debugging in dev mode */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mb-2">
                  Button state: {isSubmitting ? 'Submitting' : 'Ready'} | 
                  Auth: {authLoading ? 'Loading' : 'Ready'} | 
                  {isSubmitting || authLoading ? ' Disabled' : ' Enabled'}
                </div>
              )}
              
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
              
              {/* Add reset button in development only */}
              {process.env.NODE_ENV === 'development' && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsSubmitting(false);
                    setError('');
                    // Initialize app cache if it doesn't exist
                    if (typeof window !== 'undefined') {
                      if (!appCache.getAll()) appCache.getAll() = {};
                      if (!appCache.getAll().auth) appCache.getAll().auth = {};
                      // Remove loading state from app cache
                      delete appCache.get('auth.loadingState');
                      // For backward compatibility
                      sessionStorage.removeItem('auth_loading_state');
                    }
                    console.log('Form state reset');
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Reset Form State
                </button>
              )}
              
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
              
              {/* Developer Debug Panel */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                      Developer Debug Tools
                    </summary>
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setIsSubmitting(false);
                            setError('');
                            // Initialize app cache if it doesn't exist
                            if (typeof window !== 'undefined') {
                              if (!appCache.getAll()) appCache.getAll() = {};
                              if (!appCache.getAll().auth) appCache.getAll().auth = {};
                              // Remove loading state from app cache
                              delete appCache.get('auth.loadingState');
                              // For backward compatibility
                              sessionStorage.removeItem('auth_loading_state');
                            }
                            console.log('Form state reset');
                          }}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded"
                        >
                          Reset Form State
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            // Clear app cache
                            if (typeof window !== 'undefined') {
                              if (appCache.getAll() && appCache.getAll().auth) {
                                appCache.getAll().auth = {};
                              }
                              // Also clear sessionStorage for backward compatibility
                              sessionStorage.clear();
                            }
                            console.log('App cache and session storage cleared');
                          }}
                          className="px-2 py-1 bg-red-100 text-red-800 rounded"
                        >
                          Clear App Cache
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            // Fill with test data
                            setFormData({
                              email: 'test@example.com',
                              password: 'Test1234!',
                              confirmPassword: 'Test1234!',
                              firstName: 'Test',
                              lastName: 'Account',
                              businessName: 'Test Company',
                              businessType: 'Other',
                              country: 'US',
                              legalStructure: 'Sole Proprietorship',
                              acceptTerms: true
                            });
                            console.log('Form filled with test data');
                          }}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded"
                        >
                          Fill Test Data
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            window.location.href = '/auth/signin';
                          }}
                          className="px-2 py-1 bg-purple-100 text-purple-800 rounded"
                        >
                          Go to Sign In
                        </button>
                      </div>
                      <div className="text-gray-600 font-mono text-xs pt-2">
                        <p>Form state: {JSON.stringify({
                          email: formData.email?.length > 0,
                          password: formData.password?.length > 0,
                          confirmPassword: formData.confirmPassword?.length > 0,
                          firstName: formData.firstName?.length > 0,
                          lastName: formData.lastName?.length > 0,
                          isSubmitting,
                          authLoading,
                          hasError: !!error
                        })}</p>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
}