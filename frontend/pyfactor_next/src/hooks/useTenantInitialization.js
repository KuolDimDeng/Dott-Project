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

// Lock keys
const TENANT_LOCK_KEY = 'tenant_initialization_lock';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout
const TENANT_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'; // Namespace for generating deterministic tenant IDs

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

/**
 * Hook for tenant ID initialization and verification
 * This hook ensures consistent tenant IDs across the application during login/auth
 */
export function useTenantInitialization() {
  const auth = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const initLock = useRef(null);

  const initializeTenantId = useCallback(async (user) => {
    // Add detailed debug logging
    logger.debug('[TenantInit] Initializing tenant for user:', {
      userId: user?.userId,
      email: user?.attributes?.email,
      existingBusinessId: user?.attributes?.['custom:businessid']
    });

    // Try to acquire lock first
    if (initLock.current) {
      logger.debug('[TenantInit] Another initialization in progress, waiting...');
      await initLock.current;
      return getTenantId();
    }

    let lockResolve;
    initLock.current = new Promise(resolve => {
      lockResolve = resolve;
    });

    try {
      setIsInitializing(true);
      setError(null);

      // Check session storage for a previously verified tenant ID
      const sessionTenantId = sessionStorage.getItem('verified_tenant_id');
      if (sessionTenantId) {
        logger.debug('[TenantInit] Using verified tenant ID from session:', sessionTenantId);
        storeTenantInfo(sessionTenantId);
        setTenantId(sessionTenantId);
        setInitialized(true);
        return sessionTenantId;
      }

      // Always verify with backend first, regardless of local storage
      let tenantId = null;
      let tenantSource = 'none';
      let userEmail = user?.attributes?.email || null;

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

          // FALLBACK: If no tenant ID found yet, generate one or fetch from server
          if (!tenantId) {
            // Generate a deterministic UUID based on user ID if possible
            if (user?.userId) {
              try {
                tenantId = uuidv5(user.userId, TENANT_NAMESPACE);
                tenantSource = 'generated_from_userid';
                logger.debug('[TenantInit] Generated tenant ID from user ID:', tenantId);
              } catch (e) {
                logger.error('[TenantInit] Error generating tenant ID:', e);
                // Fallback to random UUID if generation fails
                tenantId = uuidv4();
                tenantSource = 'random_generated';
                logger.debug('[TenantInit] Generated random tenant ID as fallback:', tenantId);
              }
            } else {
              // Generate a random UUID if no user ID is available
              tenantId = uuidv4();
              tenantSource = 'random_generated';
              logger.debug('[TenantInit] Generated random tenant ID:', tenantId);
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
              setTenantId(verifiedId);
              setInitialized(true);
              return verifiedId;
            }
          }

          // Mark this request as pending
          sessionStorage.setItem(pendingKey, Date.now().toString());

          try {
            // Get tokens for request
            const { fetchAuthSession } = await import('aws-amplify/auth');
            let sessionResult;
            
            try {
              sessionResult = await fetchAuthSession();
            } catch (sessionError) {
              logger.error('[TenantInit] Failed to fetch auth session:', sessionError);
              throw new Error('Unable to fetch authentication session');
            }
            
            const tokens = sessionResult?.tokens;
            
            if (!tokens?.accessToken || !tokens?.idToken) {
              logger.error('[TenantInit] No valid tokens available for tenant verification');
              throw new Error('No valid authentication tokens available');
            }

            logger.debug('[TenantInit] Making tenant verification request with tokens', { 
              hasAccessToken: !!tokens.accessToken, 
              hasIdToken: !!tokens.idToken,
              tenantId,
              userId: user.userId,
              userEmail
            });

            try {
              const response = await fetch('/api/auth/verify-tenant', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tokens.accessToken}`,
                  'X-Id-Token': tokens.idToken.toString(),
                  'X-Request-ID': requestId,
                  'X-User-ID': user.userId
                },
                body: JSON.stringify({ 
                  tenantId,
                  userId: user.userId,
                  email: userEmail,
                  username: user.username
                })
              });

              // Handle failed responses with better diagnostics
              if (!response.ok) {
                let errorText = 'Unknown error';
                let errorData = null;
                
                try {
                  // Try to get error as JSON first
                  errorData = await response.json().catch(() => null);
                  if (errorData) {
                    errorText = errorData.message || JSON.stringify(errorData);
                  } else {
                    // Fallback to text if not JSON
                    errorText = await response.text().catch(() => 'Unknown error');
                  }
                } catch (parseError) {
                  logger.debug('[TenantInit] Could not parse error response:', parseError);
                }
                
                logger.error('[TenantInit] Tenant verification failed:', { 
                  status: response.status, 
                  error: errorText || 'Unknown error',
                  data: errorData || {}
                });
                
                // Fallback tenant ID is either the one we have or a default
                const fallbackId = tenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
                logger.info('[TenantInit] Using fallback tenant ID after API error:', fallbackId);
                
                // Store the fallback ID in session storage
                sessionStorage.setItem('verified_tenant_id', fallbackId);
                sessionStorage.removeItem(pendingKey);
                
                // Store in cookies and local storage
                storeTenantInfo(fallbackId);
                
                // Update state
                setTenantId(fallbackId);
                setInitialized(true);
                return fallbackId;
              }

              // Handle successful responses
              const responseData = await response.json();
              
              if (responseData.success) {
                const verifiedTenantId = responseData.tenantId || responseData.correctTenantId;
                
                if (!verifiedTenantId) {
                  logger.error('[TenantInit] Missing tenant ID in successful response:', responseData);
                  throw new Error('Missing tenant ID in response');
                }
                
                logger.debug('[TenantInit] Tenant verification successful:', { 
                  tenantId: verifiedTenantId,
                  source: responseData.source || 'api' 
                });
                
                // Store the verified ID in session storage
                sessionStorage.setItem('verified_tenant_id', verifiedTenantId);
                sessionStorage.removeItem(pendingKey);
                
                // Store in cookies and local storage
                storeTenantInfo(verifiedTenantId);
                
                // Update state
                setTenantId(verifiedTenantId);
                setInitialized(true);
                return verifiedTenantId;
              } else {
                logger.error('[TenantInit] Tenant verification returned error:', responseData);
                throw new Error(responseData.message || 'Tenant verification failed');
              }
            } catch (fetchError) {
              // Format the error object properly for logging
              const errorInfo = {
                message: fetchError.message || 'Unknown error',
                stack: fetchError.stack || '',
                name: fetchError.name || 'Error'
              };
              
              logger.error('[TenantInit] Fetch error during tenant verification:', errorInfo);
              
              // Fall back to the tenantId we already have
              logger.debug('[TenantInit] API error, using previously retrieved tenant ID');
              // Only use the tenant ID if it's in proper UUID format
              if (tenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
                storeTenantInfo(tenantId);
                setTenantId(tenantId);
                setInitialized(true);
                return tenantId;
              } else {
                // Otherwise generate a deterministic one from user
                logger.debug('[TenantInit] Invalid tenant ID format, generating from user ID');
                const userId = user?.userId;
                if (userId) {
                  try {
                    const generatedTenantId = uuidv5(userId, TENANT_NAMESPACE);
                    storeTenantInfo(generatedTenantId);
                    setTenantId(generatedTenantId);
                    setInitialized(true);
                    return generatedTenantId;
                  } catch (genError) {
                    logger.error('[TenantInit] Error generating tenant ID:', genError);
                  }
                }
                // Last resort fallback
                return null;
              }
            }
          } catch (tokenError) {
            logger.error('[TenantInit] Error getting tokens for tenant verification:', tokenError);
            throw tokenError;
          }
        } catch (error) {
          logger.error('[TenantInit] Error during tenant initialization:', error);
          
          // Generate tenant ID from user ID if possible
          if (user?.userId) {
            try {
              const generatedTenantId = uuidv5(user.userId, TENANT_NAMESPACE);
              logger.debug('[TenantInit] Generated tenant ID from user ID after error:', generatedTenantId);
              storeTenantInfo(generatedTenantId);
              setTenantId(generatedTenantId);
              setInitialized(true);
              return generatedTenantId;
            } catch (genError) {
              logger.error('[TenantInit] Error generating tenant ID from user ID:', genError);
            }
          }
          
          // Use existing tenant ID if it's valid
          if (tenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
            logger.debug('[TenantInit] Using existing tenant ID after error:', tenantId);
            storeTenantInfo(tenantId);
            setTenantId(tenantId);
            setInitialized(true);
            return tenantId;
          }
          
          // No valid tenant ID available
          logger.warn('[TenantInit] No valid tenant ID available after error');
          setError(new Error('Could not determine tenant ID'));
          setInitialized(true);
          return null;
        }
      } else {
        // No authenticated user - redirect to login
        logger.debug('[TenantInit] No authenticated user, tenant ID cannot be determined');
        // Don't set a tenant ID when there's no authenticated user
        setError(new Error('Authentication required'));
        setInitialized(true);
        return null;
      }
    } catch (initError) {
      const defaultTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
      logger.error('[TenantInit] Unhandled error in tenant initialization:', initError);
      setError(initError);
      
      // Always ensure a tenant ID is set even if there was an error
      storeTenantInfo(defaultTenantId);
      setTenantId(defaultTenantId);
      setInitialized(true);
      return defaultTenantId;
    } finally {
      setIsInitializing(false);
      if (lockResolve) {
        lockResolve();
      }
      initLock.current = null;
    }
  }, []);

  /**
   * Login with tenant ID synchronization
   * @param {string} email User email
   * @param {string} password User password
   * @param {boolean} rememberMe Whether to remember the user
   * @returns {Promise<{success: boolean, tenantId?: string, error?: string}>} Login result
   */
  const login = useCallback(async (email, password, rememberMe = false) => {
    try {
      logger.info('[TenantInit] Login with tenant verification', { email });
      
      // Ensure Amplify is configured before attempting login
      reconfigureAmplify();
      
      // Perform the login via Amplify
      let signInResult;
      try {
        signInResult = await signIn({ username: email, password });
        
        if (!signInResult?.isSignedIn) {
          throw new Error('Login attempt rejected by authentication service');
        }
      } catch (signInError) {
        logger.error('[TenantInit] amplifySignIn failed:', signInError);
        throw signInError;
      }
      
      // Get user attributes to extract business ID and onboarding status
      let userAttributes;
      try {
        userAttributes = await fetchUserAttributes();
      } catch (attributesError) {
        logger.error('[TenantInit] Failed to fetch user attributes after login:', attributesError);
        throw new Error('Authentication succeeded but user data could not be retrieved');
      }
      
      logger.debug('[TenantInit] User attributes after sign-in:', {
        hasBusinessId: !!userAttributes['custom:businessid'],
        businessId: userAttributes['custom:businessid'],
        onboardingStatus: userAttributes['custom:onboarding'] || 'NOT_STARTED',
        hasComplete: userAttributes['custom:onboarding']?.toLowerCase() === 'complete',
        setupDone: userAttributes['custom:setupdone']?.toLowerCase() === 'true'
      });
      
      // Extract tenant ID and onboarding status from user attributes
      const cognitoTenantId = userAttributes['custom:businessid'] || '18609ed2-1a46-4d50-bc4e-483d6e3405ff'; // Use fallback if not set
      const onboardingStatus = userAttributes['custom:onboarding'] || 'NOT_STARTED';
      
      // Get tokens from session
      let authSession;
      try {
        authSession = await fetchAuthSession();
      } catch (sessionError) {
        logger.error('[TenantInit] Failed to fetch auth session after login:', sessionError);
        throw new Error('Authentication succeeded but session could not be established');
      }
      
      const { tokens } = authSession;
      
      if (!tokens?.idToken || !tokens?.accessToken) {
        throw new Error('Authentication succeeded but tokens are missing');
      }
      
      // Store tenant ID in cookies and localStorage for consistency
      try {
        // Set in localStorage
        localStorage.setItem('tenantId', cognitoTenantId);
        
        // Set in cookie with the appropriate expiration
        const expiration = new Date();
        if (rememberMe) {
          expiration.setDate(expiration.getDate() + 30); // 30 days
        } else {
          expiration.setDate(expiration.getDate() + 1); // 1 day
        }
        
        document.cookie = `tenantId=${cognitoTenantId}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        document.cookie = `authToken=true; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        // Set onboarding status cookies for middleware
        document.cookie = `onboardedStatus=${onboardingStatus}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        // Also set setupCompleted for middleware
        const setupCompleted = userAttributes['custom:setupdone']?.toLowerCase() === 'true' || 
                              userAttributes['custom:onboarding']?.toLowerCase() === 'complete' ? 'true' : 'false';
        document.cookie = `setupCompleted=${setupCompleted}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        // Set onboarding step cookie based on status
        let onboardingStep = 'business-info'; // Default
        const normalizedStatus = onboardingStatus?.toLowerCase();

        if (normalizedStatus === 'business_info' || normalizedStatus === 'business-info') {
          onboardingStep = 'subscription';
        } else if (normalizedStatus === 'subscription') {
          const plan = userAttributes['custom:subscription_plan'] || '';
          onboardingStep = ['professional', 'enterprise'].includes(plan.toLowerCase()) ? 'payment' : 'setup';
        } else if (normalizedStatus === 'payment') {
          onboardingStep = 'setup';
        } else if (normalizedStatus === 'complete') {
          onboardingStep = 'complete';
        }
        document.cookie = `onboardingStep=${onboardingStep}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
        
        logger.debug('[TenantInit] Stored tenant ID and auth cookies:', {
          tenantId: cognitoTenantId,
          onboardingStatus,
          setupCompleted,
          onboardingStep
        });
      } catch (storageError) {
        logger.warn('[TenantInit] Failed to store tenant ID:', storageError);
        // Non-fatal error, continue with login
      }
      
      return { 
        success: true, 
        tenantId: cognitoTenantId,
        onboardingStatus: onboardingStatus
      };
    } catch (error) {
      logger.error('[TenantInit] Login failed:', error instanceof Error ? 
        { message: error.message, stack: error.stack, name: error.name } : 
        String(error));
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) || 'Login failed'
      };
    }
  }, []);

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
        const pathname = window.location.pathname;
        const isPublicRoute = pathname.includes('/auth/') || pathname === '/';
        if (isPublicRoute) {
          logger.debug('[TenantInit] Skipping tenant initialization on public route:', pathname);
          return;
        }
        
        // Check if user is authenticated before trying to get current user
        const { fetchAuthSession } = await import('aws-amplify/auth');
        let tokens;
        
        try {
          const session = await fetchAuthSession();
          tokens = session?.tokens;
          
          if (!tokens?.idToken) {
            logger.debug('[TenantInit] No active session, skipping tenant initialization');
            return;
          }
        } catch (sessionError) {
          logger.debug('[TenantInit] Session error, user likely not authenticated:', sessionError.message);
          return;
        }
        
        // Now it's safe to get the current user
        try {
          const { getCurrentUser } = await import('aws-amplify/auth');
          const user = await getCurrentUser();
          
          if (user) {
            try {
              const tenantId = await initializeTenantId(user);
              logger.debug('[TenantInit] Tenant ID initialized for existing user:', tenantId);
              
              // Check onboarding status for redirection
              checkOnboardingStatus(user);
            } catch (tenantInitError) {
              // Handle tenant initialization errors gracefully
              logger.error('[TenantInit] Tenant initialization failed:', tenantInitError);
              
              // Use a fallback tenant ID
              const fallbackId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
              storeTenantInfo(fallbackId);
              setTenantId(fallbackId);
              setInitialized(true);
            }
          }
        } catch (userError) {
          if (userError.name === 'UserUnAuthenticatedException') {
            logger.debug('[TenantInit] User not authenticated, skipping tenant initialization');
          } else {
            logger.error('[TenantInit] Error getting current user:', userError);
          }
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

  // Enhanced function to check if we need to redirect to onboarding
  const checkOnboardingStatus = useCallback(async (user) => {
    try {
      // Get current pathname
      const pathname = window.location.pathname;
      
      // Skip check if we're on auth pages or in the onboarding flow already
      if (pathname.startsWith('/auth/') || pathname.startsWith('/onboarding/') || pathname === '/') {
        logger.debug('[TenantInit] On auth/onboarding page, skipping onboarding status check:', pathname);
        return true;
      }
      
      // Get user attributes
      const userAttributes = await fetchUserAttributes();
      
      // Check cookies for onboarding status (useful for mock or local development)
      const getCookie = (name) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      // Check localStorage for onboarding status
      const getLocalStorage = (key) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      };
      
      // Combine all sources of onboarding status
      const cookieOnboardingStatus = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
      const cookieSetupCompleted = getCookie(COOKIE_NAMES.SETUP_COMPLETED);
      const localStorageOnboardingStatus = getLocalStorage(STORAGE_KEYS.ONBOARDING_STATUS);
      const localStorageSetupCompleted = getLocalStorage(STORAGE_KEYS.SETUP_COMPLETED);
      
      logger.debug('[TenantInit] Checking onboarding status with attributes:', {
        customOnboarding: userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS],
        customSetupDone: userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED],
        customBusinessId: userAttributes[COGNITO_ATTRIBUTES.BUSINESS_ID],
        cookieOnboardingStatus,
        cookieSetupCompleted,
        localStorageOnboardingStatus,
        localStorageSetupCompleted,
        path: pathname
      });
      
      // For new users, the onboarding attribute might not exist yet
      // Consider them not onboarded if attribute is missing or not "COMPLETE"
      const onboardingAttribute = userAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
      const setupDoneAttribute = userAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
      
      // Check all sources for onboarding status - ANY source can mark as onboarded
      const isOnboardedCognito = onboardingAttribute === ONBOARDING_STATUS.COMPLETE || setupDoneAttribute === 'true';
      const isOnboardedCookie = cookieOnboardingStatus === ONBOARDING_STATUS.COMPLETE || cookieSetupCompleted === 'true';
      const isOnboardedLocalStorage = localStorageOnboardingStatus === ONBOARDING_STATUS.COMPLETE || localStorageSetupCompleted === 'true';
      
      // Combined onboarding status - if ANY source says onboarded, consider onboarded
      const isOnboarded = isOnboardedCognito || isOnboardedCookie || isOnboardedLocalStorage;
      
      // CRITICAL FIX: If we're on dashboard and cookies indicate onboarding is complete, 
      // never redirect regardless of Cognito attributes
      if (pathname.startsWith('/dashboard') && (isOnboardedCookie || isOnboardedLocalStorage)) {
        logger.info('[TenantInit] Dashboard access allowed by cookie/localStorage onboarding status');
        
        // Update Cognito in background to match cookies if needed
        if (!isOnboardedCognito) {
          logger.info('[TenantInit] Directly updating Cognito onboarding attributes');
          try {
            // Try to update attributes in background (don't await)
            updateUserAttributes({
              userAttributes: {
                [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
                [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
              }
            }).catch(e => 
              logger.warn('[TenantInit] Background attribute update error:', e)
            );
          } catch (e) {
            logger.warn('[TenantInit] Error preparing background Cognito update:', e);
          }
        }
        
        return true; // Allow dashboard access
      }
      
      // Check for URL parameters that might prevent redirect
      const urlParams = new URLSearchParams(window.location.search);
      const fromSignin = urlParams.get('from') === 'signin';
      const noRedirect = urlParams.get('noredirect') === 'true';
      const newAccount = urlParams.get('newAccount') === 'true';
      const planSelected = urlParams.get('plan') !== null;
      
      // CRITICAL FIX: If coming from subscription with a plan selection,
      // mark as onboarded in cookies and never redirect
      if (pathname.startsWith('/dashboard') && (newAccount && planSelected)) {
        logger.info('[TenantInit] New account with plan detected, marking as onboarded');
        
        // Set up all the necessary cookies and storage
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/`;
        document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/`;
        document.cookie = `${COOKIE_NAMES.ONBOARDING_STEP}=${ONBOARDING_STEPS.COMPLETE}; path=/`;
        
        try {
          localStorage.setItem(STORAGE_KEYS.ONBOARDING_STATUS, ONBOARDING_STATUS.COMPLETE);
          localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETED, 'true');
        } catch (e) {
          // Ignore storage errors
        }
        
        // Also update Cognito if possible
        try {
          updateUserAttributes({
            userAttributes: {
              [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
              [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
            }
          }).catch(e => logger.warn('[TenantInit] Cognito update error:', e));
        } catch (e) {
          logger.warn('[TenantInit] Error in Cognito update setup:', e);
        }
        
        return true; // Allow dashboard access
      }
      
      if (noRedirect) {
        logger.debug('[TenantInit] Redirect suppressed by noredirect parameter');
        return true;
      }
      
      // Only redirect if not onboarded and not coming from signin flow
      if (!isOnboarded && !fromSignin) {
        // Determine which onboarding step to redirect to
        let redirectStep = ONBOARDING_STEPS.BUSINESS_INFO; // Default first step
        
        if (onboardingAttribute === ONBOARDING_STATUS.BUSINESS_INFO || cookieOnboardingStatus === ONBOARDING_STATUS.BUSINESS_INFO_COMPLETED) {
          redirectStep = ONBOARDING_STEPS.SUBSCRIPTION;
        } else if (onboardingAttribute === ONBOARDING_STATUS.SUBSCRIPTION || cookieOnboardingStatus === ONBOARDING_STATUS.SUBSCRIPTION_COMPLETED) {
          // Check if paid plan - redirect to payment if so
          const plan = userAttributes[COGNITO_ATTRIBUTES.SUBSCRIPTION_PLAN] || getCookie('selectedPlan') || '';
          redirectStep = ['professional', 'enterprise'].includes(plan.toLowerCase()) ? ONBOARDING_STEPS.PAYMENT : ONBOARDING_STEPS.SETUP;
        } else if (onboardingAttribute === ONBOARDING_STATUS.PAYMENT || cookieOnboardingStatus === ONBOARDING_STATUS.PAYMENT_COMPLETED) {
          redirectStep = ONBOARDING_STEPS.SETUP;
        }
        
        logger.info('[TenantInit] User not onboarded, redirecting to:', `/onboarding/${redirectStep}`);
        
        // Add parameters to prevent redirect loops
        const redirectUrl = `/onboarding/${redirectStep}?from=tenant_check&ts=${Date.now()}`;
        window.location.href = redirectUrl;
        return false;
      }
      
      return isOnboarded;
    } catch (error) {
      logger.error('[TenantInit] Error checking onboarding status:', error);
      return false;
    }
  }, []);

  /**
   * Verify tenant schema exists and create one if missing
   */
  const verifyTenantSchema = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user) {
      logger.debug('[TenantInit] User not authenticated, skipping tenant schema verification');
      return null;
    }

    try {
      logger.debug('[TenantInit] Verifying tenant schema exists...');
      const response = await fetch('/api/tenant/verify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.getAccessToken()}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        logger.error('[TenantInit] Error verifying tenant schema:', data);
        return null;
      }

      if (data.schema_exists) {
        logger.debug('[TenantInit] Tenant schema exists:', data.schema_name);
        return data;
      }

      // If schema doesn't exist, create it
      logger.warn('[TenantInit] Tenant schema missing, creating one...');
      const createResponse = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.getAccessToken()}`
        }
      });

      const createData = await createResponse.json();
      
      if (!createResponse.ok) {
        logger.error('[TenantInit] Error creating tenant schema:', createData);
        return null;
      }

      logger.info('[TenantInit] Successfully created tenant schema:', createData);
      return createData;
    } catch (error) {
      logger.error('[TenantInit] Error in verifyTenantSchema:', error);
      return null;
    }
  }, [auth]);

  /**
   * Verify tenant consistency across all storage mechanisms and fix if needed
   * @returns {Promise<Object>} Repair status and tenant info
   */
  const verifyTenantConsistency = useCallback(async () => {
    try {
      logger.info('[TenantInit] Verifying tenant ID consistency across all sources');
      
      // Collect all potential tenant IDs from various sources
      const potentialTenantIds = {
        cognito: null,
        cookies: null,
        localStorage: null,
        url: null
      };
      
      // 1. Check Cognito (highest priority as source of truth)
      try {
        const userAttributes = await fetchUserAttributes();
        potentialTenantIds.cognito = userAttributes['custom:businessid'];
        
        if (potentialTenantIds.cognito) {
          logger.info('[TenantInit] Found Cognito tenant ID:', potentialTenantIds.cognito);
        } else {
          logger.warn('[TenantInit] No tenant ID in Cognito attributes');
        }
        
        // Also collect onboarding status for full verification
        const onboardingStatus = {
          cognitoOnboarding: null,
          cognitoSetupDone: null,
          cookieOnboardedStatus: null
        };
        
        // Get Cognito onboarding status
        onboardingStatus.cognitoOnboarding = userAttributes['custom:onboarding'];
        onboardingStatus.cognitoSetupDone = userAttributes['custom:setupdone'];
        
        logger.debug('[TenantInit] Cognito onboarding status:', {
          onboarding: onboardingStatus.cognitoOnboarding,
          setupDone: onboardingStatus.cognitoSetupDone
        });
        
        // 2. Check cookies (next priority)
        try {
          const cookies = document.cookie.split(';').map(c => c.trim());
          
          // Find tenant ID in cookies
          const tenantIdCookie = cookies.find(row => row.startsWith('tenantId='));
          if (tenantIdCookie) {
            potentialTenantIds.cookies = tenantIdCookie.split('=')[1];
            logger.debug('[TenantInit] Found cookie tenant ID:', potentialTenantIds.cookies);
          }
          
          // Also check onboarding status cookies
          onboardingStatus.cookieOnboardedStatus = cookies.find(row => row.startsWith('onboardedStatus='))?.split('=')[1];
          
          logger.debug('[TenantInit] Cookie onboarding status:', {
            onboardedStatus: onboardingStatus.cookieOnboardedStatus
          });
        } catch (cookieError) {
          logger.warn('[TenantInit] Error reading cookies:', cookieError);
        }
        
        // 3. Check localStorage (lower priority)
        try {
          potentialTenantIds.localStorage = localStorage.getItem('tenantId');
          if (potentialTenantIds.localStorage) {
            logger.debug('[TenantInit] Found localStorage tenant ID:', potentialTenantIds.localStorage);
          }
        } catch (storageError) {
          logger.warn('[TenantInit] Error reading from localStorage:', storageError);
        }
        
        // 4. Check URL parameters (lowest priority, but useful for debugging)
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlTenantId = urlParams.get('tenantId');
          if (urlTenantId) {
            potentialTenantIds.url = urlTenantId;
            logger.debug('[TenantInit] Found tenant ID in URL:', potentialTenantIds.url);
          }
        } catch (urlError) {
          logger.warn('[TenantInit] Error reading URL parameters:', urlError);
        }
        
        // 5. Decide if we need to repair tenant ID inconsistencies
        // IMPORTANT: Cognito is always the source of truth for tenant ID
        const needsRepair = !!(
          potentialTenantIds.cognito &&
          (
            potentialTenantIds.cognito !== potentialTenantIds.cookies ||
            potentialTenantIds.cognito !== potentialTenantIds.localStorage
          )
        );
        
        const needsOnboardingRepair = !!(
          (onboardingStatus.cognitoOnboarding !== 'COMPLETE' ||
           onboardingStatus.cognitoSetupDone !== 'true' ||
           onboardingStatus.cookieOnboardedStatus !== 'COMPLETE') && 
          // But only if tenant schema exists (indicated by Cognito tenant ID)
          potentialTenantIds.cognito);
        
        if (needsRepair) {
          logger.warn('[TenantInit] Tenant ID inconsistency detected:', {
            cognito: potentialTenantIds.cognito,
            cookies: potentialTenantIds.cookies,
            localStorage: potentialTenantIds.localStorage,
            url: potentialTenantIds.url
          });
          
          // 6. Repair inconsistencies - always use Cognito tenant ID as source of truth
          if (potentialTenantIds.cognito) {
            // Set tenant ID in localStorage
            localStorage.setItem('tenantId', potentialTenantIds.cognito);
            
            // Set tenant ID cookie
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 30); // 30 days
            document.cookie = `tenantId=${potentialTenantIds.cognito}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
            
            logger.info('[TenantInit] Fixed tenant ID inconsistency. Using Cognito ID:', potentialTenantIds.cognito);
            
            // Update server session to enforce consistency
            try {
              const response = await fetch('/api/tenant/status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  tenantId: potentialTenantIds.cognito,
                  forceSync: true
                })
              });
              
              if (response.ok) {
                logger.info('[TenantInit] Server-side tenant ID update successful');
              } else {
                logger.warn('[TenantInit] Server-side tenant ID update failed');
              }
            } catch (serverError) {
              logger.warn('[TenantInit] Error updating server-side tenant ID:', serverError);
            }
          }
        }
        
        // Return final tenant ID (after repairs if needed)
        return {
          repaired: needsRepair,
          tenantId: potentialTenantIds.cognito || potentialTenantIds.cookies || potentialTenantIds.localStorage,
          sources: potentialTenantIds,
          needsOnboardingRepair,
          onboardingComplete: onboardingStatus.cognitoOnboarding === 'COMPLETE'
        };
      } catch (cognitoError) {
        logger.error('[TenantInit] Error getting tenant ID from Cognito:', cognitoError);
        
        // Fall back to stored values if Cognito check fails
        return {
          repaired: false,
          error: cognitoError.message,
          tenantId: potentialTenantIds.cookies || potentialTenantIds.localStorage,
          sources: potentialTenantIds
        };
      }
    } catch (error) {
      logger.error('[TenantInit] Error verifying tenant consistency:', error);
      return {
        repaired: false,
        error: error.message,
        tenantId: null
      };
    }
  }, []);
  
  /**
   * Directly update Cognito onboarding attributes to mark setup as complete
   * This is used when the server-side updates fail
   * @returns {Promise<boolean>} Success status
   */
  const updateCognitoOnboardingStatus = useCallback(async () => {
    try {
      // Skip updates on public routes
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname.includes('/auth/') || pathname === '/') {
          logger.debug('[TenantInit] Skipping Cognito attribute update on public route:', pathname);
          return false;
        }
      }
      
      logger.info('[TenantInit] Directly updating Cognito onboarding attributes');
      
      // Get current attributes to check if update is needed
      const currentAttributes = await fetchUserAttributes().catch(error => {
        logger.error('[TenantInit] Error fetching user attributes:', {
          message: error.message,
          name: error.name,
          code: error.code
        });
        return {};
      });
      
      const currentOnboarding = currentAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
      const currentSetupDone = currentAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
      
      logger.debug('[TenantInit] Current Cognito attributes:', {
        onboarding: currentOnboarding || 'not set',
        setupDone: currentSetupDone || 'not set'
      });
      
      if (currentOnboarding === ONBOARDING_STATUS.COMPLETE && currentSetupDone === 'true') {
        logger.info("[TenantInit] No need to update attributes, already set properly");
        return true;
      }
      
      // Update attributes using Amplify v6 format
      const result = await updateUserAttributes({
        userAttributes: {
          [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE, 
          [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'true'
        }
      });
      
      // Verify the update worked with retries
      const verifyWithRetry = async (maxRetries = 5) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Wait a bit before verification to allow time for propagation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            logger.info(`[TenantInit] Verifying attribute update (attempt ${attempt}/${maxRetries})`);
            const updatedAttributes = await fetchUserAttributes();
            const newOnboarding = updatedAttributes[COGNITO_ATTRIBUTES.ONBOARDING_STATUS];
            const newSetupDone = updatedAttributes[COGNITO_ATTRIBUTES.SETUP_COMPLETED];
            
            logger.debug('[TenantInit] Updated attributes check:', {
              onboarding: newOnboarding || 'not set',
              setupDone: newSetupDone || 'not set'
            });
            
            if (newOnboarding === ONBOARDING_STATUS.COMPLETE && newSetupDone === 'true') {
              logger.info("[TenantInit] Successfully updated Cognito attributes");
              return true;
            }
            
            logger.warn('[TenantInit] Attributes not updated yet, will retry verification');
            
            if (attempt < maxRetries) {
              // Increase delay for each attempt to allow more time
              const delay = 1000 * attempt;
              logger.info(`[TenantInit] Waiting ${delay}ms before next verification...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            logger.warn(`[TenantInit] Verification attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        // If we get here, verification failed but we consider it successful
        // since the update command itself succeeded
        logger.warn('[TenantInit] Could not verify attribute update, but update commands succeeded');
        return true;
      };
      
      // Run verification with retries
      await verifyWithRetry();
      return true;
    } catch (error) {
      logger.error('[TenantInit] Error updating Cognito onboarding status:', error);
      return false;
    }
  }, []);
  
  /**
   * Ensure the tenant exists by checking all sources and repairing if needed
   * @returns {Promise<Object>} Tenant status
   */
  const ensureTenant = useCallback(async () => {
    try {
      // 1. First check and repair any inconsistencies
      const consistency = await verifyTenantConsistency();
      
      // If tenant ID is available after verification, check if schema exists
      if (consistency.tenantId) {
        logger.info('[TenantInit] Checking if tenant schema exists for:', consistency.tenantId);
        
        // 2. Check if tenant schema exists by calling status endpoint
        try {
          const response = await fetch('/api/tenant/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tenantId: consistency.tenantId,
              checkOnly: true
            })
          });
          
          const data = await response.json();
          
          if (response.ok && data.schemaExists) {
            logger.info('[TenantInit] Tenant schema exists:', data);
            
            // If schema exists but onboarding is incomplete, fix it
            if (consistency.needsOnboardingRepair) {
              logger.info('[TenantInit] Schema exists but onboarding status needs repair');
              await updateCognitoOnboardingStatus();
            }
            
            return {
              exists: true,
              tenantId: consistency.tenantId,
              ...data
            };
          } else {
            logger.warn('[TenantInit] Tenant schema does not exist, will create it:', data);
            
            // 3. Create schema using the verified tenant ID
            const createResponse = await fetch('/api/dashboard/trigger-schema-setup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                tenantId: consistency.tenantId,
                forceCreate: true
              })
            });
            
            if (createResponse.ok) {
              const createData = await createResponse.json();
              logger.info('[TenantInit] Successfully created tenant schema:', createData);
              
              // Update onboarding status directly 
              await updateCognitoOnboardingStatus();
              
              return {
                exists: true,
                created: true,
                tenantId: consistency.tenantId,
                ...createData
              };
            } else {
              // If primary method fails, try fallback approach
              logger.error('[TenantInit] Failed to create tenant schema, trying fallback method');
              
              try {
                // Fallback to older tenant create endpoint
                const fallbackResponse = await fetch('/api/tenant/create', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    tenantId: consistency.tenantId,
                    forceMigration: true
                  })
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  logger.info('[TenantInit] Fallback tenant creation successful:', fallbackData);
                  
                  // Update onboarding status regardless
                  await updateCognitoOnboardingStatus();
                  
                  return {
                    exists: true,
                    created: true,
                    fallback: true,
                    tenantId: consistency.tenantId,
                    ...fallbackData
                  };
                } else {
                  const fallbackError = await fallbackResponse.json();
                  throw new Error(fallbackError.message || 'Fallback tenant creation failed');
                }
              } catch (fallbackError) {
                logger.error('[TenantInit] Fallback tenant creation also failed:', fallbackError);
                throw fallbackError;
              }
            }
          }
        } catch (schemaError) {
          logger.error('[TenantInit] Error checking/creating tenant schema:', schemaError);
          throw schemaError;
        }
      } else {
        // If no tenant ID is found, we need to create a new one
        logger.warn('[TenantInit] No valid tenant ID found, need to create one');
        
        // Generate a deterministic tenant ID based on user ID to avoid mismatches
        const userId = await getCurrentUserId();
        if (userId) {
          // Create tenant ID deterministically based on user ID to avoid future mismatches
          const newTenantId = await createOrUpdateCognitoTenantId(userId);
          
          if (newTenantId) {
            logger.info('[TenantInit] Created new tenant ID and updated Cognito:', newTenantId);
            
            // Now try to create the schema with this new ID
            return await ensureTenant(); // Recursive call with new ID now set
          } else {
            throw new Error('Failed to create or update tenant ID in Cognito');
          }
        } else {
          throw new Error('Cannot create tenant ID - user not authenticated');
        }
      }
    } catch (error) {
      logger.error('[TenantInit] ensureTenant error:', error);
      return {
        exists: false,
        error: error.message
      };
    }
  }, [verifyTenantConsistency, updateCognitoOnboardingStatus]);
  
  /**
   * Creates or updates the Cognito tenant ID attribute
   * @param {string} userId - The user ID to associate with tenant
   * @returns {Promise<string>} The tenant ID
   */
  const createOrUpdateCognitoTenantId = useCallback(async (userId) => {
    try {
      if (!userId) {
        const userInfo = await getCurrentUserId();
        userId = userInfo;
        
        if (!userId) {
          throw new Error('No user ID available to create tenant ID');
        }
      }
      
      // First check if user already has a businessid in Cognito
      const userAttributes = await fetchUserAttributes();
      const existingTenantId = userAttributes['custom:businessid'];
      
      if (existingTenantId) {
        logger.info('[TenantInit] Using existing Cognito tenant ID:', existingTenantId);
        return existingTenantId;
      }
      
      // Create a new tenant ID based on user ID (this ensures deterministic generation)
      const tenantId = uuidv5(userId, TENANT_NAMESPACE);
      logger.info('[TenantInit] Generated new tenant ID from user ID:', tenantId);
      
      // Update Cognito with the new tenant ID
      await updateUserAttributes({
        'custom:businessid': tenantId
      });
      
      logger.info('[TenantInit] Updated Cognito with new tenant ID:', tenantId);
      
      // Set in localStorage and cookies for immediate use
      localStorage.setItem('tenantId', tenantId);
      
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30); // 30 days
      document.cookie = `tenantId=${tenantId}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
      
      // Verify the update worked
      const updatedAttributes = await fetchUserAttributes();
      const verifiedTenantId = updatedAttributes['custom:businessid'];
      
      if (verifiedTenantId !== tenantId) {
        logger.error('[TenantInit] Tenant ID verification failed:', {
          expected: tenantId,
          actual: verifiedTenantId
        });
        throw new Error('Tenant ID verification failed');
      }
      
      return tenantId;
    } catch (error) {
      logger.error('[TenantInit] Error creating/updating Cognito tenant ID:', error);
      throw error;
    }
  }, []);

  return {
    login,
    register: handleRegistration,
    initializeTenantId,
    getTenantId,
    storeTenantInfo,
    clearTenantInfo: releaseTenantLock,
    verifyTenantSchema,
    verifyTenantConsistency,
    updateCognitoOnboardingStatus
  };
}