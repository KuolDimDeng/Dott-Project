'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn as amplifySignIn } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { createTenantForUser, updateUserWithTenantId, fixOnboardingStatusCase, storeTenantId } from '@/utils/tenantUtils';
import { ensureUserCreatedAt } from '@/utils/authUtils';
import ReactivationDialog from './ReactivationDialog';
import { checkDisabledAccount } from '@/lib/account-reactivation';

// Initialize global app cache for auth
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
}

export default function SignInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [showReactivation, setShowReactivation] = useState(false);
  const [emailForReactivation, setEmailForReactivation] = useState('');

  // Clear errors when input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous states
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setRedirectAttempts(0);
    
    try {
      logger.debug('[SignInForm] Starting sign-in process', { 
        username: formData.username,
        hasPassword: !!formData.password
      });
      
      // Development mode bypass for easier testing
      if (false) { // Disable development bypass regardless of environment
        // Development bypass disabled in production mode
        logger.debug('[SignInForm] Development bypass disabled in production mode');
      }
      
      // Production authentication flow
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
            
            // Store email for verification page
            if (typeof window !== 'undefined') {
              window.__APP_CACHE.auth.email = formData.username;
              window.__APP_CACHE.auth.needsVerification = true;
              
              // Set these in sessionStorage as minimal fallback for cross-page data
              try {
                sessionStorage.setItem('pyfactor_email', formData.username);
                sessionStorage.setItem('needs_verification', 'true');
              } catch (e) {
                // Ignore sessionStorage errors
              }
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
              await fixOnboardingStatusCase(userAttributes);
              
              // Improved tenant verification and creation
              // More robust tenant creation with retries and status tracking
              const ensureTenant = async (businessId) => {
                try {
                  logger.info('[SignInForm] Creating tenant for user with business ID:', businessId);
                  
                  // Call the improved tenant API endpoint that ensures schema creation
                  const tenantResponse = await fetch('/api/tenant/ensure-db-record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tenantId: businessId, // Use businessId as tenantId for consistency
                      userId: userAttributes.sub,
                      email: userAttributes.email || formData.username,
                      businessName: userAttributes['custom:businessname'] || 
                        (userAttributes['given_name'] ? `${userAttributes['given_name']}'s Business` : 
                         userAttributes.email ? `${userAttributes.email.split('@')[0]}'s Business` : 'My Business'),
                      businessType: userAttributes['custom:businesstype'] || 'Other',
                      businessCountry: userAttributes['custom:businesscountry'] || 'US'
                    })
                  });
                  
                  if (tenantResponse.ok) {
                    const tenantResult = await tenantResponse.json();
                    logger.info('[SignInForm] Tenant creation result:', tenantResult);
                    
                    if (tenantResult.success && tenantResult.tenantId) {
                      // Update user's tenant_id in Cognito
                      await updateUserAttributes({
                        userAttributes: {
                          'custom:tenant_id': tenantResult.tenantId,
                          'custom:updated_at': new Date().toISOString()
                        }
                      });
                      
                      // Store tenantId in all storage locations for consistency
                      storeTenantId(tenantResult.tenantId);
                      
                      // Initialize the database schema for the tenant
                      try {
                        const initResponse = await fetch('/api/tenant/initialize-tenant', {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'x-tenant-id': tenantResult.tenantId
                          },
                          body: JSON.stringify({
                            tenantId: tenantResult.tenantId
                          })
                        });
                        
                        if (initResponse.ok) {
                          logger.info('[SignInForm] Tenant database initialized successfully');
                        } else {
                          logger.warn('[SignInForm] Tenant database initialization warning:', await initResponse.text());
                          // Continue anyway as this is non-fatal
                        }
                      } catch (initError) {
                        logger.error('[SignInForm] Tenant initialization error (non-fatal):', initError);
                        // Continue anyway as this is non-fatal
                      }
                      
                      return tenantResult.tenantId;
                    }
                  } else {
                    logger.error('[SignInForm] Tenant creation failed:', await tenantResponse.text());
                  }
                  return null;
                } catch (error) {
                  logger.error('[SignInForm] Error creating tenant:', error);
                  return null;
                }
              };
              
              // Redirect based on onboarding status
              if (onboardingStatus === 'complete' || setupDone) {
                // Onboarding is complete, redirect to dashboard
                logger.debug('[SignInForm] Onboarding complete, redirecting to dashboard');
                
                // Check if tenant ID exists
                const tenantId = userAttributes['custom:tenant_id'];
                if (tenantId) {
                  // Store the tenant ID for reliable access
                  storeTenantId(tenantId);
                  
                  // Redirect to tenant-specific dashboard
                  router.push(`/${tenantId}/dashboard`);
                } else {
                  // Default dashboard without tenant ID but with fromAuth parameter
                  // This tells the middleware to handle tenant ID detection
                  router.push('/dashboard?fromAuth=true');
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
                      tenantId: userAttributes['custom:tenant_id']
                    });
                    
                    if (subplan === 'free' || subplan === 'basic') {
                      // Skip payment for free/basic plans
                      logger.info('[SignInForm] Free/Basic plan detected, redirecting to dashboard');
                      
                      // Extract tenant ID if available
                      const tenantId = userAttributes['custom:tenant_id'];
                      // Check for business ID with both possible attribute names
                      const businessId = userAttributes['custom:business_id'] || userAttributes['custom:businessid'];
                      
                      logger.debug('[SignInForm] Business/tenant IDs found:', { 
                        businessId,
                        tenantId
                      });
                      
                      if (tenantId) {
                        logger.debug('[SignInForm] Tenant ID found:', tenantId);
                        
                        // Store tenant ID for consistent access
                        storeTenantId(tenantId);
                        
                        // Redirect to tenant-specific dashboard
                        router.push(`/${tenantId}/dashboard?freePlan=true`);
                      } else if (businessId) {
                        // No tenant ID but has business ID - create tenant
                        logger.debug('[SignInForm] Business ID found but no tenant ID, creating tenant');
                        
                        // Attempt to create tenant with retry logic
                        let createdTenantId = null;
                        const maxAttempts = 3;
                        
                        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                          logger.info(`[SignInForm] Tenant creation attempt ${attempt}/${maxAttempts}`);
                          
                          createdTenantId = await ensureTenant(businessId);
                          if (createdTenantId) break;
                          
                          // Wait before retry
                          if (attempt < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                          }
                        }
                        
                        if (createdTenantId) {
                          // Update user attributes with tenant ID
                          await updateUserWithTenantId(createdTenantId);
                          
                          // Store the tenant ID
                          storeTenantId(createdTenantId);
                          
                          // Successfully created/linked tenant, redirect to tenant dashboard
                          logger.info('[SignInForm] Tenant created/linked successfully, redirecting to tenant dashboard');
                          router.push(`/${createdTenantId}/dashboard?freePlan=true&newTenant=true`);
                        } else {
                          // Failed to create tenant, use standard dashboard with request parameter
                          logger.warn('[SignInForm] Failed to create tenant, redirecting to standard dashboard');
                          router.push('/dashboard?freePlan=true&requestTenantCreation=true&businessId=' + businessId);
                        }
                      } else {
                        logger.warn('[SignInForm] No tenant ID or business ID found for free/basic plan user');
                        router.push('/onboarding/business-info?needsBusiness=true');
                      }
                    } else {
                      // Paid plan, go to payment
                      logger.debug('[SignInForm] Paid plan detected, redirecting to payment page');
                      router.push('/onboarding/payment');
                    }
                    break;
                  case 'payment':
                    // Double-check if user has free or basic plan
                    const paymentSubplan = userAttributes['custom:subplan']?.toLowerCase();
                    if (paymentSubplan === 'free' || paymentSubplan === 'basic') {
                      // Should go to dashboard, not payment page
                      logger.warn('[SignInForm] Free/Basic plan redirected to dashboard instead of payment');
                      
                      // Check for tenant ID
                      const tenantId = userAttributes['custom:tenant_id'];
                      if (tenantId) {
                        storeTenantId(tenantId);
                        router.push(`/${tenantId}/dashboard?freePlan=true`);
                      } else {
                        router.push('/dashboard?freePlan=true');
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
            } catch (redirectError) {
              logger.error('[SignInForm] Error during redirection:', redirectError);
              setError('An error occurred after authentication. Please try refreshing the page.');
              setIsLoading(false);
            }
          } else {
            // Handle other authentication steps if needed
            logger.warn('[SignInForm] Unhandled authentication step:', authResult.nextStep?.signInStep);
            setError('Authentication requires additional steps. Please contact support.');
            setIsLoading(false);
          }
        } else {
          // No next step but signed in - unusual state
          logger.warn('[SignInForm] Unusual state: isSignedIn=true but no nextStep');
          router.push('/dashboard');
        }
      } else {
        // Not signed in
        logger.error('[SignInForm] Authentication failed:', authResult);
        setError('Authentication failed. Please check your email and password.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[SignInForm] Error:', error);
      
      // Check for specific error that indicates disabled user
      if (error.name === 'UserNotConfirmedException' || 
          error.name === 'NotAuthorizedException' && 
          error.message.includes('disabled')) {
        // Account might be disabled, let's check
        try {
          const checkResult = await checkDisabledAccount(formData.username);
          
          if (checkResult.success && checkResult.exists && checkResult.isDisabled) {
            // Account is disabled, show reactivation dialog
            setEmailForReactivation(formData.username);
            setShowReactivation(true);
            return;
          }
        } catch (checkError) {
          console.error('[SignInForm] Error checking disabled status:', checkError);
          // Continue with normal error handling
        }
      }
      
      // Handle other errors
      if (error.name === 'UserNotConfirmedException') {
        setError('Your account email has not been verified. Please check your email for verification instructions.');
        if (typeof window !== 'undefined') {
          window.__APP_CACHE.auth.email = formData.username;
          window.__APP_CACHE.auth.needsVerification = true;
          
          // Set these in sessionStorage as minimal fallback for cross-page data
          try {
            sessionStorage.setItem('pyfactor_email', formData.username);
            sessionStorage.setItem('needs_verification', 'true');
          } catch (e) {
            // Ignore sessionStorage errors
          }
        }
      } else if (error.name === 'NotAuthorizedException') {
        setError('Incorrect username or password. Please try again.');
      } else if (error.name === 'UserNotFoundException') {
        setError('No account found with this email. Please check your email or sign up.');
      } else if (error.name === 'PasswordResetRequiredException') {
        setError('Password reset required. Please use the "Forgot password" option.');
      } else if (error.name === 'TooManyRequestsException') {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError(`Login failed: ${error.message || 'Unknown error'}`);
      }
      
      setIsLoading(false);
    }
  };

  // Add debugging tools in development mode
  useEffect(() => {
    // Development tools disabled in production mode
  }, []);

  return (
    <>
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Sign In</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
            {error.includes('verification') && (
              <div className="mt-2">
                <Link href={`/auth/verify-email?email=${encodeURIComponent(formData.username)}`} className="text-blue-600 underline">
                  Go to verification page
                </Link>
              </div>
            )}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="email"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
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
      
      {/* Reactivation Dialog */}
      {showReactivation && (
        <ReactivationDialog
          email={emailForReactivation}
          onClose={() => setShowReactivation(false)}
          onSuccess={() => {
            setShowReactivation(false);
            router.push('/dashboard');
          }}
          onError={(message) => {
            setShowReactivation(false);
            setError(message || 'Error reactivating account');
          }}
        />
      )}
    </>
  );
}