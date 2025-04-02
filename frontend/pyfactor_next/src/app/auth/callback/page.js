'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { handleAuthResponse, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { setAuthCookies, determineOnboardingStep } from '@/utils/cookieManager';

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Processing authentication...');
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.debug('[OAuth Callback] Auth callback page loaded, handling response');
        setStatus('Completing authentication...');
        setProgress(25);
        
        // Handle the OAuth callback
        let tokens;
        try {
          const authResponse = await handleAuthResponse();
          tokens = authResponse?.tokens;
          logger.debug('[OAuth Callback] Auth response handled:', { 
            hasTokens: !!tokens,
            isSignedIn: authResponse?.isSignedIn
          });
        } catch (authError) {
          logger.error('[OAuth Callback] Error handling auth response:', authError);
          setError('Authentication failed: ' + (authError.message || 'Unknown error'));
          return;
        }
        
        if (!tokens) {
          throw new Error('No tokens received from OAuth callback');
        }
        
        logger.debug('[OAuth Callback] OAuth callback successful');
        setStatus('Checking account status...');
        setProgress(50);
        
        // Get user attributes to check onboarding status
        try {
          const userAttributes = await fetchUserAttributes();
          logger.debug('[OAuth Callback] User attributes:', {
            onboardingStatus: userAttributes['custom:onboarding'],
            businessId: userAttributes['custom:business_id'],
            subscription: userAttributes['custom:subscription_plan']
          });
          
          // Set all auth and onboarding cookies using the cookieManager
          setAuthCookies(tokens, userAttributes);
          
          // Determine where to redirect based on onboarding status
          const nextStep = determineOnboardingStep(userAttributes);
          let redirectUrl = '/dashboard'; // Default if complete
          
          setProgress(75);
          
          if (nextStep === 'business-info') {
            redirectUrl = '/onboarding/business-info';
          } else if (nextStep === 'subscription') {
            redirectUrl = '/onboarding/subscription';
          } else if (nextStep === 'payment') {
            redirectUrl = '/onboarding/payment';
          } else if (nextStep === 'setup') {
            redirectUrl = '/onboarding/setup';
          } else if (nextStep !== 'complete') {
            // Any other status that isn't COMPLETE - redirect to business info
            redirectUrl = '/onboarding/business-info';
          }
          
          // Add from parameter to prevent redirect loops
          redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'from=oauth';
          logger.debug('[OAuth Callback] Redirecting to:', redirectUrl);
          
          setStatus(`Redirecting to ${redirectUrl}...`);
          setProgress(90);
          
          // Set a timeout to ensure cookies are set before redirect
          setTimeout(() => {
            // Use window.location for a clean redirect
            window.location.href = redirectUrl;
          }, 800);
        } catch (attributesError) {
          logger.error('[OAuth Callback] Error fetching user attributes:', attributesError);
          // Fall back to safe default
          setError('Unable to determine account status. Redirecting to start of onboarding.');
          setTimeout(() => {
            window.location.href = '/onboarding/business-info?from=oauth&error=attributes';
          }, 2000);
        }
      } catch (error) {
        logger.error('[OAuth Callback] OAuth process failed:', error);
        setError(error.message || 'Authentication failed');
        setStatus('Authentication error. Redirecting to sign in...');
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin?error=oauth');
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
          {status}
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
      <CircularProgress variant="determinate" value={progress} size={60} />
      <Typography variant="body1" color="textSecondary">
        {status}
      </Typography>
    </Box>
  );
}
