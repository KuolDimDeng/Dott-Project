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
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/hooks/useAuth'; // Ensure correct import path
import { validateUserState, generateRequestId } from '@/lib/authUtils';  // Add this line



import { 
  ONBOARDING_STEPS, 
  canAccessStep, 
  getnext_step 
} from '@/config/steps';

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

  // Special handling for steps
  const handleStepAccess = useCallback(async (pathname) => {
    const step = pathname.split('/').pop();
    const currentStatus = session?.user?.onboarding_status;
  
    logger.debug('Detailed onboarding status check:', {
      requestId,
      step,
      currentStatus,
      sessionData: {
        onboarding_status: session?.user?.onboarding_status,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      }
    });
  
    try {
      // Business info is always accessible
      if (step === 'business-info') {
        logger.debug('Access granted: Business info is always accessible.', { requestId, step });
        return true;
      }
  
      // Subscription step access logic
      if (step === 'subscription') {
        const allowedAccess = currentStatus === 'business-info' || currentStatus === 'subscription';
  
        logger.debug('Subscription access check:', {
          requestId,
          currentStatus,
          allowedAccess,
        });
  
        return allowedAccess;
      }
  
      // Setup step access logic
      if (step === 'setup') {
        if (currentStatus !== 'setup') {
          logger.debug('Skipping setup status check; user not in setup step yet.', { requestId, currentStatus });
          return false;
        }
  
        const subscriptionData = await persistenceService.getData('subscription-data');
  
        logger.debug('Setup access check:', {
          requestId,
          hasSubscriptionData: !!subscriptionData,
          selected_plan: subscriptionData?.selected_plan,
        });
  
        return !!subscriptionData?.selected_plan;
      }
  
      // Default validation for other steps
      const canAccess = canAccessStep(step, { user: session?.user });
  
      logger.debug('Default step access validation:', {
        requestId,
        step,
        canAccess,
      });
  
      return canAccess;
  
    } catch (error) {
      logger.error('Step access validation failed:', {
        requestId,
        step,
        error: error.message,
      });
      return false;
    }
  }, [session, requestId]);
  

  const handleRedirect = useCallback((path, reason = 'unauthorized') => {
    if (!mountedRef.current) return;

    log('Initiating redirect:', {
      from: path,
      to: '/auth/signin',
      reason,
      sessionStatus: status,
      currentonboarding_status: session?.user?.onboarding_status
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
          'Accept': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        body: JSON.stringify({
          token: accessToken
        }),
        credentials: 'include'
      });
  
      if (!response.ok) {
        log('Token validation failed:', {
          status: response.status
        });
        return false;
      }
  
      const data = await response.json();
      return data.is_valid && data.user_id === session?.user?.id; // Add user ID check
  
    } catch (error) {
      log('Token validation error:', {
        error: error.message 
      });
      return false;
    }
  };
    // Update validateAccess to use the simplified handleStepAccess
    const validateAccess = useCallback(async () => {
      if (!mountedRef.current) return true;
  
      try {
        if (isPublicOrAuthPath(pathname)) {
          return true;
        }
  
        if (!session?.user?.accessToken) {
          handleRedirect(pathname, 'no_session');
          return false;
        }
  
        if (pathname.startsWith('/onboarding/')) {
          return await handleStepAccess(pathname);
        }
  
        return true;
  
      } catch (error) {
        logger.error('Access validation failed:', {
          requestId,
          error: error.message,
          pathname
        });
        setError(error);
        return false;
      }
    }, [pathname, session, handleStepAccess, handleRedirect, isPublicOrAuthPath]);
  

  


 useEffect(() => {
  if (status === 'loading') return;
  
  const validateAndSetAccess = async () => {
    log('Session status changed:', {
      status,
      pathname,
      hasSession: !!session,
      hasToken: !!session?.user?.accessToken,
      onboarding_status: session?.user?.onboarding_status
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
          onboarding_status: session?.user?.onboarding_status
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
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
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

// Handle onboarding routes
if (pathname.startsWith('/onboarding/')) {
  const step = pathname.split('/').pop();

  // Check step access
  if (!handleStepAccess(pathname)) {
    log('Step access denied - redirecting:', {
      step,
      currentStatus: session?.user?.onboarding_status
    });
    return <LoadingState message="Checking access..." />;
  }

  log('Rendering onboarding step:', {
    step,
    hasToken: !!session?.user?.accessToken,
    onboarding_status: session?.user?.onboarding_status
  });
  return children;
}

// Handle public routes
if (isPublicOrAuthPath(pathname)) {
  log('Rendering public route:', { pathname });
  return children;
}

// Handle authenticated routes
if (status === 'authenticated' && !isValidating) {
  log('Rendering authenticated route:', {
    pathname,
    onboarding_status: session?.user?.onboarding_status
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