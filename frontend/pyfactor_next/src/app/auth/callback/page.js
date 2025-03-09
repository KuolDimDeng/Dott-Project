'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { handleRedirectSignIn } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle the OAuth callback
        const { tokens } = await handleRedirectSignIn();
        
        if (tokens) {
          logger.debug('OAuth callback successful');
          
          // Get current user and check onboarding status
          const { getCurrentUser } = await import('aws-amplify/auth');
          const user = await getCurrentUser();
          const onboardingStatus = user?.attributes?.['custom:onboarding'];
          
          logger.debug('Onboarding status:', onboardingStatus);
          
          // First check if user has completed onboarding in the backend
          try {
            // Get user ID from Cognito
            const userId = user.userId || user.attributes?.sub;
            
            // Make API call to check onboarding status in the backend
            const response = await fetch('/api/onboarding/status', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${tokens.accessToken.toString()}`,
                'X-Id-Token': tokens.idToken.toString()
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              logger.debug('Backend onboarding status:', data);
              
              // If backend indicates onboarding is complete, set setupCompleted cookie and redirect to dashboard
              if (data.setup_completed || data.status === 'COMPLETE') {
                logger.debug('Backend confirms onboarding complete, setting setupCompleted cookie');
                
                // Set setupCompleted cookie via API
                await fetch('/api/auth/set-cookies', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    idToken: tokens.idToken.toString(),
                    accessToken: tokens.accessToken.toString(),
                    setupCompleted: true,
                    onboardingStep: 'complete',
                    onboardedStatus: 'COMPLETE'
                  })
                });
                
                logger.debug('SetupCompleted cookie set, redirecting to dashboard');
                router.push('/dashboard');
                return;
              }
            }
            
            // Fall back to Cognito attribute if backend check fails
            if (onboardingStatus === 'complete' || onboardingStatus === 'COMPLETE') {
              logger.debug('Cognito attribute indicates onboarding complete, redirecting to dashboard');
              router.push('/dashboard');
            } else {
              const redirectPath = `/onboarding/${onboardingStatus || 'business-info'}`;
              logger.debug('Incomplete onboarding, redirecting to:', redirectPath);
              router.push(redirectPath);
            }
          } catch (error) {
            logger.error('Error checking backend onboarding status:', error);
            
            // Fall back to Cognito attribute if backend check fails
            if (onboardingStatus === 'complete' || onboardingStatus === 'COMPLETE') {
              logger.debug('Cognito attribute indicates onboarding complete, redirecting to dashboard');
              router.push('/dashboard');
            } else {
              const redirectPath = `/onboarding/${onboardingStatus || 'business-info'}`;
              logger.debug('Incomplete onboarding, redirecting to:', redirectPath);
              router.push(redirectPath);
            }
          }
        } else {
          throw new Error('No tokens received from OAuth callback');
        }
      } catch (error) {
        logger.error('OAuth callback failed:', error);
        setError(error.message || 'Authentication failed');
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="textSecondary">
          Redirecting to sign in...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="textSecondary">
        Completing sign in...
      </Typography>
    </Box>
  );
}
