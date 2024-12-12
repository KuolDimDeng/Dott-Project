// /src/app/onboarding/components/Step4/useStep4Form.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { WS_CONFIG, SLIDESHOW_IMAGES } from './Step4.constants';

const getWebSocketUrl = (userId, token) => {
  try {
    if (!userId || !token) return null;
    const protocol = window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window?.location?.hostname || 'localhost';
    const port = hostname === 'localhost' ? ':8000' : '';
    return `${protocol}//${hostname}${port}/ws/onboarding/${userId}/?token=${encodeURIComponent(token)}`;
  } catch (error) {
    logger.error('Error creating WebSocket URL:', error);
    return null;
  }
};

export const useStep4Form = (session, formData, metadata, saveStep) => {
  const router = useRouter();

  // State
  const [initialized, setInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false); // Add this line
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [localError, setLocalError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const toast = useToast(); // Add this line near the top

  // Refs
  const ws = useRef(null);
  const pollIntervalRef = useRef(null);
  const slideShowIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const initAttemptRef = useRef(false);

  // Error handler
  const handleError = useCallback(
    (error) => {
      logger.error('Setup error:', error);

      let message = 'An unexpected error occurred';

      if (error.response) {
        switch (error.response.status) {
          case 401:
            message = 'Authentication error. Please sign in again.';
            router.push('/auth/signin');
            break;
          case 403:
            message = 'You do not have permission to perform this action';
            break;
          case 409:
            message = 'Setup is already in progress';
            break;
          case 500:
            message = 'Server error. Please try again later';
            break;
          default:
            message = error.response.data?.message || error.message;
        }
      } else if (error.request) {
        message = 'Unable to connect to server. Please check your connection';
      }

      setLocalError(message);
      toast.error(message);
    },
    [router, toast]
  ); // Add toast to dependencies

  // In useStep4Form:
  const handleSetupComplete = useCallback(
    async (data) => {
      try {
        // First validate that we have required data
        if (!data.task_info?.database_name) {
          throw new Error('Missing database information');
        }

        // Save completion status
        await saveStep('complete', {
          status: 'complete',
          database_name: data.task_info.database_name,
        });

        // Clear polling interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        toast.success('Setup completed successfully!');
        await router.replace('/dashboard');
      } catch (error) {
        logger.error('Setup completion error:', error);
        handleError(error);
      }
    },
    [saveStep, router, toast, handleError]
  );

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (event) => {
      try {
        if (!event.data) {
          logger.warn('Received empty WebSocket message');
          return;
        }

        const data = JSON.parse(event.data);

        if (!data.type) {
          logger.warn('WebSocket message missing type:', data);
          return;
        }

        switch (data.type) {
          case 'connection_established':
            logger.info('WebSocket connection established');
            break;

          case 'progress':
            setProgress(data.progress || 0);
            setCurrentStep(data.step || 'Processing');
            if (data.status === 'complete') {
              handleSetupComplete(data);
            }
            break;

          default:
            logger.warn('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    },
    [handleSetupComplete]
  );

  // Polling fallback
  const startPolling = useCallback(() => {
    logger.debug('Starting polling fallback');

    // Clear existing WebSocket
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setWsConnected(false);

    // Clear existing poll interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    let retryCount = 0;
    const maxRetries = WS_CONFIG.MAX_POLL_RETRIES;

    const poll = async () => {
        try {
            const response = await axiosInstance.get('/api/onboarding/step4/setup/status/');
            const { status, progress, step, task_id, task_info } = response.data;
            logger.debug('Polling status:', response.data);
            
            // Handle different status cases
            switch(status) {
                case 'complete':
                    setProgress(100);
                    setCurrentStep('Setup Complete');
                    clearInterval(pollIntervalRef);
                    return;
                
                case 'IN_PROGRESS':
                    if (task_id) {
                        setProgress(progress || 0);
                        setCurrentStep(step || 'Processing');
                    }
                    break;
                    
                case 'FAILURE':
                    setLocalError('Setup failed');
                    clearInterval(pollIntervalRef);
                    break;
            }
        } catch (error) {
            console.error('Error polling status:', error);
            logger.error('Error polling status:', error);
        }
    };

    // Start first poll immediately
    poll();

    // Then set up interval
    // Set interval
    const pollInterval = setInterval(poll, 2000);
    pollIntervalRef.current = pollInterval;

    return () => {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    };
  }, [router, handleSetupComplete, handleError]);

  // WebSocket setup
  // In useStep4Form.js
  const setupWebSocket = useCallback(() => {
    if (isConnecting || wsConnected) {
      logger.debug('WebSocket setup skipped - already connecting/connected');
      return;
    }

    setIsConnecting(true);
    let retryCount = 0;

    // Close any existing connection
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
      ws.current = null;
    }

    const wsUrl = getWebSocketUrl(session?.user?.id, session?.user?.accessToken);
    if (!wsUrl) {
      logger.error('Failed to create WebSocket URL');
      setIsConnecting(false);
      startPolling();
      return;
    }

    try {
      ws.current = new WebSocket(wsUrl);

      // Set timeout for connection
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          logger.warn('WebSocket connection timeout');
          ws.current?.close();
          setIsConnecting(false);
          startPolling();
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);

      ws.current.onopen = () => {
        logger.info('WebSocket connection established');
        clearTimeout(connectionTimeoutRef.current);
        setIsConnecting(false);
        setWsConnected(true);
        retryCount = 0;
      };

      ws.current.onmessage = handleWebSocketMessage;

      ws.current.onclose = () => {
        logger.debug('WebSocket connection closed');
        setWsConnected(false);
        setIsConnecting(false);
        if (!isComplete) {
          startPolling();
        }
      };

      ws.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setWsConnected(false);
        setIsConnecting(false);
        if (!isComplete) {
          startPolling();
        }
      };
    } catch (error) {
      logger.error('Failed to setup WebSocket:', error);
      setIsConnecting(false);
      startPolling();
    }
  }, [session, isConnecting, wsConnected, isComplete, handleWebSocketMessage, startPolling]);

  // Start setup
  const startSetup = useCallback(async () => {
    try {
      setLocalError(null);
      const response = await axiosInstance.post('/api/onboarding/step4/setup/start/');
      logger.info('Setup started:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to start setup:', error);
      setLocalError(error.message);
      throw error;
    }
  }, []);

  const initSetup = useCallback(async () => {
    // Check all conditions before proceeding
    if (!session?.user?.id || initAttemptRef.current || isInitializing) {
      return;
    }

    try {
      // Set initialization state
      setIsInitializing(true);
      initAttemptRef.current = true;

      logger.debug('Starting setup initialization');
      const setupResponse = await startSetup();
      logger.debug('Setup response:', setupResponse);

      if (setupResponse?.status === 'started') {
        setupWebSocket();
      } else {
        startPolling();
      }
      setInitialized(true);
    } catch (error) {
      logger.error('Setup initialization failed:', error);
      handleError(error);
      startPolling();
    } finally {
      // Always reset initialization state
      setIsInitializing(false);
      // Note: we keep initAttemptRef.current as true to prevent multiple attempts
    }
  }, [
    session?.user?.id,
    startSetup,
    setupWebSocket,
    startPolling,
    handleError,
    isInitializing, // Now this dependency is properly defined
  ]);

  // Use useEffect for initialization
  useEffect(() => {
    if (!initialized && session?.user?.id && !initAttemptRef.current) {
      const timeoutId = setTimeout(() => {
        initSetup();
      }, 100); // Add small delay to prevent race conditions

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [initialized, session?.user?.id, initSetup]);

  // Slideshow effect
  useEffect(() => {
    slideShowIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, WS_CONFIG.SLIDESHOW_INTERVAL);

    return () => {
      if (slideShowIntervalRef.current) {
        clearInterval(slideShowIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      // Combine cleanup logic here
      if (!isComplete) {
        axiosInstance.post('/api/onboarding/step4/setup/cancel/').catch((error) => {
          if (error?.response?.status !== 404) {
            logger.error('Error canceling setup:', error);
          }
        });
      }

      // Clean up all refs and connections
      if (ws.current) ws.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (slideShowIntervalRef.current) clearInterval(slideShowIntervalRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

      ws.current = null;
      initAttemptRef.current = false;
      setWsConnected(false);
    };
  }, [isComplete]);

  return {
    progress,
    currentStep,
    error: localError,
    isComplete,
    currentImageIndex,
    wsConnected,
    isConnecting,
    initialized, // Add initialized to returned values
    setProgress,
    setCurrentStep,
    setLocalError,
    setIsComplete,
    setCurrentImageIndex,
    setWsConnected,
    setIsConnecting,
    startSetup,
    handleError,
    handleSetupComplete,
    setupWebSocket,
    startPolling,
    initSetup,
  };
};
