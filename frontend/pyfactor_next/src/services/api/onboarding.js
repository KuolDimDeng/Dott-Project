import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_RETRIES = 2;

async function getAuthHeaders(retryCount = 0) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Get Auth0 access token for backend API authentication
    try {
      // For client-side, get the access token from Auth0
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const { accessToken } = await response.json();
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
          logger.debug('[OnboardingAPI] Added Auth0 access token to headers');
        }
      }
    } catch (tokenError) {
      logger.warn('[OnboardingAPI] Failed to get access token:', tokenError);
      // Continue without token - let backend handle the auth error
    }

    // Add tenant ID from localStorage if available
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
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
      
      // Handle 401/403 - with Auth0, user needs to re-authenticate
      if (response.status === 401 || response.status === 403) {
        logger.debug('[OnboardingAPI] Auth error - user needs to re-authenticate:', {
          status: response.status,
          error: data
        });
        
        // Redirect to login if unauthorized
        if (typeof window !== 'undefined' && response.status === 401) {
          window.location.href = '/api/auth/login';
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
    // Map frontend field names to backend expectations
    const mappedData = {
      businessName: data.businessName || data.business_name,
      businessType: data.businessType || data.business_type,
      businessSubtypeSelections: data.businessSubtypeSelections || data.business_subtypes,
      country: data.country,
      businessState: data.businessState || data.business_state,
      legalStructure: data.legalStructure || data.legal_structure,
      dateFounded: data.dateFounded || data.date_founded,
      firstName: data.firstName || data.first_name,
      lastName: data.lastName || data.last_name,
      industry: data.industry,
      address: data.address,
      phoneNumber: data.phoneNumber || data.phone_number,
      taxId: data.taxId || data.tax_id
    };

    logger.debug('[OnboardingAPI] Submitting business info via NextJS API route:', {
      businessName: mappedData.businessName,
      businessType: mappedData.businessType,
      country: mappedData.country,
      requestUrl: '/api/onboarding/business-info'
    });

    // Use NextJS API route instead of calling Django directly
    // This route handles Auth0 authentication and forwards to Django backend
    const response = await fetch('/api/onboarding/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      credentials: 'include',
      body: JSON.stringify(mappedData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`
      }));
      
      // Handle specific error cases
      if (response.status === 401) {
        logger.debug('[OnboardingAPI] Auth error - redirecting to login');
        if (typeof window !== 'undefined') {
          window.location.href = '/api/auth/login';
        }
        throw new Error('Your session has expired. Please sign in again.');
      }
      
      const error = new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = errorData;
      
      logger.error('[OnboardingAPI] Request failed:', {
        status: response.status,
        error: errorData
      });
      
      throw error;
    }

    const responseData = await response.json();

    // Update localStorage with tenant info for compatibility
    if (responseData?.tenant_id || responseData?.businessInfo?.businessId) {
      const tenantId = responseData.tenant_id || responseData.businessInfo.businessId;
      localStorage.setItem('tenantId', tenantId);
      
      // Store user attributes for compatibility with existing code
      const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
      userAttributes['custom:tenant_id'] = tenantId;
      userAttributes['custom:business_name'] = mappedData.businessName;
      localStorage.setItem('userAttributes', JSON.stringify(userAttributes));
    }

    logger.debug('[OnboardingAPI] Business info submitted successfully:', {
      success: responseData.success,
      hasBusinessInfo: !!responseData.businessInfo
    });

    return responseData;
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to submit business info:', {
      error: error.message,
      stack: error.stack
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
    // Map frontend field names to backend expectations
    const mappedData = {
      selected_plan: data.selected_plan || data.plan,
      billingCycle: data.billingCycle || data.billing_cycle || data.interval || 'monthly',
      tenant_id: data.tenant_id || localStorage.getItem('tenantId')
    };

    logger.debug('[OnboardingAPI] Submitting subscription:', {
      plan: mappedData.selected_plan,
      billingCycle: mappedData.billingCycle,
      tenantId: mappedData.tenant_id
    });

    const response = await makeRequest(`${API_BASE_URL}/api/onboarding/subscription/`, {
      method: 'POST',
      body: JSON.stringify(mappedData)
    });

    // Update localStorage for compatibility
    if (response?.success) {
      const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
      userAttributes['custom:subscription_plan'] = mappedData.selected_plan;
      userAttributes['custom:billing_interval'] = mappedData.billingCycle;
      localStorage.setItem('userAttributes', JSON.stringify(userAttributes));
    }

    return response;
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

    const response = await makeRequest(`${API_BASE_URL}/api/onboarding/complete/`, {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: localStorage.getItem('tenantId')
      })
    });

    // Update localStorage for compatibility
    if (response?.success) {
      const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
      userAttributes['custom:onboarding_status'] = 'completed';
      userAttributes['custom:setup_done'] = 'true';
      localStorage.setItem('userAttributes', JSON.stringify(userAttributes));
      localStorage.setItem('onboardingStatus', 'completed');
    }

    return response;
  } catch (error) {
    logger.error('[OnboardingAPI] Failed to complete setup:', error);
    throw error;
  }
}

export async function getOnboardingStatus() {
  try {
    logger.debug('[OnboardingAPI] Fetching onboarding status');

    const response = await makeRequest(`${API_BASE_URL}/api/onboarding/status/`, {
      method: 'GET'
    });

    // Update localStorage for compatibility
    if (response) {
      if (response.tenant_id) {
        localStorage.setItem('tenantId', response.tenant_id);
      }
      if (response.status) {
        localStorage.setItem('onboardingStatus', response.status);
      }
      
      // Update user attributes
      const userAttributes = JSON.parse(localStorage.getItem('userAttributes') || '{}');
      userAttributes['custom:onboarding_status'] = response.status;
      userAttributes['custom:onboarding_step'] = response.current_step;
      localStorage.setItem('userAttributes', JSON.stringify(userAttributes));
    }

    return response;
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