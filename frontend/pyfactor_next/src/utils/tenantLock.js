// tenantLock.js
const LOCK_TIMEOUT = 30000; // 30 seconds timeout

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
  window.__APP_CACHE.tenant.locks = window.__APP_CACHE.tenant.locks || {};
}

/**
 * Try to acquire the tenant initialization lock
 * @returns {boolean} True if lock was acquired, false otherwise
 */
export const acquireTenantLock = () => {
  if (typeof window === 'undefined') return false;
  
  // Ensure app cache exists
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
  window.__APP_CACHE.tenant.locks = window.__APP_CACHE.tenant.locks || {};
  
  // Check if lock already exists
  const existingLock = window.__APP_CACHE.tenant.locks.initialization;
  if (existingLock) {
    // Check if lock is stale (older than timeout)
    const now = Date.now();
    if (now - existingLock.timestamp < LOCK_TIMEOUT) {
      console.log('Tenant initialization already in progress');
      return false;
    }
    // Lock is stale, we can acquire it
    console.log('Found stale lock, releasing it');
  }
  
  // Acquire lock
  const lockData = {
    timestamp: Date.now(),
    requestId: Math.random().toString(36).substring(2)
  };
  window.__APP_CACHE.tenant.locks.initialization = lockData;
  return true;
};

/**
 * Release the tenant initialization lock
 */
export const releaseTenantLock = () => {
  if (typeof window === 'undefined') return;
  
  // Ensure app cache exists
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
  window.__APP_CACHE.tenant.locks = window.__APP_CACHE.tenant.locks || {};
  
  // Remove lock
  delete window.__APP_CACHE.tenant.locks.initialization;
};