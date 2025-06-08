// tenantLock.js
const LOCK_TIMEOUT = 30000; // 30 seconds timeout

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined') {
  appCache.getAll() = appCache.getAll() || {};
  appCache.getAll().tenant = appCache.getAll().tenant || {};
  appCache.set('tenant.locks', appCache.get('tenant.locks') || {});
}

/**
 * Try to acquire the tenant initialization lock
 * @returns {boolean} True if lock was acquired, false otherwise
 */
export const acquireTenantLock = () => {
  if (typeof window === 'undefined') return false;
  
  // Ensure app cache exists
  appCache.getAll() = appCache.getAll() || {};
  appCache.getAll().tenant = appCache.getAll().tenant || {};
  appCache.set('tenant.locks', appCache.get('tenant.locks') || {});
  
  // Check if lock already exists
  const existingLock = appCache.get('tenant.locks').initialization;
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
  appCache.get('tenant.locks').initialization = lockData;
  return true;
};

/**
 * Release the tenant initialization lock
 */
export const releaseTenantLock = () => {
  if (typeof window === 'undefined') return;
  
  // Ensure app cache exists
  appCache.getAll() = appCache.getAll() || {};
  appCache.getAll().tenant = appCache.getAll().tenant || {};
  appCache.set('tenant.locks', appCache.get('tenant.locks') || {});
  
  // Remove lock
  delete appCache.get('tenant.locks').initialization;
};