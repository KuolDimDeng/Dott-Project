import { appCache } from '@/utils/appCache';
import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
// Auth0 authentication is handled via useSession hook

// Increase initial polling interval and add exponential backoff
const BASE_POLLING_INTERVAL = 30000; // 30 seconds (increased from 15 seconds)
const MAX_POLLING_INTERVAL = 120000; // 120 seconds (2 minutes, increased from 1 minute)
const MAX_POLLING_TIME = 15 * 60 * 1000; // 15 minutes (increased from 10 minutes)
const MAX_RETRIES = 7; // Increased from 5

// Calculate polling interval with exponential backoff and jitter
const getPollingInterval = (retryCount) => {
  const base = Math.min(BASE_POLLING_INTERVAL * Math.pow(2.5, retryCount), MAX_POLLING_INTERVAL);
  return base + (Math.random() * 0.75 * base); // Add up to 75% jitter (increased from 50%)
};

export function useSetupPolling() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  const startPolling = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    try {
      // Get current user using v6 API
      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Reset state
      setStartTime(Date.now());
      setRetryCount(0);
      
      // Make request to start setup
      const response = await axiosInstance.post('/api/onboarding/setup/', {
        userId: user.username,
        setupType: 'free'
      });

      // Start polling immediately
      const statusResponse = await axiosInstance.get('/api/onboarding/setup/status/');
      setStatus(statusResponse.data);

      logger.debug('[SetupPolling] Setup started:', {
        setupResponse: response.data,
        initialStatus: statusResponse.data
      });
    } catch (error) {
      logger.error('[SetupPolling] Failed to start setup:', error);
      // Check if it's an auth error
      if (error.response?.status === 401) {
        setError('Authentication failed. Please try signing in again.');
      } else {
        setError('Failed to start setup process. Please try again.');
      }
      setIsPolling(false);
      return;
    }
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const completeSetup = useCallback(async () => {
    try {
      // Mark setup as complete in backend
      const response = await axiosInstance.post('/api/onboarding/setup/complete/');
      
      logger.debug('[SetupPolling] Setup completed:', {
        response: response.data,
        elapsedTime: startTime ? Math.round((Date.now() - startTime) / 1000) : 0
      });
      
      // Reset polling state
      setIsPolling(false);
      setStartTime(null);
      setRetryCount(0);
      setError(null);
      
      return response.data;
    } catch (error) {
      logger.error('[SetupPolling] Failed to complete setup:', {
        error: error.message,
        status: error.response?.status
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        setError('Authentication failed. Please try signing in again.');
      } else if (error.response?.status === 409) {
        // Setup already completed
        return { status: 'complete' };
      } else {
        setError('Failed to complete setup process. Please try again.');
      }
      throw error;
    }
  }, [startTime]);

  useEffect(() => {
    let timeoutId;
    let currentRetryCount = 0;

    const pollStatus = async () => {
      if (!isPolling) return;

      // Check if we recently had a 429 error and need to wait longer
      let last429Time = null;
      
      // Get from app cache if available
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) appCache.init();
        if (!appCache.get('polling')) appCache.set('polling', {});
        last429Time = appCache.get('polling.last429ErrorTime');
      }
      
      if (last429Time) {
        const timeSince429 = Date.now() - parseInt(last429Time, 10);
        const minWaitTime = MAX_POLLING_INTERVAL * 4; // At least 4x max interval after a 429 (increased from 2x)
        
        if (timeSince429 < minWaitTime) {
          const remainingWait = minWaitTime - timeSince429;
          logger.info(`[SetupPolling] Still in 429 cooldown period, waiting ${remainingWait}ms more`);
          
          // Try to refresh user attributes during cooldown period
          try {
            await auth.// fetchUserAttributes() - removed Amplify;
            logger.info('[SetupPolling] Refreshed user attributes during cooldown period');
          } catch (refreshError) {
            logger.error('[SetupPolling] Failed to refresh user attributes during cooldown:', refreshError);
          }
          
          timeoutId = setTimeout(pollStatus, remainingWait);
          return;
        } else {
          // Clear the 429 timestamp if enough time has passed
          if (typeof window !== 'undefined' && appCache.getAll()
            delete appCache.get('polling.last429ErrorTime');
          }
        }
      }

      try {
        const response = await axiosInstance.get(
          '/api/onboarding/setup/status/'
        );
        const newStatus = response.data;
        setStatus(newStatus);
        
        // Reset retry count on success
        currentRetryCount = 0;

        if (newStatus.status === 'complete') {
          setIsPolling(false);
        } else {
          // Use exponential backoff for polling interval
          timeoutId = setTimeout(pollStatus, getPollingInterval(currentRetryCount));
        }
      } catch (error) {
        logger.error('[SetupPolling] Failed to fetch setup status:', error);
        
        // Increase retry count for backoff
        currentRetryCount = Math.min(currentRetryCount + 1, MAX_RETRIES);
        
        // If we get a 429 (Too Many Requests), increase the backoff more aggressively
        if (error.response?.status === 429) {
          // Jump to maximum retry count to use maximum delay
          currentRetryCount = MAX_RETRIES;
          logger.warn('[SetupPolling] Rate limited (429), using maximum backoff', {
            retryCount: currentRetryCount,
            nextDelay: getPollingInterval(currentRetryCount)
          });
          
          // Add an even longer delay for 429 errors - 5x the max interval (increased from 3x)
          const nextDelay = MAX_POLLING_INTERVAL * 5;
          logger.info('[SetupPolling] Adding maximum delay for rate limiting', { nextDelay });
          
          // Store the last 429 timestamp to avoid polling too soon
          if (typeof window !== 'undefined') {
            if (!appCache.getAll()) appCache.init();
            if (!appCache.get('polling')) appCache.set('polling', {});
            appCache.set('polling.last429ErrorTime', Date.now().toString());
          }
          
          // Force a refresh of the user's Cognito attributes to update onboarding status
          try {
            // Attempt to refresh the user's session to get updated attributes
            await auth.// fetchUserAttributes() - removed Amplify;
            logger.info('[SetupPolling] Refreshed user attributes after 429 error');
          } catch (refreshError) {
            logger.error('[SetupPolling] Failed to refresh user attributes:', refreshError);
          }
          
          timeoutId = setTimeout(pollStatus, nextDelay);
          return; // Skip the normal retry logic below
        }
        
        if (error.response?.status === 401) {
          setError('Authentication failed. Please try signing in again.');
          setIsPolling(false);
        } else if (currentRetryCount >= MAX_RETRIES) {
          setError('Failed to fetch setup status after multiple attempts. Please try again later.');
          setIsPolling(false);
        } else {
          // Continue polling with increased interval
          timeoutId = setTimeout(pollStatus, getPollingInterval(currentRetryCount));
        }
      }
    };

    if (isPolling) {
      pollStatus();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPolling]);

  return {
    status,
    error,
    isPolling,
    startPolling,
    stopPolling,
    completeSetup,
  };
}
