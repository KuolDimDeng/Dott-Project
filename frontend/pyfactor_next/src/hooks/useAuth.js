import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation'; // Changed to next/navigation
import { useSession, getSession, signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { persistenceService } from '@/services/persistenceService';

import { 
  validateSessionState,
  refreshSession,
  isTokenExpired,
  handleAuthFlow,
  generateRequestId
} from '@/lib/authUtils';

import { logger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/services/persistenceService';

export function useAuth() {
  // Core state management
  const { data: session, status: sessionStatus, update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Local state management with loading and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Computed states for quick access
  const isAuthenticated = !!session?.user?.accessToken;
  const isSessionLoading = sessionStatus === 'loading';

  // Handle step validation with persistence checks
  const validateStepAccess = useCallback(async (step, subscriptionData) => {
    const requestId = generateRequestId();

    try {
      logger.debug('Validating step access:', {
        requestId,
        step,
        hasSubscriptionData: !!subscriptionData
      });

      // Special handling for setup step
      if (step === 'setup') {
        const persistedData = await persistenceService.getData(STORAGE_KEYS.SUBSCRIPTION_DATA);
        
        logger.debug('Setup validation check:', {
          requestId,
          hasPersistedData: !!persistedData,
          selected_plan: persistedData?.selected_plan
        });

        return {
          isValid: !!persistedData?.selected_plan,
          selected_plan: persistedData?.selected_plan,
          reason: persistedData?.selected_plan ? 'VALID' : 'NO_PLAN_SELECTED'
        };
      }

      // Handle business-info step
      if (step === 'business-info') {
        return { isValid: true, reason: 'ALWAYS_ACCESSIBLE' };
      }

      // Default validation for other steps
      return { 
        isValid: true,
        reason: 'DEFAULT_ACCESS'
      };

    } catch (error) {
      logger.error('Step validation failed:', {
        requestId,
        step,
        error: error.message
      });
      return { 
        isValid: false,
        reason: 'VALIDATION_ERROR',
        error: error.message
      };
    }
  }, []);

  // Handle session updates with verification
  const updateSessionWithStep = useCallback(async (step, plan) => {
    const requestId = generateRequestId();

    try {
      logger.debug('Starting session update:', {
        requestId,
        step,
        plan,
        currentStatus: session?.user?.onboarding_status
      });

      // Update the session
      await update({
        ...session,
        user: {
          ...session.user,
          onboarding_status: step,
          selected_plan: plan,
          current_step: step
        }
      });

      // Verify the update
      const updatedSession = await getSession();
      const updateSuccess = updatedSession?.user?.onboarding_status === step;

      logger.debug('Session update verification:', {
        requestId,
        success: updateSuccess,
        expectedStatus: step,
        actualStatus: updatedSession?.user?.onboarding_status
      });

      if (!updateSuccess) {
        throw new Error('Session update verification failed');
      }

      return true;

    } catch (error) {
      logger.error('Session update failed:', {
        requestId,
        error: error.message,
        step,
        plan
      });
      return false;
    }
  }, [session, update]);

  // Session validation effect
  useEffect(() => {
    if (isSessionLoading || isValidating) return;

    const validateAuth = async () => {
      const requestId = generateRequestId();
      
      try {
        setIsValidating(true);
        setError(null);

        // Skip validation for public routes
        if (router.pathname === '/auth/signin' || 
            router.pathname === '/onboarding/business-info') {
          return;
        }

        // Full session validation
        const validation = await validateSessionState(session, requestId);
        
        if (!validation.isValid) {
          // Handle token refresh if needed
          if (validation.reason === 'Invalid token') {
            try {
              await refreshSession();
              const recheck = await validateSessionState(session, requestId);
              
              if (!recheck.isValid) {
                throw new Error('Session invalid after refresh');
              }
            } catch (refreshError) {
              await router.push('/auth/signin');
              return;
            }
          } else {
            await router.push(validation.redirectTo || '/auth/signin');
            return;
          }
        }

        setLastChecked(new Date());

      } catch (error) {
        logger.error('Auth validation failed:', {
          requestId,
          error: error.message,
          pathname: router.pathname
        });
        setError(error.message);
      } finally {
        setIsValidating(false);
        setIsLoading(false);
      }
    };

    validateAuth();
  }, [session, sessionStatus, router.pathname, isValidating, isSessionLoading]);

  // Enhanced logout handling
  const logout = useCallback(async () => {
    const requestId = generateRequestId();

    try {
      setIsLoading(true);
      logger.debug('Starting logout process', { requestId });

      // Clear persistence data
      await persistenceService.clearData(STORAGE_KEYS.SUBSCRIPTION_DATA);
      
      // Clear query cache
      queryClient.clear();
      
      // Sign out
      await signOut({ redirect: false });
      
      logger.debug('Logout successful, redirecting', { requestId });
      await router.push('/auth/signin');

    } catch (error) {
      logger.error('Logout failed:', {
        requestId,
        error: error.message
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, router]);

  // Session refresh check
  const checkSession = useCallback(async () => {
    if (!session?.user?.accessToken) return;

    const requestId = generateRequestId();

    try {
      if (isTokenExpired(session.user.accessToken)) {
        logger.debug('Token expired, refreshing', { requestId });
        await refreshSession();
      }
    } catch (error) {
      logger.error('Session check failed:', {
        requestId,
        error: error.message
      });
      setError(error.message);
    }
  }, [session]);

  return {
    // Auth state
    isAuthenticated,
    isLoading,
    isValidating,
    error,
    session,
    lastChecked,

    // Auth actions
    logout,
    checkSession,
    validateStepAccess,
    updateSessionWithStep,
    
    // Error handling
    clearError: () => setError(null),
  };
}