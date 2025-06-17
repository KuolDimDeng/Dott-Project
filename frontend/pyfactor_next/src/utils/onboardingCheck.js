/**
 * Backend-first onboarding status check
 * Always checks backend database for true onboarding status
 */

import { serverAxiosInstance } from '@/config/axios.config';

/**
 * Check if user needs onboarding from backend
 * This is the ONLY way to check onboarding status
 * @returns {Promise<Object>} Onboarding status from backend
 */
export async function checkOnboardingStatus() {
    try {
        console.log('[OnboardingCheck] Checking backend for onboarding status...');
        
        const response = await serverAxiosInstance.get('/api/onboarding/status/');
        
        const data = response.data;
        console.log('[OnboardingCheck] Backend status:', {
            needs_onboarding: data.needs_onboarding,
            status: data.status,
            is_complete: data.is_complete,
            tenant_id: data.tenant_id
        });
        
        return {
            needsOnboarding: data.needs_onboarding,
            isComplete: data.is_complete,
            currentStep: data.current_step,
            tenantId: data.tenant_id,
            subscriptionPlan: data.subscription_plan,
            raw: data
        };
    } catch (error) {
        console.error('[OnboardingCheck] Error checking onboarding status:', error);
        
        // Default to needing onboarding if check fails
        return {
            needsOnboarding: true,
            isComplete: false,
            currentStep: 'business_info',
            tenantId: null,
            subscriptionPlan: 'free',
            error: error.message
        };
    }
}

/**
 * Force complete onboarding in backend
 * Use this when frontend knows onboarding is complete but backend disagrees
 * @returns {Promise<Object>} Result of force complete
 */
export async function forceCompleteOnboarding() {
    try {
        console.log('[OnboardingCheck] Force completing onboarding in backend...');
        
        const response = await serverAxiosInstance.post('/api/onboarding/force-complete/');
        
        console.log('[OnboardingCheck] Force complete result:', response.data);
        
        return {
            success: response.data.success,
            needsOnboarding: false,
            message: response.data.message
        };
    } catch (error) {
        console.error('[OnboardingCheck] Error force completing onboarding:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Determine redirect URL based on onboarding status
 * @param {Object} status - Status from checkOnboardingStatus()
 * @returns {string} URL to redirect to
 */
export function getRedirectUrl(status) {
    if (status.needsOnboarding) {
        return '/onboarding';
    }
    
    if (status.tenantId) {
        return `/tenant/${status.tenantId}/dashboard`;
    }
    
    // Fallback to home if no tenant (shouldn't happen)
    return '/';
}