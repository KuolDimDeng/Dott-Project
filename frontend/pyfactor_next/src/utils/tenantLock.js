// tenantLock.js
const TENANT_LOCK_KEY = 'tenant_initialization_lock';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Try to acquire the tenant initialization lock
 * @returns {boolean} True if lock was acquired, false otherwise
 */
export const acquireTenantLock = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if lock already exists
  const existingLock = localStorage.getItem(TENANT_LOCK_KEY);
  if (existingLock) {
    // Check if lock is stale (older than timeout)
    const lockData = JSON.parse(existingLock);
    const now = Date.now();
    if (now - lockData.timestamp < LOCK_TIMEOUT) {
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
  localStorage.setItem(TENANT_LOCK_KEY, JSON.stringify(lockData));
  return true;
};

/**
 * Release the tenant initialization lock
 */
export const releaseTenantLock = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TENANT_LOCK_KEY);
};