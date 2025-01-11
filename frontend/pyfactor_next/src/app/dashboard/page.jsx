///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.jsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardContent from './DashboardContent';
import { axiosInstance } from '@/lib/axiosConfig';
import { SetupProgressIndicator } from '@/components/SetupProgressIndicator';
import { logger } from '@/utils/logger';
import { 
  validateUserState, 
  SETUP_STATUS, 
  handleAuthError, 
  checkSetupStatus, 
  POLL_INTERVALS,
  createErrorHandler, // Add this import
  validateAndRouteUser // Add this import
} from '@/lib/authUtils';

export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [setupStatus, setSetupStatus] = useState(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupError, setSetupError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [requestId] = useState(() => crypto.randomUUID());


  const handleSetupStatus = (setupState, progress) => {
    if (Object.values(SETUP_STATUS).includes(setupState)) {
      setSetupStatus(setupState);
      setSetupProgress(progress || 0);
      
      if (setupState === SETUP_STATUS.SUCCESS) {
        setIsInitialized(true);
        return true;
      }
    }
    return false;
  };

  const handleValidationError = useCallback(async (error, context = {}) => {
    const errorHandler = createErrorHandler(router, logger);
    return errorHandler(error, requestId, {
      component: 'Dashboard',
      ...context
    });
  }, [router, requestId]);

  const handleStatusError = (error) => {
    const errorResult = handleAuthError(error);
    
    logger.error('Status check failed:', {
      requestId,  // Add this
      error,
      errorType: errorResult.type,
      currentUrl: window.location.pathname,
      setupStatus
    });
  
    if (errorResult.redirectTo) {
      setAuthError(errorResult.message);
      router.replace(errorResult.redirectTo);
      return true;
    }
  
    setSetupError(errorResult.message);
    return false;
  };

  useEffect(() => {
    if (!session?.user || isInitialized) return;

    let mounted = true;
    let pollInterval = null;

    const checkStatus = async () => {
      try {
        const validationResult = await validateAndRouteUser(
          { user: session?.user },
          { pathname, requestId }
        );
    
        if (!validationResult.isValid) {
          throw new Error(validationResult.reason);
        }
    
        const setupResult = await checkSetupStatus(session, requestId);
        if (!mounted) return;
    
        const setupComplete = handleSetupStatus(setupResult.status, setupResult.progress);
        if (setupComplete) {
          clearInterval(pollInterval);
        }
    
      } catch (error) {
        if (!mounted) return;
        
        // Use single error handler instead of both handleValidationError and handleStatusError
        await handleValidationError(error, {
          statusCheck: true,
          setupStatus: setupStatus,
          operation: 'checkStatus'
        });
        
        clearInterval(pollInterval);
      }
    };

    // Initial check
    checkStatus();
    
    // Start polling with dynamic interval
    pollInterval = setInterval(
      checkStatus, 
      setupStatus === SETUP_STATUS.SUCCESS ? 
        POLL_INTERVALS.SETUP_SUCCESS : 
        POLL_INTERVALS.SETUP_IN_PROGRESS
    );

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setAuthError(null);
      setSetupError(null);
      setSetupStatus(null); // Add this
      setSetupProgress(0); // Add this
    };
  }, [session, router, isInitialized, setupStatus, requestId]); // Add requestId dependency


  if (sessionStatus === 'loading' || !session) {
    return null;
  }

  if (authError) {
    return (
      <div className="auth-error-container">
        <p className="auth-error-message">{authError}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <DashboardContent />
      {setupStatus && setupStatus !== SETUP_STATUS.SUCCESS && (
        <SetupProgressIndicator 
          status={setupStatus}
          progress={setupProgress}
          error={setupError}
          authError={authError}
        />
      )}
    </div>
  );
}