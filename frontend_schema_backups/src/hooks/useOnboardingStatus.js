'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import {
  getOnboardingStatus,
  updateOnboardingStatus,
  validateToken,
  refreshSession,
} from '@/lib/authUtils';
import { validateOnboardingState } from '@/utils/userAttributes';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function useOnboardingStatus() {
  const { data: session } = useSession();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!session?.user) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      // Validate token first
      const isValid = await validateToken();
      if (!isValid) {
        await refreshSession();
      }

      // Get status from Cognito user attributes
      const onboardingStatus = await getOnboardingStatus();
      if (!onboardingStatus) {
        throw new Error('Failed to get onboarding status');
      }

      // Validate the status
      const validatedStatus = validateOnboardingState(onboardingStatus);

      setStatus({
        status: validatedStatus,
        lastStep: validatedStatus,
        completedAt:
          validatedStatus === 'COMPLETE' ? new Date().toISOString() : null,
      });
      setError(null);
      setRetryCount(0);
    } catch (err) {
      logger.error('Error fetching onboarding status:', err);
      setError(err);

      if (retryCount < MAX_RETRIES) {
        setRetryCount((prev) => prev + 1);
        // Implement exponential backoff
        setTimeout(fetchStatus, RETRY_DELAY * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  }, [session, retryCount]);

  const updateStatus = useCallback(
    async (newStatus, lastStep = null) => {
      if (!session?.user) {
        throw new Error('No authenticated session');
      }

      try {
        // Validate the new status
        const validatedStatus = validateOnboardingState(newStatus);

        // Validate token before update
        const isValid = await validateToken();
        if (!isValid) {
          await refreshSession();
        }

        // Update status in Cognito
        await updateOnboardingStatus(validatedStatus);

        const updatedStatus = {
          status: validatedStatus,
          lastStep: lastStep
            ? validateOnboardingState(lastStep)
            : validatedStatus,
          completedAt:
            validatedStatus === 'COMPLETE' ? new Date().toISOString() : null,
        };

        setStatus(updatedStatus);
        return updatedStatus;
      } catch (err) {
        logger.error('Error updating onboarding status:', err);
        throw err;
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) return;

    fetchStatus();

    // Only poll if we have a session and haven't completed onboarding
    if (session && status?.status !== 'COMPLETE') {
      const pollInterval = setInterval(fetchStatus, POLL_INTERVAL);
      return () => clearInterval(pollInterval);
    }
  }, [session, status?.status, fetchStatus]);

  return {
    status: status?.status || null,
    lastStep: status?.lastStep || null,
    completedAt: status?.completedAt || null,
    loading,
    error,
    updateStatus,
  };
}
