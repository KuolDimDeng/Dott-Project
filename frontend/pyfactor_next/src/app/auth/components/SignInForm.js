'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Button, TextField, Typography, Link, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession';

const REDIRECT_DELAY = 2000; // Increased delay to ensure session is properly established

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isLoading: isAuthLoading } = useAuth();
  const { refreshSession, isAuthenticated } = useSession();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const maxSessionAttempts = 3;

  useEffect(() => {
    logger.debug('[SignInForm] Component mounted', {
      hasCallbackUrl: !!searchParams.get('callbackUrl'),
      callbackUrl: searchParams.get('callbackUrl'),
      isAuthenticated
    });

    return () => {
      logger.debug('[SignInForm] Component unmounting');
    };
  }, [searchParams, isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    logger.debug('[SignInForm] Form field updated:', { 
      field: name,
      length: value.length,
      isEmpty: value.length === 0
    });

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      logger.debug('[SignInForm] Clearing previous error');
      setError('');
    }
  };

  const verifySession = async (maxAttempts = 3, delay = 500) => {
    logger.debug('[SignInForm] Verifying session establishment:', {
      attempt: sessionAttempts + 1,
      maxAttempts,
      delay
    });

    if (sessionAttempts >= maxAttempts) {
      throw new Error('Failed to establish session after multiple attempts');
    }

    // Wait for delay before checking
    await new Promise(resolve => setTimeout(resolve, delay));

    // Attempt to refresh session
    const refreshResult = await refreshSession();
    if (!refreshResult) {
      setSessionAttempts(prev => prev + 1);
      return verifySession(maxAttempts, delay * 2);
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsRedirecting(false);
    setSessionAttempts(0);

    logger.debug('[SignInForm] Form submission started:', { 
      username: formData.username,
      hasPassword: !!formData.password,
      formComplete: !!(formData.username && formData.password)
    });

    try {
      // Validate form data
      if (!formData.username || !formData.password) {
        const missingFields = [];
        if (!formData.username) missingFields.push('username');
        if (!formData.password) missingFields.push('password');
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      logger.debug('[SignInForm] Starting sign in process');

      // Attempt sign in
      const signInResult = await signIn(formData.username, formData.password);

      if (!signInResult.success) {
        if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          logger.debug('[SignInForm] User needs to confirm signup, redirecting to verification');
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
          return;
        }
        throw new Error(signInResult.error || 'Sign in failed');
      }

      logger.debug('[SignInForm] Sign in successful, verifying session establishment');

      // Verify session is properly established
      await verifySession(maxSessionAttempts);

      logger.debug('[SignInForm] Session verified successfully, preparing redirect');

      setIsRedirecting(true);

      // Additional delay to ensure all auth processes complete
      await new Promise(resolve => setTimeout(resolve, REDIRECT_DELAY));

      // Get callback URL or default to onboarding
      const callbackUrl = searchParams.get('callbackUrl') || '/onboarding/business-info';
      
      logger.debug('[SignInForm] Redirecting to:', {
        callbackUrl,
        isOnboarding: callbackUrl.startsWith('/onboarding/')
      });

      // Use router.push for client-side navigation
      router.push(callbackUrl);

    } catch (error) {
      logger.error('[SignInForm] Sign in error:', {
        error: error.message,
        username: formData.username,
        code: error.code,
        stack: error.stack,
        sessionAttempts,
        formState: {
          hasUsername: !!formData.username,
          hasPassword: !!formData.password
        }
      });
      setError(error.message);
      setIsRedirecting(false);
    }
  };

  const isLoading = isAuthLoading || isRedirecting;

  logger.debug('[SignInForm] Render state:', {
    isLoading,
    isAuthLoading,
    isRedirecting,
    hasError: !!error,
    hasUsername: !!formData.username,
    hasPassword: !!formData.password,
    hasCallbackUrl: !!searchParams.get('callbackUrl'),
    sessionAttempts,
    isAuthenticated
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 400,
        mx: 'auto',
        p: 3,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Sign In
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        required
        fullWidth
        id="username"
        name="username"
        label="Email"
        type="email"
        autoComplete="email"
        value={formData.username}
        onChange={handleChange}
        disabled={isLoading}
        autoFocus
      />

      <TextField
        required
        fullWidth
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={formData.password}
        onChange={handleChange}
        disabled={isLoading}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={isLoading}
        sx={{ mt: 2, minHeight: 42 }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} color="inherit" />
            {isRedirecting ? 'Redirecting...' : 'Signing in...'}
          </Box>
        ) : (
          'Sign In'
        )}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link
          href="/auth/forgot-password"
          variant="body2"
          sx={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          Forgot password?
        </Link>
      </Box>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Don&apos;t have an account?{' '}
          <Link 
            href="/auth/signup" 
            variant="body2" 
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Sign up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}