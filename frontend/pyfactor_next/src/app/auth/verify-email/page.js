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
  const [sendingCode, setSendingCode] = useState(false);

  const handleResendCode = useCallback(async () => {
    if (!email) {
      setError('Please provide your email address');
      return;
    }

    setError('');
    setSuccess('');
    setResendDisabled(true);
    setCountdown(30); // Start with 30 seconds cooldown
    setSendingCode(true);

    try {
      logger.debug('[VerifyEmail] Resending verification code to:', email);
      const result = await resendVerificationCode(email);
      
      if (result.success) {
        setSuccess('A new verification code has been sent to your email');
        logger.debug('[VerifyEmail] Verification code resent successfully');
      } else if (result.code === 'LimitExceededException') {
        logger.info('[VerifyEmail] Rate limit exceeded for verification code');
        setSuccess('You have recently requested a verification code. Please check your email inbox, including spam folder.');
        // Set a longer cooldown since we hit the rate limit
        setCountdown(120); // 2 minutes cooldown when rate limited
      } else {
        logger.error('[VerifyEmail] Failed to resend verification code:', result.error);
        setError(result.error || 'Failed to resend verification code');
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (error) {
      logger.error('[VerifyEmail] Unexpected error resending verification code:', error);
      setError('An unexpected error occurred. Please try again later.');
      setResendDisabled(false);
      setCountdown(0);
    } finally {
      setSendingCode(false);
    }
  }, [email, resendVerificationCode]);

  // Separate function for initial code sending
  const sendInitialCode = useCallback(async () => {
    if (!email) return;
    
    setError('');
    setSuccess('');
    setSendingCode(true);

    try {
      logger.debug('[VerifyEmail] Sending initial verification code to:', email);
      const result = await resendVerificationCode(email);
      
      if (result.success) {
        setSuccess('Verification code has been sent to your email');
        logger.debug('[VerifyEmail] Initial verification code sent successfully');
      } else if (result.code === 'LimitExceededException') {
        // For rate limiting, show a success message instead of an error
        logger.info('[VerifyEmail] Rate limit hit for initial verification code');
        setSuccess('Please check your email for the verification code or wait a few minutes before requesting another');
      } else if (result.error?.includes('already confirmed')) {
        logger.info('[VerifyEmail] User already confirmed:', email);
        router.push('/dashboard');
      } else {
        logger.error('[VerifyEmail] Error sending initial verification code:', result.error);
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      logger.error('[VerifyEmail] Unexpected error sending initial verification code:', error);
      setError('Failed to send verification code. Please try again later.');
    } finally {
      setSendingCode(false);
      setInitialCodeSent(true);
    }
  }, [email, resendVerificationCode, router]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      
      // Always send verification code when email parameter is present
      if (!initialCodeSent) {
        sendInitialCode();
      }
    } else {
      // If no email parameter, log for debugging
      logger.debug('[VerifyEmail] No email parameter in URL, user will need to enter email manually');
    }
  }, [searchParams, sendInitialCode, initialCodeSent]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!email || !code) {
      setError('Please provide both email and verification code');
      return;
    }

    setError('');
    setSuccess('');

    try {
      logger.debug('[VerifyEmail] Confirming sign up for:', email);
      await confirmSignUp(email, code);
      logger.debug('[VerifyEmail] Sign up confirmed successfully, redirecting to dashboard');
      setSuccess('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      logger.error('[VerifyEmail] Failed to confirm sign up:', error);
      setError(error.message || 'Failed to verify email. Please try again.');
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
            <>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: sendingCode ? 1 : 3 }}>
                We've sent a verification code to:
              </Typography>
              <Typography variant="body1" fontWeight="bold" align="center" sx={{ mb: sendingCode ? 1 : 3 }}>
                {email}
              </Typography>
              {sendingCode && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                    Sending verification code...
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 1 }}>
                Please enter the email address you used to sign up and the verification code you received.
              </Typography>
              <Typography variant="body1" fontWeight="bold" align="center" sx={{ mb: 3 }}>
                If you were redirected here from sign-in, you may need to check your email for the verification code.
              </Typography>
            </>
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

          <Box component="form" onSubmit={handleVerifyEmail} sx={{ width: '100%' }}>
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
              autoFocus={!!searchParams.get('email')}
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
              <Typography variant="body2" color="text.secondary" gutterBottom>
                1. Check your spam/junk folder
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                2. Make sure the email address above is correct
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                3. Click the button below to request a new code
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={handleResendCode}
                disabled={resendDisabled || isLoading || !email || sendingCode}
                sx={{ mt: 2 }}
              >
                {countdown > 0
                  ? `Resend Code (${countdown}s)`
                  : sendingCode ? <CircularProgress size={20} sx={{ mr: 1 }} /> : 'Resend Verification Code'}
              </Button>
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" component="div">
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