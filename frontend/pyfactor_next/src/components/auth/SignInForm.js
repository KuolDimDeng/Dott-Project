'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { signInWithSocialProvider } from '@/utils/auth';
import {
  signIn,
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  isAmplifyConfigured
} from '@/config/amplifyUnified';
import { getOnboardingStatus } from '@/utils/onboardingUtils';
import { ONBOARDING_STATES } from '@/utils/userAttributes';
import { appendLanguageParam, getLanguageQueryString } from '@/utils/languageUtils';
import { useTenantInitialization } from '@/hooks/useTenantInitialization';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, initializeTenantId } = useTenantInitialization();

  const handleRedirect = async () => {
    try {
      // Wait for session to be established
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) {
        throw new Error('No valid session');
      }

      // Get current user
      const currentUser = await getCurrentUser();
      logger.debug('[SignInForm] Current user:', {
        username: currentUser.username
      });

      // Fetch user attributes directly
      const attributes = await fetchUserAttributes();
      const onboardingStatus = attributes['custom:onboarding'];
      
      logger.debug('[SignInForm] User attributes:', {
        attributes,
        onboardingStatus
      });
      
      // Initialize tenant ID from user attributes
      try {
        const tenantId = await initializeTenantId(currentUser);
        logger.debug(`[SignInForm] Initialized tenant ID: ${tenantId}`);
      } catch (tenantError) {
        // Log but don't fail the login process
        logger.error('[SignInForm] Error initializing tenant ID:', tenantError);
      }

      // Get full onboarding status
      const { currentStep, setupDone } = await getOnboardingStatus();
      logger.debug('[SignInForm] Full onboarding status:', { currentStep, setupDone });
      
      // Set cookies using our API route
      try {
        logger.debug('[SignInForm] Setting cookies via API');
        const response = await fetch('/api/auth/set-cookies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: tokens.idToken.toString(),
            accessToken: tokens.accessToken.toString(),
            refreshToken: tokens.refreshToken ? tokens.refreshToken.toString() : undefined,
            onboardingStep: currentStep,
            onboardedStatus: onboardingStatus
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to set cookies via API: ${errorData.error || response.statusText}`);
        }
        
        logger.debug('[SignInForm] Cookies set successfully via API');
      } catch (cookieError) {
        logger.error('[SignInForm] Failed to set cookies via API:', cookieError);
        throw cookieError;
      }

      // Get the language query string using our utility
      const langQueryString = getLanguageQueryString();
      
      // Determine redirect URL
      let redirectUrl;
      
      if (setupDone && currentStep === ONBOARDING_STATES.COMPLETE) {
        redirectUrl = '/dashboard';
      } else {
        // Handle different onboarding statuses
        switch (onboardingStatus) {
          case 'NOT_STARTED':
          case 'IN_PROGRESS':
          case 'BUSINESS_INFO':
            logger.debug(`[SignInForm] Redirecting to business info for ${onboardingStatus} status`);
            redirectUrl = `/onboarding/business-info${langQueryString}`;
            break;
          case 'SUBSCRIPTION':
            logger.debug('[SignInForm] Redirecting to subscription page');
            redirectUrl = `/onboarding/subscription${langQueryString}`;
            break;
          case 'PAYMENT':
            logger.debug('[SignInForm] Redirecting to payment page');
            redirectUrl = `/onboarding/payment${langQueryString}`;
            break;
          case 'SETUP':
            logger.debug('[SignInForm] Redirecting to setup page');
            redirectUrl = `/onboarding/setup${langQueryString}`;
            break;
          default:
            logger.warn('[SignInForm] Unknown onboarding status:', onboardingStatus);
            redirectUrl = `/onboarding/business-info${langQueryString}`;
        }
      }
      
      // Use window.location for a full page reload instead of client-side navigation
      // This ensures the server sees the cookies we just set
      logger.debug(`[SignInForm] Redirecting to: ${redirectUrl}`);
      window.location.href = redirectUrl;
    } catch (error) {
      logger.error('[SignInForm] Failed to handle redirect:', error);
      setError('Failed to determine redirect path. Please try again.');
      // Sign out on error to ensure clean state
      try {
        if (isAmplifyConfigured()) {
          await signOut();
        } else {
          logger.debug('[SignInForm] Skipping sign out, Amplify not configured');
        }
      } catch (signOutError) {
        logger.error('[SignInForm] Error signing out:', signOutError);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      logger.debug('[SignInForm] Attempting sign in:', { email });

      // Use the tenant-aware login function with rememberMe option
      const result = await login(email, password, rememberMe);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      logger.debug('[SignInForm] Sign in successful with tenant initialization');

      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Handle redirect after successful sign in
      await handleRedirect();
    } catch (error) {
      logger.error('[SignInForm] Sign in failed:', error);

      const errorMessages = {
        NotAuthorizedException: 'Incorrect email or password',
        UserNotFoundException: 'No account found with this email',
        InvalidParameterException: 'Please enter a valid email and password',
        TooManyRequestsException: 'Too many attempts. Please try again later'
      };

      setError(errorMessages[error.name] || error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      logger.debug('[SignInForm] Initiating Google sign in');
      
      setError("Google Sign-in is coming soon! Please use email login for now.");
      setIsLoading(false);
      return;

      /* 
      // GOOGLE SIGN-IN IMPLEMENTATION 
      // Temporarily disabled until Cognito is properly configured for OAuth
      
      // Proper implementation below:
      const { signInWithRedirect } = await import('@aws-amplify/auth');
      
      // Initialize Amplify with proper configuration
      const { Amplify } = await import('aws-amplify');
      const { amplifyConfig } = await import('@/config/amplifyUnified');
      
      // Make sure config has been applied
      Amplify.configure(amplifyConfig);
      
      logger.debug('[SignInForm] Redirecting to Google sign-in');
      
      // Redirect to Google sign-in
      await signInWithRedirect({ provider: 'Google' });
      
      // Browser will redirect, no code after this will execute
      */
    } catch (error) {
      logger.error('[SignInForm] Google sign in failed:', error);
      
      // User-friendly error message
      setError('Google sign-in is not available at this moment. Please use email login.');
      setIsLoading(false);
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
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <div className="flex items-center justify-center gap-3">
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </div>
            <div className="absolute top-0 right-0 bg-yellow-500 text-xs text-white px-1 rounded-bl-md rounded-tr-md">
              Coming Soon
            </div>
          </button>
        </div>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 text-center">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            <span className="mx-auto">{isLoading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already signed up but need to verify your email?{' '}
            <Link href="/auth/verify-email" className="font-medium text-indigo-600 hover:text-indigo-500">
              Enter verification code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
