

import { getSession, signIn } from 'next-auth/react';

import { logger } from '@/utils/logger';


import { axiosInstance } from '@/lib/axiosConfig';
import { NEXT_DID_POSTPONE_HEADER } from 'next/dist/client/components/app-router-headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const URLUtil = {
    // Ensure URL has trailing slash and proper base
    formatUrl: (url, baseUrl) => {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const cleanPath = url.replace(/^\/+/, '').replace(/\/+$/, '');
        return `${cleanBaseUrl}/${cleanPath}/`;
    },

    // Simple validation
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

// Update makeAuthenticatedRequest to use simpler URL handling
async function makeAuthenticatedRequest(urlInput, options = {}) {
    const requestId = crypto.randomUUID();

    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
            throw new Error('API base URL not configured');
        }

        const finalUrl = urlInput.startsWith('http') 
            ? urlInput 
            : `${baseUrl.replace(/\/+$/, '')}/${urlInput.replace(/^\/+/, '')}`;
                
        logger.debug('Making authenticated request:', {
            requestId,
            originalUrl: urlInput,
            finalUrl,
            method: options.method || 'GET'
        });

        // Get current session using NextAuth
        const session = await getSession();
        if (!session?.user?.accessToken) {
            logger.error('No valid session token:', { requestId });
            throw new OnboardingApiError('No valid session found', 401);
        }

        const headers = {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Request-ID': requestId,
            ...options.headers
        };

        let response = await fetch(finalUrl, {
            ...options,
            headers,
            credentials: 'include'
        });

        // Handle 401 with automatic token refresh
        if (response.status === 401) {
            logger.debug('Token expired, attempting refresh:', { requestId });

            // Use NextAuth's signIn with refresh option
            const result = await signIn('credentials', {
                redirect: false,
                refresh: true,
                callbackUrl: window.location.pathname
            });

            if (result?.error) {
                throw new Error('Token refresh failed');
            }

            // Get fresh session after refresh
            const newSession = await getSession({ force: true });
            if (!newSession?.user?.accessToken) {
                throw new Error('Session refresh failed');
            }

            // Update header with new token
            headers.Authorization = `Bearer ${newSession.user.accessToken}`;

            // Retry request
            response = await fetch(finalUrl, {
                ...options,
                headers,
                credentials: 'include'
            });
        }

        return response;
    } catch (error) {
        logger.error('Request failed:', {
            requestId,
            url: urlInput,
            error: error.message
        });
        throw error;
    }
}


    
async function refreshSession() {
    try {
        const { signIn } = await import('next-auth/react');
        await signIn('credentials', {
            redirect: false,
            accessToken: null // Trigger refresh
        });
        return getSession({ force: true });
    } catch (error) {
        logger.error('Session refresh failed:', error);
        return null;
    }
}

// Create a URL utility to handle API endpoint construction
const APIUtils = {
    // Base URL configuration with validation
    getBaseUrl: () => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }
        return baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    },

    // Endpoint construction with validation
    constructEndpoint: (path) => {
        if (!path) {
            throw new Error('API endpoint path is required');
        }
        // Ensure path starts with /api/
        const normalizedPath = path.startsWith('/api/') ? path : `/api/${path}`;
        return normalizedPath.replace(/^\/+/, ''); // Remove leading slashes
    },

    // Full URL construction
    constructUrl: (endpoint) => {
        const baseUrl = APIUtils.getBaseUrl();
        const normalizedEndpoint = APIUtils.constructEndpoint(endpoint);
        return `${baseUrl}/${normalizedEndpoint}`;
    }
};


export const onboardingApi = {
  // Business Info
  getBusinessInfo: async () => {
    const url = `api/onboarding/business-info/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Getting Business Info:', { requestId, url });

        const response = await makeAuthenticatedRequest(url);

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('API Error:', { requestId, status: response.status, responseText: errorText });
            throw new OnboardingApiError('Failed to fetch business info', response.status);
        }

        const data = await response.json();
        logger.debug('Business Info Retrieved:', { requestId, data });
        return data;

    } catch (error) {
        logger.error('Error in getBusinessInfo:', {
            requestId,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
},

saveBusinessInfo: async (formData) => {
    const url = `api/onboarding/save-business-info/`;
    const requestId = crypto.randomUUID();
    const currentSession = await getSession();

    try {
        logger.debug('Attempting to save business info:', {
            requestId,
            hasData: !!formData,
            fields: Object.keys(formData || {})
        });

        // Validation
        const requiredFields = [
            'business_name',
            'business_type',
            'country',
            'legal_structure',
            'date_founded',
            'first_name',
            'last_name'
        ];

        if (!formData || typeof formData !== 'object') {
            throw new OnboardingApiError('Form data is required', 400);
        }

        const missingFields = requiredFields.filter(field => {
            const value = formData[field];
            return !value || (typeof value === 'string' && !value.trim());
        });

        if (missingFields.length > 0) {
            throw new OnboardingApiError(
                `Missing required fields: ${missingFields.join(', ')}`,
                400
            );
        }

        // Clean data
        const cleanedData = Object.fromEntries(
            Object.entries(formData).map(([key, value]) => [
                key,
                typeof value === 'string' ? value.trim() : value
            ])
        );

        // Make request
        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId
            },
            body: JSON.stringify({
                ...cleanedData,
                request_id: requestId,

            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                responseData.message || 'Failed to save business info',
                response.status,
                responseData
            );
        }
        // Handle token updates if provided
        if (responseData.tokens?.access) {
            const { signIn } = await import('next-auth/react');
            await signIn('credentials', {
                redirect: false,
                accessToken: responseData.tokens.access,
                refreshToken: responseData.tokens.refresh || currentSession?.user?.refreshToken,

                // Include any other session data you need to update
                onboarding: 'business-info'
            });
        }

        logger.info('Business info saved successfully:', {
            requestId,
            status: response.status
        });

        return {
            success: true,
            data: responseData,
            tokens: responseData.tokens
        };

    } catch (error) {
        logger.error('Failed to save business info:', {
            requestId,
            error: error instanceof OnboardingApiError ? error : error.message,
            stack: error.stack
        });

        throw error instanceof OnboardingApiError 
            ? error 
            : new OnboardingApiError(
                'Failed to save business info',
                error.response?.status || 500,
                error
            );
    }
},

  // Setup Management
  getSetupStatus: async () => {
    const url = `api/onboarding/setup/status/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Getting setup status:', { requestId });
        const response = await makeAuthenticatedRequest(url);
        
        if (!response.ok) {
            throw new OnboardingApiError(response.statusText, response.status);
        }

        const jsonData = await response.json();
        logger.debug('Setup status retrieved:', { requestId, data: jsonData });
        return { data: jsonData };
    } catch (error) {
        logger.error('Failed to get setup status:', { requestId, error: error.message });
        throw error;
    }
},

validateStep: async (step, data) => {
    const requestId = crypto.randomUUID();
    
    logger.debug('Starting step validation:', {
        requestId,
        step,
        hasData: !!data,
        dataFields: Object.keys(data || {})
    });

    try {
        // Local validation mapping
        const validationMap = {
            'business-info': (data) => ({
                isValid: !!(data?.business_name && data?.business_type && 
                          data?.country && data?.legal_structure),
                message: 'All business info fields are required'
            }),
            'subscription': (data) => ({
                isValid: !!data?.selected_plan,
                message: 'Plan selection is required'
            }),
            // ... other step validations
        };

        const validator = validationMap[step];
        if (!validator) {
            throw new Error(`No validator found for step: ${step}`);
        }

        const result = validator(data);
        return {
            success: result.isValid,
            data: {
                step,
                isValid: result.isValid,
                message: result.message
            }
        };

    } catch (error) {
        logger.error('Step validation failed:', {
            requestId,
            step,
            error: error.message,
            stack: error.stack
        });

        throw new OnboardingApiError(
            'Step validation failed',
            500,
            error
        );
    }
},


startSetup: async (data) => {
    const url = `api/onboarding/setup/start/`;
    const requestId = crypto.randomUUID();

    try {
        // Get current session to verify token
        const session = await getSession();
        if (!session?.user?.accessToken) {
            throw new Error('No valid session token');
        }

        // Log the attempt with token info
        logger.debug('Starting setup:', {
            requestId,
            hasToken: true,
            urlEndpoint: url,
            setupData: {
                ...data,
                operation: 'create_database'
            }
        });
        
        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'Authorization': `Bearer ${session.user.accessToken}`
            },
            body: JSON.stringify({
                ...data,
                request_id: requestId,
                operation: 'create_database'
            })
        });

        if (!response.ok) {
            const jsonData = await response.json();
            throw new Error(jsonData.message || 'Setup initialization failed');
        }

        const jsonData = await response.json();

        logger.info('Setup initialized:', {
            requestId,
            status: response.status,
            setupId: jsonData.setup_id
        });

        // Handle token refresh if provided
        if (jsonData.tokens?.access) {
            await signIn('credentials', {
                redirect: false,
                accessToken: jsonData.tokens.access,
                refreshToken: jsonData.tokens.refresh || session.user.refreshToken,
                onboarding: 'setup'
            });
        }

        return { success: true, data: jsonData };

    } catch (error) {
        logger.error('Setup setup failed:', {
            requestId,
            error: error.message,
            status: error.response?.status,
            data
        });
        throw error;
    }
},

completeSetup: async (data) => {
    const url = `api/onboarding/setup/complete/`;
    const requestId = crypto.randomUUID();

    try {
        const currentSession = await getSession();

        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                request_id: requestId
            })
        });

        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Setup completion failed',
                response.status,
                jsonData
            );
        }

        if (jsonData.tokens?.access) {
            const { signIn } = await import('next-auth/react');
            await signIn('credentials', {
                redirect: false,
                accessToken: jsonData.tokens.access,
                refreshToken: jsonData.tokens.refresh || currentSession?.user?.refreshToken,
                onboarding: 'complete'
            });
        }

        logger.info('Setup completed successfully:', {
            requestId,
            status: response.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Setup completion failed:', {
            requestId,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to complete setup', error.response?.status, error);
    }
},

saveSetup: async (data) => {
    const url = `api/onboarding/setup/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Saving setup:', {
            requestId,
            setupData: data
        });

        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                request_id: requestId
            })
        });

        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Failed to save setup',
                response.status,
                jsonData
            );
        }

        logger.info('Setup saved successfully:', {
            requestId,
            status: response.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Failed to save setup:', {
            requestId,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to save setup', error.response?.status, error);
    }
},

  // Onboarding Status
checkStatus: async () => {
    const url = `api/onboarding/status/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Checking onboarding status:', { requestId });

        const response = await makeAuthenticatedRequest(url);
        const jsonData = await response.json();

        logger.debug('Status check completed:', {
            requestId,
            status: response.status,
            onboarding: jsonData.status
        });

        return { response, data: jsonData };

    } catch (error) {
        logger.error('Status check failed:', {
            requestId,
            error: error.message
        });
        throw new OnboardingApiError('Failed to check status', error.response?.status, error);
    }
},

updateStatus: async (statusData) => {
    const url = `api/onboarding/status-update/`;
    const requestId = statusData.request_id || crypto.randomUUID();
        
    try {
        if (!statusData || !statusData.current_step || !statusData.next_step) {
            throw new Error('Status data is incomplete');
        }

        // Extract selected_plan from statusData, not from undefined variable
        const selected_plan = statusData.selected_plan || null;

        // Create explicit status payload
        const statusPayload = {
            current_step: statusData.current_step,
            next_step: statusData.next_step,
            onboarding: statusData.next_step,
            request_id: requestId,
            selected_plan: selected_plan,
            form_data: statusData.form_data || null
        };

        logger.debug('Updating onboarding status:', {
            requestId,
            ...statusPayload
        });

        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(statusPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update status');
        }

        const responseData = await response.json();

        // Update session if tokens provided
        if (responseData.tokens?.access) {
            const currentSession = await getSession();
            await signIn('credentials', {
                redirect: false,
                accessToken: responseData.tokens.access,
                refreshToken: responseData.tokens.refresh || currentSession?.user?.refreshToken,
                onboarding: statusData.next_step
            });
        }

        logger.info('Status updated successfully:', {
            requestId,
            newStatus: statusData.next_step,
            selected_plan: selected_plan
        });

        return {
            success: true,
            data: {
                ...responseData,
                status: statusData.next_step,
                selected_plan: selected_plan
            },
            tokens: responseData.tokens
        };

    } catch (error) {
        logger.error('Status update failed:', {
            requestId,
            error: error.message,
            statusData
        });

        // Ensure we're throwing an error with proper details
        if (error instanceof OnboardingApiError) {
            throw error;
        }
        throw new OnboardingApiError(
            error.message || 'Failed to update status',
            error.response?.status || 500,
            error
        );
    }
},

  // Step Management
startOnboarding: async () => {
    const url = `api/onboarding/start/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Starting onboarding:', { requestId });

        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({ request_id: requestId })
        });

        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Failed to start onboarding',
                response.status,
                jsonData
            );
        }

        logger.info('Onboarding started successfully:', {
            requestId,
            status: response.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Failed to start onboarding:', {
            requestId,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to start onboarding', error.response?.status, error);
    }
},

updateStep: async (step, data) => {
    const url = `api/onboarding/update/${step}/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Updating step:', {
            requestId,
            step,
            updateData: data
        });

        const response = await makeAuthenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify({
                ...data,
                request_id: requestId
            })
        });

        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Failed to update step',
                response.status,
                jsonData
            );
        }

        logger.info('Step updated successfully:', {
            requestId,
            step,
            status: response.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Failed to update step:', {
            requestId,
            step,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to update step', error.response?.status, error);
    }
},

  // Database Management
checkDatabaseHealth: async () => {
    const url = `api/onboarding/database/health-check/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Checking database health:', { requestId });

        const response = await makeAuthenticatedRequest(url);
        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Database health check failed',
                response.status,
                jsonData
            );
        }

        logger.info('Database health check completed:', {
            requestId,
            status: response.status,
            health: jsonData.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Database health check failed:', {
            requestId,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to check database health', error.response?.status, error);
    }
},

cancelSetup: async () => {
    const url = `api/onboarding/setup/cancel/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Initiating setup cancellation:', { requestId });
        
        const response = await makeAuthenticatedRequest(url, {
            method: 'POST'
        });
        const jsonData = await response.json();

        logger.info('Setup cancellation completed:', {
            requestId,
            status: response.status,
            success: response.ok
        });

        return { response, data: jsonData };

    } catch (error) {
        logger.error('Setup cancellation failed:', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        throw new OnboardingApiError('Failed to cancel setup', error.response?.status, error);
    }
},

  // Task Management
getTaskStatus: async (taskId) => {
    const url = `api/onboarding/tasks/${taskId}/status/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Getting task status:', {
            requestId,
            taskId
        });

        const response = await makeAuthenticatedRequest(url);
        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Failed to get task status',
                response.status,
                jsonData
            );
        }

        logger.info('Task status retrieved:', {
            requestId,
            taskId,
            status: jsonData.status
        });

        return { response, data: jsonData };
    } catch (error) {
        logger.error('Failed to get task status:', {
            requestId,
            taskId,
            error: error.message
        });
        throw error instanceof OnboardingApiError ? error : new OnboardingApiError('Failed to get task status', error.response?.status, error);
    }
},

// Subscription Management
validateSubscriptionAccess: async () => {
    const url = `api/onboarding/subscription/validate/`;
    const requestId = crypto.randomUUID();

    try {
        const response = await makeAuthenticatedRequest(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Request-ID': requestId
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                data.message || 'Failed to validate access',
                response.status,
                data
            );
        }

        // Update session using NextAuth if needed
        if (data.current_status !== undefined) {
            await signIn('credentials', {
                redirect: false,
                onboarding: data.current_status,
                callbackUrl: window.location.pathname
            });
        }

        return {
            success: true,
            data: {
                can_access: data.can_access,
                current_status: data.current_status,
                current_step: data.current_step,
                has_business_info: data.has_business_info,
                business_info: data.business_info,
                subscription_info: {
                    selected_plan: data.business_info?.subscription?.selected_plan,
                    billing_cycle: data.business_info?.subscription?.billing_cycle,
                    is_active: data.business_info?.subscription?.is_active
                }
            }
        };

    } catch (error) {
        logger.error('Access validation failed:', {
            requestId,
            error: error.message
        });
        throw error instanceof OnboardingApiError 
            ? error 
            : new OnboardingApiError(
                'Failed to validate subscription access',
                error.response?.status || 500,
                error
            );
    }
},



saveSubscriptionPlan: async (planData) => {
    const url = `api/onboarding/subscription/save/`;
    const requestId = planData.request_id || crypto.randomUUID();
    const startTime = Date.now();

    try {
        // Validate input data
        if (!planData.selected_plan || !planData.billing_cycle) {
            throw new Error('Missing required subscription data');
        }

        logger.debug('[Subscription] Starting subscription process', {
            requestId,
            plan: planData.selected_plan,
            billingCycle: planData.billing_cycle,
            currentStep: 'subscription'
        });

        // 1. Save subscription plan
        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            headers: {
                'X-Request-ID': requestId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selected_plan: planData.selected_plan,
                billing_cycle: planData.billing_cycle,
                request_id: requestId,
                current_step: 'subscription'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('[Subscription] Save failed', {
                requestId,
                status: response.status,
                error: errorText
            });
            throw new Error(errorText || `Failed to save subscription plan: ${response.statusText}`);
        }

        const responseData = await response.json();
        
        // 2. For free plan, initialize setup first
        if (planData.selected_plan === 'free') {
            logger.debug('[Subscription] Initializing setup for free plan', {
                requestId,
                selected_plan: planData.selected_plan
            });

            // 1. Initialize setup
            const setupResponse = await makeAuthenticatedRequest('api/onboarding/setup/start/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId
                },
                body: JSON.stringify({
                    operation: 'create_database',
                    selected_plan: planData.selected_plan,
                    billing_cycle: planData.billing_cycle,
                    request_id: requestId
                })
            });
        
            if (!setupResponse.ok) {
                logger.error('[Subscription] Setup initialization failed', {
                    requestId,
                    status: setupResponse.status
                });
                throw new Error('Failed to initialize setup');
            }
        
            const setupData = await setupResponse.json();
            logger.debug('[Subscription] Setup initialized', {
                requestId,
                setupId: setupData.setup_id
            });

            // 2. Update status
            const statusUpdateResponse = await makeAuthenticatedRequest('api/onboarding/status-update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId
                },
                body: JSON.stringify({
                    current_step: 'subscription',
                    next_step: 'setup',
                    onboarding: 'setup',
                    selected_plan: planData.selected_plan,
                    request_id: requestId,
                    form_data: {
                        billing_cycle: planData.billing_cycle,
                        selected_plan: planData.selected_plan,
                        setup_id: setupData.setup_id
                    }
                })
            });
        
            if (!statusUpdateResponse.ok) {
                logger.error('[Subscription] Status update failed', {
                    requestId,
                    status: statusUpdateResponse.status
                });
                throw new Error('Failed to update status');
            }

            logger.debug('[Subscription] Status updated', {
                requestId,
                onboarding: 'setup'
            });
        
            // 3. Update session
            const signInResult = await signIn('credentials', {
                redirect: false,
                onboarding: 'setup',
                current_step: 'setup',
                selected_plan: planData.selected_plan,
                setup_id: setupData.setup_id,
                request_id: requestId
            });
        
            if (signInResult?.error) {
                logger.error('[Subscription] Session update failed', {
                    requestId,
                    error: signInResult.error
                });
                throw new Error(`Session update failed: ${signInResult.error}`);
            }
        
            // 4. Store setup tracking data
            await persistenceService.saveData('setup-data', {
                setup_id: setupData.setup_id,
                status: 'in_progress',
                timestamp: new Date().toISOString(),
                selected_plan: planData.selected_plan,
                billing_cycle: planData.billing_cycle
            });
        
            logger.info('[Subscription] Free plan setup completed', {
                requestId,
                setupId: setupData.setup_id,
                duration: Date.now() - startTime
            });

            // 5. Return success
            return {
                success: true,
                data: {
                    current_step: 'setup',
                    next_step: 'dashboard',
                    selected_plan: planData.selected_plan,
                    targetRoute: '/dashboard',
                    setup_id: setupData.setup_id
                }
            };
        }

        // For paid plans, continue to payment
        logger.debug('[Subscription] Processing paid plan', {
            requestId,
            selected_plan: planData.selected_plan
        });

        const nextStep = 'payment';
        const statusUpdateResponse = await makeAuthenticatedRequest('api/onboarding/status-update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId
            },
            body: JSON.stringify({
                current_step: 'subscription',
                next_step: nextStep,
                onboarding: 'subscription',
                selected_plan: planData.selected_plan,
                request_id: requestId,
                form_data: {
                    billing_cycle: planData.billing_cycle,
                    selected_plan: planData.selected_plan
                }
            })
        });

        if (!statusUpdateResponse.ok) {
            logger.error('[Subscription] Status update failed for paid plan', {
                requestId,
                status: statusUpdateResponse.status
            });
            throw new Error('Failed to update status');
        }

        const signInResult = await signIn('credentials', {
            redirect: false,
            onboarding: 'subscription',
            current_step: 'subscription',
            selected_plan: planData.selected_plan,
            request_id: requestId
        });

        if (signInResult?.error) {
            logger.error('[Subscription] Session update failed for paid plan', {
                requestId,
                error: signInResult.error
            });
            throw new Error(`Session update failed: ${signInResult.error}`);
        }

        logger.info('[Subscription] Flow completed successfully', {
            requestId,
            selectedPlan: planData.selected_plan,
            duration: Date.now() - startTime,
            nextStep
        });

        return {
            success: true,
            data: {
                current_step: 'subscription',
                next_step: nextStep,
                selected_plan: planData.selected_plan,
                targetRoute: `/onboarding/${nextStep}`
            }
        };

    } catch (error) {
        logger.error('[Subscription] Critical error in subscription flow', {
            requestId,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            timestamp: new Date().toISOString()
        });
        
        try {
            // Rollback status
            await makeAuthenticatedRequest('api/onboarding/status-update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId
                },
                body: JSON.stringify({
                    current_step: 'subscription',
                    next_step: 'subscription',
                    onboarding: 'subscription',
                    selected_plan: planData.selected_plan,
                    request_id: requestId
                })
            });

            // Reset session
            await signIn('credentials', {
                redirect: false,
                onboarding: 'subscription',
                current_step: 'subscription',
                selected_plan: planData.selected_plan,
                request_id: requestId
            });

            logger.info('[Subscription] Rollback completed', {
                requestId,
                selected_plan: planData.selected_plan
            });

        } catch (rollbackError) {
            logger.error('[Subscription] Rollback failed', {
                requestId,
                error: rollbackError.message,
                originalError: error.message
            });
        }

        throw new Error('Subscription process failed. Please try again. Reference ID: ' + requestId);
    }
},

getSubscriptionStatus: async () => {
    const url = `api/onboarding/subscription/status/`;
    const requestId = crypto.randomUUID();
    
    try {
        // Construct URL to match Django URL pattern
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
        if (!baseUrl) {
            throw new Error('API base URL is not configured');
        }

        // Match the Django URL pattern 'subscription/status/'
        const url = `api/onboarding/subscription/status/`;
        
        logger.debug('Fetching subscription status:', {
            requestId,
            url
        });

        // Make the request
        const response = await makeAuthenticatedRequest(url);

        // Handle non-OK responses
        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Subscription status request failed:', {
                requestId,
                status: response.status,
                error: errorText
            });
            throw new OnboardingApiError(
                'Failed to fetch subscription status',
                response.status
            );
        }

        // Parse response
        const data = await response.json();
        
        logger.debug('Subscription status retrieved:', {
            requestId,
            status: response.status,
            success: true
        });

        return {
            success: true,
            data,
            status: response.status
        };

    } catch (error) {
        logger.error('Failed to fetch subscription status:', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        throw error instanceof OnboardingApiError 
            ? error 
            : new OnboardingApiError(
                'Failed to fetch subscription status',
                error.response?.status || 500,
                error
            );
    }
},


// Template for other API methods
makeApiRequest: async (endpoint, options = {}) => {
    try {
        const url = APIUtils.constructUrl(endpoint);
        return makeRequest(url, options);
    } catch (error) {
        logger.error('API request failed:', {
            endpoint,
            error: error.message
        });
        throw error;
    }
},

cancelTask: async (taskId) => {
    const url = `api/onboarding/tasks/${taskId}/cancel/`;
    const requestId = crypto.randomUUID();

    try {
        logger.debug('Cancelling task:', {
            requestId,
            taskId
        });

        const response = await makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify({ request_id: requestId })
        });

        const jsonData = await response.json();

        if (!response.ok) {
            throw new OnboardingApiError(
                jsonData.message || 'Failed to cancel task',
                response.status,
                jsonData
            );
        }

        logger.info('Task cancelled successfully:', {
            requestId,
            taskId,
            status: response.status
        });

        return { response, data: jsonData };

    } catch (error) {
        logger.error('Error cancelling task:', {
            requestId,
            taskId,
            error: error.message,
            stack: error.stack
        });
        throw new OnboardingApiError('Failed to cancel task', error.response?.status, error);
    }
}
};

// Helper function for local validation
const validateStepLocally = async (step, data) => {
    switch(step) {
        case 'business-info':
            return !!(data?.business_name && 
                     data?.business_type && 
                     data?.country && 
                     data?.legal_structure && 
                     data?.date_founded &&
                     data?.first_name &&
                     data?.last_name);
        
        case 'subscription':
            return !!(data?.selected_plan);
            
        default:
            return true;
    }
};



export class OnboardingApiError extends Error {
    constructor(message, statusCode = 400, originalError = null) {
        super(message);
        Object.setPrototypeOf(this, OnboardingApiError.prototype);
        this.name = 'OnboardingApiError';
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.code = 'ONBOARDING_API_ERROR';
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, OnboardingApiError);
        }
    }
}

export const makeRequest = async (url, options = {}) => {
    const requestId = crypto.randomUUID();
    
    try {
        // Resolve URL if it's a Promise
        const resolvedUrl = await Promise.resolve(url);
        
        logger.debug('Making API request:', {
            requestId,
            url: resolvedUrl,
            method: options.method || 'GET'
        });

        const response = await makeAuthenticatedRequest(resolvedUrl, options);
        
        // Get response text once
        const responseText = await response.text();
        
        // Check if response is redirecting to Next.js routes
        if (responseText.includes('<!DOCTYPE html>')) {
            logger.error('Received HTML response instead of JSON:', {
                requestId,
                url: resolvedUrl,
                status: response.status
            });
            throw new OnboardingApiError('Invalid API endpoint', 404);
        }

        // Check if response is ok
        if (!response.ok) {
            logger.error('API request failed:', {
                requestId,
                status: response.status,
                error: responseText
            });
            throw new OnboardingApiError(
                responseText || 'Request failed',
                response.status
            );
        }

        // Try to parse JSON response
        try {
            const data = JSON.parse(responseText);
            return {
                success: true,
                data,
                status: response.status
            };
        } catch (parseError) {
            logger.error('Failed to parse response:', {
                requestId,
                error: parseError.message,
                responseText: responseText.substring(0, 200) // Log only first 200 chars
            });
            throw new OnboardingApiError(
                'Invalid JSON response',
                response.status,
                parseError
            );
        }

    } catch (error) {
        logger.error('Request failed:', {
            requestId,
            url,
            error: error.message
        });
        throw error instanceof OnboardingApiError 
            ? error 
            : new OnboardingApiError(error.message, error.response?.status || 500, error);
    }
};