/**
 * onboardingService.js
 * 
 * Service for handling onboarding-related operations and status checks
 */

import apiService from './apiService';

/**
 * Check if onboarding is complete for a tenant
 * 
 * @param {string} tenantId - The tenant ID to check
 * @returns {Promise<boolean>} - Whether onboarding is complete
 */
export const isOnboardingComplete = async (tenantId) => {
  if (!tenantId) return false;
  
  try {
    // First check localStorage as the quickest option
    const localStatus = checkLocalStorage(tenantId);
    if (localStatus !== null) {
      return localStatus;
    }
    
    // If not in localStorage, check with the API
    const status = await checkWithApi(tenantId);
    return status;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Check onboarding status in localStorage
 * 
 * @param {string} tenantId - The tenant ID to check
 * @returns {boolean|null} - Onboarding status or null if not found
 */
const checkLocalStorage = (tenantId) => {
  try {
    // Check tenant-specific onboarding status
    const tenantKey = `onboarding_${tenantId}`;
    const status = localStorage.getItem(tenantKey);
    
    if (status === 'complete') {
      return true;
    }
    
    // Check general onboarding status
    const generalStatus = localStorage.getItem('onboardingComplete');
    if (generalStatus === 'true' || generalStatus === 'complete') {
      return true;
    }
    
    // Check custom keys that might be used
    const customStatus = localStorage.getItem('custom_onboardingComplete');
    if (customStatus === 'true' || customStatus === 'complete') {
      return true;
    }
    
    // If we have explicit 'false' values
    if (status === 'false' || status === 'incomplete') {
      return false;
    }
    
    // No definitive information found
    return null;
  } catch (error) {
    console.error('Error checking localStorage:', error);
    return null;
  }
};

/**
 * Check onboarding status with API
 * 
 * @param {string} tenantId - The tenant ID to check
 * @returns {Promise<boolean>} - Whether onboarding is complete
 */
const checkWithApi = async (tenantId) => {
  try {
    // Try the dedicated onboarding status endpoint first
    const response = await apiService.get(`/api/onboarding/status?tenantId=${tenantId}`);
    
    if (response && response.status === 200) {
      const data = response.data || {};
      
      // Save to localStorage for future checks
      if (data.isComplete) {
        localStorage.setItem(`onboarding_${tenantId}`, 'complete');
      }
      
      return !!data.isComplete;
    }
    
    // If the dedicated endpoint fails, try the tenant profile as fallback
    const profileResponse = await apiService.get(`/api/profile?tenantId=${tenantId}`);
    
    if (profileResponse && profileResponse.status === 200) {
      const profile = profileResponse.data || {};
      const isComplete = profile.onboardingComplete === true || 
                        profile.onboardingStatus === 'complete';
      
      // Save to localStorage for future checks
      if (isComplete) {
        localStorage.setItem(`onboarding_${tenantId}`, 'complete');
      }
      
      return isComplete;
    }
    
    // No definitive information found
    return false;
  } catch (error) {
    console.error('Error checking onboarding status with API:', error);
    return false;
  }
};

export default {
  isOnboardingComplete
};
