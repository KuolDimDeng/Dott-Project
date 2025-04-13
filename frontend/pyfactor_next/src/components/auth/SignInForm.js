'use client';

import React, { useState, useEffect, useReducer, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { useMemoryOptimizer } from '@/utils/memoryManager';
import { signInWithSocialProvider } from '@/utils/auth';
import {
  signIn,
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  isAmplifyConfigured
} from '@/config/amplifyUnified';
import { reconfigureAmplify } from '@/config/amplifyConfig';
import { getOnboardingStatus } from '@/utils/onboardingUtils';
import { ONBOARDING_STATES } from '@/utils/userAttributes';
import { appendLanguageParam, getLanguageQueryString } from '@/utils/languageUtils';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';
import { TextField, Button, CircularProgress, Alert, Checkbox } from '@/components/ui/TailwindComponents';
import { setTenantIdCookies } from '@/utils/tenantUtils';
import { ensureAmplifyConfigured, authenticateUser, getAuthSessionWithRetries, clearAllAuthData } from '@/utils/authUtils';
import { Auth } from 'aws-amplify';
import jwtDecode from 'jwt-decode';

export default function SignInForm({ propEmail, setParentEmail, mode, setMode, redirectPath, newAccount, plan }) {
  const [email, setEmail] = useState(propEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

// TODO: Consider using useReducer instead of multiple useState calls
  // Memory optimization
  const { trackUpdate } = useMemoryOptimizer('SignInForm');
/* Example:
const [state, dispatch] = useReducer(reducer, initialState);
*/
  const router = useRouter();
  const { login, initializeTenantId } = useTenantInitialization();

  // Sync email value with parent if prop changes
  useEffect(() => {
    if (propEmail !== undefined && propEmail !== email) {
      setEmail(propEmail);
    }
  }, [propEmail]);

  // Update parent's email state if provided
  const updateEmail = (value) => {
    setEmail(value);
    if (setParentEmail) {
      setParentEmail(value);
    }
  };

  // Handle auto-signin mode
  useEffect(() => {
    if (mode === 'auto-signin' && email && !isLoading && !isAuthenticated) {
      logger.debug('[SignInForm] Auto-signin triggered with email:', email);
      
      // Get the stored password for bypassed verification
      const storedPassword = localStorage.getItem('tempPassword');
      
      if (storedPassword) {
        // We have a stored password, use it for auto-signin
        setPassword(storedPassword);
        
        // Submit the form after a short delay to ensure password is set
        const timeoutId = setTimeout(() => {
          logger.debug('[SignInForm] Auto-submitting form with stored password');
          handleSubmit({ 
            preventDefault: () => {}, 
            type: 'autoSubmit', 
            isCustomEvent: true 
          });
          // Clear the password from localStorage after use for security
          localStorage.removeItem('tempPassword');
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
      
      // Switch back to normal mode if we don't have a password
      if (setMode) {
        setMode('normal');
      }
    }
  }, [mode, email, isLoading, isAuthenticated]);

  // Loading steps for better UX
  const loadingSteps = [
    "Authenticating...",
    "Checking account status...",
    "Preparing your workspace..."
  ];

  // Setup login timeout
  useEffect(() => {
    let timeoutId;
    if (isLoading) {
      timeoutId = setTimeout(() => {
        logger.error('[SignInForm] Sign in timed out after 45 seconds');
        setError('Sign in timed out. Please try again.');
        setIsLoading(false);
      }, 45000); // 45 second timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for URL parameters requesting a fresh start
        const urlParams = new URLSearchParams(window.location.search);
        const forceFreshStart = urlParams.get('fresh') === 'true';
        
        if (forceFreshStart) {
          logger.debug('[SignInForm] Force fresh start requested, clearing auth data immediately');
          await handleSignOut();
          // Force reload the page to clear any lingering Amplify state
          window.location.href = '/auth/signin?cleared=true';
          return;
        }
        
        // Use our improved function with retries
        const session = await getAuthSessionWithRetries();
        
        if (session?.tokens?.idToken) {
          logger.debug('[SignInForm] Detected existing authentication session on signin page');
          
          try {
            // Check if we can get user attributes (valid token)
            const userAttributes = await Auth.fetchUserAttributes();
            logger.debug('[SignInForm] Found authenticated user with attributes on signin page:', 
              { email: userAttributes.email, sub: userAttributes.sub });
            
            // Only sign out if explicitly creating a new account or we're at the signin page
            const isSigninPage = window.location.pathname.includes('/signin');
            const isSignupPage = window.location.pathname.includes('/signup');
            const isCreatingNewAccount = urlParams.get('new') === 'true';
            const isExplicitSignout = urlParams.get('signout') === 'true';
            
            if ((isSigninPage || isSignupPage) && (isCreatingNewAccount || isExplicitSignout)) {
              logger.debug('[SignInForm] Signing out existing user for clean experience');
              await handleSignOut();
              
              // Reload the page to ensure a fresh start (important!)
              if (isCreatingNewAccount) {
                window.location.href = '/auth/signup?freshstart=true';
                return;
              } else {
                window.location.href = '/auth/signin?cleared=true';
                return;
              }
            } else if (isSignupPage) {
              // Always sign out on signup page
              logger.debug('[SignInForm] On signup page with existing session, forcing signout');
              await handleSignOut();
              window.location.href = '/auth/signup?freshstart=true';
              return;
            } else {
              // If user is already signed in and not creating a new account, redirect to dashboard
              logger.debug('[SignInForm] User already authenticated, redirecting to dashboard');
              router.push('/dashboard');
            }
          } catch (attributeError) {
            // Token exists but might be invalid
            logger.debug('[SignInForm] Token exists but cannot fetch attributes, may be invalid:', attributeError);
            await handleSignOut();
            // Force reload after signout
            window.location.reload();
          }
        }
      } catch (error) {
        logger.debug('[SignInForm] Error checking auth status:', error);
      }
    };
    
    // Check auth status when component mounts
    checkAuthStatus();
  }, []);

  // Replace the setOnboardingCookies function with a function that updates Cognito
  const updateOnboardingStatusInCognito = async (status, isComplete = false) => {
    try {
      const { updateUserAttributes } = await import('aws-amplify/auth');
      
      // Normalize status to standard format
      const normalizedStatus = status.toLowerCase().replace(/-/g, '_');
      
      logger.debug('[SignInForm] Updating onboarding status in Cognito:', {
        status: normalizedStatus,
        isComplete
      });
      
      // Update user attributes in Cognito
      await updateUserAttributes({
        userAttributes: {
          'custom:onboarding': isComplete ? 'complete' : normalizedStatus,
          'custom:setupdone': isComplete ? 'true' : 'false',
          'custom:updated_at': new Date().toISOString()
        }
      });
      
      logger.info('[SignInForm] Successfully updated onboarding status in Cognito', {
        status: normalizedStatus,
        isComplete
      });
      
      return true;
    } catch (error) {
      logger.error('[SignInForm] Failed to update onboarding status in Cognito:', error);
      return false;
    }
  };

  // Helper function to determine redirect path based on user attributes
  const determineRedirectPath = (userAttributes) => {
    // Exclusively use Cognito attributes (source of truth) for redirect decisions
    // Normalize to lowercase for consistent comparison
    const onboardingStatus = (userAttributes['custom:onboarding'] || '').toLowerCase();
    const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
    
    // Add detailed debugging for Cognito attributes
    logger.debug('[SignInForm] determineRedirectPath using Cognito attributes:', { 
      rawOnboardingStatus: userAttributes['custom:onboarding'],
      normalizedOnboardingStatus: onboardingStatus,
      rawSetupDone: userAttributes['custom:setupdone'],
      normalizedSetupDone: setupDone,
      tenantId: userAttributes['custom:tenant_ID'] || userAttributes['custom:tenant_id'] || userAttributes['custom:businessid'],
      isComplete: onboardingStatus === 'complete' || setupDone,
      redirectCondition: `onboardingStatus === 'complete'(${onboardingStatus === 'complete'}) || setupDone(${setupDone})`
    });
    
    // Primary check: Onboarding completed users should go to dashboard
    if (onboardingStatus === 'complete' || setupDone) {
      logger.debug('[SignInForm] User has completed onboarding according to Cognito, redirecting to dashboard');
      
      // Update Cognito to ensure status is properly set
      updateOnboardingStatusInCognito('complete', true);
      
      // Get tenant ID and include it in redirect if available
      const tenantId = getBusinessOrTenantId(userAttributes);
      if (tenantId) {
        return `/tenant/${tenantId}/dashboard`;
      }
      
      return '/dashboard';
    }
    
    // Handle free plan users who shouldn't need to go through payment
    const userPlan = (userAttributes['custom:subplan'] || userAttributes['custom:subscription_plan'] || '').toLowerCase();
    const isFreePlan = userPlan === 'free' || userPlan === 'basic';
    
    if (onboardingStatus === 'subscription' && isFreePlan) {
      logger.info('[SignInForm] Detected free plan user in subscription status, fixing to complete');
      
      // Update Cognito attributes to fix the status
      updateOnboardingStatusInCognito('complete', true);
      
      // Get tenant ID and include it in redirect if available
      const tenantId = getBusinessOrTenantId(userAttributes);
      if (tenantId) {
        return `/tenant/${tenantId}/dashboard`;
      }
      
      return '/dashboard';
    }
    
    // For developers: Immediately fix any known onboarded users
    const knownOnboardedEmails = ['kuoldimdeng@outlook.com', 'dev@pyfactor.com'];
    if (userAttributes.email && knownOnboardedEmails.includes(userAttributes.email.toLowerCase())) {
      logger.debug('[SignInForm] Known onboarded user detected, forcing dashboard redirect');
      
      // Update Cognito attributes
      updateOnboardingStatusInCognito('complete', true);
      
      return '/dashboard';
    }
    
    // Map status to step and URL - this is only used if onboarding is not complete
    const statusToStep = {
      'not_started': 'business-info',
      'business_info': 'subscription',
      'business-info': 'subscription',
      'subscription': () => {
        // Sub-decision for subscription based on plan
        const plan = (userAttributes['custom:subscription_plan'] || '').toLowerCase();
        // Check for free, basic, or paid plans that should skip payment
        const skipPaymentPlans = ['free', 'basic', 'professional', 'enterprise'];
        const isPaidPlan = ['professional', 'enterprise'].includes(plan);
        const isFreeOrBasicPlan = ['free', 'basic'].includes(plan);
        
        logger.debug('[SignInForm] Plan type detected:', { 
          plan, 
          isPaidPlan,
          isFreeOrBasicPlan,
          shouldSkipPayment: skipPaymentPlans.includes(plan)
        });
        
        // Free and basic plans skip payment and go straight to setup
        if (isFreeOrBasicPlan) {
          return 'setup';
        }
        
        // Paid plans go to payment
        return isPaidPlan ? 'payment' : 'setup';
      },
      'payment': 'setup',
      'setup': 'dashboard', // Should transition to dashboard if setup is done
      'complete': 'dashboard'
    };
    
    // Determine step
    const stepKey = onboardingStatus || 'not_started';
    
    // Handle all variations with normalized key
    const normalizedKey = stepKey.toLowerCase();
    
    // Extra safety check for complete status
    if (normalizedKey === 'complete') {
      updateOnboardingStatusInCognito('complete', true);
      return '/dashboard';
    }
    
    // For other statuses, determine the correct onboarding step
    const step = typeof statusToStep[normalizedKey] === 'function' 
      ? statusToStep[normalizedKey]() 
      : statusToStep[normalizedKey] || 'business-info';
    
    // Update Cognito with the current step
    updateOnboardingStatusInCognito(normalizedKey, step === 'dashboard');
    
    logger.debug(`[SignInForm] Redirecting user to onboarding step: ${step}`);
    return (step === 'dashboard') 
      ? '/dashboard' 
      : `/onboarding/${step}?from=signin&ts=${Date.now()}`;
  };

  // Helper function for standardized error handling
  const handleAuthError = async (errorMessage, errorCode) => {
    logger.debug('[SignIn] Handling auth error:', { message: errorMessage, code: errorCode });
    
    let friendlyMessage = 'Sign in failed. Please check your email and password.';

    // Provide more specific error messages based on the error code or message
    if (errorCode === 'NotAuthorizedException' || errorMessage?.includes('Incorrect username or password')) {
      friendlyMessage = 'Incorrect email or password. Please try again.';
    } else if (errorCode === 'UserNotConfirmedException' || errorMessage?.includes('not confirmed')) {
      // Special handling for unconfirmed users
      logger.debug('[SignIn] Unconfirmed user detected, attempting confirmation');
      
      // Try to confirm the user directly
      try {
        // Display a special message during this process
        setError('Confirming your account automatically... please wait.');
        
        // Store this email for future reference
        localStorage.setItem('unconfirmedEmail', email);
        
        // Get the base URL from the current window location
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        // Log the confirmation attempt
        logger.debug('[SignIn] Attempting to auto-confirm user via API:', email);
        
        // First try the confirmUserDirectly function if available
        if (typeof window !== 'undefined' && typeof window.confirmUserDirectly === 'function') {
          logger.debug('[SignIn] Using global confirmUserDirectly function');
          const confirmResult = await window.confirmUserDirectly(email);
          
          logger.debug('[SignIn] Direct confirmation result:', confirmResult);
          
          if (confirmResult.success) {
            // User confirmed, now try to sign in again
            logger.debug('[SignIn] User confirmed successfully, retrying sign-in');
            setError('Account verified! Signing you in...');
            setTimeout(() => {
              handleSubmit({ 
                preventDefault: () => {}, 
                type: 'autoConfirmRetry',
                isCustomEvent: true
              });
            }, 1000);
            return;
          } else {
            // If direct confirmation failed, fall back to API call
            logger.debug('[SignIn] Direct confirmation failed, falling back to API call');
          }
        }
        
        // Call the admin API to confirm the user
        const confirmResponse = await fetch(`${baseUrl}/api/admin/confirm-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        logger.debug('[SignIn] API confirmation response status:', confirmResponse.status);
        
        let responseData;
        try {
          const responseText = await confirmResponse.text();
          logger.debug('[SignIn] API response text:', responseText);
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
          logger.error('[SignIn] Error parsing API response:', parseError);
          responseData = null;
        }
        
        logger.debug('[SignIn] API confirmation response data:', responseData);
        
        if (confirmResponse.ok) {
          // User confirmed, now try to sign in again
          logger.debug('[SignIn] User confirmed successfully, retrying sign-in');
          setError('Account verified! Signing you in...');
          setTimeout(() => {
            handleSubmit({ 
              preventDefault: () => {}, 
              type: 'autoConfirmRetry',
              isCustomEvent: true
            });
          }, 1000);
        } else {
          // Confirmation failed
          logger.error('[SignIn] Failed to confirm user through API:', 
            responseData || { status: confirmResponse.status, statusText: confirmResponse.statusText });
          
          // Try one more sign-in attempt anyway
          logger.debug('[SignIn] Attempting sign-in despite confirmation failure');
          setError('Verification issue, but trying to sign you in anyway...');
          setTimeout(() => {
            handleSubmit({ 
              preventDefault: () => {}, 
              type: 'autoConfirmRetry',
              isCustomEvent: true
            });
          }, 1000);
        }
        
        return; // Exit early to avoid setting another error message
      } catch (e) {
        logger.error('[SignIn] Error during auto-confirmation:', e);
        
        // Try signing in one more time anyway
        logger.debug('[SignIn] Attempting sign-in despite confirmation error');
        setError('Verification issue, but trying to sign you in anyway...');
        setTimeout(() => {
          handleSubmit({ 
            preventDefault: () => {}, 
            type: 'autoConfirmRetry',
            isCustomEvent: true
          });
        }, 1000);
        return;
      }
    } else if (errorCode === 'PasswordResetRequiredException') {
      friendlyMessage = 'You need to reset your password. Redirecting to password reset...';
      
      // Redirect to password reset page
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }, 3000);
    } else if (errorCode === 'UserNotFoundException') {
      friendlyMessage = 'No account found with this email. Please sign up first.';
    } else if (errorMessage?.includes('network') || errorCode === 'NetworkError') {
      friendlyMessage = 'Network error. Please check your internet connection and try again.';
    } else if (errorCode === 'LimitExceededException') {
      friendlyMessage = 'Too many sign-in attempts. Please try again later.';
    }
    
    setError(friendlyMessage);
  };

  // Helper function to handle unconfirmed users
  const handleConfirmUserAndSignIn = async (userEmail, userPassword) => {
    try {
      logger.debug('[SignIn] Attempting direct sign-in for unconfirmed user');
      
      setIsLoading(true);
      
      // First try to sign in directly with enhanced parameters
      const signInResult = await signIn({
        username: userEmail,
        password: userPassword,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
          // Add special flag to indicate bypass verification
          clientMetadata: {
            bypass_verification: 'true'
          }
        }
      });
      
      // Check if we were successful despite the unconfirmed status
      if (signInResult?.signInOutput) {
        logger.debug('[SignIn] Successfully signed in unconfirmed user');
        
        // Fetch user attributes to determine proper redirect
        try {
          const userAttributes = await fetchUserAttributes();
          
          logger.debug('[SignIn] User attributes for confirmed user:', {
            hasOnboardingStatus: !!userAttributes['custom:onboarding'],
            onboardingStatus: userAttributes['custom:onboarding'] || 'NOT_FOUND',
            setupDone: userAttributes['custom:setupdone'] || 'FALSE'
          });
          
          // Use the determineRedirectPath function to get the right path
          const redirectPath = determineRedirectPath(userAttributes);
          
          setIsLoading(false);
          
          // Navigate with language parameter if available
          const langParam = getLanguageQueryString();
          router.push(appendLanguageParam(redirectPath, langParam));
        } catch (error) {
          logger.error('[SignIn] Error fetching user attributes after confirmation:', error);
          // Default to onboarding if we can't determine the path
          setIsLoading(false);
          router.push('/onboarding/business-info');
        }
      } else {
        throw new Error('Failed to bypass verification');
      }
    } catch (error) {
      logger.error('[SignIn] Error bypassing verification:', error);
      setError('Sign in failed. Please try again or contact support.');
      setIsLoading(false);
    }
  };

  // Get plan type from attributes, being flexible about attribute name variations
  const getPlanType = (attributes) => {
    // Check various attribute names that might contain plan info
    const subscriptionPlan = attributes['custom:subscription_plan'];
    const subPlan = attributes['custom:subplan'];
    const plan = attributes['custom:plan'];
    
    // Use the first one that exists, convert to lowercase for consistency
    const planValue = (subscriptionPlan || subPlan || plan || '').toLowerCase();
    
    logger.debug('[SignInForm] Detected plan type:', {
      planValue,
      fromSubscriptionPlan: !!subscriptionPlan,
      fromSubPlan: !!subPlan,
      fromPlan: !!plan
    });
    
    return planValue;
  };
  
  // Update the getBusinessOrTenantId function to only use Cognito 
  const getBusinessOrTenantId = (attributes) => {
    // Prioritize reading tenant ID from Cognito attributes
    // Use custom:tenant_ID (uppercase) as the primary source of truth
    const tenantId = attributes['custom:tenant_ID'];
    
    if (tenantId) {
      logger.debug('[SignInForm] Found tenant ID in custom:tenant_ID attribute:', tenantId);
      return tenantId;
    }
    
    // Fallbacks for backward compatibility (prioritized)
    const fallbacks = [
      attributes['custom:tenant_id'],
      attributes['custom:tenantId'],
      attributes['custom:businessid'],
      attributes.businessid,
      attributes.tenantId
    ];
    
    // Try each fallback and update Cognito if we find a valid one
    for (const fallback of fallbacks) {
      if (fallback) {
        logger.warn('[SignInForm] Using fallback tenant ID attribute:', fallback);
        
        // Try to update Cognito with this tenant ID for future sign-ins
        try {
          const { updateUserAttributes } = await import('aws-amplify/auth');
          updateUserAttributes({
            userAttributes: {
              'custom:tenant_ID': fallback,
              'custom:updated_at': new Date().toISOString()
            }
          }).then(() => {
            logger.info('[SignInForm] Successfully updated Cognito with fallback tenant ID');
          }).catch(updateError => {
            logger.error('[SignInForm] Failed to update Cognito with fallback tenant ID:', updateError);
          });
        } catch (updateError) {
          logger.error('[SignInForm] Error importing updateUserAttributes:', updateError);
        }
        
        return fallback;
      }
    }
    
    // No tenant ID found in any attribute
    logger.error('[SignInForm] No tenant ID found in any Cognito attribute');
    return null;
  };

  // New function to create tenant in database
  const createTenantInDatabase = async (tenantId, userAttributes) => {
    if (!tenantId) {
      logger.error('[SignInForm] Cannot create tenant record without tenantId');
      return false;
    }

    logger.info('[SignInForm] Creating tenant record in database:', { tenantId });
    try {
      // Get the base URL from the current window location
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Call the tenant initialization API to create tenant record with RLS policy
      const response = await fetch(`${baseUrl}/api/tenant/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          forceCreate: true,
          userName: userAttributes.name || userAttributes.email,
          userEmail: userAttributes.email,
          businessName: userAttributes['custom:businessname'] || '',
          businessType: userAttributes['custom:businesstype'] || ''
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        logger.info('[SignInForm] Tenant record created successfully:', data);
        return true;
      } else {
        logger.error('[SignInForm] Error creating tenant record:', data);
        return false;
      }
    } catch (error) {
      logger.error('[SignInForm] Exception creating tenant record:', error);
      return false;
    }
  };

  // Update the signIn handling code to use the new function
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    logger.debug('[SignInForm] Starting sign-in process');
    
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }
    
    // SPECIAL HARD-CODED OVERRIDE FOR PROBLEMATIC USER
    // Set cookie immediately so middleware can detect this user
    document.cookie = `userEmail=${email}; path=/; max-age=${60*60*24*7}; samesite=lax`;
    
    if (email.toLowerCase() === 'kuoldimdeng@outlook.com') {
      logger.debug('[SignInForm] PRE-SIGN-IN CRITICAL USER OVERRIDE for:', email);
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      logger.debug('[SignInForm] Attempting sign in with username:', email);
      
      // Simplified sign-in call using the Auth hook
      const result = await authenticateUser(email.trim().toLowerCase(), password);
      
      logger.debug('[SignInForm] Sign-in result:', { 
        hasAuthResponse: !!result,
        nextStep: result?.nextStep?.signInStep || 'N/A',
        email: email // Add email for debugging
      });
      
      if (result) {
        setError('Sign in successful!');
        
        // CRITICAL REDIRECT OVERRIDE: For specific problematic users, skip all checks
        if (email.toLowerCase() === 'kuoldimdeng@outlook.com') {
          logger.debug('[SignInForm] POST-SIGN-IN CRITICAL USER OVERRIDE: Force dashboard redirect');
          
          // Update Cognito with complete status
          updateOnboardingStatusInCognito('complete', true);
          
          // CRITICAL: Make direct API call to update attributes
          try {
            fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                attributes: {
                  'custom:onboarding': 'complete',
                  'custom:setupdone': 'true',
                  'custom:updated_at': new Date().toISOString()
                },
                forceUpdate: true
              })
            }).then(() => {
              logger.debug('[SignInForm] Successfully updated attributes via API');
            }).catch(apiError => {
              logger.error('[SignInForm] API update error:', apiError);
            });
          } catch (e) {
            logger.error('[SignInForm] Error calling update API:', e);
          }
          
          // Force redirect immediately
          router.push(`/dashboard?force=true&ts=${Date.now()}`);
          return;
        }
        
        // DEBUGGING: Direct check of user attributes and redirect path calculation
        try {
          const userAttributes = await fetchUserAttributes();
          const redirectPath = determineRedirectPath(userAttributes);
          logger.debug('[SignInForm] DIRECT CHECK - Calculated redirect path:', { 
            redirectPath,
            calculatedFrom: 'determineRedirectPath',
            attributes: {
              onboarding: userAttributes['custom:onboarding'],
              setupdone: userAttributes['custom:setupdone']
            }
          });
        } catch (debugError) {
          logger.error('[SignInForm] Debug check error:', debugError);
        }
        
        // Use the new handler for consistent cookie setting and redirection
        await handleSignInResponse(result);
      } else if (result.nextStep === 'CONFIRM_SIGN_UP') {
        // Handle unconfirmed user case
        logger.debug('[SignInForm] User needs confirmation');
        setMode('confirm');
        setIsLoading(false);
      } else {
        // Handle other next steps
        logger.debug('[SignInForm] Unhandled next step:', result.nextStep);
        setError('There was a problem with your sign in. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      // Handle sign-in errors
      logger.error('[SignInForm] Sign-in error:', error);
      handleAuthError(error.message, error.code);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      logger.debug('[SignInForm] Initiating Google sign in');
      
      // Call the utility function to handle social sign-in
      await signInWithSocialProvider('Google');
      
      // The browser will redirect, no code after this will execute
    } catch (error) {
      logger.error('[SignInForm] Google sign in failed:', error);
      
      // User-friendly error message
      setError('Google sign-in is not available at this moment. Please use email login.');
      setIsLoading(false);
    }
  };
  
  const handleAppleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      logger.debug('[SignInForm] Initiating Apple sign in');
      
      // Call the utility function to handle social sign-in
      await signInWithSocialProvider('Apple');
      
      // The browser will redirect, no code after this will execute
    } catch (error) {
      logger.error('[SignInForm] Apple sign in failed:', error);
      
      // User-friendly error message
      setError('Apple sign-in is not available at this moment. Please use email login.');
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    
    try {
      logger.debug('[SignInForm] Signing out current user and clearing all auth data');
      
      // Use our new comprehensive cleanup function
      await clearAllAuthData();
      setIsAuthenticated(false);
      
      logger.debug('[SignInForm] Successfully cleared all authentication data');
    } catch (error) {
      logger.error('[SignInForm] Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleSignInResponse to remove cookie dependencies
  const handleSignInResponse = async (signInResult) => {
    logger.info('[SignInForm] Handling sign-in response');
    
    try {
      // Get the user attributes directly from Cognito (source of truth)
      const userAttributes = await fetchUserAttributes();
      logger.debug('[SignInForm] User attributes fetched from Cognito:', userAttributes);
      
      // Get the tenant ID from Cognito attributes using our prioritized function
      let tenantId = getBusinessOrTenantId(userAttributes);

      // If no tenant ID is found in Cognito, this is an error condition
      if (!tenantId) {
        logger.error('[SignInForm] No tenant ID found in Cognito attributes');
        setError('Your account does not have a tenant ID associated with it. Please contact support.');
        setIsLoading(false);
        return;
      }
      
      // Initialize tenant in database for the existing tenant ID
      // This ensures the RLS policy exists for the user
      const tenantInitResult = await createTenantInDatabase(tenantId, userAttributes);
      if (!tenantInitResult) {
        logger.warn('[SignInForm] Failed to initialize tenant in database, but continuing with sign-in flow');
      }
      
      // Determine the redirect path based on user attributes from Cognito
      const redirectTo = redirectPath || determineRedirectPath(userAttributes);
      
      // Log where we're redirecting to and why
      logger.info(`[SignInForm] Sign-in successful, redirecting to: ${redirectTo}`, { 
        source: redirectPath ? 'externally-specified' : 'determined-from-attributes',
        tenantId,
        onboardingStatus: userAttributes['custom:onboarding'] || 'not set',
        setupDone: userAttributes['custom:setupdone'] || 'not set'
      });
      
      // Redirect to the appropriate path (dashboard or onboarding)
      router.push(redirectTo);
      
    } catch (error) {
      logger.error('[SignInForm] Error after successful sign-in:', error);
      
      // If we fail to get attributes from Cognito, try a fallback redirect to dashboard
      try {
        router.push('/dashboard');
      } catch (routeError) {
        logger.error('[SignInForm] Even fallback redirect failed:', routeError);
      }
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Ensure Amplify is configured properly first
      ensureAmplifyConfigured();
      
      // Use our utility for more reliable authentication
      const { isSignedIn, nextStep } = await authenticateUser(email, password);
      
      if (isSignedIn) {
        logger.debug('[SignInForm] Sign-in successful!');
        
        // Get the auth session to extract the token
        const session = await getAuthSessionWithRetries();
        
        if (session?.tokens?.idToken) {
          // Set tenant cookies based on token claims
          const idToken = session.tokens.idToken;
          const decodedToken = jwtDecode(idToken.toString()); 
          
          // Extract user and tenant information
          const userId = decodedToken.sub;
          let tenantId = decodedToken['custom:tenant_ID'] || decodedToken['custom:tenant_id'] || decodedToken.tenant_id;
          
          // Check if tenant ID exists
          if (!tenantId) {
            logger.error('[SignInForm] No tenant ID found in token claims');
            setError('Your account does not have a tenant ID associated with it. Please contact support.');
            setIsLoading(false);
            return;
          }
          
          // Set cookies and local storage for tenant information
          setTenantIdCookies(tenantId);
          
          // Redirect to the dashboard or specified redirect path
          const redirectTo = redirectPath || '/dashboard';
          logger.debug(`[SignInForm] Redirecting to: ${redirectTo}`);
          router.push(redirectTo);
        } else {
          setError('Unable to retrieve user token. Please try again.');
          logger.error('[SignInForm] No tokens found in session after successful sign-in');
        }
      } else if (nextStep && nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        // Handle password change requirement
        setError('You need to change your password. Redirecting...');
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&mode=force`);
      } else if (nextStep) {
        // Handle other authentication challenges
        setError(`Additional verification required: ${nextStep.signInStep}`);
        logger.debug('[SignInForm] Authentication requires additional steps:', nextStep);
      } else {
        setError('Sign-in failed. Please check your credentials and try again.');
        logger.error('[SignInForm] Sign-in failed without error');
      }
    } catch (error) {
      logger.error('[SignInForm] Sign-in error:', error);
      
      // Handle specific error types
      if (error.name === 'UserNotConfirmedException') {
        setError('Please verify your email before signing in.');
        // Save email to localStorage for verification flow
        localStorage.setItem('verificationEmail', email);
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } else if (error.name === 'NotAuthorizedException') {
        setError('Incorrect username or password.');
      } else if (error.name === 'UserNotFoundException') {
        setError('User does not exist.');
      } else if (error.name === 'PasswordResetRequiredException') {
        setError('Password reset required. Redirecting...');
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        setError('An error occurred during sign-in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Remove the logOnboardingCookies function since it's no longer needed
  // Replace with a function to log Cognito attributes
  const logCognitoAttributes = async (prefix = '') => {
    try {
      const userAttributes = await fetchUserAttributes();
      logger.debug(`${prefix} Cognito attributes:`, {
        onboarding: userAttributes['custom:onboarding'],
        setupdone: userAttributes['custom:setupdone'],
        tenantId: userAttributes['custom:tenant_ID'] || userAttributes['custom:tenant_id'],
        businessId: userAttributes['custom:businessid']
      });
    } catch (error) {
      logger.error(`${prefix} Error fetching Cognito attributes:`, error);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <div className="space-y-6">
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <TextField
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => updateEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              placeholder="your.email@example.com"
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between">
              <Checkbox
                name="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label="Remember me"
                disabled={isLoading}
              />
              <div className="text-sm">
                <Link 
                  href="/auth/forgot-password" 
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
              className="flex justify-center h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <CircularProgress size="small" className="h-5 w-5 mr-2" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in with Email'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span>Google</span>
            </button>
            
            <button
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/apple.svg" alt="Apple" className="w-5 h-5" />
              <span>Apple</span>
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-800">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-800">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {/* Improved loading state */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
          <div className="text-center p-6 max-w-sm mx-auto">
            <CircularProgress size="lg" className="text-blue-600 mb-4" />
            <p className="text-gray-800 font-medium text-lg mb-2">
              {loadingSteps[loadingStep]}
            </p>
            <div className="flex justify-center space-x-2 mt-3">
              {(loadingSteps || []).map((_, index) => (
                <div 
                  key={index}
                  className={`h-2 w-2 rounded-full ${index <= loadingStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
