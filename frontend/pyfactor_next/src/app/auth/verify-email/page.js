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
} from '@/components/ui/TailwindComponents';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import ConfigureAmplify from '@/components/ConfigureAmplify';

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
  const [isResending, setIsResending] = useState(false);

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
        // Store the timestamp when the code was sent
        try {
          sessionStorage.setItem('verificationCodeSentAt', Date.now().toString());
        } catch (storageError) {
          logger.debug('[VerifyEmail] Error saving to session storage:', storageError);
        }
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
    
    // Check if a code was already sent via session storage
    try {
      const lastCodeSentTime = sessionStorage.getItem('verificationCodeSentAt');
      if (lastCodeSentTime) {
        const timeSinceLastCode = Date.now() - parseInt(lastCodeSentTime);
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeSinceLastCode < fiveMinutesInMs) {
          logger.debug('[VerifyEmail] Code was recently sent via session, using existing code');
          setSuccess('Please use the verification code already sent to your email');
          setInitialCodeSent(true);
          return;
        }
      }
    } catch (storageError) {
      logger.debug('[VerifyEmail] Error checking session storage:', storageError);
    }
    
    // If we get here, we need to send a new code
    setError('');
    setSuccess('');
    setSendingCode(true);

    try {
      logger.debug('[VerifyEmail] Sending verification code to:', email);
      const result = await resendVerificationCode(email);
      
      if (result.success) {
        const timestamp = Date.now().toString();
        setSuccess('Verification code has been sent to your email');
        logger.debug('[VerifyEmail] Verification code sent successfully');
        
        // Store the timestamp when the code was sent (in both session and local storage)
        try {
          sessionStorage.setItem('verificationCodeSentAt', timestamp);
        } catch (storageError) {
          logger.debug('[VerifyEmail] Error saving to session storage:', storageError);
        }
      } else if (result.code === 'LimitExceededException') {
        logger.info('[VerifyEmail] Rate limit hit for verification code');
        setSuccess('Please check your email for the verification code or wait a few minutes before requesting another');
      } else if (result.error?.includes('already confirmed')) {
        logger.info('[VerifyEmail] User already confirmed:', email);
        router.push('/dashboard');
      } else {
        logger.error('[VerifyEmail] Error sending verification code:', result.error);
        setError(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      logger.error('[VerifyEmail] Unexpected error sending verification code:', error);
      setError('Failed to send verification code. Please try again later.');
    } finally {
      setSendingCode(false);
      setInitialCodeSent(true);
    }
  }, [email, resendVerificationCode, router]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam && !initialCodeSent) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      
      // Check if we're coming directly from signup
      const signupCodeSent = localStorage.getItem('signupCodeSent');
      const signupCodeTimestamp = localStorage.getItem('signupCodeTimestamp');
      const now = Date.now();
      
      if (signupCodeSent === 'true' && signupCodeTimestamp) {
        const timeSinceSignup = now - parseInt(signupCodeTimestamp);
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeSinceSignup < fiveMinutesInMs) {
          // If we just came from signup (within 5 minutes), don't send another email
          logger.debug('[VerifyEmail] Recently signed up, using existing code');
          setSuccess('Please use the verification code sent during signup');
          setInitialCodeSent(true);
          return;
        }
      }
      
      // Only proceed with sending code if we didn't just come from signup
      sendInitialCode();
    } else if (!emailParam) {
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
    logger.debug('[VerifyEmail] Verify button clicked with:', {
      email: email, 
      codeLength: code?.length,
      isLoading: isLoading
    });
    
    if (!email || !code) {
      setError('Please provide both email and verification code');
      return;
    }

    setError('');
    setSuccess('');

    try {
      logger.debug('[VerifyEmail] Confirming sign up for:', email);
      logger.debug('[VerifyEmail] Using verification code:', code.length > 0 ? '(provided)' : '(empty)');
      
      // Add more specific logging and validation
      if (code.length < 6) {
        setError('Verification code should be 6 digits. Please check the code sent to your email.');
        return;
      }
      
      logger.debug('[VerifyEmail] About to call confirmSignUp with:', {
        email: email,
        codeLength: code?.length,
        code: code
      });
      
      // Attempt to confirm the sign up
      const result = await confirmSignUp(email, code);
      
      logger.debug('[VerifyEmail] Sign up confirmation result:', result);
      logger.debug('[VerifyEmail] Sign up confirmed successfully, redirecting to dashboard');
      
      setSuccess('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        logger.debug('[VerifyEmail] Redirecting to dashboard');
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      // Log specific error details
      logger.error('[VerifyEmail] Failed to confirm sign up:', {
        message: error.message,
        code: error.code,
        name: error.name,
        email: email,
        codeLength: code?.length
      });
      
      // Show specific error messages based on the error type
      if (error.code === 'CodeMismatchException') {
        setError('The verification code is incorrect. Please check the code and try again.');
      } else if (error.code === 'ExpiredCodeException') {
        setError('The verification code has expired. Please request a new code.');
      } else if (error.code === 'NotAuthorizedException') {
        setError('Your account has already been verified. You can now sign in.');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
      } else {
        setError(error.message || 'Failed to verify email. Please try again.');
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm" className="pt-8">
      <ConfigureAmplify />
      <Paper elevation={3} className="p-8 mt-8">
        <Box className="flex flex-col items-center">
          <Typography component="h1" variant="h5" className="text-center mb-4">
            Verify Your Email
          </Typography>
          
          <Typography variant="body1" className="text-center mb-4">
            Enter the verification code that was sent to your email
          </Typography>

          {email ? (
            <>
              <Typography variant="body1" className="text-gray-600 text-center mb-3">
                We've sent a verification code to:
              </Typography>
              <Typography variant="body1" className="font-bold text-center mb-3">
                {email}
              </Typography>
              {sendingCode && (
                <Box className="flex justify-center mb-2">
                  <CircularProgress size="small" />
                  <Typography variant="body2" component="span" className="ml-2">
                    Sending verification code...
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography variant="body1" className="text-gray-600 text-center mb-1">
                Please enter the email address you used to sign up and the verification code you received.
              </Typography>
              <Typography variant="body1" className="font-bold text-center mb-3">
                If you were redirected here from sign-in, you may need to check your email for the verification code.
              </Typography>
            </>
          )}

          {error && (
            <Alert severity="error" className="mb-4 w-full">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" className="mb-4 w-full">
              {success}
            </Alert>
          )}

          <Box 
            component="form" 
            onSubmit={(e) => {
              logger.debug('[VerifyEmail] Form submit event triggered');
              handleVerifyEmail(e);
            }} 
            className="w-full"
          >
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
              className="mt-6 mb-4 py-2"
              disabled={isLoading || !email || !code}
              onClick={(e) => {
                logger.debug('[VerifyEmail] Button clicked directly');
                if (!isLoading && email && code) {
                  handleVerifyEmail(e);
                }
              }}
            >
              {isLoading ? <CircularProgress size="small" /> : 'Verify Email'}
            </Button>

            <Box className="mt-6 mb-6 p-4 bg-gray-50 rounded">
              <Typography variant="subtitle1" className="font-bold mb-2">
                Didn't receive the verification code?
              </Typography>
              <Typography variant="body2" className="text-gray-600 mb-1">
                1. Check your spam/junk folder
              </Typography>
              <Typography variant="body2" className="text-gray-600 mb-1">
                2. Make sure the email address above is correct
              </Typography>
              <Typography variant="body2" className="text-gray-600 mb-3">
                3. Click the button below to request a new code
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={handleResendCode}
                disabled={resendDisabled || isLoading || !email || sendingCode}
                className="mt-4"
              >
                {countdown > 0
                  ? `Resend Code (${countdown}s)`
                  : sendingCode ? <CircularProgress size="small" className="mr-2" /> : 'Resend Verification Code'}
              </Button>
            </Box>

            <Box className="mt-4 text-center">
              <Typography variant="body2" className="text-gray-600">
                Need to use a different email?{' '}
                <Link
                  href="/auth/signin"
                  className="cursor-pointer hover:underline text-primary"
                >
                  Return to sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}