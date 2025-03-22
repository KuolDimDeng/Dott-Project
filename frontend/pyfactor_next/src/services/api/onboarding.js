import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { refreshUserSession } from '@/utils/refreshUserSession';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_RETRIES = 2;

async function getAuthHeaders(retryCount = 0) {
  try {
    // Get current session using v6 API
    const { tokens, hasValidSession } = await fetchAuthSession();
    
    // If no valid session, try to refresh immediately
    if (!hasValidSession || !tokens?.idToken) {
      if (retryCount < MAX_RETRIES) {
        logger.debug('[OnboardingAPI] No valid session, attempting refresh:', {
          attempt: retryCount + 1,
          maxRetries: MAX_RETRIES
        });
        
        const refreshed = await refreshUserSession();
        if (refreshed) {
          return getAuthHeaders(retryCount + 1);
        }
      }
      throw new Error('No valid session and refresh failed');
    }

    // Add tenant ID to headers if available
    const headers = {
      'Authorization': `Bearer ${tokens.idToken}`,
      'Content-Type': 'application/json'
    };

    // Add tenant ID from token claims if available
    try {
      const payload = JSON.parse(atob(tokens.idToken.split('.')[1]));
      if (payload['custom:tenant_id']) {
        headers['X-Tenant-ID'] = payload['custom:tenant_id'];
      }
    } catch (e) {
      logger.warn('[OnboardingAPI] Failed to parse token claims:', e);
    }

    return headers;
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to get auth headers:', {
      error: error.message,
      retryCount,
      maxRetries: MAX_RETRIES
    });
    throw error;
  }
}

async function makeRequest(url, options, retryCount = 0) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      },
      credentials: 'include'
    });

    // Try to parse response as JSON
    const data = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`
    }));

    if (!response.ok) {
      // Enhanced error object
      const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;
      error.code = data.code;
      error.tenant_error = data.tenant_error;
      error.tenant_id = data.tenant_id;
      
      // Handle 401/403 with token refresh
      if ((response.status === 401 || response.status === 403) && retryCount < MAX_RETRIES) {
        logger.debug('[OnboardingAPI] Auth error, attempting refresh:', {
          attempt: retryCount + 1,
          maxRetries: MAX_RETRIES,
          error: data
        });

        const refreshed = await refreshUserSession();
        if (refreshed) {
          return makeRequest(url, options, retryCount + 1);
        }
      }

      // Log detailed error information
      logger.error('[OnboardingAPI] Request failed:', {
        url,
        method: options.method,
        status: response.status,
        statusText: response.statusText,
        error: {
          message: data.error,
          code: data.code,
          tenant_error: data.tenant_error,
          tenant_id: data.tenant_id
        }
      });

      throw error;
    }

    return data;
  } catch (error) {
    // Ensure error object has all necessary properties
    if (!error.status) error.status = 500;
    if (!error.statusText) error.statusText = 'Internal Server Error';
    
    logger.error('[OnboardingAPI] Request failed:', {
      error: {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
        tenant_error: error.tenant_error,
        tenant_id: error.tenant_id,
        data: error.data
      },
      url,
      method: options.method,
      retryCount
    });
    throw error;
  }
}

export async function submitBusinessInfo(data) {
  try {
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL is not configured');
    }

    logger.debug('[OnboardingAPI] Submitting business info:', {
      business_name: data.business_name,
      business_type: data.business_type,
      country: data.country,
      business_state: data.business_state,
      operation_id: data.operation_id,
      requestUrl: `${API_BASE_URL}/api/onboarding/business-info`
    });

    const response = await makeRequest(`${API_BASE_URL}/api/onboarding/business-info`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to save business information');
    }

    return response;
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to submit business info:', {
      error: error.message,
      stack: error.stack,
      data: {
        business_name: data.business_name,
        business_type: data.business_type,
        country: data.country,
        business_state: data.business_state,
        operation_id: data.operation_id
      }
    });
    throw error;
  }
}

export async function getBusinessInfo() {
  try {
    logger.debug('[OnboardingAPI] Fetching business info');

    return makeRequest(`${API_BASE_URL}/api/onboarding/business-info`, {
      method: 'GET'
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to get business info:', error);
    throw error;
  }
}

export async function submitSubscription(data) {
  try {
    logger.debug('[OnboardingAPI] Submitting subscription:', {
      plan: data.plan,
      interval: data.interval
    });

    return makeRequest(`${API_BASE_URL}/api/onboarding/subscription`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to submit subscription:', error);
    throw error;
  }
}

export async function submitPayment(data) {
  try {
    logger.debug('[OnboardingAPI] Submitting payment:', {
      paymentId: data.id
    });

    return makeRequest(`${API_BASE_URL}/api/onboarding/payment`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to submit payment:', error);
    throw error;
  }
}

export async function completeSetup() {
  try {
    logger.debug('[OnboardingAPI] Completing setup');

    return makeRequest(`${API_BASE_URL}/api/onboarding/complete`, {
      method: 'POST'
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to complete setup:', error);
    throw error;
  }
}

export async function getOnboardingStatus() {
  try {
    logger.debug('[OnboardingAPI] Fetching onboarding status');

    return makeRequest(`${API_BASE_URL}/api/onboarding/status`, {
      method: 'GET'
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to get onboarding status:', error);
    throw error;
  }
}

// Export a consolidated onboardingApi object
export const onboardingApi = {
  submitBusinessInfo,
  getBusinessInfo,
  submitSubscription,
  submitPayment,
  completeSetup,
  getOnboardingStatus
};

export default onboardingApi;