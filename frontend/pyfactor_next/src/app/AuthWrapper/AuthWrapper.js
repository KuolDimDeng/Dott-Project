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
    logger.debug(message, { 
      requestId,
      timestamp: new Date().toISOString(),
      ...data 
    });
  }, [requestId]);

  const isPublicOrAuthPath = useCallback((path) => {
    const isPublic = path === '/' || 
                    isPublicRoute(path) || 
                    path.startsWith('/auth/') ||
                    path.includes('/api/auth/') ||
                    path.includes('/callback/') ||
                    path.includes('oauth');
    
    log('Public path evaluation:', { 
      path,
      isPublic,
      checks: {
        isRoot: path === '/',
        isPublicRoute: isPublicRoute(path),
        isAuthPath: path.startsWith('/auth/'),
        isApiAuth: path.includes('/api/auth/'),
        isCallback: path.includes('/callback/') || path.includes('oauth')
      }
    });
    
    return isPublic;
  }, [log]);

  const handleRedirect = useCallback((path, reason = 'unauthorized') => {
    if (!mountedRef.current) return;

    log('Initiating redirect:', {
      from: path,
      to: '/auth/signin',
      reason,
      sessionStatus: status,
      currentOnboardingStatus: session?.user?.onboardingStatus
    });
    
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
  }, [router, log, status, session]);

  const validateToken = async (accessToken) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token/verify/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
  
      if (!response.ok) {
        log('Token validation failed:', {
          status: response.status
        });
        return false;
      }
  
      const data = await response.json();
      return data.isValid;
  
    } catch (error) {
      log('Token validation error:', {
        error: error.message 
      });
      return false;
    }
  };
  const validateAccess = useCallback(async () => {
    if (!mountedRef.current) return true;
  
    log('Starting access validation:', {
      pathname,
      sessionStatus: status,
      hasUser: !!session?.user,
      hasToken: !!session?.user?.accessToken,
      onboardingStatus: session?.user?.onboardingStatus
    });
  
    try {
      // Special handling for business-info page
      if (pathname === '/onboarding/business-info') {
        if (!session?.user?.accessToken) {
          log('No token for business-info access');
          handleRedirect(pathname, 'no_token');
          return false;
        }
  
        // Verify token with backend
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token/verify/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include'
          });
  
          if (!response.ok) {
            log('Token validation failed for business-info:', {
              status: response.status
            });
            handleRedirect(pathname, 'invalid_token');
            return false;
          }
  
          log('Token validated for business-info access');
          return true;
        } catch (error) {
          log('Token validation error:', { error: error.message });
          handleRedirect(pathname, 'token_error');
          return false;
        }
      }
  
      // Handle public and special paths
      if (isPublicOrAuthPath(pathname)) {
        log('Public path access granted:', { pathname });
        return true;
      }
  
      // Check session existence
      if (!session?.user?.accessToken) {
        log('No valid session found:', { pathname });
        handleRedirect(pathname, 'no_session');
        return false;
      }
  
      // Ensure onboarding status exists
      if (!session.user.onboardingStatus) {
        session.user.onboardingStatus = 'business-info';
        session.user.currentStep = 1;
        log('Set default onboarding status:', {
          status: 'business-info',
          step: 1
        });
      }
  
      // Handle onboarding routes
      if (pathname.startsWith('/onboarding/')) {
        const currentStep = pathname.split('/').pop();
        const currentStatus = session.user.onboardingStatus;
  
        // Always allow business-info and subscription access
        if (currentStep === 'business-info' || currentStep === 'subscription') {
          return true;
        }
  
        // For other steps, validate against current status
        if (!currentStatus || (currentStep !== currentStatus && 
            !['business-info', 'subscription'].includes(currentStep))) {
          if (mountedRef.current) {
            router.replace(`/onboarding/${currentStatus || 'business-info'}`);
          }
          return false;
        }
      }
  
      log('Access validation successful');
      return true;
  
    } catch (err) {
      logger.error('Access validation failed:', { 
        error: err.message,
        stack: err.stack,
        pathname,
        sessionStatus: status
      });
      setError(err);
      return false;
    }
  }, [pathname, session, handleRedirect, router, isPublicOrAuthPath, log, status]);

 useEffect(() => {
  if (status === 'loading') return;
  
  const validateAndSetAccess = async () => {
    log('Session status changed:', {
      status,
      pathname,
      hasSession: !!session,
      hasToken: !!session?.user?.accessToken,
      onboardingStatus: session?.user?.onboardingStatus
    });
    
    setIsValidating(true);
    const hasAccess = await validateAccess();
    
    validationTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setIsValidating(false);
        
        log('Access check completed', {
          hasAccess,
          pathname,
          status,
          hasToken: !!session?.user?.accessToken,
          onboardingStatus: session?.user?.onboardingStatus
        });
      }
    }, 100);
  };

  validateAndSetAccess();

  return () => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
  };
}, [status, validateAccess, log, pathname, session]);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    
    log('Component mounted:', {
      pathname,
      sessionStatus: status
    });
    
    return () => {
      log('Component unmounting:', {
        pathname,
        sessionStatus: status
      });
      mountedRef.current = false;
      setMounted(false);
    };
  }, [log, pathname, status]);

// Update the render conditions
if (!mounted || status === 'loading' || isValidating) {
  return <LoadingState message="Checking authentication..." />;
}

if (error) {
  return (
    <ErrorState
      error={error.message}
      onRetry={() => {
        if (mountedRef.current) {
          log('Retrying after error:', {
            error: error.message,
            pathname
          });
          setError(null);
          router.refresh();
        }
      }}
    />
  );
}

// Special handling for business-info
if (pathname === '/onboarding/business-info') {
  if (!session?.user?.accessToken) {
    log('No token for business-info - redirecting to signin');
    handleRedirect(pathname, 'no_token_business_info');
    return <LoadingState message="Redirecting to sign in..." />;
  }
  
  log('Rendering business-info page:', {
    hasToken: !!session?.user?.accessToken,
    onboardingStatus: session?.user?.onboardingStatus
  });
  return children;
}

// Handle other public routes
if (isPublicOrAuthPath(pathname)) {
  log('Rendering public route:', { pathname });
  return children;
}

if (status === 'authenticated' && !isValidating) {
  log('Rendering authenticated route:', {
    pathname,
    onboardingStatus: session?.user?.onboardingStatus,
    currentStep: session?.user?.currentStep
  });
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