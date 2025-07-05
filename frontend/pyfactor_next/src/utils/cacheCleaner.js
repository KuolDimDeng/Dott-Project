/**
 * cacheCleaner.js
 * 
 * Utility for clearing incorrect cached country detection data
 */

import { getCacheValue, setCacheValue, clearCacheKey } from @/utils/appCache';

/**
 * Clear all country detection related cache
 */
export function clearCountryDetectionCache() {
  try {
    clearCacheKey('user_detected_country');
    clearCacheKey('user_country');
    clearCacheKey('user_language');
    clearCacheKey('user_is_developing_country');
    
    console.log('✅ Cleared all country detection cache');
    return true;
  } catch (error) {
    console.error('❌ Error clearing country detection cache:', error);
    return false;
  }
}

/**
 * Force refresh country detection
 */
export async function forceRefreshCountryDetection() {
  try {
    // Clear cache first
    clearCountryDetectionCache();
    
    // Re-import and re-run detection
    const { initializeCountryDetection } = await import('@/services/countryDetectionService');
    const result = await initializeCountryDetection();
    
    console.log('✅ Force refreshed country detection:', result);
    return result;
  } catch (error) {
    console.error('❌ Error force refreshing country detection:', error);
    return { country: 'US', language: 'en', isDeveloping: false };
  }
}

/**
 * Debug current cache state
 */
export async function debugCacheState() {
  try {
    const cacheState = {
      detectedCountry: await getCacheValue('user_detected_country'),
      country: await getCacheValue('user_country'),
      language: await getCacheValue('user_language'),
      isDeveloping: await getCacheValue('user_is_developing_country')
    };
    
    console.log('🔍 Current cache state:', cacheState);
    return cacheState;
  } catch (error) {
    console.error('❌ Error getting cache state:', error);
    return {
      detectedCountry: null,
      country: null,
      language: null,
      isDeveloping: null
    };
  }
}
