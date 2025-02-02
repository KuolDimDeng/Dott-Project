// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/useSetupForm.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { setupStates, slideShowConfig, wsConfig } from './Setup.types';
import { persistenceService } from '@/services/persistenceService';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { onboardingApi } from '@/services/api/onboarding';
import { canNavigateToStep } from '@/app/onboarding/constants/onboardingConstants';
import { generateRequestId, getWebSocketUrl } from '@/lib/authUtils';

const WEBSOCKET_RETRY_DELAY = 3000;
const WEBSOCKET_MAX_RETRIES = 3;
const SETUP_REDIRECT_DELAY = 1000;

export const useSetupForm = () => {
  const router = useRouter();
  const { data: session, update } = useSession();
  const toast = useToast();

  const [state, setState] = useState({
    progress: 0,
    current_step: setupStates.INITIALIZING,
    isComplete: false,
    currentImageIndex: 0,
    wsConnected: false,
    isInitializing: true,
    selected_plan: null,
    requestId: generateRequestId()
  });

  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const slideShowIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const handleSetupError = (error, requestId) => {
    logger.error('Setup step failed:', {
      requestId,
      error: error.message,
      stack: error.stack,
      currentStep: session?.user?.onboarding_status
    });

    toast.dismiss();
    toast.error(error.message || 'Failed to complete setup');

    if (error.statusCode === 401) {
      router.replace('/auth/signin');
      return;
    }

    if (error.statusCode === 403) {
      router.replace('/onboarding/subscription');
      return;
    }
  };

  const handleSetupComplete = useCallback(async (data) => {
    try {
      if (!canNavigateToStep('setup')) {
        throw new Error('Setup step access denied');
      }

      const response = await onboardingApi.completeSetup({
        status: 'complete',
        tier: state.selected_plan,
        ...data,
      });

      if (response.data?.success) {
        // First update state to mark completion
        setState((prev) => ({
          ...prev,
          isComplete: true,
          progress: 100,
          wsConnected: false
        }));

        // Then perform cleanup
        const cleanup = async () => {
          // Close WebSocket connection first
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }

          // Clear any existing intervals
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (slideShowIntervalRef.current) {
            clearInterval(slideShowIntervalRef.current);
            slideShowIntervalRef.current = null;
          }

          // Update session last
          await update({
            ...session,
            user: {
              ...session?.user,
              onboarding_status: 'complete',
              setup_completed: true
            }
          });
        };

        // Perform cleanup and wait for it to complete
        await cleanup();

        const redirectUrl = `/${state.selected_plan === 'professional' ? 'pro/' : ''}dashboard`;

        logger.info('Setup completion successful:', {
          requestId: state.requestId,
          redirectUrl,
          tier: state.selected_plan,
        });

        // Let the parent component handle the redirect
        // This allows for proper cleanup in the component's unmount phase
        setState(prev => ({
          ...prev,
          redirectUrl
        }));
      }
    } catch (error) {
      logger.error('Setup completion failed:', {
        error: error.message,
        requestId: state.requestId,
        tier: state.selected_plan,
      });
      toast.error('Failed to complete setup. Please try again.');
    }
  }, [router, toast, session, update, state.requestId, state.selected_plan]);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      logger.debug('WebSocket message received:', {
        requestId: state.requestId,
        type: data.type,
        progress: data.progress,
        step: data.step
      });

      switch (data.type) {
        case 'progress':
          setState(prev => ({
            ...prev,
            progress: data.progress || prev.progress,
            current_step: data.step || 'Processing'
          }));
          
          if (data.status === 'complete') {
            handleSetupComplete(data);
          }
          break;

        case 'error':
          throw new Error(data.message || 'WebSocket error occurred');

        default:
          logger.warn('Unknown WebSocket message type:', {
            requestId: state.requestId,
            type: data.type,
            data
          });
      }
    } catch (error) {
      logger.error('WebSocket message handling failed:', {
        error: error.message,
        requestId: state.requestId
      });
    }
  }, [handleSetupComplete, state.requestId]);

  const setupWebSocket = useCallback(() => {
    if (!session?.user?.id || !state.selected_plan) {
      return;
    }

    const connectWebSocket = async () => {
      try {
        const wsUrl = getWebSocketUrl(
          session.user.id,
          session.user.accessToken,
          state.selected_plan
        );

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setState(prev => ({ ...prev, wsConnected: true }));
          retryCountRef.current = 0;
          logger.info('WebSocket connected:', { requestId: state.requestId });
        };

        wsRef.current.onmessage = handleWebSocketMessage;

        wsRef.current.onclose = () => {
          setState((prev) => ({ ...prev, wsConnected: false }));
          
          if (retryCountRef.current < WEBSOCKET_MAX_RETRIES) {
            retryCountRef.current++;
            setTimeout(() => {
              if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
                setupWebSocket();
              }
            }, WEBSOCKET_RETRY_DELAY);
          }
        };

        wsRef.current.onerror = (error) => {
          setState(prev => ({ ...prev, wsConnected: false }));
          logger.error('WebSocket error:', {
            error: error.message,
            requestId: state.requestId
          });
        };
      } catch (error) {
        logger.error('WebSocket setup failed:', {
          error: error.message,
          requestId: state.requestId
        });
      }
    };

    connectWebSocket();
  }, [session?.user?.id, state.selected_plan, state.requestId, handleWebSocketMessage]);

  useEffect(() => {
    const initializeSetup = async () => {
      if (session?.user?.id && state.isInitializing) {
        logger.info('Initializing setup:', { requestId: state.requestId });
        const requestId = state.requestId;

        try {
          let selected_plan = session.user.selected_plan;

          if (!selected_plan) {
            const tierResponse = await onboardingApi.getSubscriptionStatus();
            selected_plan = tierResponse?.data?.plan || 'free';

            await update({
              ...session,
              user: {
                ...session.user,
                selected_plan
              }
            });
          }

          setState((prev) => ({ ...prev, selected_plan }));

          const response = await onboardingApi.startSetup({
            tier: selected_plan,
            operation: 'create_database'
          });

          if (response?.success) {
            setState((prev) => ({ ...prev, isInitializing: false }));
            setupWebSocket();
          }
        } catch (error) {
          handleSetupError(error, requestId);
        }
      }
    };

    initializeSetup();
  }, [session?.user?.id, state.isInitializing, update, setupWebSocket]);

  useEffect(() => {
    if (!state.isInitializing && !state.wsConnected && state.selected_plan) {
      setupWebSocket();
    }
  }, [state.isInitializing, state.wsConnected, state.selected_plan, setupWebSocket]);

  useEffect(() => {
    if (!session?.user?.accessToken || !state.selected_plan) return;

    const pollStatus = async () => {
      try {
        const response = await onboardingApi.getSetupStatus();

        if (response.data?.status === 'complete') {
          handleSetupComplete(response.data);
        } else if (response.data?.progress) {
          setState(prev => ({
            ...prev,
            progress: response.data.progress,
            current_step: response.data.current_step || prev.current_step
          }));
        }
      } catch (error) {
        logger.error('Status polling failed:', {
          error: error.message,
          requestId: state.requestId
        });
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 5000);

    return () => clearInterval(pollIntervalRef.current);
  }, [session, state.selected_plan, handleSetupComplete]);

  useEffect(() => {
    if (!state.selected_plan) return;

    slideShowIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentImageIndex: (prev.currentImageIndex + 1) % 
          (slideShowConfig.IMAGES[state.selected_plan]?.length || 1)
      }));
    }, slideShowConfig.INTERVAL);

    return () => {
      if (slideShowIntervalRef.current) {
        clearInterval(slideShowIntervalRef.current);
      }
    };
  }, [state.selected_plan]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (slideShowIntervalRef.current) {
        clearInterval(slideShowIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    progress: state.progress,
    current_step: state.current_step,
    isComplete: state.isComplete,
    currentImageIndex: state.currentImageIndex,
    wsConnected: state.wsConnected,
    isInitializing: state.isInitializing,
    requestId: state.requestId,
    selected_plan: state.selected_plan,
    redirectUrl: state.redirectUrl,
  };
};
