import { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { getTenantId, storeTenantInfo } from '@/utils/tenantUtils';
import { useAuth } from './auth';

// Lock keys
const TENANT_LOCK_KEY = 'tenant_initialization_lock';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Try to acquire the tenant initialization lock
 * @returns {boolean} True if lock was acquired, false otherwise
 */
const acquireTenantLock = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if lock already exists
  const existingLock = localStorage.getItem(TENANT_LOCK_KEY);
  if (existingLock) {
    // Check if lock is stale (older than timeout)
    const lockData = JSON.parse(existingLock);
    const now = Date.now();
    if (now - lockData.timestamp < LOCK_TIMEOUT) {
      logger.debug('Tenant initialization already in progress');
      return false;
    }
    // Lock is stale, we can acquire it
    logger.debug('Found stale lock, releasing it');
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
const releaseTenantLock = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TENANT_LOCK_KEY);
};

/**
 * Get request ID for deduplication
 * @returns {string} A unique request ID
 */
const getRequestId = () => {
  if (typeof window === 'undefined') return uuidv4();
  
  // Check if we already have a request ID in session storage
  const reqId = sessionStorage.getItem('tenant_request_id');
  if (reqId) return reqId;
  
  // Generate and store a new one
  const newReqId = uuidv4();
  sessionStorage.setItem('tenant_request_id', newReqId);
  return newReqId;
};

/**
 * Hook to handle tenant initialization during login/registration
 * This ensures that every user has a tenant ID assigned
 */
export function useTenantInitialization() {
  const auth = useAuth();

  /**
   * Initialize tenant ID for a user
   * @param {Object} user - The authenticated user object
   * @returns {string} The tenant ID
   */
  const initializeTenantId = useCallback(async (user) => {
    // Try to acquire lock first
    if (!acquireTenantLock()) {
      logger.warn('[TenantInit] Another tenant initialization is in progress, waiting...');
      // Wait until lock is released or times out (poll every 500ms)
      await new Promise(resolve => {
        const interval = setInterval(() => {
          // Check if lock is released or stale
          const existingLock = localStorage.getItem(TENANT_LOCK_KEY);
          if (!existingLock || (existingLock && JSON.parse(existingLock).timestamp + LOCK_TIMEOUT < Date.now())) {
            if (acquireTenantLock()) {
              clearInterval(interval);
              resolve();
            }
          }
        }, 500);
        
        // Set a timeout in case lock never releases
        setTimeout(() => {
          clearInterval(interval);
          // Force acquire the lock
          localStorage.removeItem(TENANT_LOCK_KEY);
          acquireTenantLock();
          resolve();
        }, 5000);
      });
    }
    
    try {
      // Check session storage for a previously verified tenant ID
      const sessionTenantId = sessionStorage.getItem('verified_tenant_id');
      if (sessionTenantId) {
        logger.debug('[TenantInit] Using verified tenant ID from session:', sessionTenantId);
        storeTenantInfo(sessionTenantId);
        return sessionTenantId;
      }
      
      // Always verify with backend first, regardless of local storage
      let tenantId = null;
      let tenantSource = 'none';
      
      // If we have an authenticated user, verify/create tenant with backend
      if (user) {
        try {
          // First try to get from user attributes as a hint
          if (user?.attributes?.['custom:businessid']) {
            tenantId = user.attributes['custom:businessid'];
            tenantSource = 'user_attributes';
          } else {
            // Check local storage as fallback hint
            const storedId = getTenantId();
            if (storedId) {
              tenantId = storedId;
              tenantSource = 'local_storage';
            } 
          }
          
          // Get a request ID for deduplication
          const requestId = getRequestId();
          
          // Check pending requests registry in sessionStorage
          const pendingKey = `pending_tenant_req:${tenantId || 'new'}`;
          const pendingReq = sessionStorage.getItem(pendingKey);
          
          if (pendingReq) {
            // Wait a bit in case another request is in progress
            logger.debug(`[TenantInit] Tenant verification already in progress for ${tenantId}, waiting briefly...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if it completed and we have a result
            const verifiedId = sessionStorage.getItem('verified_tenant_id');
            if (verifiedId) {
              logger.debug('[TenantInit] Using tenant ID from completed verification:', verifiedId);
              sessionStorage.removeItem(pendingKey);
              return verifiedId;
            }
          }
          
          // Mark this request as pending
          sessionStorage.setItem(pendingKey, Date.now().toString());
          
          // Regardless of where we got the tenant ID from, ALWAYS verify with backend
          // This is critical to prevent tenant duplication
          logger.debug(`[TenantInit] Verifying tenant ID with backend (source: ${tenantSource}): ${tenantId || 'none'}, requestId: ${requestId}`);
          
          const response = await fetch('/api/auth/verify-tenant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId
            },
            body: JSON.stringify({ 
              tenantId: tenantId || uuidv4(), // Generate new ID if none exists
              requestId: requestId
            }),
            credentials: 'include' // Include cookies
          });
          
          // Clear pending flag
          sessionStorage.removeItem(pendingKey);
          
          if (!response.ok) {
            // Check if it's a duplicate request response
            if (response.status === 429) {
              const data = await response.json();
              if (data.status === 'duplicate') {
                logger.debug('[TenantInit] Duplicate request detected, waiting for original request to complete');
                
                // Wait a bit for the original request to complete
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Check if we have a result from the original request
                const verifiedId = sessionStorage.getItem('verified_tenant_id');
                if (verifiedId) {
                  return verifiedId;
                }
              }
            }
            
            throw new Error(`Backend verification failed: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Always use the backend tenant ID, regardless of what we had locally
          if (data.correctTenantId) {
            tenantId = data.correctTenantId;
            logger.debug('[TenantInit] Using corrected tenant ID from backend:', tenantId);
          } else if (data.tenantId) {
            tenantId = data.tenantId;
            logger.debug('[TenantInit] Using confirmed tenant ID from backend:', tenantId);
          } else {
            logger.error('[TenantInit] No tenant ID in backend response');
            releaseTenantLock();
            return null;
          }
          
          // Store the verified tenant ID in multiple places for consistency
          storeTenantInfo(tenantId); // Cookies and localStorage
          sessionStorage.setItem('verified_tenant_id', tenantId); // Session storage
          
          return tenantId;
        } catch (error) {
          logger.error('[TenantInit] Error verifying tenant with backend:', error);
          throw error; // Re-throw to be handled by caller
        }
      } else {
        // No user - can't verify, just return whatever we have
        logger.debug('[TenantInit] No user to verify tenant ID with backend');
        return getTenantId();
      }
    } catch (error) {
      logger.error('[TenantInit] Error initializing tenant ID:', error);
      return null;
    } finally {
      // Always release lock when done
      releaseTenantLock();
    }
  }, []);

  /**
   * Handle user login
   * @param {string} username - The username
   * @param {string} password - The password
   */
  const handleLogin = useCallback(async (username, password) => {
    try {
      // Use the auth.signIn function directly
      const result = await auth.signIn(username, password);
      
      if (result.success) {
        try {
          // Initialize tenant ID after successful login
          const tenantId = await initializeTenantId(result.user);
          logger.debug('[TenantInit] Tenant ID initialized after login:', tenantId);
        } catch (tenantError) {
          // Log but don't fail the login process
          logger.error('[TenantInit] Error initializing tenant ID after login:', tenantError);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('[TenantInit] Login error:', error);
      throw error;
    }
  }, [auth, initializeTenantId]);

  /**
   * Handle user registration
   * @param {Object} userData - The user registration data
   */
  const handleRegistration = useCallback(async (userData) => {
    try {
      // Generate tenant ID before registration
      const tenantId = uuidv4();
      logger.debug('[TenantInit] Generated tenant ID for registration:', tenantId);
      
      // Add tenant ID to user attributes
      const enhancedUserData = {
        ...userData,
        'custom:businessid': tenantId
      };
      
      // Register user with tenant ID
      const result = await auth.signUp(enhancedUserData);
      
      if (result.success) {
        // Store tenant ID in cookies, localStorage, and sessionStorage
        storeTenantInfo(tenantId);
        sessionStorage.setItem('verified_tenant_id', tenantId);
        logger.debug('[TenantInit] Tenant ID stored after registration');
      }
      
      return result;
    } catch (error) {
      logger.error('[TenantInit] Registration error:', error);
      throw error;
    }
  }, [auth]);

  // Initialize tenant ID on component mount if user is already authenticated
  useEffect(() => {
    const initializeExistingUser = async () => {
      try {
        // First check if we're on a public route like sign-in or sign-up
        const isPublicRoute = window.location.pathname.includes('/auth/');
        if (isPublicRoute) {
          logger.debug('[TenantInit] Skipping tenant initialization on public route:', window.location.pathname);
          return;
        }
        
        // Check if user is authenticated before trying to get current user
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        
        if (!tokens?.idToken) {
          logger.debug('[TenantInit] No active session, skipping tenant initialization');
          return;
        }
        
        // Now it's safe to get the current user
        const { getCurrentUser } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        
        if (user) {
          const tenantId = await initializeTenantId(user);
          logger.debug('[TenantInit] Tenant ID initialized for existing user:', tenantId);
        }
      } catch (error) {
        // Only log as error if it's not an authentication error
        if (error.name === 'UserUnAuthenticatedException') {
          logger.debug('[TenantInit] User not authenticated, skipping tenant initialization');
        } else {
          logger.error('[TenantInit] Error initializing tenant for existing user:', error);
        }
      }
    };
    
    initializeExistingUser();
  }, [initializeTenantId]);

  return {
    login: handleLogin,
    register: handleRegistration,
    initializeTenantId
  };
}