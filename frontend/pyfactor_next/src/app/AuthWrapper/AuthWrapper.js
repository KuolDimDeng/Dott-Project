///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/AuthWrapper/AuthWrapper.js
'use client';

import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box, Typography, Alert, Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import { RoutingManager } from '@/lib/routingManager';
import PropTypes from 'prop-types';
import { isPublicRoute } from '@/lib/authUtils';

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
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
        Please try refreshing the page or contact support if the problem persists.
      </Typography>
    </Box>
  );
});

function AuthWrapper({ children }) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const requestId = useRef(crypto.randomUUID()).current;
  const validationTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const toast = useToast();

  const log = useCallback((message, data) => {
    logger.debug(message, { requestId, ...data });
  }, [requestId]);

  const isPublicOrAuthPath = useCallback((path) => {
    const isPublic = path === '/' || 
                    isPublicRoute(path) || 
                    path.startsWith('/auth/') ||
                    path.includes('/api/auth/') ||
                    path.includes('/callback/') ||
                    path.includes('oauth');
    
    log('Checking public path', { path, isPublic });
    return isPublic;
  }, [log]);

  const handleRedirect = useCallback((path, reason = 'unauthorized') => {
    if (!mountedRef.current) return;

    log('Redirecting user', {
      from: path,
      to: '/auth/signin',
      reason
    });
    
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
  }, [router, log]);

  const validateAccess = useCallback(() => {
    if (!mountedRef.current) return true;

    try {
      // Handle public and special paths
      if (isPublicOrAuthPath(pathname)) {
        return true;
      }

      // Check session
      if (!session?.user) {
        handleRedirect(pathname, 'no_session');
        return false;
      }

      // Handle onboarding routes with more lenient validation
      if (pathname.startsWith('/onboarding/')) {
        const currentStep = pathname.split('/').pop();
        const currentStatus = session.user.onboardingStatus;
        
        // Allow business-info access
        if (currentStep === 'business-info') {
          return true;
        }

        // Allow subscription access during transition
        if (currentStep === 'subscription' && 
            (currentStatus === 'subscription' || 
             currentStatus === 'business-info')) {
          return true;
        }

        // For other steps, maintain normal validation
        if (!currentStatus || 
            (currentStep !== currentStatus && 
             !['business-info', 'subscription'].includes(currentStep))) {
          if (mountedRef.current) {
            router.replace(`/onboarding/${currentStatus || 'business-info'}`);
          }
          return false;
        }
      }

      return true;
    } catch (err) {
      logger.error('Access validation failed:', { error: err.message });
      setError(err);
      return false;
    }
  }, [pathname, session, handleRedirect, router]);

  useEffect(() => {
    if (status === 'loading') return;
    
    setIsValidating(true);
    const hasAccess = validateAccess();
    
    validationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsValidating(false);
        
        log('Access check completed', {
          hasAccess,
          pathname,
          status,
          onboardingStatus: session?.user?.onboardingStatus
        });
      }
    }, 100);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [status, validateAccess, log, pathname, session]);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    
    return () => {
      mountedRef.current = false;
      setMounted(false);
    };
  }, []);

  if (!mounted || status === 'loading' || isValidating) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error.message}
        onRetry={() => {
          if (mountedRef.current) {
            setError(null);
            router.refresh();
          }
        }}
      />
    );
  }

  if (isPublicOrAuthPath(pathname) || pathname === '/onboarding/business-info') {
    return children;
  }

  if (status === 'authenticated' && !isValidating) {
    return children;
  }

  return <LoadingState message="Verifying access..." />;
}

LoadingState.propTypes = {
  message: PropTypes.string.isRequired
};

ErrorState.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired
};

AuthWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

export default memo(AuthWrapper);