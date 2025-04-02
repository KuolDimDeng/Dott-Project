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
import { reconfigureAmplify } from '@/config/amplifyConfig';
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, initializeTenantId } = useTenantInitialization();

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

  // Helper function to determine redirect path based on user attributes
  const determineRedirectPath = (userAttributes) => {
    // Check if we should return to a specific onboarding step
    const returnToOnboarding = localStorage.getItem('returnToOnboarding') === 'true';
    const returnStep = localStorage.getItem('onboardingStep');
    
    // Clear the return flags immediately to prevent future redirect loops
    try {
      localStorage.removeItem('returnToOnboarding');
      // Don't remove onboardingStep as it might be needed for state
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // If we have explicit return info, prioritize it
    if (returnToOnboarding && returnStep) {
      logger.debug(`[SignInForm] Returning user to onboarding step from localStorage: ${returnStep}`);
      
      // Set cookies for server-side state persistence
      const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      document.cookie = `onboardingInProgress=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      document.cookie = `onboardingStep=${returnStep}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      
      return `/onboarding/${returnStep}?from=signin&ts=${Date.now()}`;
    }
    
    // Get all relevant status indicators
    const onboardingStatus = userAttributes['custom:onboarding'];
    const setupDone = userAttributes['custom:setupdone'] === 'TRUE';
    
    // Set all cookies in one place with consistent expiration
    const expiresDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `onboardedStatus=${onboardingStatus || 'NOT_STARTED'}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    document.cookie = `setupCompleted=${(onboardingStatus === 'COMPLETE' || setupDone) ? 'true' : 'false'}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    
    // Simple decision tree for redirect
    if (onboardingStatus === 'COMPLETE' || setupDone) {
      document.cookie = `onboardingStep=complete; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
      logger.debug('[SignInForm] User has completed onboarding, redirecting to dashboard');
      return '/dashboard';
    }
    
    // Map status to step and URL
    const statusToStep = {
      'NOT_STARTED': 'business-info',
      'BUSINESS_INFO': 'subscription',
      'SUBSCRIPTION': () => {
        // Sub-decision for subscription based on plan
        const plan = userAttributes['custom:subscription_plan'] || '';
        const isPaidPlan = ['professional', 'enterprise'].includes(plan.toLowerCase());
        return isPaidPlan ? 'payment' : 'setup';
      },
      'PAYMENT': 'setup'
    };
    
    // Determine step
    const step = typeof statusToStep[onboardingStatus || 'NOT_STARTED'] === 'function' 
      ? statusToStep[onboardingStatus || 'NOT_STARTED']() 
      : statusToStep[onboardingStatus || 'NOT_STARTED'];
    
    // Set the step cookie
    document.cookie = `onboardingStep=${step}; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    document.cookie = `onboardingInProgress=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
    
    logger.debug(`[SignInForm] Redirecting user to onboarding step: ${step}`);
    
    // Return full path with uniqueness parameter to prevent caching
    return `/onboarding/${step}?from=signin&ts=${Date.now()}`;
  };

  // Helper function for standardized error handling
  const handleAuthError = (error) => {
    // Define all possible errors in one place
    const errorMap = {
      // Authentication errors
      NotAuthorizedException: 'Your email or password is incorrect.',
      UserNotFoundException: 'We couldn\'t find an account with this email address.',
      UserNotConfirmedException: 'Please verify your email first.',
      CodeMismatchException: 'Verification code is incorrect.',
      ExpiredCodeException: 'Verification code has expired.',
      
      // Network errors
      NetworkError: 'Connection issue detected.',
      
      // Tenant errors
      TenantError: 'Account setup issue detected.',
      
      // Generic fallback
      default: 'Sign-in issue detected.'
    };
    
    // Log with consistent format
    logger.error('[SignInForm] Error during authentication flow:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Determine user-friendly message
    let userMessage = errorMap[error.name] || errorMap.default;
    
    // Add recovery hint if possible
    if (error.message && error.message.includes('network')) {
      userMessage = errorMap.NetworkError + ' Please check your connection and try again.';
    } else if (error.name === 'TenantError') {
      userMessage += ' Please contact support for assistance.';
    }
    
    // Set error for display
    setError(userMessage);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setLoadingStep(0);

    try {
      // Make sure Amplify is configured
      reconfigureAmplify();
      
      logger.debug('[SignInForm] Attempting sign in:', { email });

      // Step 1: Authenticate
      const result = await login(email, password, rememberMe);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // Step 2: Get user status
      setLoadingStep(1);
      logger.debug('[SignInForm] Sign in successful, checking user attributes');
      
      try {
        const userAttributes = await fetchUserAttributes();
        logger.debug('[SignInForm] User attributes retrieved:', {
          onboardingStatus: userAttributes['custom:onboarding'],
          businessId: userAttributes['custom:businessid'],
          setupDone: userAttributes['custom:setupdone']
        });

        // Step 3: Prepare for redirect
        setLoadingStep(2);
        
        // Determine where to redirect based on user status
        const redirectUrl = determineRedirectPath(userAttributes);
        logger.debug('[SignInForm] Final redirect URL:', redirectUrl);
        
        // Short delay for user experience
        setTimeout(() => {
          // Use window.location for a clean redirect with page reload
          window.location.href = redirectUrl;
        }, 500);
      } catch (attributesError) {
        logger.error('[SignInForm] Error fetching user attributes:', attributesError);
        // Fall back to safe default if we can't determine status
        window.location.href = '/onboarding/business-info?from=signin&error=attributes';
      }
    } catch (error) {
      logger.error('[SignInForm] Sign in failed:', error);
      handleAuthError(error);
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
              onChange={(e) => setEmail(e.target.value)}
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
              {loadingSteps.map((_, index) => (
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
