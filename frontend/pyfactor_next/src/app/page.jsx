///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.jsx
'use client';

import React, { useEffect, useState, memo, useCallback, useRef, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Typography, Button, CircularProgress, Box } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { AppErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { logger } from '@/utils/logger';
import { validateAndRouteUser } from '@/lib/authUtils';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';

// Lazy load components
const AppAppBar = lazy(() => import('./components/AppBar'));
const Hero = lazy(() => import('./components/Hero'));
const Features = lazy(() => import('./components/Features'));
const Highlights = lazy(() => import('./components/Highlights'));
const Pricing = lazy(() => import('./components/Pricing'));
const FAQ = lazy(() => import('./components/FAQ'));
const Footer = lazy(() => import('./components/Footer'));

// Preload critical components
const preloadCriticalComponents = () => {
  const promises = [
    import('./components/AppBar'),
    import('./components/Hero')
  ];
  Promise.all(promises).catch(() => {});
};

if (typeof window !== 'undefined') {
  preloadCriticalComponents();
}

// Loading component
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
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

// Landing content component
const LandingContent = memo(function LandingContent() {
  const [error, setError] = useState(null);

  useEffect(() => {
    // Component mounted
    logger.debug('Landing content mounted');
    return () => logger.debug('Landing content unmounted');
  }, []);

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={() => setError(null)} 
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppAppBar />
      <Hero />
      <Suspense fallback={<LoadingSpinner />}>
        <>
          <Features />
          <Highlights />
          <Pricing />
          <FAQ />
          <Footer />
        </>
      </Suspense>
    </Suspense>
  );
});

// Main landing page component
function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const mounted = useRef(false);
  const requestIdRef = useRef(crypto.randomUUID());
  const [error, setError] = useState(null);

  const handleAuthentication = useCallback(async () => {
    if (!session?.user) return;

    try {
      logger.debug('Landing page auth check:', {
        requestId: requestIdRef.current,
        status,
        onboarding_status: session?.user?.onboarding_status,
        sessionData: {
          current_step: session?.user?.current_step,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        }
      });
      const onboarding_status = session.user.onboarding_status;0
      
      if (onboarding_status && onboarding_status !== 'complete') {
        await router.replace(`/onboarding/${onboarding_status}`);
        return;
      }

      const validationResult = await validateAndRouteUser(
        { user: session.user },
        { pathname: '/', requestId: requestIdRef.current }
      );

      if (validationResult.redirectTo) {
        await router.replace(validationResult.redirectTo);
      } else if (onboarding_status === 'complete') {
        await router.replace('/dashboard');
      }

    } catch (error) {
      logger.error('Authentication error', {
        requestId: requestIdRef.current,
        error: error.message
      });

      if (mounted.current) {
        setError({
          message: error.message || 'Authentication failed',
          code: error.code
        });
      }
    }
  }, [session, status, router]);

  useEffect(() => {
    mounted.current = true;

    if (status === 'authenticated') {
      handleAuthentication();
    }

    return () => {
      mounted.current = false;
    };
  }, [status, handleAuthentication]);

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={() => {
          setError(null);
          handleAuthentication();
        }} 
      />
    );
  }

  if (status === 'loading') return <LoadingSpinner />;
  if (status === 'unauthenticated') return <LandingContent />;
  if (status === 'authenticated') return null;

  return <LoadingSpinner />;
}

// PropTypes
ErrorState.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]).isRequired,
  onRetry: PropTypes.func.isRequired
};

LoadingSpinner.propTypes = {};
LandingContent.propTypes = {};

// Performance monitoring in development
const withPerformanceMonitoring = (WrappedComponent) => {
  if (process.env.NODE_ENV !== 'development') {
    return WrappedComponent;
  }

  return function MonitoredComponent(props) {
    const mountTime = useRef(performance.now());

    useEffect(() => {
      logger.debug('Component mounted', {
        component: WrappedComponent.displayName || WrappedComponent.name,
        timestamp: mountTime.current
      });

      return () => {
        const duration = Math.round(performance.now() - mountTime.current);
        logger.debug('Component unmounted', {
          component: WrappedComponent.displayName || WrappedComponent.name,
          duration: `${duration}ms`
        });
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
};

// Create monitored version of landing page
const MonitoredLandingPage = process.env.NODE_ENV === 'development'
  ? withPerformanceMonitoring(memo(LandingPage))
  : memo(LandingPage);

// Export with error boundary
export default memo(function PageWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      <MonitoredLandingPage />
    </AppErrorBoundary>
  );
});