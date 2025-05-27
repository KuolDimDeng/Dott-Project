/**
 * cacheCleaner.js
 * 
 * Utility for clearing incorrect cached country detection data
 */

import { getCacheValue, setCacheValue, clearCacheKey } from '@/utils/appCache';

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
export function debugCacheState() {
  const cacheState = {
    detectedCountry: getCacheValue('user_detected_country'),
    country: getCacheValue('user_country'),
    language: getCacheValue('user_language'),
    isDeveloping: getCacheValue('user_is_developing_country')
  };
  
  console.log('🔍 Current cache state:', cacheState);
  return cacheState;
}
