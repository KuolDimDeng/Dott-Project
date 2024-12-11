///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.jsx
'use client';

import React, { useEffect, useState, memo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Typography, Button, CircularProgress, Box } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { AppErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';
import RefreshIcon from '@mui/icons-material/Refresh';

// Memoize static components
const Hero = memo(React.lazy(() => import('./components/Hero')));
const Features = memo(React.lazy(() => import('./components/Features')));
const Highlights = memo(React.lazy(() => import('./components/Highlights')));
const Pricing = memo(React.lazy(() => import('./components/Pricing')));
const FAQ = memo(React.lazy(() => import('./components/FAQ')));
const Footer = memo(React.lazy(() => import('./components/Footer')));
const AppAppBar = memo(React.lazy(() => import('./components/AppBar')));

// Loading component
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
});

// Landing page content component
const LandingContent = memo(function LandingContent() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <AppAppBar />
      <Hero />
      <Features />
      <Highlights />
      <Pricing />
      <FAQ />
      <Footer />
    </React.Suspense>
  );
});

// Move ErrorState outside the main component
const ErrorState = memo(function ErrorState({ error, onRetry }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
      p={3}
    >
      <Typography variant="h6" color="error">
        {error.message || 'Something went wrong'}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {error.response?.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'Please try again or contact support if the problem persists.'}
      </Typography>
      <Button variant="contained" onClick={onRetry} startIcon={<RefreshIcon />}>
        Try Again
      </Button>
    </Box>
  );
});

// Main landing page component
function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { updateFormData } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the onboarding status check
  const checkOnboardingStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
      const onboardingStatus = response.data?.onboarding_status;

      if (onboardingStatus) {
        updateFormData({ onboardingStatus });
      }

      return onboardingStatus;
    } catch (error) {
      logger.error('Error fetching onboarding status:', error);
      throw error;
    }
  }, [updateFormData]);

  // Memoize authentication handling
  const handleAuthentication = useCallback(async () => {
    if (status === 'authenticated' && session?.user) {
      logger.info('User authenticated, checking status and session details:', {
        userId: session.user.id,
        sessionStatus: status,
        onboardingStatus: session.user.onboardingStatus,
      });

      try {
        // First check if we already know the user is complete from the session
        if (session.user.onboardingStatus === 'complete' || session.user.isComplete) {
          logger.info('User already completed - redirecting to dashboard');
          router.replace('/dashboard');
          return;
        }

        // If not complete or status unknown, check with backend
        const response = await axiosInstance.get(APP_CONFIG.api.endpoints.onboarding.status);
        const onboardingStatus = response.data?.onboarding_status;

        logger.info('Backend onboarding status received:', {
          status: onboardingStatus,
          userId: session.user.id,
        });

        // Update our local state with the latest status
        if (onboardingStatus) {
          updateFormData({
            onboardingStatus,
            isComplete: onboardingStatus === 'complete',
          });
        }

        // Make routing decision based on status
        if (onboardingStatus === 'complete') {
          logger.info('Backend confirms completion - redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          // Add more specific logging about the step
          logger.info('Onboarding incomplete - redirecting to step', {
            currentStep: onboardingStatus || 'step1',
            userId: session.user.id,
            previousStep: session.user.onboardingStatus,
          });

          // Ensure we're not going backwards in the flow
          const currentStepNumber = parseInt(onboardingStatus?.replace('step', '') || '1');
          const previousStepNumber = parseInt(
            session.user.onboardingStatus?.replace('step', '') || '0'
          );

          if (currentStepNumber < previousStepNumber) {
            logger.warn('Attempted backward step navigation - maintaining current step');
            router.replace(`/onboarding/step${previousStepNumber}`);
          } else {
            router.replace(`/onboarding/${onboardingStatus || 'step1'}`);
          }
        }
      } catch (error) {
        logger.error('Authentication flow error:', {
          error,
          userId: session.user.id,
          errorType: error.name,
          errorStatus: error.response?.status,
        });

        // Handle specific error cases
        if (error.response?.status === 401) {
          // Session expired - let AuthWrapper handle redirect to signin
          setError(new Error('Session expired'));
        } else {
          // For other errors, assume onboarding needed
          setError(error);
          router.replace('/onboarding/step1');
        }
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'unauthenticated') {
      logger.info('User not authenticated - showing landing page');
      setIsLoading(false);
    }
  }, [status, session, router, updateFormData]);

  // Authentication effect
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    let timeoutId;

    const initializePage = async () => {
      try {
        if (status === 'loading') {
          return;
        }

        if (mounted) {
          // Add a small delay to prevent rapid re-renders
          timeoutId = setTimeout(async () => {
            await handleAuthentication();
          }, 100);
        }
      } catch (error) {
        if (mounted) {
          logger.error('Page initialization error:', error);
          setError(error);
        }
      }
    };

    initializePage();

    return () => {
      mounted = false;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
      logger.info('Landing page cleanup complete');
    };
  }, [status, handleAuthentication]);

  // Error effect
  useEffect(() => {
    if (error) {
      logger.error('Landing page error:', error);
      // Implement error handling (e.g., show error toast)
    }
  }, [error]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner />;
  }

  // Show landing page for unauthenticated users
  if (status === 'unauthenticated') {
    return <LandingContent />;
  }

  return null;
}

// Performance monitoring HOC
const withPerformanceMonitoring = (WrappedComponent) => {
  if (process.env.NODE_ENV !== 'development') {
    return WrappedComponent;
  }

  return function PerformanceMonitor(props) {
    useEffect(() => {
      const startTime = performance.now();
      logger.info('Landing page mounted');

      return () => {
        const endTime = performance.now();
        logger.info(`Landing page unmounted after ${endTime - startTime}ms`);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
};

// Export with error boundary and performance monitoring
export default function PageWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      {process.env.NODE_ENV === 'development' ? (
        withPerformanceMonitoring(LandingPage)()
      ) : (
        <LandingPage />
      )}
    </AppErrorBoundary>
  );
}
