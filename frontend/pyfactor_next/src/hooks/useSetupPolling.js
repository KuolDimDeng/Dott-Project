import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getCurrentUser } from 'aws-amplify/auth';

// Increase initial polling interval and add exponential backoff
const BASE_POLLING_INTERVAL = 5000; // 5 seconds
const MAX_POLLING_INTERVAL = 60000; // 60 seconds (1 minute)
const MAX_POLLING_TIME = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 5;

// Calculate polling interval with exponential backoff
const getPollingInterval = (retryCount) => {
  return Math.min(BASE_POLLING_INTERVAL * Math.pow(2, retryCount), MAX_POLLING_INTERVAL);
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
          currentRetryCount = Math.min(currentRetryCount + 2, MAX_RETRIES);
          logger.warn('[SetupPolling] Rate limited (429), increasing backoff', {
            retryCount: currentRetryCount,
            nextDelay: getPollingInterval(currentRetryCount)
          });
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
