'use client';

import { useState, useEffect } from 'react';
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
import { TextField, Button, CircularProgress, Alert, Checkbox } from '@/components/ui/TailwindComponents';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, initializeTenantId } = useTenantInitialization();

  // Setup login timeout
  useEffect(() => {
    let timeoutId;
    if (isLoading) {
      timeoutId = setTimeout(() => {
        logger.error('[SignInForm] Sign in timed out after 45 seconds');
        setError('Sign in timed out. Please try again.');
        setIsLoading(false);
      }, 45000); // 45 second timeout (increased from 15)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  const setCookiesViaAPI = async (tokens, onboardingStep, onboardedStatus, rememberMe) => {
    logger.debug('[SignInForm] Setting cookies via API');
    try {
      // Set cookies with a retry mechanism
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          const response = await fetch('/api/auth/set-cookies', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: tokens?.idToken?.toString(),
              accessToken: tokens?.accessToken?.toString(),
              onboardingStep,
              onboardedStatus,
              rememberMe,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to set cookies: ${response.status}`);
          }
          
          success = true;
          logger.debug('[SignInForm] Cookies set successfully via API');
          return true;
        } catch (error) {
          retryCount++;
          logger.warn(`[SignInForm] Failed to set cookies (attempt ${retryCount}/${maxRetries}):`, error);
          
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
    } catch (error) {
      logger.error('[SignInForm] Failed to set cookies via API:', error);
      throw error;
    }
  };

  const handleRedirect = async () => {
    try {
      logger.debug('[SignInForm] Getting tokens for redirect');
      
      // Get current tokens using the retry-enabled function
      const { fetchAuthSessionWithRetry } = await import('@/config/amplifyUnified');
      const { tokens } = await fetchAuthSessionWithRetry();
      
      logger.debug('[SignInForm] Session tokens:', {
        hasIdToken: !!tokens?.idToken,
        hasAccessToken: !!tokens?.accessToken,
        idTokenLength: tokens?.idToken?.toString()?.length,
        accessTokenLength: tokens?.accessToken?.toString()?.length
      });
      
      // Get onboarding status
      const status = await getOnboardingStatus();
      logger.debug('[SignInForm] Full onboarding status:', status);
      
      try {
        // Set cookies via API with retries
        await setCookiesViaAPI(
          tokens, 
          status.currentStep || ONBOARDING_STATES.NOT_STARTED,
          status.setupDone ? ONBOARDING_STATES.COMPLETE : ONBOARDING_STATES.NOT_STARTED,
          rememberMe
        );
        
        logger.debug('[SignInForm] Cookies set successfully via API');
      } catch (cookieError) {
        // Log but continue - we'll use client-side redirect with the tokens we have
        logger.error('[SignInForm] Failed to set cookies via API:', cookieError);
        
        // Set cookies manually as a fallback
        try {
          // Set required cookies with client-side code
          const expiration = new Date();
          expiration.setDate(expiration.getDate() + 7); // 7 days
          
          // Set authToken cookie explicitly - crucial for middleware
          document.cookie = `authToken=true; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
          document.cookie = `onboardedStatus=${status.currentStep || 'NOT_STARTED'}; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
          document.cookie = `onboardingStep=business-info; path=/; expires=${expiration.toUTCString()}; samesite=lax`;
          
          logger.debug('[SignInForm] Set fallback cookies via client-side');
        } catch (clientCookieError) {
          logger.error('[SignInForm] Failed to set fallback cookies:', clientCookieError);
        }
      }
      
      // Determine where to redirect
      let redirectPath = '/onboarding/business-info'; // Default for NOT_STARTED
      
      if (status.setupDone) {
        redirectPath = '/dashboard';
      }
      
      // Add query parameter to prevent middleware redirect loops
      redirectPath += '?from=signin';
      
      // Add language parameter if needed
      redirectPath = appendLanguageParam(redirectPath);
      logger.debug('[SignInForm] Redirecting to:', redirectPath);
      
      // Use window.location for a full page reload to ensure middleware re-evaluation
      window.location.href = redirectPath;
    } catch (error) {
      logger.error('[SignInForm] Failed to handle redirect:', error);
      setError('An error occurred during sign in. Please try again.');
      
      // Try to clean up
      try {
        if (isAmplifyConfigured()) {
          await signOut();
        }
      } catch (signOutError) {
        logger.error('[SignInForm] Error during cleanup sign out:', signOutError);
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
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed relative mb-3"
          >
            <div className="flex items-center justify-center gap-3">
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </div>
          </button>
          
          <button
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <div className="flex items-center justify-center gap-3">
              <img src="/apple.svg" alt="Apple" className="w-5 h-5" />
              <span>Continue with Apple</span>
            </div>
          </button>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              disabled={isLoading}
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
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
              className="flex justify-center h-10"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <CircularProgress size="small" className="h-5 w-5 mr-2" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
