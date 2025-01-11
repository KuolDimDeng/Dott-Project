///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.jsx
'use client';

import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Typography, Button, CircularProgress, Box } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { AppErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { logger } from '@/utils/logger';
import { validateAndRouteUser, createErrorHandler } from '@/lib/authUtils';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';

// Loading component
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
});

// Memoize static components
const Hero = memo(React.lazy(() => import('./components/Hero')));
const Features = memo(React.lazy(() => import('./components/Features')));
const Highlights = memo(React.lazy(() => import('./components/Highlights')));
const Pricing = memo(React.lazy(() => import('./components/Pricing')));
const FAQ = memo(React.lazy(() => import('./components/FAQ')));
const Footer = memo(React.lazy(() => import('./components/Footer')));
const AppAppBar = memo(React.lazy(() => import('./components/AppBar')));
const LOADING_TIMEOUT = 10000; // 10 seconds


// Landing page content component
const LandingContent = memo(function LandingContent() {
  const [componentLoading, setComponentLoading] = useState(true);
  const [error, setError] = useState(null); // Add error state


  useEffect(() => {
    const timer = setTimeout(() => setComponentLoading(false), 0);

    const timeoutId = setTimeout(() => {
      if (componentLoading) {
        setError({
          message: 'Loading timeout. Please refresh the page.',
          code: 'LOADING_TIMEOUT'
        });
      }
    }, LOADING_TIMEOUT);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutId);
    };
  }, [componentLoading]);

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={() => {
          setError(null);
          setComponentLoading(true);
        }}
      />
    );
  }

  if (componentLoading) {
    return <LoadingSpinner />;
  }

  
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <>
        <AppAppBar />
        <Hero />
        <Features />
        <Highlights />
        <Pricing />
        <FAQ />
        <Footer />
      </>
    </React.Suspense>
  );
});

// Error state component
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
          : 'Please try again or contact support@dottapps.com if the problem persists.'}
      </Typography>
      <Button variant="contained" onClick={onRetry} startIcon={<RefreshIcon />}>
        Try Again
      </Button>
    </Box>
  );
});

ErrorState.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]).isRequired,
  onRetry: PropTypes.func.isRequired
};
LoadingSpinner.propTypes = {};
LoadingSpinner.displayName = 'LoadingSpinner';

LandingContent.propTypes = {};
LandingContent.displayName = 'LandingContent';

// Debug logging utility
const logStateTransition = (data) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Auth state transition:', data);
  }
};

// Main landing page component
function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const mounted = useRef(false);
  const initializationComplete = useRef(false);
  const authInProgress = useRef(false);
  const authAttempts = useRef(0);
  const requestIdRef = useRef(crypto.randomUUID());
  const [error, setError] = useState(null);

  const handleAuthentication = useCallback(async () => {
    const requestId = requestIdRef.current;
    
    if (authInProgress.current || !mounted.current || initializationComplete.current || authAttempts.current >= 3) {
      logger.debug('Authentication skipped', {
        requestId,
        isInProgress: authInProgress.current,
        isMounted: mounted.current,
        isComplete: initializationComplete.current,
        attempts: authAttempts.current
      });
      return;
    }
  
    try {
      authInProgress.current = true;
      authAttempts.current += 1;
  
      logger.debug('Starting authentication', {
        requestId,
        attempt: authAttempts.current,
        status,
        hasSession: !!session,
        hasUser: !!session?.user,
        onboardingStatus: session?.user?.onboardingStatus
      });
      
      if (status === 'authenticated' && session?.user) {
        // Check onboarding status first
        const onboardingStatus = session.user.onboardingStatus;
        
        if (onboardingStatus && onboardingStatus !== 'complete') {
          logger.info('User in onboarding flow', {
            requestId,
            onboardingStatus
          });
          await router.replace(`/onboarding/${onboardingStatus}`);
          return;
        }
  
        const validationResult = await validateAndRouteUser(
          { user: session?.user },
          { 
            pathname: '/', 
            requestId,
            onboardingStatus 
          }
        );
  
        if (!mounted.current) {
          logger.debug('Component unmounted during validation', { requestId });
          return;
        }
  
        if (validationResult.redirectTo) {
          await router.replace(validationResult.redirectTo);
        } else {
          // Only redirect to dashboard if onboarding is complete
          await router.replace(onboardingStatus === 'complete' ? '/dashboard' : `/onboarding/${onboardingStatus}`);
        }
      }
    } catch (error) {
      logger.error('Authentication error', {
        requestId,
        error: error.message,
        code: error.code,
        stack: error.stack
      });
  
      if (mounted.current) {
        setError({
          message: error.message || 'Authentication failed',
          code: error.code
        });
      }
    } finally {
      if (mounted.current) {
        authInProgress.current = false;
        initializationComplete.current = true;
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    mounted.current = true;
    let timeoutId;

    const initialize = () => {
      if (status === 'loading') return;

      timeoutId = setTimeout(() => {
        if (!mounted.current || initializationComplete.current) return;
        handleAuthentication();
      }, 100);
    };

    initialize();

    return () => {
      mounted.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, handleAuthentication]);

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={() => {
          setError(null);
          authAttempts.current = 0;
          initializationComplete.current = false;
          authInProgress.current = false;
          handleAuthentication();
        }} 
      />
    );
  }

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

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

  const MonitoredComponent = (props) => {
    const mountTime = useRef(performance.now());
    const mounted = useRef(false);

    useEffect(() => {
      mounted.current = true;
      logger.info('Landing page mounted');

      return () => {
        mounted.current = false;
        if (mounted.current) {
          const duration = Math.round(performance.now() - mountTime.current);
          logger.info(`Landing page unmounted after ${duration}ms`);
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };

  MonitoredComponent.displayName = `WithPerformanceMonitoring(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return MonitoredComponent;
};

// Create monitored version of the landing page
const MonitoredLandingPage = process.env.NODE_ENV === 'development'
  ? withPerformanceMonitoring(memo(LandingPage))
  : memo(LandingPage);

// Final export with error boundary
export default memo(function PageWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      <MonitoredLandingPage />
    </AppErrorBoundary>
  );
});