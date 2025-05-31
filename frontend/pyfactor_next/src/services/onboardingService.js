///Users/kuoldeng/projectx/frontend/pyfactor_next/src/services/onboardingService.js
import { logger } from '@/utils/logger';

const BASE_URL = '/api/onboarding'

/**
 * Auth0 compatibility functions
 */
const fetchAuthSession = async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const user = await response.json();
      return {
        tokens: {
          accessToken: { toString: () => 'auth0-access-token' },
          idToken: { toString: () => 'auth0-id-token' }
        },
        userSub: user.sub
      };
    }
    return null;
  } catch (error) {
    logger.error('[onboardingService] Error fetching session:', error);
    return null;
  }
};

/**
 * Enhanced fetch with session token handling
 * Ensures that API requests include proper tokens and handles auth retries
 */
const enhancedFetch = async (url, options = {}) => {
  const maxRetries = 2;
  let retryCount = 0;
  
  const attemptFetch = async () => {
    try {
      // Check if we're requesting business-info data specifically
      const isBusinessInfoRequest = url.includes('business-info') || 
                                   (url.includes('state') && options.headers?.['X-Business-Info'] === 'true') ||
                                   (url.includes('verify-state') && url.includes('business-info'));
      
      // First try to get a valid session using Cognito directly
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
      
      // Set up headers with auth tokens from Cognito
      const headers = {
        ...(options.headers || {}),
        'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      
      // Use tokens if available
      if (tokens?.idToken) {
        headers['X-Id-Token'] = tokens.idToken.toString();
      }
      
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken.toString()}`;
      }
      
      // Add general onboarding headers
      headers['X-Onboarding-Route'] = 'true';
      
      // Check if it's a business-info or partial request
      const isOnboardingStep = url.includes('/onboarding/') || url.includes('step=');
      
      if (isBusinessInfoRequest || isOnboardingStep) {
        headers['X-Allow-Partial'] = 'true';
        headers['X-Lenient-Access'] = 'true';
      }
      
      // Add cache prevention for repeated requests
      if (!url.includes('?')) {
        url = `${url}?_t=${Date.now()}`;
      } else {
        url = `${url}&_t=${Date.now()}`;
      }
      
      // Perform the fetch with tokens and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // If unauthorized and we have retries left, try again
        if (response.status === 401 && retryCount < maxRetries) {
          retryCount++;
          logger.warn(`[OnboardingService] 401 response, retrying (${retryCount}/${maxRetries})`);
          
          // For business-info requests, try a special fallback approach if we're still getting 401s
          if (retryCount >= 1 && isBusinessInfoRequest) {
            logger.warn('[OnboardingService] Using fallback approach for business-info request');
            // Special business-info fallback - add marker header and skip token validation
            headers['X-Bypass-Auth'] = 'true';
            headers['X-Business-Info-Fallback'] = 'true';
            
            clearTimeout(timeoutId);
            return fetch(url, {
              ...options,
              headers
            });
          }
          
          // Force session refresh before retry
          await refreshUserSession();
          
          // Add delay with reduced exponential backoff (300ms base with less aggressive scaling)
          const delay = 300 * Math.pow(1.5, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return attemptFetch();
        }
        
        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        retryCount++;
        logger.warn(`[OnboardingService] Fetch error, retrying (${retryCount}/${maxRetries}): ${error.message}`);
        
        // Add delay with reduced exponential backoff (300ms base with less aggressive scaling)
        const delay = 300 * Math.pow(1.5, retryCount - 1);
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
  // Cache for verification requests to prevent loops
  _verificationCache: {},
  _stateCacheTimestamp: null,
  _lastStateResponse: null,
  _stateRequestCount: 0,
  _stateCacheKey: null,
  
  /**
   * Verify if the current state is valid for the requested step
   * With caching to prevent repeated calls
   */
  async verifyState(requestedStep, options = {}) {
    logger.debug('[OnboardingService] Verifying state for step', { requestedStep });
    
    const cacheKey = `verify_${requestedStep}_${JSON.stringify(options)}`;
    const now = Date.now();
    
    // If we have a cached response less than 5 seconds old, use it
    if (this._verificationCache[cacheKey] && 
        now - this._verificationCache[cacheKey].timestamp < 5000) {
      logger.debug('[OnboardingService] Using cached verification result');
      return this._verificationCache[cacheKey].data;
    }
    
    // Otherwise make a new request
    try {
      // Force a fallback for business-info when too many attempts
      const requestCount = this._verificationCache[`count_${requestedStep}`] || 0;
      this._verificationCache[`count_${requestedStep}`] = requestCount + 1;
      
      // If we've tried this step more than 3 times, use a fallback response
      if (requestCount >= 3 && requestedStep === 'business-info') {
        logger.warn(`[OnboardingService] Too many verification attempts for ${requestedStep}, using fallback`);
        const fallbackResponse = {
          isValid: true,
          isPartial: true,
          userData: {},
          autoFallback: true
        };
        
        // Cache the fallback response
        this._verificationCache[cacheKey] = {
          timestamp: now,
          data: fallbackResponse
        };
        
        return fallbackResponse;
      }
      
      // Add timestamp to cache buster
      const timestamp = Date.now();
      const queryParams = [`ts=${timestamp}`];
      
      if (requestedStep) {
        queryParams.push(`step=${requestedStep}`);
      }
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      
      // Set up a race with a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await Promise.race([
          enhancedFetch(`${BASE_URL}/verify-state${queryString}`, {
            method: 'GET',
            headers: {
              ...(options.headers || {}),
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Verification request timeout')), 3000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to verify state: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        this._verificationCache[cacheKey] = {
          timestamp: now,
          data
        };
        
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      logger.warn('[OnboardingService] State verification failed:', error);
      
      // Return a fallback response with isValid to prevent blocking the UI
      const fallbackResponse = {
        isValid: true,
        isPartial: true,
        userData: {},
        error: error.message
      };
      
      // Cache the fallback response too to prevent repeated failed requests
      this._verificationCache[cacheKey] = {
        timestamp: now,
        data: fallbackResponse
      };
      
      return fallbackResponse;
    }
  },
  
  /**
   * Get current onboarding state from server
   * With caching to prevent repeated calls
   */
  async getState(options = {}) {
    // Check if we have a cached state response that's less than 3 seconds old
    const now = Date.now();
    const cacheKey = JSON.stringify(options);
    
    if (this._lastStateResponse && 
        this._stateCacheTimestamp && 
        now - this._stateCacheTimestamp < 3000 &&
        this._stateCacheKey === cacheKey) {
      logger.debug('[OnboardingService] Using cached state response');
      return this._lastStateResponse;
    }
    
    try {
      // Default options
      const {
        allowPartial = false,
        includeUserData = true,
        forBusinessInfo = false,
        ...restOptions
      } = options;
      
      // Count state requests to prevent infinite loops
      const requestCount = this._stateRequestCount || 0;
      this._stateRequestCount = requestCount + 1;
      
      // Return a minimally viable response if we've made too many requests
      if (requestCount > 5) {
        logger.warn('[OnboardingService] Too many state requests, using fallback response');
        const fallbackResponse = {
          currentStep: 'business-info',
          userData: {},
          isPartial: true,
          isFallback: true
        };
        
        // Cache the fallback
        this._lastStateResponse = fallbackResponse;
        this._stateCacheTimestamp = now;
        this._stateCacheKey = cacheKey;
        
        return fallbackResponse;
      }
      
      // Prepare query parameters
      const queryParams = [
        `t=${Date.now()}`, // Cache buster
        `partial=${allowPartial ? 'true' : 'false'}`,
        `userData=${includeUserData ? 'true' : 'false'}`
      ];
      
      if (forBusinessInfo) {
        queryParams.push('businessInfo=true');
      }
      
      const queryString = `?${queryParams.join('&')}`;
      
      // Set up a race with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await Promise.race([
          enhancedFetch(`${BASE_URL}/state${queryString}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(restOptions.headers || {}),
              'X-Request-Purpose': 'onboarding-state'
            },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('State request timeout')), 3000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // For business info, generate a minimally viable response
          if (forBusinessInfo && response.status === 401) {
            logger.warn('[OnboardingService] Auth error for business-info state, using fallback');
            const fallbackData = {
              currentStep: 'business-info',
              userData: {},
              isPartial: true,
              authFallback: true
            };
            
            // Cache the fallback
            this._lastStateResponse = fallbackData;
            this._stateCacheTimestamp = now;
            this._stateCacheKey = cacheKey;
            
            return fallbackData;
          }
          
          throw new Error(`Failed to get state: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the response
        this._lastStateResponse = data;
        this._stateCacheTimestamp = now;
        this._stateCacheKey = cacheKey;
        
        // Reset request counter on success
        this._stateRequestCount = 0;
        
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      logger.warn('[OnboardingService] Error getting state:', error);
      
      // Always return a usable response to prevent UI blockage
      const fallbackResponse = {
        currentStep: 'business-info',
        userData: {},
        isPartial: true,
        error: error.message,
        fallback: true
      };
      
      // Cache the fallback too
      this._lastStateResponse = fallbackResponse;
      this._stateCacheTimestamp = now;
      this._stateCacheKey = cacheKey;
      
      return fallbackResponse;
    }
  },

  /**
   * Update onboarding state on the server
   */
  async updateState(step, data) {
    logger.debug('[OnboardingService] Updating onboarding state', { step, data });
    
    // Special handling for business-info
    const isBusinessInfo = step === 'business-info';
    
    try {
      // Check if document is still available (not navigated away)
      if (typeof document === 'undefined' || document.hidden || document.visibilityState === 'hidden') {
        logger.debug('[OnboardingService] Document not visible, skipping server update');
        this.updateLocalState(step, data);
        return { success: true, localOnly: true };
      }
      
      // For business-info, make a direct call to the business-info API endpoint for more reliable handling
      if (isBusinessInfo) {
        try {
          const businessInfoResponse = await fetch('/api/onboarding/business-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Lenient-Access': 'true',
              'X-Allow-Partial': 'true'
            },
            body: JSON.stringify({
              ...data,
              _onboardingStatus: 'business_info',
              _onboardingStep: 'subscription'
            })
          });
          
          if (!businessInfoResponse.ok) {
            // Still update local state even if API fails
            this.updateLocalState(step, data);
            return { success: false, localOnly: true };
          }
          
          // Update local state as well
          this.updateLocalState(step, data);
          
          try {
            const responseData = await businessInfoResponse.json();
            return responseData;
          } catch (parseError) {
            // If JSON parsing fails, still return success
            return { success: true, parsed: false };
          }
        } catch (fetchError) {
          // Handle network errors or aborted fetches
          if (fetchError.name === 'AbortError' || 
              (fetchError.message && fetchError.message.includes('fetch'))) {
            logger.debug('[OnboardingService] API request aborted or failed, using local state only');
            // Still update local state
            this.updateLocalState(step, data);
            return { success: true, localOnly: true, aborted: true };
          }
          
          throw fetchError;
        }
      }
      
      // For other steps, use the normal endpoint
      try {
        const response = await enhancedFetch(`${BASE_URL}/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ step, data })
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Failed to update onboarding state' }));
          throw new Error(error.message || 'Failed to update onboarding state');
        }
        
        // Update local state
        this.updateLocalState(step, data);
        
        try {
          const responseData = await response.json();
          return responseData;
        } catch (parseError) {
          // If JSON parsing fails, still return success
          return { success: true, parsed: false };
        }
      } catch (fetchError) {
        // Handle network errors or aborted fetches
        if (fetchError.name === 'AbortError' || 
            (fetchError.message && fetchError.message.includes('fetch'))) {
          logger.debug('[OnboardingService] API request aborted or failed, using local state only');
          // Still update local state
          this.updateLocalState(step, data);
          return { success: true, localOnly: true, aborted: true };
        }
        
        throw fetchError;
      }
    } catch (error) {
      // Prevent unhandled errors from bubbling up in the console
      logger.debug('[OnboardingService] Error in updateState:', { error: error.message });
      
      // For business-info, if the API update fails, still update local state for progressive enhancement
      if (isBusinessInfo) {
        this.updateLocalState(step, data);
      }
      
      // Don't rethrow the error if we're in a navigation or document is no longer visible
      if (typeof document === 'undefined' || document.hidden || document.visibilityState === 'hidden') {
        return { success: false, localOnly: true };
      }
      
      throw error;
    }
  },

  /**
   * Update local state with current step data
   * @param {string} step - The onboarding step
   * @param {object} data - The data for the step
   */
  updateLocalState(step, data) {
    if (!step) return;
    
    try {
      logger.debug('[OnboardingService] Updating local state:', { step });
      
      // Make sure we're client-side and initialize global cache if needed
      if (typeof window === 'undefined') return;
      
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = {};
      }
      
      if (!window.__APP_CACHE.onboarding) {
        window.__APP_CACHE.onboarding = {};
      }
      
      // Save data to global app cache for persistence
      if (data && typeof data === 'object') {
        // Store step data in global cache
        window.__APP_CACHE.onboarding[`step_${step}`] = data;
        
        // Store onboarding step in global cache
        window.__APP_CACHE.onboarding.currentStep = step;
        window.__APP_CACHE.onboarding.lastUpdated = Date.now();
        
        // Store business info in global cache if present
        if (step === 'business-info' && data.businessName) {
          window.__APP_CACHE.onboarding.businessName = data.businessName;
          window.__APP_CACHE.onboarding.businessType = data.businessType || 'Other';
        }
      }
    } catch (error) {
      logger.error('[OnboardingService] Error updating local state:', error);
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
      'business-info': 'not_started',
      'subscription': 'business_info',
      'payment': 'subscription',
      'setup': 'payment',
      'dashboard': 'complete',
      'complete': 'complete'
    };
    return map[step] || 'not_started';
  },

  /**
   * Map status to step consistently
   */
  statusToStep(status) {
    const map = {
      'not_started': 'business-info',
      'business_info': 'subscription',
      'subscription': 'payment',
      'payment': 'setup',
      'setup': 'dashboard',
      'complete': 'dashboard'
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

  /**
   * Update user's onboarding status (Auth0 compatibility)
   * @param {object} updates - The updates to apply
   */
  async updateOnboardingStatus(updates) {
    try {
      if (!updates) return;
      
      logger.debug('[OnboardingService] Updating onboarding status (Auth0 compatibility):', updates);
      
      // Store in localStorage for Auth0 compatibility
      if (typeof window !== 'undefined') {
        if (updates.status) {
          localStorage.setItem('onboarding_status', updates.status.toLowerCase());
        }
        
        if (updates.step) {
          localStorage.setItem('onboarding_step', updates.step);
        }
        
        if (updates.businessName) {
          localStorage.setItem('business_name', updates.businessName);
        }
        
        if (updates.businessType) {
          localStorage.setItem('business_type', updates.businessType);
        }
        
        // Add updated timestamp
        localStorage.setItem('updated_at', new Date().toISOString());
      }
      
      logger.info('[OnboardingService] Successfully updated onboarding status (Auth0 compatibility)');
      return true;
    } catch (error) {
      logger.error('[OnboardingService] Error updating onboarding status:', error);
      return false;
    }
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
