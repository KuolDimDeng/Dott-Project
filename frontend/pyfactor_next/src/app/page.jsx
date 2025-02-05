'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useEffect, memo, useRef, useState, useCallback, Suspense } from 'react';
import { logger } from '@/utils/logger';
import PropTypes from 'prop-types';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '@/hooks/auth';

// Import your components
import AppBar from '@/app/components/AppBar';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import Highlights from '@/app/components/Highlights';
import Pricing from '@/app/components/Pricing';
import FAQ from '@/app/components/FAQ';
import Footer from '@/app/components/Footer';

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
  const { signInWithGoogle } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppBar />
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

// PropTypes definitions
const errorPropType = PropTypes.shape({
  message: PropTypes.string,
  code: PropTypes.string,
  response: PropTypes.shape({
    status: PropTypes.number
  })
});

ErrorState.propTypes = {
  error: errorPropType.isRequired,
  onRetry: PropTypes.func.isRequired
};

LoadingSpinner.propTypes = {};
LandingContent.propTypes = {};

// Performance monitoring HOC
const withPerformanceMonitoring = (WrappedComponent) => {
  if (process.env.NODE_ENV !== 'development') {
    return WrappedComponent;
  }

  const MonitoredComponent = (props) => {
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

  MonitoredComponent.displayName = `withPerformanceMonitoring(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return MonitoredComponent;
};

// Main component
function Home() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [error, setError] = useState(null);
  const mounted = useRef(false);
  const requestIdRef = useRef(crypto.randomUUID());

  const handleAuthentication = useCallback(async () => {
    if (!session?.user) return;

    try {
      logger.debug('Landing page auth check:', {
        requestId: requestIdRef.current,
        status,
        onboarding: session?.user['custom:onboarding'],
        sessionData: {
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        }
      });

      const onboardingStatus = session.user['custom:onboarding'];
      
      if (onboardingStatus === 'complete') {
        logger.debug('User onboarding complete, redirecting to dashboard');
        await router.replace('/dashboard');
      } else {
        logger.debug('User onboarding incomplete, redirecting to onboarding');
        await router.replace(`/onboarding/${onboardingStatus || 'business-info'}`);
      }
    } catch (err) {
      logger.error('Authentication error', {
        requestId: requestIdRef.current,
        error: err.message
      });

      if (mounted.current) {
        setError({
          message: err.message || 'Authentication failed',
          code: err.code
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
  if (status === 'authenticated') return <LoadingSpinner />;

  return <LoadingSpinner />;
}

// Export enhanced component
const EnhancedHome = withPerformanceMonitoring(Home);
EnhancedHome.displayName = 'EnhancedHome';

export default EnhancedHome;