'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { validateToken, refreshSession } from '@/lib/authUtils';

/**
 * Configuration constants for polling and retry behavior
 * @type {Readonly<{MAX_RETRIES: number, RETRY_DELAY: number, POLL_INTERVAL: number}>}
 */
const CONFIG = Object.freeze({
  /** Maximum number of retry attempts for failed operations */
  MAX_RETRIES: 3,
  /** Base delay in milliseconds for exponential backoff */
  RETRY_DELAY: 1000,
  /** Time in milliseconds between polling attempts */
  POLL_INTERVAL: 5000,
});

export const ONBOARDING_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  BUSINESS_INFO: 'BUSINESS_INFO',
  SUBSCRIPTION: 'SUBSCRIPTION',
  PAYMENT: 'PAYMENT',
  SETUP: 'SETUP',
  COMPLETE: 'COMPLETE',
};

/**
 * Custom hook for polling onboarding status with enhanced error handling
 * and state management
 */
export function useOnboardingPolling() {
  const { data: session } = useSession();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);

  // Function to validate status transitions
  const isValidTransition = useCallback((currentStatus, newStatus) => {
    const states = Object.values(ONBOARDING_STATES);
    const currentIndex = states.indexOf(currentStatus);
    const newIndex = states.indexOf(newStatus);
    return newIndex <= currentIndex + 1;
  }, []);

  const fetchStatus = useCallback(
    async (force = false) => {
      // Prevent polling too frequently unless forced
      const now = Date.now();
      if (!force && now - lastPollTime < CONFIG.POLL_INTERVAL) {
        return;
      }

      if (!session?.user) {
        setStatus(null);
        setLoading(false);
        return;
      }

      try {
        // Validate token first
        const { isValid, timeUntilExpiry } = await validateToken();
        if (!isValid) {
          await refreshSession();
        } else if (timeUntilExpiry < 10 * 60 * 1000) {
          // Refresh if < 10 minutes left
          refreshSession().catch((error) => {
            logger.warn('Pre-emptive token refresh failed:', error);
          });
        }

        const response = await fetch('/api/onboarding/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch onboarding status: ${response.status}`
          );
        }

        const data = await response.json();

        // Validate status transition
        if (status?.status && !isValidTransition(status.status, data.status)) {
          logger.warn('Invalid status transition detected:', {
            from: status.status,
            to: data.status,
          });
          // Keep current status but log the issue
          return;
        }

        const newStatus = {
          status: data.status,
          lastStep: data.lastStep || data.status,
          completedAt:
            data.status === ONBOARDING_STATES.COMPLETE
              ? data.completedAt || new Date().toISOString()
              : null,
        };

        // Only update if status has changed
        if (JSON.stringify(newStatus) !== JSON.stringify(status)) {
          logger.debug('Onboarding status updated:', {
            previousStatus: status?.status,
            newStatus: newStatus.status,
            lastStep: newStatus.lastStep,
          });
          setStatus(newStatus);
        }

        setError(null);
        setRetryCount(0);
        setPollAttempts((prev) => prev + 1);
        setLastPollTime(now);
      } catch (err) {
        logger.error('Error fetching onboarding status:', err);
        setError(err);

        if (retryCount < CONFIG.MAX_RETRIES) {
          setRetryCount((prev) => prev + 1);
          // Implement exponential backoff
          const delay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
          logger.debug(
            `Retrying in ${delay}ms (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`
          );
          setTimeout(() => fetchStatus(true), delay);
        } else {
          logger.error(
            `Max retries (${CONFIG.MAX_RETRIES}) reached for status polling`
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [session, retryCount, status, lastPollTime, isValidTransition]
  );

  /**
   * Updates the onboarding status with retry logic and validation
   */
  const updateStatus = useCallback(
    async (newStatus, lastStep = null) => {
      if (!session?.user) {
        throw new Error('No authenticated session');
      }

      // Validate the new status
      if (!Object.values(ONBOARDING_STATES).includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      // Validate the transition
      if (status?.status && !isValidTransition(status.status, newStatus)) {
        throw new Error(
          `Invalid transition from ${status.status} to ${newStatus}`
        );
      }

      let retries = 0;
      while (retries < CONFIG.MAX_RETRIES) {
        try {
          // Validate token before update
          const { isValid } = await validateToken();
          if (!isValid) {
            await refreshSession();
          }

          const response = await fetch('/api/onboarding/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              status: newStatus,
              lastStep: lastStep || newStatus,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || 'Failed to update onboarding status'
            );
          }

          const data = await response.json();
          const updatedStatus = {
            status: data.status,
            lastStep: data.lastStep || data.status,
            completedAt:
              data.status === ONBOARDING_STATES.COMPLETE
                ? data.completedAt
                : null,
            previousStatus: data.previousStatus,
          };

          logger.debug('Status update successful:', {
            previousStatus: status?.status,
            newStatus: updatedStatus.status,
            lastStep: updatedStatus.lastStep,
          });

          setStatus(updatedStatus);
          setError(null);
          return updatedStatus;
        } catch (err) {
          retries++;
          logger.error(
            `Error updating onboarding status (attempt ${retries}/${CONFIG.MAX_RETRIES}):`,
            err
          );

          if (retries === CONFIG.MAX_RETRIES) {
            setError(err);
            throw err;
          }

          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.RETRY_DELAY * Math.pow(2, retries - 1))
          );
        }
      }
    },
    [session, status, isValidTransition]
  );

  // Enhanced polling effect with cleanup and error recovery
  useEffect(() => {
    if (!session) return;

    // Initial fetch
    fetchStatus(true);

    let pollInterval;
    // Only poll if we have a session and haven't completed onboarding
    if (session && status?.status !== ONBOARDING_STATES.COMPLETE) {
      pollInterval = setInterval(() => {
        // Reset retry count on new polling cycle
        if (retryCount >= CONFIG.MAX_RETRIES) {
          setRetryCount(0);
        }
        fetchStatus();
      }, CONFIG.POLL_INTERVAL);
    }

    // Cleanup function
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      // Reset state on unmount
      setRetryCount(0);
      setPollAttempts(0);
      setLastPollTime(0);
    };
  }, [session, status?.status, fetchStatus, retryCount]);

  return {
    status: status?.status || null,
    lastStep: status?.lastStep || null,
    completedAt: status?.completedAt || null,
    loading,
    error,
    updateStatus,
    refetch: fetchStatus,
  };
}
