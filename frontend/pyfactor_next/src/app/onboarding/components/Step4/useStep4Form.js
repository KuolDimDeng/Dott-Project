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
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [localError, setLocalError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const toast = useToast();  // Add this line near the top

  // Refs
  const ws = useRef(null);
  const pollIntervalRef = useRef(null);
  const slideShowIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const initAttemptRef = useRef(false);


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


    // Define initSetup before it's used
  // Move initSetup after startSetup is defined
  const initSetup = useCallback(async () => {
    if (!session?.user?.id || initAttemptRef.current) {
      return;
    }

    try {
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
    }
  }, [session?.user?.id, startSetup, setupWebSocket, startPolling, handleError]);

  // Use useEffect for initialization
  useEffect(() => {
    if (!initialized && session?.user?.id && !initAttemptRef.current) {
      initSetup();
    }
    
    return () => {
      initAttemptRef.current = false;
    };
  }, [initialized, session?.user?.id, initSetup]);




  // Error handler
  const handleError = useCallback((error) => {
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
}, [router, toast]); // Add toast to dependencies


  // Setup completion handler
  const handleSetupComplete = useCallback(async (data) => {
    try {
      setProgress(100);
      setIsComplete(true);
      
      await saveStep('step4', {
        status: 'complete',
        database_name: data.database_name
      });

      toast.success('Setup completed successfully!');  // Add toast here
      
      const nextRoute = metadata?.nextStep 
        ? `/onboarding/${metadata.nextStep.toLowerCase()}`
        : '/dashboard';
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await router.replace(nextRoute);

    } catch (error) {
      handleError(error);
    }
}, [metadata, router, saveStep, handleError, toast]); // Add toast to dependencies

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event) => {
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
  }, [handleSetupComplete]);

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
        const data = response.data;
        retryCount = 0;
  
        logger.debug('Poll response:', data);
  
        if (data.status === 'complete') {
          clearInterval(pollIntervalRef.current);
          handleSetupComplete(data);
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          handleError(new Error(data.error || 'Setup failed'));
        } else {
          setProgress(data.progress || 0);
          setCurrentStep(data.currentStep || 'Processing');
        }
      } catch (error) {
        logger.error('Polling error:', error);
        retryCount++;
        
        if (error?.response?.status === 401) {
          clearInterval(pollIntervalRef.current);
          router.push('/auth/signin');
          return;
        }
  
        if (retryCount >= maxRetries) {
          clearInterval(pollIntervalRef.current);
          handleError(new Error('Failed to check setup status'));
          return;
        }
  
        // Exponential backoff for retries
        const delay = Math.min(
          WS_CONFIG.POLL_INTERVAL * Math.pow(2, retryCount), 
          WS_CONFIG.MAX_POLL_INTERVAL
        );
        
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(poll, delay);
      }
    };
  
    // Start first poll immediately
    poll();
    
    // Then set up interval
    pollIntervalRef.current = setInterval(poll, WS_CONFIG.POLL_INTERVAL);
  
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [router, handleSetupComplete, handleError]);






  // Slideshow effect
  useEffect(() => {
    slideShowIntervalRef.current = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, WS_CONFIG.SLIDESHOW_INTERVAL);

    return () => {
        if (slideShowIntervalRef.current) {
            clearInterval(slideShowIntervalRef.current);
        }
    };
}, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (!isComplete) {
        axiosInstance.post('/api/onboarding/step4/setup/cancel/')
          .catch(error => {
            if (error?.response?.status !== 404) {
              logger.error('Error canceling setup:', error);
            }
          });
      }

      if (ws.current) ws.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (slideShowIntervalRef.current) clearInterval(slideShowIntervalRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

      ws.current = null;
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
    initialized,  // Add initialized to returned values
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
    initSetup
  };
};