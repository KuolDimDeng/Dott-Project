'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const { confirmSignUp, resendVerificationCode, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Get email from query params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    try {
      const { isSignUpComplete } = await confirmSignUp(email, code);
      logger.debug('Email verification successful');
      if (isSignUpComplete) {
        // After verification, redirect to sign in
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Email verification failed:', error);
      setError(error.message || 'Failed to verify email');
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResendDisabled(true);
    setCountdown(60); // 60 seconds cooldown

    try {
      await resendVerificationCode(email);
      logger.debug('Verification code resent successfully');
    } catch (error) {
      logger.error('Failed to resend verification code:', error);
      setError(error.message || 'Failed to resend verification code');
      setResendDisabled(false);
      setCountdown(0);
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
          Verify Your Email
        </Typography>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Please enter the verification code sent to your email address.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="code"
            label="Verification Code"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Verify Email'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={handleResendCode}
            disabled={resendDisabled || isLoading}
            sx={{ mb: 2 }}
          >
            {countdown > 0
              ? `Resend Code (${countdown}s)`
              : 'Resend Verification Code'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
