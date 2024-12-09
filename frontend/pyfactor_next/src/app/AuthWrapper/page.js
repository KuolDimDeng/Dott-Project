// src/app/AuthWrapper/page.js
'use client';

import React, { useEffect, useState, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box, Typography, Alert, Button } from '@mui/material';
import { useApi } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { APP_CONFIG } from '@/config';

// Constants - Move to config if they might change
const ROUTE_CONFIG = {
  public: [
    '/', 
    '/about', 
    '/contact', 
    '/auth/signin', 
    '/auth/signup',
    '/auth/forgot-password'
  ],
  onboarding: [
    '/onboarding',
    '/onboarding/save-step1',  // Update to match API routes
    '/onboarding/save-step2',  // Update to match API routes
    '/onboarding/save-step3',  // Update to match API routes
    '/onboarding/step4/setup'  // Update to match API routes
  ]
};

// Loading component
const LoadingState = memo(function LoadingState({ message }) {
  return (
    <Box 
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </Box>
  );
});

// Error component
const ErrorState = memo(function ErrorState({ error, onRetry }) {
  return (
    <Box 
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={3}
    >
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
        sx={{ maxWidth: 400 }}
      >
        {error}
      </Alert>
      <Typography 
        variant="body2" 
        color="textSecondary" 
        sx={{ mt: 2, textAlign: 'center' }}
      >
        Please try refreshing the page or contact support if the problem persists.
      </Typography>
    </Box>
  );
});

function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  // Add token validation
  const isTokenValid = useCallback(() => {
    if (!session?.user?.accessToken) return false;
    return session.user.accessTokenExpires && Date.now() < session.user.accessTokenExpires;
  }, [session]);

  // Onboarding status query - Update the enabled condition
  const { 
    data: onboardingData, 
    isLoading: onboardingLoading,
    error: onboardingError,
    refetch: refetchOnboarding
  } = useApi.useOnboardingStatus({
    enabled: isTokenValid() && mounted,
    onError: (error) => {
      logger.error('Error fetching onboarding status:', error);
      handleError(error);
    }
  });

  // Error handling - Update to handle token errors
  const handleError = useCallback((error) => {
    if (error.response?.status === 401 || error.message === 'RefreshAccessTokenError') {
      setError('Session expired. Please sign in again.');
      toast.error('Session expired. Please sign in again.');
      router.push('/auth/signin?error=SessionExpired');
    } else {
      setError(error.message || 'Failed to load user information');
      toast.error(error.message || 'Failed to load user information');
    }
  }, [router]);

   // Session management - Add token validation
  useEffect(() => {
    if (!mounted) return;

    if (status === 'authenticated' && !isTokenValid()) {
      logger.info('Token invalid, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    if (status === 'unauthenticated' && !isPublicRoute(pathname)) {
      logger.info('Redirecting unauthenticated user to signin');
      router.push('/auth/signin');
    }
  }, [status, pathname, mounted, router, isPublicRoute, isTokenValid]);


  // Route checking
  const isPublicRoute = useCallback((path) => 
    ROUTE_CONFIG.public.includes(path), []);

  const isOnboardingRoute = useCallback((path) => 
    ROUTE_CONFIG.onboarding.some(route => path.startsWith(route)), []);

  // Initialization
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Session management
  useEffect(() => {
    if (!mounted) return;

    if (status === 'unauthenticated' && !isPublicRoute(pathname)) {
      logger.info('Redirecting unauthenticated user to signin');
      router.push('/auth/signin');
    }
  }, [status, pathname, mounted, router, isPublicRoute]);

  // Route management
  useEffect(() => {
    if (!mounted || status !== 'authenticated' || !onboardingData) return;

    const handleRouting = async () => {
      try {
        if (isPublicRoute(pathname)) return;

        const { onboarding_status } = onboardingData;
        const onboardingRoute = isOnboardingRoute(pathname);

        if (onboarding_status !== 'complete' && !onboardingRoute) {
          logger.info('Redirecting to onboarding:', onboarding_status);
          router.push(`/onboarding/${onboarding_status || 'step1'}`);
          return;
        }

        if (onboarding_status === 'complete' && onboardingRoute) {
          logger.info('Redirecting completed user to dashboard');
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        logger.error('Routing error:', err);
        handleError(err);
      }
    };

    handleRouting();
  }, [
    status, 
    pathname, 
    router, 
    mounted, 
    onboardingData, 
    isPublicRoute, 
    isOnboardingRoute, 
    handleError
  ]);

  // Loading states
  if (!mounted || status === 'loading' || onboardingLoading) {
    return (
      <LoadingState 
        message={
          !mounted ? 'Initializing...' : 
          status === 'loading' ? 'Checking authentication...' : 
          'Loading your information...'
        }
      />
    );
  }

  // Error states
  if (error || onboardingError) {
    return (
      <ErrorState 
        error={error || 'Failed to load user information'} 
        onRetry={() => {
          setError(null);
          refetchOnboarding();
        }}
      />
    );
  }

  // Public route access
  if (isPublicRoute(pathname)) {
    return children;
  }

  // Protected route access
  if (status === 'authenticated') {
    return children;
  }

  // Default fallback
  router.push('/auth/signin');
  return null;
}

// Export with performance monitoring in development
export default process.env.NODE_ENV === 'development'
  ? React.memo(AuthWrapper, (prevProps, nextProps) => {
      console.log('AuthWrapper re-render prevented');
      return true;
    })
  : AuthWrapper;

// Optional - TypeScript types
if (process.env.NODE_ENV !== 'production') {
  AuthWrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };
}