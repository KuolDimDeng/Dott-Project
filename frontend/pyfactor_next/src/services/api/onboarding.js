import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { refreshUserSession } from '@/utils/refreshUserSession';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_RETRIES = 2;

async function getAuthHeaders(retryCount = 0) {
  try {
    // Get current session using v6 API
    const { tokens } = await fetchAuthSession();
    if (!tokens?.idToken) {
      throw new Error('No valid session');
    }

    return {
      'Authorization': `Bearer ${tokens.idToken}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    // If token is expired and we haven't exceeded max retries,
    // try to refresh the session and retry
    if (error.message.includes('expired') && retryCount < MAX_RETRIES) {
      logger.debug('[OnboardingAPI] Token expired, attempting refresh:', {
        attempt: retryCount + 1,
        maxRetries: MAX_RETRIES
      });

      const refreshed = await refreshUserSession();
      if (refreshed) {
        return getAuthHeaders(retryCount + 1);
      }
    }

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

    if (!response.ok) {
      const error = await response.json();
      
      // If unauthorized and we haven't exceeded max retries,
      // try to refresh the session and retry
      if (response.status === 401 && retryCount < MAX_RETRIES) {
        logger.debug('[OnboardingAPI] Unauthorized, attempting refresh:', {
          attempt: retryCount + 1,
          maxRetries: MAX_RETRIES
        });

        const refreshed = await refreshUserSession();
        if (refreshed) {
          return makeRequest(url, options, retryCount + 1);
        }
      }

      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    logger.error('[OnboardingAPI] Request failed:', {
      error: error.message,
      url,
      method: options.method,
      retryCount
    });
    throw error;
  }
}

export async function submitBusinessInfo(data) {
  try {
    logger.debug('[OnboardingAPI] Submitting business info:', {
      businessName: data.businessName,
      businessType: data.businessType,
      country: data.country
    });

    return makeRequest(`${API_BASE_URL}/api/onboarding/business-info`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to submit business info:', error);
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