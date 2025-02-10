import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const POLLING_INTERVAL = 3000; // 3 seconds

export function useSetupPolling() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const startPolling = useCallback(async () => {
    setIsPolling(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/onboarding/setup/start');
      logger.debug('Setup started:', response.data);
    } catch (error) {
      logger.error('Failed to start setup:', error);
      setError('Failed to start setup process');
      setIsPolling(false);
      return;
    }
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const completeSetup = useCallback(async () => {
    try {
      const response = await axiosInstance.post(
        '/api/onboarding/setup/complete'
      );
      logger.debug('Setup completed:', response.data);
      setIsPolling(false);
      return response.data;
    } catch (error) {
      logger.error('Failed to complete setup:', error);
      setError('Failed to complete setup process');
      throw error;
    }
  }, []);

  useEffect(() => {
    let timeoutId;

    const pollStatus = async () => {
      if (!isPolling) return;

      try {
        const response = await axiosInstance.get(
          '/api/onboarding/setup/status'
        );
        const newStatus = response.data;
        setStatus(newStatus);

        if (newStatus.status === 'complete') {
          setIsPolling(false);
        } else {
          timeoutId = setTimeout(pollStatus, POLLING_INTERVAL);
        }
      } catch (error) {
        logger.error('Failed to fetch setup status:', error);
        setError('Failed to fetch setup status');
        setIsPolling(false);
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
