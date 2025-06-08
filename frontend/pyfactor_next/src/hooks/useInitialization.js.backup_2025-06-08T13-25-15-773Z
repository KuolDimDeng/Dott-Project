// hooks/useInitialization.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

const INIT_STATES = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
};

export const useInitialization = (options = {}) => {
  const { maxAttempts = 3, timeout = 10000, onSuccess, onError, dependencies = [] } = options;

  const [status, setStatus] = useState(INIT_STATES.IDLE);
  const [error, setError] = useState(null);
  const attempts = useRef(0);
  const timeoutRef = useRef(null);
  const mounted = useRef(false);

  const initialize = useCallback(async () => {
    if (attempts.current >= maxAttempts) {
      const error = new Error('Max initialization attempts reached');
      setError(error);
      setStatus(INIT_STATES.ERROR);
      onError?.(error);
      return false;
    }

    try {
      setStatus(INIT_STATES.PENDING);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Initialization timeout'));
        }, timeout);
      });

      // Race between initialization and timeout
      const result = await Promise.race([options.onInitialize?.(), timeoutPromise]);

      if (mounted.current) {
        setStatus(INIT_STATES.SUCCESS);
        setError(null);
        onSuccess?.(result);
      }

      return true;
    } catch (error) {
      logger.error('Initialization failed:', {
        attempt: attempts.current + 1,
        error,
        maxAttempts,
      });

      if (mounted.current) {
        attempts.current += 1;
        setError(error);
        setStatus(INIT_STATES.ERROR);
        onError?.(error);
      }

      return false;
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [maxAttempts, timeout, onSuccess, onError, options.onInitialize]);

  const reset = useCallback(() => {
    attempts.current = 0;
    setStatus(INIT_STATES.IDLE);
    setError(null);
  }, []);

  // Cleanup effect
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-initialize when dependencies change
  useEffect(() => {
    if (status === INIT_STATES.IDLE) {
      initialize();
    }
  }, [...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    error,
    attempts: attempts.current,
    isInitialized: status === INIT_STATES.SUCCESS,
    isInitializing: status === INIT_STATES.PENDING,
    initialize,
    reset,
  };
};
