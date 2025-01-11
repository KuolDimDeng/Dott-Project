///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/DashboardLoading/DashboardLoading.jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CircularProgress,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';
import { 
  checkSetupStatus, 
  SETUP_STATUS, 
  POLL_INTERVALS,
  handleAuthError,
  validateUserState 
} from '@/lib/authUtils';

export function DashboardLoading() {
  const { data: session } = useSession();
  const [setupStatus, setSetupStatus] = useState(SETUP_STATUS.STARTED);
  const [progress, setProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [transientErrors, setTransientErrors] = useState(0);
  const [requestId] = useState(() => crypto.randomUUID());
  const router = useRouter();
  
  const MAX_ATTEMPTS = 60; // 3 minutes with 3s interval
  const MAX_TRANSIENT_ERRORS = 5; // Maximum consecutive transient errors

  const getNextPollInterval = (errorCount) => {
    const baseInterval = POLL_INTERVALS.SETUP_IN_PROGRESS;
    const maxInterval = 10000; // 10 seconds max
    return Math.min(baseInterval * Math.pow(1.5, errorCount), maxInterval);
  };

  useEffect(() => {
    let mounted = true;
    let pollInterval;

    const validateAndCheckSetup = async () => {
      try {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollInterval);
          setError('Setup timed out');
          toast.error('Setup timed out. Please try again.');
          router.replace('/onboarding/step4');
          return;
        }

        // Reset transient errors count on successful request
        if (transientErrors > 0) {
          setTransientErrors(0);
        }

        // First validate the session
        const validationResult = await validateUserState(session, requestId);
        if (!validationResult.isValid) {
          clearInterval(pollInterval);
          router.replace(validationResult.redirectTo);
          return;
        }

        // Then check setup status using authUtils
        const setupResult = await checkSetupStatus(session, requestId);
        if (!mounted) return;

        setSetupStatus(setupResult.status);
        setProgress(setupResult.progress);
        setAttempts(prev => prev + 1);

        switch (setupResult.status) {
          case SETUP_STATUS.SUCCESS:
            clearInterval(pollInterval);
            setShowNotification(true);
            toast.success('Setup completed successfully!');
            window.location.reload();
            break;

          case SETUP_STATUS.ERROR:
          case 'FAILURE': // Handle legacy status
            clearInterval(pollInterval);
            setError(setupResult.message || 'Setup failed');
            toast.error(setupResult.message || 'Setup failed. Please try again.');
            setTimeout(() => {
              router.replace('/onboarding/step4');
            }, 2000);
            break;

          case SETUP_STATUS.IN_PROGRESS:
          case SETUP_STATUS.STARTED:
            logger.debug('Setup progress:', {
              requestId,
              status: setupResult.status,
              progress: setupResult.progress,
              step: setupResult.step,
              attempts
            });
            break;

          default:
            logger.warn('Unknown setup status:', {
              requestId,
              status: setupResult.status,
              attempts
            });
        }
      } catch (error) {
        if (!mounted) return;

        logger.error('Setup check failed:', {
          requestId,
          error: error.message,
          status: error.response?.status,
          attempts,
          transientErrors
        });
        
        const errorResult = handleAuthError(error);
        if (errorResult.redirectTo) {
          clearInterval(pollInterval);
          toast.error(errorResult.message);
          router.replace(errorResult.redirectTo);
          return;
        }

        // Handle transient errors
        const newTransientErrors = transientErrors + 1;
        setTransientErrors(newTransientErrors);

        if (newTransientErrors >= MAX_TRANSIENT_ERRORS) {
          clearInterval(pollInterval);
          setError('Connection unstable. Please try again.');
          toast.error('Connection unstable. Please try again later.');
          router.replace('/onboarding/step4');
          return;
        }

        // Update polling interval based on error count
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = setInterval(
            validateAndCheckSetup,
            getNextPollInterval(newTransientErrors)
          );
        }

        // Show retry message to user
        toast.info(`Retrying setup check... (Attempt ${attempts + 1}/${MAX_ATTEMPTS})`);
        setAttempts(prev => prev + 1);
      }
    };

    // Initial setup
    pollInterval = setInterval(
      validateAndCheckSetup,
      POLL_INTERVALS.SETUP_IN_PROGRESS
    );
    validateAndCheckSetup();

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [router, attempts, session, requestId, transientErrors]);

  const handleNotificationClose = () => setShowNotification(false);

  if (setupStatus === SETUP_STATUS.SUCCESS) {
    return (
      <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleNotificationClose} severity="success">
          Setup completed successfully!
        </Alert>
      </Snackbar>
    );
  }

  const getStatusMessage = () => {
    if (error) return 'Setup failed';
    switch (setupStatus) {
      case SETUP_STATUS.STARTED:
        return 'Running Migrations...';
      case SETUP_STATUS.IN_PROGRESS:
        return 'Setting up workspace...';
      default:
        return 'Finalizing setup...';
    }
  };

  return (
    <Box
      position="fixed"
      bottom={16}
      right={16}
      zIndex={1000}
      bgcolor="background.paper"
      borderRadius={2}
      boxShadow={3}
      p={2}
      maxWidth={400}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <CircularProgress size={24} />
        <Box flex={1}>
          <Typography variant="body2">
            {getStatusMessage()}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1 }}
            color={error ? 'error' : 'primary'}
          />
          <Typography variant="caption" color="text.secondary">
            {progress}% complete {attempts > 0 && `(Attempt ${attempts}/${MAX_ATTEMPTS})`}
          </Typography>
        </Box>
      </Box>
      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}