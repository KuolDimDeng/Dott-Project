// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/useSetupForm.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { setupStates, slideShowConfig, wsConfig } from './Setup.types';
import { persistenceService } from '@/services/persistenceService';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { 
  validateUserState, 
  handleAuthError, 
  generateRequestId,
  validateOnboardingStep,
  makeRequest,
  getWebSocketUrl 
} from '@/lib/authUtils';

export const useSetupForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const { canNavigateToStep } = useOnboarding();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(setupStates.INITIALIZING);
  const [isComplete, setIsComplete] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [requestId] = useState(() => generateRequestId());
  const [selectedTier, setSelectedTier] = useState(null);

  const ws = useRef(null);
  const slideShowIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const handleSetupComplete = useCallback(async (data) => {
    try {
      if (!canNavigateToStep('setup')) {
        throw new Error('Cannot access setup step');
      }

      const response = await makeRequest(() => ({
        promise: fetch('/api/onboarding/setup/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'complete',
            tier: selectedTier,
            ...data
          })
        })
      }));

      setIsComplete(true);
      setProgress(100);

      if (response.data?.redirect_url) {
        logger.debug('Setup complete, redirecting to:', {
          url: response.data.redirect_url,
          tier: selectedTier
        });
        
        setTimeout(() => {
          router.replace(response.data.redirect_url);
        }, 1000);
      } else {
        const dashboardPath = selectedTier === 'professional' ? '/pro/dashboard' : '/dashboard';
        logger.debug('Setup complete, redirecting to dashboard:', {
          path: dashboardPath,
          tier: selectedTier
        });
        await router.replace(dashboardPath);
      }

    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Setup completion failed:', { 
        error: errorResult,
        requestId,
        tier: selectedTier
      });
      toast.error(errorResult.message);
    }
  }, [router, toast, session, requestId, selectedTier, canNavigateToStep]);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      logger.debug('WebSocket message received:', {
        type: data.type,
        progress: data.progress,
        step: data.step
      });

      switch (data.type) {
        case 'progress':
          setProgress(data.progress || 0);
          setCurrentStep(data.step || 'Processing');
          if (data.status === 'complete') {
            handleSetupComplete(data);
          }
          break;

        case 'error':
          throw new Error(data.message);

        default:
          logger.warn('Unknown WebSocket message type:', {
            type: data.type,
            data
          });
      }
    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('WebSocket message error:', { 
        error: errorResult,
        requestId 
      });
    }
  }, [handleSetupComplete, requestId]);

  const setupWebSocket = useCallback(() => {
    if (!session?.user?.id || !selectedTier) {
      logger.debug('Cannot setup WebSocket - missing requirements:', {
        hasUserId: !!session?.user?.id,
        tier: selectedTier
      });
      return;
    }

    const wsUrl = getWebSocketUrl(session.user.id, session.user.accessToken, selectedTier);
    if (!wsUrl) {
      logger.error('Failed to create WebSocket URL');
      return;
    }

    ws.current = new WebSocket(wsUrl);
    const reconnectConfig = wsConfig[selectedTier];

    ws.current.onopen = () => {
      setWsConnected(true);
      logger.info('WebSocket connected', { tier: selectedTier });
    };

    ws.current.onmessage = handleWebSocketMessage;

    ws.current.onclose = () => {
      setWsConnected(false);
      logger.info('WebSocket closed', { tier: selectedTier });
    };

    ws.current.onerror = (error) => {
      const errorResult = handleAuthError(error);
      logger.error('WebSocket error:', { 
        error: errorResult,
        requestId,
        tier: selectedTier
      });
      setWsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [session?.user?.id, handleWebSocketMessage, requestId, selectedTier]);

  const startSetup = useCallback(async () => {
    try {
      if (!canNavigateToStep('setup')) {
        throw new Error('Cannot access setup step');
      }

      const userState = await validateUserState(session, requestId);
      if (!userState.isValid) {
        throw new Error(userState.reason);
      }

      const tier = await persistenceService.getCurrentTier();
      setSelectedTier(tier);

      logger.debug('Starting setup:', {
        tier,
        requestId
      });

      const response = await makeRequest(() => ({
        promise: fetch('/api/onboarding/setup/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tier })
        })
      }));

      setupWebSocket();
      setIsInitializing(false);

      return response.data;

    } catch (error) {
      const errorResult = handleAuthError(error);
      logger.error('Setup initialization failed:', { 
        error: errorResult,
        requestId,
        tier: selectedTier
      });
      toast.error(errorResult.message);
      router.replace('/onboarding/subscription');
    }
  }, [session, router, toast, setupWebSocket, requestId, canNavigateToStep]);

  useEffect(() => {
    if (session?.user?.id && isInitializing) {
      startSetup();
    }
  }, [session?.user?.id, isInitializing, startSetup]);

  useEffect(() => {
    if (!selectedTier) return;

    slideShowIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => 
        (prev + 1) % (slideShowConfig.IMAGES[selectedTier]?.length || 1)
      );
    }, slideShowConfig.INTERVAL);

    return () => {
      if (slideShowIntervalRef.current) {
        clearInterval(slideShowIntervalRef.current);
      }
    };
  }, [selectedTier]);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
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
    progress,
    currentStep,
    isComplete,
    currentImageIndex,
    wsConnected,
    isInitializing,
    requestId,
    selectedTier
  };
};