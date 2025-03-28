///Users/kuoldeng/projectx/frontend/pyfactor_next/src/services/onboardingService.js
import { logger } from '@/utils/logger';
import { fetchAuthSession } from 'aws-amplify/auth';
import { refreshUserSession } from '@/utils/refreshUserSession';

const BASE_URL = '/api/onboarding'

/**
 * Enhanced fetch with session token handling
 * Ensures that API requests include proper tokens and handles auth retries
 */
const enhancedFetch = async (url, options = {}) => {
  const maxRetries = 3;
  let retryCount = 0;
  
  const attemptFetch = async () => {
    try {
      // First try to get a valid session
      let tokens = null;
      try {
        const authSession = await fetchAuthSession();
        tokens = authSession.tokens;
      } catch (sessionError) {
        logger.warn('[OnboardingService] Error fetching auth session:', sessionError.message);
      }
      
      if (!tokens?.idToken) {
        logger.debug('[OnboardingService] No valid session, attempting refresh');
        
        try {
          await refreshUserSession();
          // Check if refresh worked
          const refreshedSession = await fetchAuthSession();
          if (!refreshedSession?.tokens?.idToken) {
            logger.warn('[OnboardingService] Session refresh failed');
          } else {
            tokens = refreshedSession.tokens;
          }
        } catch (refreshError) {
          logger.warn('[OnboardingService] Session refresh failed:', refreshError.message);
        }
      }
      
      // Set up headers with auth tokens and cookies
      const headers = {
        ...(options.headers || {}),
      };
      
      // Use tokens if available
      if (tokens?.idToken) {
        headers['X-Id-Token'] = tokens.idToken.toString();
      }
      
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken.toString()}`;
      }
      
      // Try to get cookies
      try {
        const savedIdToken = document.cookie.match(/idToken=([^;]+)/)?.[1];
        const savedAccessToken = document.cookie.match(/accessToken=([^;]+)/)?.[1];
        
        if (!headers['X-Id-Token'] && savedIdToken) {
          headers['X-Id-Token'] = decodeURIComponent(savedIdToken);
        }
        
        if (!headers['Authorization'] && savedAccessToken) {
          headers['Authorization'] = `Bearer ${decodeURIComponent(savedAccessToken)}`;
        }
      } catch (cookieError) {
        logger.warn('[OnboardingService] Error reading token cookies:', cookieError);
      }
      
      // Add general onboarding headers
      headers['X-Onboarding-Route'] = 'true';
      
      // Check if it's a business-info or partial request
      const isBusinessInfoRequest = url.includes('business-info') || url.includes('allowPartial=true');
      if (isBusinessInfoRequest) {
        headers['X-Allow-Partial'] = 'true';
      }
      
      // Perform the fetch with tokens
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // If unauthorized and we have retries left, try again
      if (response.status === 401 && retryCount < maxRetries) {
        retryCount++;
        logger.warn(`[OnboardingService] 401 response, retrying (${retryCount}/${maxRetries})`);
        
        // Force session refresh before retry
        await refreshUserSession();
        
        // Add delay with exponential backoff
        const delay = 500 * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return attemptFetch();
      }
      
      return response;
    } catch (error) {
      if (retryCount < maxRetries) {
        retryCount++;
        logger.warn(`[OnboardingService] Fetch error, retrying (${retryCount}/${maxRetries}): ${error.message}`);
        
        // Add delay with exponential backoff
        const delay = 500 * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return attemptFetch();
      }
      
      throw error;
    }
  };
  
  return attemptFetch();
};

/**
 * Enhanced Onboarding Service
 * Provides a centralized way to manage onboarding state with comprehensive error handling
 * and synchronous state updates
 */
export const onboardingService = {
  /**
   * Get current onboarding state from server
   */
  async getState(options = {}) {
    logger.debug('[OnboardingService] Fetching onboarding state');
    
    const { allowPartial = true, forBusinessInfo = false } = options;
    
    try {
      const queryParams = [];
      
      if (allowPartial) {
        queryParams.push('allowPartial=true');
      }
      
      if (forBusinessInfo) {
        queryParams.push('step=business-info');
      }
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await enhancedFetch(`${BASE_URL}/state${queryString}`);
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('[OnboardingService] Failed to fetch state:', error);
        
        // Create fallback for business-info page
        if (forBusinessInfo || allowPartial) {
          logger.debug('[OnboardingService] Using fallback for state retrieval');
          return {
            status: 'NOT_STARTED',
            currentStep: 'business-info',
            userData: {
              email: '',
              businessName: '',
              businessType: ''
            },
            isAuthenticated: false,
            isPartial: true
          };
        }
        
        throw new Error(error.message || 'Failed to get onboarding state');
      }

      const data = await response.json();
      logger.debug('[OnboardingService] State retrieved', { data });
      return data;
    } catch (error) {
      logger.error('[OnboardingService] Error in getState:', error);
      
      // Create fallback for business-info page
      if (forBusinessInfo || allowPartial) {
        logger.debug('[OnboardingService] Using fallback after state retrieval error');
        return {
          status: 'NOT_STARTED',
          currentStep: 'business-info',
          userData: {
            email: '',
            businessName: '',
            businessType: ''
          },
          isAuthenticated: false,
          isPartial: true
        };
      }
      
      throw error;
    }
  },

  /**
   * Update onboarding state on server and handle local state updates
   */
  async updateState(step, data) {
    logger.debug('[OnboardingService] Updating onboarding state', { step, data });
    
    try {
      const response = await enhancedFetch(`${BASE_URL}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ step, data })
      });
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('[OnboardingService] Failed to update state:', error);
        throw new Error(error.message || 'Failed to update onboarding state');
      }

      // Update local state
      this.updateLocalState(step, data);
      
      const result = await response.json();
      logger.debug('[OnboardingService] State updated successfully', { result });
      return result;
    } catch (error) {
      logger.error('[OnboardingService] Error in updateState:', error);
      throw error;
    }
  },

  /**
   * Update local state (cookies) for client-side access
   */
  updateLocalState(step, data) {
    logger.debug('[OnboardingService] Updating local state', { step, data });
    
    try {
      // Set cookies with consistent expiration
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 7);
      
      // Set step and status cookies
      document.cookie = `onboardingStep=${step}; path=/; expires=${expiration.toUTCString()}; SameSite=Strict`;
      document.cookie = `onboardedStatus=${this.stepToStatus(step)}; path=/; expires=${expiration.toUTCString()}; SameSite=Strict`;
      
      // Store key data in cookies
      if (data?.businessName) {
        document.cookie = `businessName=${encodeURIComponent(data.businessName)}; path=/; expires=${expiration.toUTCString()}; SameSite=Strict`;
      }
      
      if (data?.businessType) {
        document.cookie = `businessType=${encodeURIComponent(data.businessType)}; path=/; expires=${expiration.toUTCString()}; SameSite=Strict`;
      }
      
      logger.debug('[OnboardingService] Local state updated successfully');
    } catch (error) {
      logger.error('[OnboardingService] Error updating local state:', error);
      throw error;
    }
  },

  /**
   * Verify if current state is valid for requested step
   */
  async verifyState(requestedStep) {
    logger.debug('[OnboardingService] Verifying state for step', { requestedStep });
    
    try {
      // For business-info, add special handling to always allow access
      const isBusinessInfo = requestedStep === 'business-info';
      const url = `${BASE_URL}/verify-state?step=${requestedStep}${isBusinessInfo ? '&allowPartial=true' : ''}`;
      
      const response = await enhancedFetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('[OnboardingService] State verification failed:', error);
        
        // Special handling for business-info to always return a valid response
        if (isBusinessInfo) {
          logger.debug('[OnboardingService] Using fallback for business-info verification');
          return {
            isValid: true,
            userData: {
              email: '',
              onboardingStatus: 'NOT_STARTED',
              businessName: '',
              businessType: ''
            },
            isPartial: true
          };
        }
        
        throw new Error(error.message || 'Failed to verify onboarding state');
      }

      const data = await response.json();
      logger.debug('[OnboardingService] State verification successful', { data });
      return data;
    } catch (error) {
      logger.error('[OnboardingService] Error in verifyState:', error);
      
      // For business-info, always return a valid response even if verification fails
      if (requestedStep === 'business-info') {
        logger.debug('[OnboardingService] Using fallback for business-info after verification error');
        return {
          isValid: true,
          userData: {
            email: '',
            onboardingStatus: 'NOT_STARTED',
            businessName: '',
            businessType: ''
          },
          isPartial: true
        };
      }
      
      throw error;
    }
  },

  /**
   * Get navigation instructions from server
   */
  async getNavigation(currentStep, data = {}) {
    logger.debug('[OnboardingService] Getting navigation instructions', { currentStep, data });
    
    try {
      const response = await enhancedFetch(`${BASE_URL}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentStep, data })
      });
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('[OnboardingService] Failed to get navigation:', error);
        
        // Provide fallback for business-info
        if (currentStep === 'business-info') {
          logger.debug('[OnboardingService] Using fallback navigation for business-info');
          return {
            nextStep: 'subscription',
            redirectUrl: `/onboarding/subscription?ts=${Date.now()}`,
            navigationMethod: 'server-redirect',
            useServerForm: true,
            serverRedirectUrl: '/api/onboarding/redirect'
          };
        }
        
        throw new Error(error.message || 'Failed to get navigation instructions');
      }

      const result = await response.json();
      logger.debug('[OnboardingService] Navigation instructions received', { result });
      return result;
    } catch (error) {
      logger.error('[OnboardingService] Error in getNavigation:', error);
      
      // Provide fallback for business-info even on error
      if (currentStep === 'business-info') {
        logger.debug('[OnboardingService] Using fallback navigation after error for business-info');
        return {
          nextStep: 'subscription',
          redirectUrl: `/onboarding/subscription?ts=${Date.now()}`,
          navigationMethod: 'server-redirect',
          useServerForm: true,
          serverRedirectUrl: '/api/onboarding/redirect'
        };
      }
      
      throw error;
    }
  },

  /**
   * Map step to status consistently
   */
  stepToStatus(step) {
    const map = {
      'business-info': 'NOT_STARTED',
      'subscription': 'BUSINESS_INFO',
      'payment': 'SUBSCRIPTION',
      'setup': 'PAYMENT',
      'complete': 'COMPLETE'
    };
    return map[step] || 'NOT_STARTED';
  },

  /**
   * Map status to step consistently
   */
  statusToStep(status) {
    const map = {
      'NOT_STARTED': 'business-info',
      'BUSINESS_INFO': 'subscription',
      'SUBSCRIPTION': 'payment',
      'PAYMENT': 'setup',
      'COMPLETE': 'dashboard'
    };
    return map[status] || 'business-info';
  },

  // Original methods below for backward compatibility
  
  async getOnboardingStatus(userId) {
    logger.debug('Fetching onboarding status', { userId });
    
    try {
      const response = await enhancedFetch('/api/onboarding/status');
      
      if (!response.ok) {
        const error = await response.json();
        logger.error('Failed to fetch onboarding status:', error);
        throw new Error(error.message || 'Failed to get onboarding status');
      }

      const data = await response.json();
      logger.debug('Onboarding status retrieved', { data });
      return data;
    } catch (error) {
      logger.error('Error in getOnboardingStatus:', error);
      throw error;
    }
  },

  async completeSetup() {
    const response = await enhancedFetch(`${BASE_URL}/setup/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to complete setup')
    }
    return response.json()
  },

  async submitBusinessInfo(data) {
    const response = await enhancedFetch(`${BASE_URL}/business-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to submit business info')
    }
    return response.json()
  },

  async selectSubscription(planId) {
    const response = await enhancedFetch(`${BASE_URL}/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to select subscription')
    }
    return response.json()
  },

  async submitPayment(paymentDetails) {
    const response = await enhancedFetch(`${BASE_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentDetails)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to submit payment')
    }
    return response.json()
  },

  async updateOnboardingStatus(updates) {
    const response = await fetch(`${BASE_URL}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update onboarding status')
    }
    return response.json()
  },

  async createSetupTask(taskData) {
    const response = await fetch(`${BASE_URL}/setup/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create setup task')
    }
    return response.json()
  },

  async updateSetupTask(taskId, updates) {
    const response = await fetch(`${BASE_URL}/setup/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update setup task')
    }
    return response.json()
  }
}
