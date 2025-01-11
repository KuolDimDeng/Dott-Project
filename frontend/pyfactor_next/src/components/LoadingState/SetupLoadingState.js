///Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LoadingState/SetupLoadingState.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PropTypes from 'prop-types';
import { LoadingStateWithProgress } from './LoadingStateWithProgress';
import { validateUserState } from '@/lib/authUtils';
import { logger } from '@/utils/logger';


export function SetupLoadingState({ 
  isBackground = true, 
  setupStarted = false,
  isInitializing = false,
  isValidating = false 
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const timeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000;

    const checkStatus = async () => {
      try {
        if (!session?.user) return;

        // Add timeout protection
        const validationPromise = validateUserState(session);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        );

        const validationResult = await Promise.race([
          validationPromise,
          timeoutPromise
        ]);
        
        if (!mounted) return;

        if (validationResult.isValid) {
          clearInterval(pollIntervalRef.current);
          router.push(validationResult.redirectTo);
          return;
        }

        // Reset retry count on successful response
        retryCount = 0;

        // Handle specific validation states
        switch (validationResult.reason) {
          case 'unhealthy_database':
            setProgress(validationResult.details?.progress || 0);
            setStatus(validationResult.details?.status || 'Setting up database...');
            break;
            
          case 'incomplete_onboarding':
            clearInterval(pollIntervalRef.current);
            router.push(validationResult.redirectTo);
            break;

          case 'no_database':
            if (!setupStarted) {
              clearInterval(pollIntervalRef.current);
              router.push('/onboarding/step1');
            }
            break;

          default:
            clearInterval(pollIntervalRef.current);
            router.push(validationResult.redirectTo);
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          logger.info('Status check aborted');
          return;
        }

        logger.error('Setup status check failed:', {
          error,
          retryCount,
          maxRetries: MAX_RETRIES
        });

        retryCount++;
        
        if (retryCount >= MAX_RETRIES) {
          setError(error.message);
          clearInterval(pollIntervalRef.current);
          return;
        }

        // Exponential backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    // Add timeout for overall polling
    timeoutRef.current = setTimeout(() => {
      if (mounted && isPolling) {
        setError('Status check timed out');
        clearInterval(pollIntervalRef.current);
      }
    }, 30000);

    setIsPolling(true);
    pollIntervalRef.current = setInterval(checkStatus, BASE_DELAY);
    checkStatus();

    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(timeoutRef.current);
      clearInterval(pollIntervalRef.current);
      setIsPolling(false);
    };
  }, [session, router, setupStarted]);

  const getMessage = useCallback(() => {
    if (isInitializing) return "Initializing setup...";
    if (isValidating) return "Validating setup...";
    if (isPolling && !status) return "Checking status...";
    return status || "Setting up your workspace...";
  }, [isInitializing, isValidating, isPolling, status]);

  if (error) {
    return (
      <LoadingStateWithProgress
        message="Setup error occurred"
        showProgress={false}
        isBackground={isBackground}
        error={error}
        onRetry={() => {
          setError(null);
          setProgress(0);
          setStatus('');
        }}
      />
    );
  }

  return (
    <LoadingStateWithProgress
      message={getMessage()}
      showProgress={!isValidating && !isInitializing}
      progress={progress}
      isBackground={isBackground}
      isLoading={isPolling || isValidating || isInitializing}
      image={{
        src: '/static/images/Pyfactor.png',
        alt: 'Pyfactor Logo',
        width: 150,
        height: 100,
      }}
    />
  );
}

// Add PropTypes
SetupLoadingState.propTypes = {
  isBackground: PropTypes.bool,
  setupStarted: PropTypes.bool,
  isInitializing: PropTypes.bool,
  isValidating: PropTypes.bool
};