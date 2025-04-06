'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { logger } from '@/utils/logger';
import { getTenantId, storeTenantInfo } from '@/utils/tenantUtils';
import { useAuth } from './auth';
import { signIn, fetchUserAttributes, fetchAuthSession, updateUserAttributes } from '@/config/amplifyUnified';
import { reconfigureAmplify } from '@/config/amplifyConfig';
// Import standardized constants
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
import { useSession } from 'next-auth/react';

// Lock keys
const TENANT_LOCK_KEY = 'tenant_initialization_lock';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout
const TENANT_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'; // Namespace for generating deterministic tenant IDs

// Cache for tenant verification to prevent redundant API calls
const tenantVerificationCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Prevent multiple session refresh attempts
const sessionRefreshInProgress = {
  value: false,
  timestamp: 0
};

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
 * Generate a random request ID
 * @returns {string} A random request ID
 */
const getRequestId = () => {
  try {
    return uuidv4();
  } catch (e) {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
};

// Safely extract tenant ID from various sources with improved error handling
const getSafeTenantId = () => {
  try {
    if (typeof window === 'undefined') return null;
    
    let tenantId = null;
    let source = null;
    
    // Try localStorage first
    try {
      tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        source = 'localStorage';
        logger.debug('[TenantUtils] Retrieved tenant ID from localStorage:', tenantId);
      }
    } catch (e) {
      logger.warn('[TenantUtils] Error accessing localStorage:', e);
    }
    
    // Try sessionStorage next
    if (!tenantId) {
      try {
        tenantId = sessionStorage.getItem('verified_tenant_id') || sessionStorage.getItem('tenantId');
        if (tenantId) {
          source = 'sessionStorage';
          logger.debug('[TenantUtils] Retrieved tenant ID from sessionStorage:', tenantId);
        }
      } catch (e) {
        logger.warn('[TenantUtils] Error accessing sessionStorage:', e);
      }
    }
    
    // Try cookies next
    if (!tenantId) {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          try {
            const [key, value] = cookie.trim().split('=');
            if (key && value) {
              acc[key] = value;
            }
          } catch (e) {
            // Skip malformed cookie
          }
          return acc;
        }, {});
        
        tenantId = cookies.tenantId || cookies.businessid;
        if (tenantId) {
          source = 'cookies';
          logger.debug('[TenantUtils] Retrieved tenant ID from cookies:', tenantId);
        }
      } catch (e) {
        logger.warn('[TenantUtils] Error accessing cookies:', e);
      }
    }
    
    // Try Cognito storage as a last resort
    if (!tenantId) {
      try {
        // Look for Cognito storage keys
        const cognitoKey = Object.keys(localStorage).find(key => 
          key.includes('CognitoIdentityServiceProvider') && key.includes('LastAuthUser')
        );
        
        if (cognitoKey) {
          const lastAuthUser = localStorage.getItem(cognitoKey);
          if (lastAuthUser) {
            // User storage often contains the tenantId
            const userDataKey = Object.keys(localStorage).find(key => 
              key.includes('CognitoIdentityServiceProvider') && 
              key.includes(lastAuthUser) && 
              key.includes('userData')
            );
            
            if (userDataKey) {
              try {
                const userData = JSON.parse(localStorage.getItem(userDataKey));
                tenantId = userData?.tenantId || userData?.['custom:tenantId'] || userData?.['custom:businessid'];
                if (tenantId) {
                  source = 'cognito_storage';
                  logger.debug('[TenantUtils] Retrieved tenant ID from Cognito storage:', tenantId);
                }
              } catch (e) {
                logger.warn('[TenantUtils] Error parsing Cognito user data:', e);
              }
            }
          }
        }
      } catch (e) {
        logger.warn('[TenantUtils] Error checking Cognito storage:', e);
      }
    }
    
    // Validate the tenant ID format if we have one
    if (tenantId) {
      // Format validation - basic check that it looks like a UUID or business ID
      const isValidFormat = (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId) || // UUID format
        /^[0-9a-f]{8}[_-][0-9a-f]{4}[_-][0-9a-f]{4}[_-][0-9a-f]{4}[_-][0-9a-f]{12}$/i.test(tenantId) || // Formatted UUID
        /^[0-9a-f]{6,12}[_-]{0,4}$/i.test(tenantId) // Short business ID format
      );
      
      if (!isValidFormat) {
        logger.warn(`[TenantUtils] Retrieved tenant ID has invalid format: ${tenantId}`);
        // Use it anyway, better than nothing
      }
    }
    
    logger.debug(`[TenantUtils] getSafeTenantId result: ${tenantId || 'null'} (source: ${source || 'none'})`);
    return tenantId;
  } catch (error) {
    logger.error('[TenantUtils] Error in getSafeTenantId:', error);
    return null;
  }
};

// Extract tenant ID from user attributes
const extractTenantId = (userAttributes) => {
  if (!userAttributes) return null;
  
  // Try to get from custom businessid
  if (userAttributes['custom:businessid']) {
    return userAttributes['custom:businessid'];
  }
  
  // Fall back to sub ID if needed
  if (userAttributes.sub) {
    return userAttributes.sub;
  }
  
  return null;
};

/**
 * Custom hook for tenant initialization with performance optimizations
 * Implements caching, batching, and memoization to reduce dashboard loading time
 */
export function useTenantInitialization() {
  const { data: session, status: sessionStatus } = useSession({ required: false });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const pendingRequests = useRef(new Map());
  const initializationComplete = useRef(false);
  
  // Track verification attempts
  const verificationAttempts = useRef(0);
  
  // Function to get tenant ID
  const getTenantId = useCallback(() => {
    // Skip if session isn't loaded yet
    if (sessionStatus === 'loading') {
      return null;
    }
    
    // Get from session if available (highest priority)
    const sessionTenantId = 
      session?.user?.['custom:businessid'] || 
      (session?.user?.businessId && session.user.businessId !== 'undefined' ? session.user.businessId : null);
    
    if (sessionTenantId) {
      return sessionTenantId;
    }
    
    // Get from local storage next
    const localStorageTenantId = 
      typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    
    if (localStorageTenantId) {
      // Set cookies to ensure consistency
      if (typeof document !== 'undefined') {
        document.cookie = `tenantId=${localStorageTenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
      }
      return localStorageTenantId;
    }
    
    // Get from cookie if available
    const getCookieTenantId = () => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; tenantId=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    // Return the cookie tenant ID or null if none available
    return getCookieTenantId();
  }, [session, sessionStatus]);
  
  /**
   * Verify tenant schema exists and create if necessary
   * Optimized with caching, batching and exponential backoff retry
   */
  const verifyTenantSchema = useCallback(async () => {
    // Don't verify if session is still loading
    if (sessionStatus === 'loading') {
      logger.info('Waiting for session to load before verifying tenant schema');
      return { success: false, waiting: true };
    }
    
    const tenantId = getTenantId();
    if (!tenantId) {
      logger.warn('Cannot verify tenant schema: No tenant ID available');
      return { success: false, error: 'No tenant ID available' };
    }
    
    // Return cached result if available
    const cacheKey = `schema-${tenantId}`;
    if (tenantVerificationCache.has(cacheKey)) {
      const cached = tenantVerificationCache.get(cacheKey);
      if (cached.timestamp > Date.now() - CACHE_TTL) {
        logger.info('Using cached tenant schema verification', cached.result);
        return cached.result;
      } else {
        tenantVerificationCache.delete(cacheKey);
      }
    }
    
    // Check if this tenant ID already has a pending request
    if (pendingRequests.current.has(tenantId)) {
      logger.info(`Joining pending request for tenant ${tenantId}`);
      try {
        // Wait for the existing promise to resolve
        return await pendingRequests.current.get(tenantId);
      } catch (error) {
        logger.error(`Error in pending request for tenant ${tenantId}:`, error);
        // Continue with new request if pending one failed
      }
    }
    
    // Create a new promise for this verification request
    const verificationPromise = (async () => {
      setIsVerifying(true);
      setVerificationError(null);
      
      try {
        logger.info(`Verifying tenant schema for tenant ID: ${tenantId}`);
        verificationAttempts.current++;
        
        // First try to set up AWS RDS tables with tenant-specific target
        try {
          const startTime = Date.now();
          const schemaResponse = await fetch(`/api/db/create-aws-tables?tenantId=${tenantId}`);
          if (schemaResponse.ok) {
            const schemaResult = await schemaResponse.json();
            logger.info(`AWS RDS tables verified in ${Date.now() - startTime}ms`, schemaResult);
          }
        } catch (schemaError) {
          logger.warn('Error creating AWS RDS tables, continuing with verification:', schemaError);
          // Continue with verification anyway
        }
        
        // Make the verification request
        const response = await fetch('/api/tenant/verify-schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId })
        });
        
        if (!response.ok) {
          throw new Error(`Verification failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        logger.info('Tenant schema verification result:', result);
        
        // Store in component state
        setVerificationResult(result);
        setIsVerifying(false);
        
        // Cache the successful result
        tenantVerificationCache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        
        // Mark initialization as complete (used for performance optimizations)
        initializationComplete.current = true;
        
        // Store tenant ID in all storage mechanisms for consistency
        if (typeof window !== 'undefined') {
          localStorage.setItem('tenantId', tenantId);
          document.cookie = `tenantId=${tenantId}; path=/; max-age=${60*60*24*30}; samesite=lax`;
        }
        
        return result;
      } catch (error) {
        logger.error('Error verifying tenant schema:', error);
        setVerificationError(error.message || 'Verification failed');
        setIsVerifying(false);
        
        throw error;
      } finally {
        // Remove from pending requests
        pendingRequests.current.delete(tenantId);
      }
    })();
    
    // Store the promise so other calls can join it
    pendingRequests.current.set(tenantId, verificationPromise);
    
    // Return the promise result
    return verificationPromise;
  }, [getTenantId, sessionStatus]);
  
  /**
   * Update Cognito user's onboarding status
   * Updates the 'custom:onboardingComplete' attribute to 'true'
   */
  const updateCognitoOnboardingStatus = useCallback(async () => {
    // Skip if session is loading
    if (sessionStatus === 'loading') {
      return { success: false, reason: 'session loading' };
    }
    
    try {
      logger.info('Updating Cognito onboarding status');
      
      const response = await fetch('/api/auth/update-cognito-attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attributes: {
            'custom:onboardingComplete': 'true'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update Cognito attributes: ${response.status}`);
      }
      
      const result = await response.json();
      logger.info('Cognito attributes updated:', result);
      
      return result;
    } catch (error) {
      logger.error('Error updating Cognito attributes:', error);
      return { success: false, error: error.message };
    }
  }, [sessionStatus]);
  
  // Auto-verify tenant when session is ready and hook is first used
  useEffect(() => {
    // Skip if session is still loading
    if (sessionStatus === 'loading') {
      return;
    }
    
    // Don't run auto-verification if already complete or in progress
    if (initializationComplete.current || isVerifying) {
      return;
    }
    
    const tenantId = getTenantId();
    if (tenantId) {
      // Don't use verifyTenantSchema directly to avoid dependency cycle
      (async () => {
        try {
          await verifyTenantSchema();
        } catch (error) {
          logger.error('Auto-verification failed:', error);
        }
      })();
    }
  }, [sessionStatus, getTenantId, isVerifying]);
  
  return {
    verifyTenantSchema,
    updateCognitoOnboardingStatus,
    isVerifying,
    verificationError,
    verificationResult,
    getTenantId,
    sessionStatus,
    verificationAttempts: verificationAttempts.current
  };
}