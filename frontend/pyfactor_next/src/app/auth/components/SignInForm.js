'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithConfig as amplifySignIn,
  signInWithRedirect
} from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { createTenantForUser, updateUserWithTenantId, fixOnboardingStatusCase, storeTenantId } from '@/utils/tenantUtils';
import { ensureUserCreatedAt , prepareForSignIn} from '@/utils/authUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import ReactivationDialog from './ReactivationDialog';
import { checkDisabledAccount } from '@/lib/account-reactivation';
import { getCsrfToken } from 'next-auth/react';
import { signIn } from 'next-auth/react';

// Initialize global app cache for auth
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
  window.__APP_CACHE.user = window.__APP_CACHE.user || {};
  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
  window.__APP_CACHE.tenants = window.__APP_CACHE.tenants || {};
  
  // Define global functions for cache access if not already defined
  if (!window.setCacheValue) {
    window.setCacheValue = function(key, value, options = {}) {
      try {
        if (!window.__APP_CACHE) return false;
        
        const now = Date.now();
        const ttl = options.ttl || 3600000; // Default 1 hour
        
        // Create cache entry with metadata
        window.__APP_CACHE[key] = {
          value,
          timestamp: now,
          expiresAt: now + ttl,
          ttl
        };
        
        return true;
      } catch (error) {
        console.error(`[AppCache] Error setting cache value for key ${key}:`, error);
        return false;
      }
    };
  }
  
  if (!window.getCacheValue) {
    window.getCacheValue = function(key) {
      try {
        if (!window.__APP_CACHE) return null;
        
        // Check if the key exists in cache
        const cacheEntry = window.__APP_CACHE[key];
        if (!cacheEntry) return null;
        
        // Check if the entry is a structured entry with expiration
        if (cacheEntry.expiresAt && cacheEntry.value !== undefined) {
          // Check if the entry has expired
          if (Date.now() > cacheEntry.expiresAt) {
            delete window.__APP_CACHE[key];
            return null;
          }
          
          return cacheEntry.value;
        }
        
        // If it's just a simple value (old format), return it directly
        return cacheEntry;
      } catch (error) {
        console.error(`[AppCache] Error getting cache value for key ${key}:`, error);
        return null;
      }
    };
  }
  
  // Add global storeTenantInfo function for TenantInitializer
  if (!window.storeTenantInfo) {
    window.storeTenantInfo = function(tenantInfo) {
      try {
        if (!tenantInfo || !tenantInfo.tenantId) {
          console.error("[SignInForm] Cannot store null or invalid tenant info");
          return false;
        }
        
        // Store in localStorage
        localStorage.setItem('tenant_id', tenantInfo.tenantId);
        localStorage.setItem('tenantId', tenantInfo.tenantId);
        
        // Store metadata if provided
        if (tenantInfo.metadata) {
          localStorage.setItem('tenant_metadata', JSON.stringify(tenantInfo.metadata));
        }
        
        // Store in AppCache with namespacing
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.id = tenantInfo.tenantId;
        window.__APP_CACHE.tenantId = tenantInfo.tenantId;
        
        // Store metadata in AppCache if provided
        if (tenantInfo.metadata) {
          Object.entries(tenantInfo.metadata).forEach(([key, value]) => {
            window.__APP_CACHE.tenant[key] = value;
          });
        }
        
        console.log("[SignInForm] Successfully stored tenant info:", tenantInfo.tenantId);
        return true;
      } catch (error) {
        console.error("[SignInForm] Error in storeTenantInfo:", error);
        return false;
      }
    };
  }
}

// Utility function to ensure authenticated redirection
// Helper function to get tenant ID from various sources
const getTenantIdFromSources = async () => {
  try {
    // Try to get from cache first
    if (typeof window !== 'undefined') {
      // Check APP_CACHE
      if (window.__APP_CACHE && window.__APP_CACHE.tenant && window.__APP_CACHE.tenant.id) {
        logger.debug('[SignInForm] Found tenant ID in APP_CACHE:', window.__APP_CACHE.tenant.id);
        return window.__APP_CACHE.tenant.id;
      }
      
      // Check sessionStorage
      try {
        const sessionTenantId = sessionStorage.getItem('tenant_id');
        if (sessionTenantId) {
          logger.debug('[SignInForm] Found tenant ID in sessionStorage:', sessionTenantId);
          return sessionTenantId;
        }
      } catch (storageError) {
        // Ignore storage access errors
      }
    }
    
    // Try to get from URL path
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/dashboard/i);
      if (match && match[1]) {
        logger.debug('[SignInForm] Found tenant ID in URL path:', match[1]);
        return match[1];
      }
    }
    
    // Try to get from Cognito
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('@/config/amplifyUnified');
      const currentUser = await getCurrentUser();
      
      if (currentUser) {
        const userAttributes = await fetchUserAttributes();
        
        // Check all possible tenant ID attribute names - prioritize the correct one
        const tenantId = userAttributes?.['custom:tenant_ID'] ||
                         userAttributes?.['custom:tenantId'] || 
                         userAttributes?.['custom:tenant_id'] || 
                         userAttributes?.['tenantId'];
                         
        if (tenantId) {
          logger.debug('[SignInForm] Found tenant ID in Cognito attributes:', tenantId);
          return tenantId;
        }
      }
    } catch (e) {
      logger.warn('[SignInForm] Error getting tenant ID from Cognito:', e);
    }
    
    // Try to get from auth session
    try {
      const { fetchAuthSession } = await import('@/config/amplifyUnified');
      const session = await fetchAuthSession();
      
      if (session && session.tokens) {
        const claims = session.tokens.idToken?.payload || {};
        const tenantId = claims['custom:tenant_ID'] ||
                         claims['custom:tenantId'] || 
                         claims['custom:tenant_id'] || 
                         claims['tenantId'];
                         
        if (tenantId) {
          logger.debug('[SignInForm] Found tenant ID in auth session claims:', tenantId);
          return tenantId;
        }
      }
    } catch (sessionError) {
      logger.warn('[SignInForm] Error getting tenant ID from auth session:', sessionError);
    }
    
    logger.warn('[SignInForm] Could not find tenant ID from any source');
    return null;
  } catch (error) {
    logger.warn('[SignInForm] Error getting tenant ID from sources:', error);
    return null;
  }
};

const safeRedirectToDashboard = async (router, tenantId, options = {}) => {
  try {
    logger.debug('[SignInForm] Preparing for dashboard redirect', { tenantId, options });
    
    // Ensure auth session flag is set in both locations
    setCacheValue('auth_had_session', true, { ttl: 24 * 60 * 60 * 1000 });
    localStorage.setItem('auth_had_session', 'true');
    
    // Set last auth time for middleware checks
    const authTime = new Date().toISOString();
    setCacheValue('auth_last_time', authTime, { ttl: 24 * 60 * 60 * 1000 });
    localStorage.setItem('auth_last_time', authTime);
    
    // Log the tenant ID for debugging
    logger.info('[SignInForm] Redirecting with tenant ID:', tenantId);
    
    // Ensure tenant ID is stored in all locations for resilience
    if (tenantId) {
      // Store in AppCache with namespacing
      window.__APP_CACHE = window.__APP_CACHE || {};
      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
      window.__APP_CACHE.tenant.id = tenantId;
      window.__APP_CACHE.tenantId = tenantId;
      
      // Store in localStorage as fallback
      localStorage.setItem('tenant_id', tenantId);
      localStorage.setItem('tenantId', tenantId);
      
      // Fetch user attributes to get business info and userId for RLS
      let businessName = '';
      let businessType = 'Other';
      let businessCountry = 'US';
      let userId = '';
      let userEmail = '';
      
      try {
        const { fetchUserAttributes } = await import('@/config/amplifyUnified');
        const userAttributes = await fetchUserAttributes();
        
        userId = userAttributes.sub || '';
        userEmail = userAttributes.email || '';
        
        businessName = userAttributes['custom:businessname'] || 
                      (userAttributes['given_name'] ? `${userAttributes['given_name']}'s Business` : 
                      userAttributes.email ? `${userAttributes.email.split('@')[0]}'s Business` : '');
        
        businessType = userAttributes['custom:businesstype'] || 'Other';
        businessCountry = userAttributes['custom:businesscountry'] || 'US';
        
        // Store user ID for RLS policies
        setCacheValue('user_id', userId, { ttl: 24 * 60 * 60 * 1000 });
        window.__APP_CACHE.user = window.__APP_CACHE.user || {};
        window.__APP_CACHE.user.id = userId;
        window.__APP_CACHE.user.sub = userId;
        window.__APP_CACHE.user.email = userEmail;
      } catch (attrError) {
        logger.warn('[SignInForm] Error getting user attributes:', attrError);
        // Continue anyway with default values
      }
      
      // Get an ID token for authenticated API requests
      let idToken = '';
      try {
        const { getCurrentUser, getIdToken } = await import('@/config/amplifyUnified');
        const currentUser = await getCurrentUser();
        idToken = await getIdToken(currentUser);
        
        // Store the token for future API requests
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
        window.__APP_CACHE.auth.idToken = idToken;
      } catch (tokenError) {
        logger.warn('[SignInForm] Error getting ID token:', tokenError);
        // Continue anyway
      }
      
      // Make database calls asynchronous to not block sign-in (fire and forget)
      // This dramatically speeds up sign-in by not waiting for database operations
      const initializeTenantAsync = async () => {
        try {
          logger.debug('[SignInForm] Starting async tenant initialization:', tenantId);
          
          // First ensure the tenant record exists
          const createResponse = await fetch('/api/tenant/ensure-db-record', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-tenant-id': tenantId,
              'x-user-id': userId,
              'Authorization': idToken ? `Bearer ${idToken}` : ''
            },
            body: JSON.stringify({
              tenantId: tenantId,
              userId: userId,
              email: userEmail,
              businessName: businessName,
              businessType: businessType,
              businessCountry: businessCountry
            })
          });
          
          if (createResponse.ok) {
            logger.debug('[SignInForm] Async tenant record creation successful');
            
            // Then initialize the database
            const initResponse = await fetch('/api/tenant/initialize-tenant', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId,
                'x-user-id': userId,
                'Authorization': idToken ? `Bearer ${idToken}` : ''
              },
              body: JSON.stringify({
                tenantId: tenantId,
                userId: userId
              })
            });
            
            if (initResponse.ok) {
              logger.debug('[SignInForm] Async tenant database initialization successful');
            }
          }
        } catch (error) {
          logger.debug('[SignInForm] Async tenant initialization failed (non-blocking):', error.message);
        }
      };
      
      // Start async initialization but don't wait for it
      initializeTenantAsync();
      
      // Store tenant info in browser storage for client-side access
      try {
        // First, use the global function we defined
        if (typeof window.storeTenantInfo === 'function') {
          window.storeTenantInfo({
            tenantId: tenantId,
            metadata: {
              businessName: businessName,
              businessType: businessType,
              businessCountry: businessCountry,
              userId: userId,
              userEmail: userEmail,
              createdAt: new Date().toISOString(),
              source: 'signin'
            }
          });
        }

        // Then also store as JSON for backup access
        localStorage.setItem('tenant_metadata', JSON.stringify({
          tenantId: tenantId,
          businessName: businessName,
          businessType: businessType,
          businessCountry: businessCountry,
          userId: userId,
          createdAt: new Date().toISOString(),
          source: 'signin'
        }));
      } catch (storeError) {
        logger.warn('[SignInForm] Error storing tenant metadata:', storeError);
        // Continue anyway
      }
      
      // Build URL parameters
      const params = new URLSearchParams();
      
      // Always add fromAuth parameter for middleware recognition
      params.append('fromAuth', 'true');
      
      // Add tenant data in URL for tenant initializer (safely encoded)
      params.append('tenantName', encodeURIComponent(businessName || ''));
      params.append('tenantType', encodeURIComponent(businessType || ''));
      params.append('tenantUserId', encodeURIComponent(userId || ''));
      
      // Add any additional options as URL parameters
      Object.entries(options).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
      
      const queryString = params.toString();
      const url = `/tenant/${tenantId}/dashboard${queryString ? '?' + queryString : ''}`;
      
      logger.info('[SignInForm] Redirecting to tenant dashboard:', url);
      
      // Also store a redundant copy of tenant data in sessionStorage for reliability
      try {
        sessionStorage.setItem('tenant_data', JSON.stringify({
          id: tenantId,
          name: businessName,
          type: businessType,
          country: businessCountry,
          userId: userId,
          timestamp: Date.now()
        }));
      } catch (e) {
        logger.warn('[SignInForm] Could not store tenant data in sessionStorage:', e);
      }
      
      // Use minimal delay to ensure storage operations complete (faster sign-in)
      setTimeout(() => {
        router.push(url);
      }, 100);
    } else {
      // No tenant ID, redirect to regular dashboard
      const params = new URLSearchParams();
      params.append('fromAuth', 'true');
      
      // Add any additional options as URL parameters
      Object.entries(options).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
      
      const queryString = params.toString();
      const url = `/dashboard${queryString ? '?' + queryString : ''}`;
      
      logger.info('[SignInForm] Redirecting to dashboard (no tenant):', url);
      
      setTimeout(() => {
        router.push(url);
      }, 100);
    }
  } catch (error) {
    logger.error('[SignInForm] Error during dashboard redirect:', error);
    // Fallback to simple redirect if something went wrong
    router.push('/dashboard?fromAuth=true');
  }
};

export default function SignInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showReactivation, setShowReactivation] = useState(false);
  const [emailForReactivation, setEmailForReactivation] = useState('');

  // Check for session expired parameter in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionStatus = urlParams.get('session');
      
      if (sessionStatus === 'expired') {
        // Check if we previously had a valid session using AppCache
        const hadPreviousSession = getCacheValue('auth_had_session') === true;
        
        if (hadPreviousSession) {
          setErrors({ general: 'Your session has expired. Please sign in again to continue.' });
        }
        
        // Remove the parameter from URL without refreshing the page
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  // Clear errors when input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: fieldValue }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced handleSubmit function with improved AppCache handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Clear previous states
    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    // Prepare for sign-in to clear any existing session
    try {
      await prepareForSignIn();
    } catch (prepError) {
      logger.warn('[SignInForm] Error preparing for sign-in:', prepError);
      // Continue anyway as this is a precautionary step
    }
    
    try {
      logger.debug('[SignInForm] Starting sign-in process', { 
        username: formData.username,
        hasPassword: !!formData.password,
        rememberMe: formData.rememberMe
      });
      
      // Development mode bypass for easier testing
      if (false) { // Disable development bypass regardless of environment
        // Development bypass disabled in production mode
        logger.debug('[SignInForm] Development bypass disabled in production mode');
      }
      
      // Check if Amplify is configured using global check function
      if (typeof window !== 'undefined' && window.reconfigureAmplify) {
        logger.debug('[SignInForm] Ensuring Amplify is configured before authentication');
        window.reconfigureAmplify();
      }
      
      // Production authentication flow - using enhanced signIn function that ensures configuration
      const authResult = await amplifySignIn({
        username: formData.username,
        password: formData.password,
        options: {
          // Using standard SRP authentication for security
          authFlowType: 'USER_SRP_AUTH'
        }
      });
      
      logger.debug('[SignInForm] Sign-in result', { 
        isSignedIn: authResult.isSignedIn,
        nextStep: authResult.nextStep?.signInStep
      });
      
      // Store auth session flag in AppCache
      setCacheValue('auth_had_session', true);
      
      // Also store in window.__APP_CACHE directly
      if (typeof window !== 'undefined' && window.__APP_CACHE) {
        window.__APP_CACHE.auth.had_session = true;
        window.__APP_CACHE.auth.last_login = new Date().toISOString();
      }
      
      // Ensure the user has custom:created_at set
      try {
        await ensureUserCreatedAt();
      } catch (attributeError) {
        logger.warn('[SignInForm] Failed to ensure created_at attribute, but continuing:', attributeError);
      }
      
      // Continue with the rest of sign-in processing
      if (authResult.isSignedIn) {
        // Success - redirect based on profile status
        setSuccessMessage('Sign in successful! Redirecting...');
        
        // Check if there's a next step in the auth flow
        if (authResult.nextStep) {
          const { signInStep } = authResult.nextStep;
          
          // Handle different auth challenges
          if (signInStep === 'CONFIRM_SIGN_UP') {
            logger.debug('[SignInForm] User needs to confirm signup');
            setSuccessMessage('Please verify your email before signing in. Redirecting...');
            
            // Store email for verification page using AppCache
            setCacheValue('auth_email', formData.username);
            setCacheValue('auth_needs_verification', true);
            
            // Also store in window.__APP_CACHE directly
            if (typeof window !== 'undefined' && window.__APP_CACHE && window.__APP_CACHE.auth) {
              window.__APP_CACHE.auth.email = formData.username;
              window.__APP_CACHE.auth.needs_verification = true;
            }
            
            // Redirect to verification page
            setTimeout(() => {
              router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
            }, 1500);
            return;
          } 
          else if (signInStep === 'DONE') {
            // Authentication successful, fetch user attributes
            logger.debug('[SignInForm] Authentication successful, checking onboarding status');
            
            try {
              // Import needed only in handler to avoid SSR issues
              const { fetchUserAttributes, updateUserAttributes } = await import('@/config/amplifyUnified');
              const userAttributes = await fetchUserAttributes();
              
              // Store user attributes in AppCache for better performance
              setCacheValue('user_attributes', userAttributes, { ttl: 3600000 }); // 1 hour cache
              
              // Also store in window.__APP_CACHE directly
              if (typeof window !== 'undefined') {
                window.__APP_CACHE = window.__APP_CACHE || {};
                window.__APP_CACHE.user = window.__APP_CACHE.user || {};
                window.__APP_CACHE.user.attributes = userAttributes;
                window.__APP_CACHE.user.email = userAttributes.email || formData.username;
                
                // Ensure auth data is also stored in sessionStorage as a fallback
                try {
                  // Get the tokens from the current session
                  const { fetchAuthSession } = await import('@/config/amplifyUnified');
                  const session = await fetchAuthSession();
                  
                  if (session && session.tokens) {
                    // Store tokens in sessionStorage for fallback
                    sessionStorage.setItem('idToken', session.tokens.idToken.toString());
                    sessionStorage.setItem('accessToken', session.tokens.accessToken.toString());
                    sessionStorage.setItem('tokenTimestamp', Date.now().toString());
                    sessionStorage.setItem('hasSession', 'true');
                    
                    // Also store in APP_CACHE
                    window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                    window.__APP_CACHE.auth.idToken = session.tokens.idToken.toString();
                    window.__APP_CACHE.auth.token = session.tokens.idToken.toString();
                    window.__APP_CACHE.auth.accessToken = session.tokens.accessToken.toString();
                    window.__APP_CACHE.auth.hasSession = true;
                    window.__APP_CACHE.auth.provider = 'cognito';
                    
                    logger.debug('[SignInForm] Successfully stored tokens in sessionStorage and APP_CACHE');
                  }
                } catch (e) {
                  logger.warn('[SignInForm] Error storing tokens in sessionStorage:', e);
                }
              }
              
              // Log raw onboarding status value before conversion
              logger.info('[SignInForm] Raw onboarding status:', {
                rawOnboarding: userAttributes['custom:onboarding'],
                rawSetupDone: userAttributes['custom:setupdone']
              });
              
              // Check the onboarding status
              const onboardingStatus = (userAttributes['custom:onboarding'] || '').toLowerCase();
              const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
              
              logger.debug('[SignInForm] User onboarding status:', { 
                onboardingStatus, 
                setupDone 
              });
              
              // Fix uppercase onboarding status if needed
              // Fix uppercase onboarding status if needed
              if (userAttributes && userAttributes['custom:onboarding']) {
                const fixedStatus = fixOnboardingStatusCase(userAttributes['custom:onboarding']);
                if (fixedStatus !== userAttributes['custom:onboarding']) {
                  try {
                    // Only update if there's a change needed
                    await updateUserAttributes({
                      'custom:onboarding': fixedStatus
                    });
                    userAttributes['custom:onboarding'] = fixedStatus;
                  } catch (attrUpdateError) {
                    // Log error but continue with sign-in process
                    logger.warn('[SignInForm] Error updating onboarding status case:', attrUpdateError);
                    // Still use the fixed status in memory
                    userAttributes['custom:onboarding'] = fixedStatus;
                  }
                }
              }
              
              // Store onboarding status in AppCache
              setCacheValue('onboarding_status', onboardingStatus, { ttl: 3600000 }); // 1 hour cache
              setCacheValue('setup_done', setupDone, { ttl: 3600000 }); // 1 hour cache
              
              // Also store in window.__APP_CACHE directly
              if (typeof window !== 'undefined' && window.__APP_CACHE && window.__APP_CACHE.user) {
                window.__APP_CACHE.user.onboarding_status = onboardingStatus;
                window.__APP_CACHE.user.setup_done = setupDone;
              }
              
              // Improved tenant verification and creation (async for faster sign-in)
              const ensureTenant = async (businessId) => {
                try {
                  logger.debug('[SignInForm] Starting async tenant creation for business ID:', businessId);
                  
                  // Store tenant ID immediately for faster sign-in
                  if (typeof window !== 'undefined' && window.__APP_CACHE) {
                    window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                    window.__APP_CACHE.tenant.id = businessId;
                    window.__APP_CACHE.tenantId = businessId;
                  }
                  
                  try {
                    await storeTenantId(businessId);
                    setCacheValue('tenantId', businessId, { ttl: 24 * 60 * 60 * 1000 });
                  } catch (storeError) {
                    logger.debug('[SignInForm] Error storing tenant ID, but continuing:', storeError);
                  }
                  
                  // Make database calls async (fire and forget for faster sign-in)
                  const createTenantAsync = async () => {
                    try {
                      const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tenantId: businessId,
                          userId: userAttributes.sub,
                          email: userAttributes.email || formData.username,
                          businessName: userAttributes['custom:businessname'] || 
                            (userAttributes['given_name'] ? `${userAttributes['given_name']}'s Business` : 
                             userAttributes.email ? `${userAttributes.email.split('@')[0]}'s Business` : ''),
                          businessType: userAttributes['custom:businesstype'] || 'Other',
                          businessCountry: userAttributes['custom:businesscountry'] || 'US'
                        })
                      });
                      
                      if (tenantResponse.ok) {
                        logger.debug('[SignInForm] Async tenant creation successful');
                        
                        // Initialize database async
                        const initResponse = await fetch('/api/tenant/initialize-tenant', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'x-tenant-id': businessId
                          },
                          body: JSON.stringify({ tenantId: businessId })
                        });
                        
                        if (initResponse.ok) {
                          logger.debug('[SignInForm] Async tenant database initialization successful');
                        }
                      }
                    } catch (error) {
                      logger.debug('[SignInForm] Async tenant creation failed (non-blocking):', error.message);
                    }
                  };
                  
                  // Start async creation but don't wait for it
                  createTenantAsync();
                  
                  // Return immediately for faster sign-in
                  return businessId;
                } catch (error) {
                  logger.error('[SignInForm] Error in tenant creation setup:', error);
                  return businessId; // Return business ID as fallback
                }
              };
              
              // Redirect based on onboarding status
              if (onboardingStatus === 'complete' || setupDone) {
                // Onboarding is complete, redirect to dashboard
                logger.debug('[SignInForm] Onboarding complete, redirecting to dashboard');
                
                // Check if tenant ID exists
                const tenantId = userAttributes['custom:tenant_ID'];
                if (tenantId) {
                  // Store the tenant ID for reliable access
                  try {
                    // First ensure tenant namespace is initialized
                    if (typeof window !== 'undefined' && window.__APP_CACHE) {
                      window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                      window.__APP_CACHE.tenant.id = tenantId;
                      window.__APP_CACHE.tenantId = tenantId;
                    }
                    
                    // Store using the utility function
                    await storeTenantId(tenantId);
                    
                    // Add a manual backup approach
                    setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
                    
                    logger.debug('[SignInForm] Successfully stored tenant ID in all locations:', tenantId);
                  } catch (storeError) {
                    logger.error('[SignInForm] Error storing tenant ID, but continuing:', storeError);
                    // Continue anyway as we've stored it in AppCache directly
                  }
                  
                  // Redirect to tenant-specific dashboard
                  await safeRedirectToDashboard(router, tenantId);
                } else {
                  // Default dashboard without tenant ID but with fromAuth parameter
                  // This tells the middleware to handle tenant ID detection
                  // Try to get tenant ID from available sources before redirecting
          const resolvedTenantId = await getTenantIdFromSources();
          await safeRedirectToDashboard(router, resolvedTenantId);
                }
              } else if (onboardingStatus) {
                // Handle specific onboarding steps
                switch(onboardingStatus) {
                  case 'business_info':
                  case 'business-info':
                    router.push('/onboarding/subscription');
                    break;
                  case 'subscription':
                    // Check if user has free or basic plan
                    const subplan = userAttributes['custom:subplan']?.toLowerCase();
                    
                    // Debug the available attributes related to plans and IDs
                    logger.info('[SignInForm] User attributes for redirection decision:', {
                      subplan,
                      plan: userAttributes['custom:plan'],
                      subPlan: userAttributes['custom:subplan'],
                      businessId: userAttributes['custom:business_id'] || userAttributes['custom:businessid'],
                      tenantId: userAttributes['custom:tenant_ID']
                    });
                    
                    // Redirect users to subscription page when their onboarding status is subscription
                    logger.info('[SignInForm] Redirecting user with subscription onboarding status to subscription page');
                    router.push('/onboarding/subscription');
                    break;
                  case 'payment':
                    // Double-check if user has free or basic plan
                    const paymentSubplan = userAttributes['custom:subplan']?.toLowerCase();
                    if (paymentSubplan === 'free' || paymentSubplan === 'basic') {
                      // Should go to dashboard, not payment page
                      logger.warn('[SignInForm] Free/Basic plan redirected to dashboard instead of payment');
                      
                      // Check for tenant ID
                      const tenantId = userAttributes['custom:tenant_ID'];
                      if (tenantId) {
                        try {
                          // First ensure tenant namespace is initialized
                          if (typeof window !== 'undefined' && window.__APP_CACHE) {
                            window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                            window.__APP_CACHE.tenant.id = tenantId;
                            window.__APP_CACHE.tenantId = tenantId;
                          }
                          
                          // Store using the utility function
                          await storeTenantId(tenantId);
                          
                          // Add a manual backup approach
                          setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
                          
                          logger.debug('[SignInForm] Successfully stored tenant ID in all locations:', tenantId);
                        } catch (storeError) {
                          logger.error('[SignInForm] Error storing tenant ID, but continuing:', storeError);
                          // Continue anyway as we've stored it in AppCache directly
                        }
                        await safeRedirectToDashboard(router, tenantId);
                      } else {
                        // Try to get tenant ID from available sources before redirecting
          const resolvedTenantId = await getTenantIdFromSources();
          await safeRedirectToDashboard(router, resolvedTenantId);
                      }
                    } else {
                      router.push('/onboarding/setup');
                    }
                    break;
                  case 'setup':
                    router.push('/onboarding/setup');
                    break;
                  default:
                    // Unknown step, restart onboarding
                    logger.warn('[SignInForm] Unknown onboarding step:', onboardingStatus);
                    router.push('/onboarding');
                }
              } else {
                // No onboarding status, start onboarding
                logger.debug('[SignInForm] No onboarding status, redirecting to onboarding');
                router.push('/onboarding');
              }
            } catch (attributeError) {
              // Handle attribute fetch errors - continue with basic redirect
              logger.error('[SignInForm] Error fetching user attributes:', attributeError);
              
              // Redirect to dashboard with fromAuth flag for protection
              // Try to get tenant ID from available sources before redirecting
              const resolvedTenantId = await getTenantIdFromSources();
              await safeRedirectToDashboard(router, resolvedTenantId, { error: 'attribute_fetch' });
            }
          } else {
            // Unexpected next step - redirect to dashboard
            logger.warn('[SignInForm] Unexpected auth next step:', authResult.nextStep);
            // Try to get tenant ID from available sources before redirecting
            const resolvedTenantId = await getTenantIdFromSources();
            await safeRedirectToDashboard(router, resolvedTenantId, { warning: 'unexpected_step' });
          }
        } else {
          // No next step - redirect to dashboard
          logger.debug('[SignInForm] No specific next step, redirecting to dashboard');
          // Try to get tenant ID from available sources before redirecting
          const resolvedTenantId = await getTenantIdFromSources();
          await safeRedirectToDashboard(router, resolvedTenantId);
        }
      } else {
        // Not signed in for some reason
        logger.error('[SignInForm] Authentication succeeded but isSignedIn is false');
        setErrors({ general: 'Error during authentication. Please try again.' });
      }
    } catch (error) {
      // Error handling code...
      setIsSubmitting(false);
      
      // Check if the account is disabled
      if (error.message && (error.message.includes('disabled') || error.code === 'UserDisabledException')) {
        setEmailForReactivation(formData.username);
        setShowReactivation(true);
      } else {
        // Handle other errors with appropriate messages
        if (error.code === 'UserNotFoundException') {
          setErrors({ username: 'No account found with this email' });
        } else if (error.code === 'NotAuthorizedException') {
          setErrors({ password: 'Incorrect password' });
        } else {
          setErrors({ general: error.message || 'Authentication failed. Please try again.' });
        }
      }
    }
  };

  // Add debugging tools in development mode
  useEffect(() => {
    // Development tools disabled in production mode
  }, []);
  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);
    
    try {
      logger.debug('[SignInForm] Initiating Google Sign-In with Cognito');
      
      // Use Amplify's signInWithRedirect for Google OAuth
      await signInWithRedirect({ 
        provider: 'Google',
        customState: JSON.stringify({
          redirectUrl: '/dashboard',
          source: 'signin_form'
        })
      });
      
      // The browser will redirect to Google OAuth, so no code after this executes
      logger.debug('[SignInForm] Google Sign-In redirect initiated');
      
    } catch (error) {
      logger.error('[SignInForm] Google Sign-In error:', error);
      
      // Handle specific error cases
      if (error.name === 'UserNotConfirmedException') {
        setErrors({ general: 'Please verify your email before signing in with Google.' });
      } else if (error.name === 'NotAuthorizedException') {
        setErrors({ general: 'Google Sign-In is not authorized. Please contact support.' });
      } else if (error.message && error.message.includes('network')) {
        setErrors({ general: 'Network error during Google Sign-In. Please check your connection and try again.' });
      } else {
        setErrors({ general: 'Google Sign-In is temporarily unavailable. Please use email sign-in or try again later.' });
      }
      
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-md w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Sign In</h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {typeof errors.general === 'string' ? (
              <>
                {errors.general}
                {errors.general.includes('verification') && (
                  <div className="mt-2">
                    <Link href={`/auth/verify-email?email=${encodeURIComponent(formData.username)}`} className="text-blue-600 underline">
                      Go to verification page
                    </Link>
                  </div>
                )}
              </>
            ) : (
              errors.general
            )}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.username ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } rounded focus:outline-none`}
            required
            autoComplete="email"
          />
          {errors.username && (
            <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.username}</p>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-gray-700 font-medium">
              Password
            </label>
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } rounded focus:outline-none`}
            required
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.password}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-150 ease-in-out"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
        
        {/* Social Sign-In Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        
        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>
      </form>
      
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Account deactivated?{' '}
          <button
            type="button"
            onClick={() => {
              if (formData.username) {
                setEmailForReactivation(formData.username);
                setShowReactivation(true);
              } else {
                alert('Please enter your email address first');
              }
            }}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Reactivate it here
          </button>
        </p>
      </div>
    </div>
  );
}