'use client';

import React, { useEffect, useState, memo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { AppErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { APP_CONFIG } from '@/config';

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
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
    >
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
      logger.error("Error fetching onboarding status:", error);
      throw error;
    }
  }, [updateFormData]);

  // Memoize authentication handling
  const handleAuthentication = useCallback(async () => {
    if (status === 'authenticated' && session?.user) {
      logger.info("User authenticated, checking onboarding status");
      
      try {
        const onboardingStatus = await checkOnboardingStatus();
        
        if (onboardingStatus !== 'complete') {
          logger.info("Redirecting to onboarding");
          router.replace('/onboarding/step1');
        } else {
          logger.info("Redirecting to dashboard");
          router.replace('/dashboard');
        }
      } catch (error) {
        logger.error("Authentication flow error:", error);
        setError(error);
        router.replace('/onboarding/step1');
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'unauthenticated') {
      logger.info("User not authenticated, showing landing page");
      setIsLoading(false);
    }
  }, [status, session, router, checkOnboardingStatus]);

  // Authentication effect
  useEffect(() => {
    let mounted = true;

    if (status !== 'loading' && mounted) {
      handleAuthentication();
    }

    return () => {
      mounted = false;
    };
  }, [status, handleAuthentication]);

  // Error effect
  useEffect(() => {
    if (error) {
      logger.error("Landing page error:", error);
      // Implement error handling (e.g., show error toast)
    }
  }, [error]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
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
          Something went wrong
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
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