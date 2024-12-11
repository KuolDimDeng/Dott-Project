///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/error/page.js
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Box, Typography, Button, Alert } from '@mui/material';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';

const ERROR_MESSAGES = {
  OAuthCallback: 'There was an issue with the OAuth login process. Please try again.',
  AccessDenied: 'Access denied. You do not have permission to access this resource.',
  Configuration: 'There was an issue with the authentication configuration.',
  Unauthorized: 'Your session has expired or you are not authorized. Please sign in again.',
  Verification: 'Email verification is required. Please check your inbox.',
  Default: 'An unknown error occurred. Please try again.',
};

const REDIRECT_DELAY = 5000; // 5 seconds

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    // Log error
    logger.error('Authentication error occurred', {
      error,
      description: errorDescription,
    });

    // Show error toast
    toast.error(ERROR_MESSAGES[error] || ERROR_MESSAGES.Default, {
      toastId: error, // Prevent duplicate toasts
      autoClose: REDIRECT_DELAY - 1000, // Close just before redirect
    });

    // Redirect to sign-in page
    const timer = setTimeout(() => {
      logger.info('Redirecting to sign-in page...');
      router.push('/auth/signin');
    }, REDIRECT_DELAY);

    return () => clearTimeout(timer);
  }, [router, error, errorDescription]);

  const getErrorDetails = () => {
    return {
      title: 'Authentication Error',
      message: ERROR_MESSAGES[error] || ERROR_MESSAGES.Default,
      description: errorDescription || 'Please try signing in again.',
      severity: error === 'Verification' ? 'info' : 'error',
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
        textAlign: 'center',
        gap: 3,
      }}
    >
      <Image
        src="/static/images/Page-Not-Found-3--Streamline-Brooklyn.png"
        alt="Error Illustration"
        width={400}
        height={300}
        priority
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />

      <Box sx={{ maxWidth: 500, width: '100%' }}>
        <Typography variant="h4" gutterBottom color="error">
          {errorDetails.title}
        </Typography>

        <Alert severity={errorDetails.severity} sx={{ mb: 3 }} variant="outlined">
          <Typography variant="body1" paragraph>
            {errorDetails.message}
          </Typography>
          {errorDescription && (
            <Typography variant="body2" color="textSecondary">
              {errorDetails.description}
            </Typography>
          )}
        </Alert>

        <Typography variant="body2" color="textSecondary" paragraph>
          You will be redirected to the sign-in page in 5 seconds.
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            href="/auth/signin"
            size="large"
          >
            Return to Sign In
          </Button>
          <Button variant="outlined" color="primary" component={Link} href="/" size="large">
            Go to Homepage
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

// Error boundary component
export function ErrorBoundary({ error }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 500, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body2">{error.message}</Typography>
      </Alert>
      <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
        Try Again
      </Button>
    </Box>
  );
}
