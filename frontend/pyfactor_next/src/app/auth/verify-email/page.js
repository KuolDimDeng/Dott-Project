'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Container,
  Link,
} from '@mui/material';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

export default function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp, resendVerificationCode, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [initialCodeSent, setInitialCodeSent] = useState(false);

  const handleResendCode = useCallback(async () => {
    if (!email) {
      setError('Please provide your email address');
      return;
    }

    setError('');
    setSuccess('');
    setResendDisabled(true);
    setCountdown(30); // Reduced from 60 to 30 seconds

    try {
      logger.debug('Resending verification code to:', email);
      await resendVerificationCode(email);
      setSuccess('A new verification code has been sent to your email');
      logger.debug('Verification code resent successfully');
    } catch (error) {
      logger.error('Failed to resend verification code:', error);
      setError(error.message || 'Failed to resend verification code');
      setResendDisabled(false);
      setCountdown(0);
    }
  }, [email, resendVerificationCode]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      
      if (!initialCodeSent && !resendDisabled && !countdown) {
        handleResendCode();
        setInitialCodeSent(true);
      }
    } else {
      // If no email parameter, log for debugging
      logger.debug('No email parameter in URL, user will need to enter email manually');
    }
  }, [searchParams, resendDisabled, countdown, handleResendCode, initialCodeSent]);

  useEffect(() => {
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
    setSuccess('');

    if (!email || !code) {
      setError('Please provide both email and verification code');
      return;
    }

    try {
      logger.debug('Attempting to verify email:', email);
      await confirmSignUp(email, code);
      setSuccess('Email verified successfully! You will be redirected to sign in in 5 seconds...');
      logger.debug('Email verification successful');
      setTimeout(() => router.push('/auth/signin'), 5000); // Increased from 2 to 5 seconds
    } catch (error) {
      logger.error('Email verification failed:', error);
      setError(error.message || 'Failed to verify email');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box sx={{ mb: 4, width: '200px', height: '60px', position: 'relative' }}>
            <Image
              src="/static/images/Pyfactor.png"
              alt="PyFactor Logo"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>

          <Typography component="h1" variant="h5" gutterBottom>
            Verify Your Email
          </Typography>

          {email ? (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
              We've sent a verification code to:<br />
              <strong>{email}</strong>
            </Typography>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Please enter the email address you used to sign up and the verification code you received.
              <br />
              <strong>If you were redirected here from sign-in, you may need to check your email for the verification code.</strong>
            </Typography>
          )}

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
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || !!searchParams.get('email')}
              placeholder="Enter the email you signed up with"
              helperText={!searchParams.get('email') ? "Enter the email address you used to sign up" : ""}
              autoFocus={!searchParams.get('email')}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="code"
              label="Verification Code"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              disabled={isLoading}
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
                inputMode: 'numeric',
              }}
              helperText="Enter the 6-digit code from your email"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading || !email || !code}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Verify Email'}
            </Button>

            <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Didn't receive the verification code?
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                1. Check your spam/junk folder
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                2. Make sure the email address above is correct
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                3. Click the button below to request a new code
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={handleResendCode}
                disabled={resendDisabled || isLoading || !email}
                sx={{ mt: 2 }}
              >
                {countdown > 0
                  ? `Resend Code (${countdown}s)`
                  : 'Resend Verification Code'}
              </Button>
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Need to use a different email?{' '}
                <Link
                  href="/auth/signin"
                  sx={{ cursor: 'pointer' }}
                  underline="hover"
                >
                  Return to sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}