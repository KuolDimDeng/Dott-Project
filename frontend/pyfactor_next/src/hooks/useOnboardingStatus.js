'use client';


import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { logger } from '@/utils/logger';
import { getOnboardingStatus } from '@/services/api/onboarding';
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
      // Get onboarding status from API
      const onboardingStatus = await getOnboardingStatus();
      if (!onboardingStatus) {
        throw new Error('Failed to get onboarding status');
      }

      // Extract status from response
      const currentStatus = onboardingStatus.onboarding_status || onboardingStatus.status || 'not_started';
      const isComplete = onboardingStatus.onboarding_completed || currentStatus === 'complete';
      
      setStatus({
        status: currentStatus,
        lastStep: onboardingStatus.current_step || currentStatus,
        completedAt: isComplete ? new Date().toISOString() : null,
        raw: onboardingStatus
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
        // For now, just update the local state
        // TODO: Implement backend update when needed
        const updatedStatus = {
          status: newStatus,
          lastStep: lastStep || newStatus,
          completedAt:
            newStatus === 'complete' ? new Date().toISOString() : null,
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
    if (session && status?.status !== 'complete') {
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
