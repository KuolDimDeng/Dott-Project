///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/auth/error/page.js
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Box, Typography, Button } from '@mui/material';
import { logger } from '@/utils/logger';

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    logger.error('Authentication error occurred', { error });
    console.error('Authentication error:', error);

    // Redirect to sign-in page after 5 seconds
    const timer = setTimeout(() => {
      console.log('Redirecting to sign-in page...');
      router.push('/api/auth/signin');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router, error]);

  const getErrorMessage = (error) => {
    switch (error) {
      case 'OAuthCallback':
        return 'There was an issue with the OAuth login process. Please try again.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to access this resource.';
      case 'Configuration':
        return 'There was an issue with the authentication configuration.';
      case 'Unauthorized':
        return 'Your session has expired or you are not authorized. Please sign in again.';
      default:
        return 'An unknown error occurred. Please try again.';
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
        padding: 3,
        textAlign: 'center',
      }}
    >
      <Image 
        src="/static/images/Page-Not-Found-3--Streamline-Brooklyn.png"
        alt="Error Image"
        width={400}
        height={300}
      />
      <Typography variant="h4" gutterBottom>
        Authentication Error
      </Typography>
      <Typography variant="body1" paragraph>
        {getErrorMessage(error)}
      </Typography>
      <Typography variant="body2" paragraph>
        You will be redirected to the sign-in page in 5 seconds.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        component={Link}
        href="/api/auth/signin"
      >
        Return to Sign In
      </Button>
    </Box>
  );
}