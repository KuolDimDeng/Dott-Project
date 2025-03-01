'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signOut, fetchAuthSession, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { useAuthContext } from '@/contexts/AuthContext';
import { getOnboardingStatus } from '@/utils/onboardingUtils';
import { ONBOARDING_STATES } from '@/utils/userAttributes';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

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

      // Wait a moment to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch user attributes directly
      const attributes = await fetchUserAttributes();
      const onboardingStatus = attributes['custom:onboarding'];
      
      logger.debug('[SignInForm] User attributes:', {
        attributes,
        onboardingStatus
      });

      // Get full onboarding status
      const { currentStep, setupDone } = await getOnboardingStatus();
      logger.debug('[SignInForm] Full onboarding status:', { currentStep, setupDone });
      
      if (setupDone && currentStep === ONBOARDING_STATES.COMPLETE) {
        router.push('/dashboard');
        return;
      }

      // Handle different onboarding statuses
      switch (onboardingStatus) {
        case 'NOT_STARTED':
        case 'IN_PROGRESS':
        case 'BUSINESS_INFO':
          logger.debug(`[SignInForm] Redirecting to business info for ${onboardingStatus} status`);
          router.push('/onboarding/business-info');
          break;
        case 'SUBSCRIPTION':
          logger.debug('[SignInForm] Redirecting to subscription page');
          router.push('/onboarding/subscription');
          break;
        case 'PAYMENT':
          logger.debug('[SignInForm] Redirecting to payment page');
          router.push('/onboarding/payment');
          break;
        case 'SETUP':
          logger.debug('[SignInForm] Redirecting to setup page');
          router.push('/onboarding/setup');
          break;
        default:
          logger.warn('[SignInForm] Unknown onboarding status:', onboardingStatus);
          router.push('/onboarding/business-info');
      }
    } catch (error) {
      logger.error('[SignInForm] Failed to handle redirect:', error);
      setError('Failed to determine redirect path. Please try again.');
      // Sign out on error to ensure clean state
      try {
        await signOut();
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

      const signInResult = await signIn({
        username: email,
        password,
        options: {
          authFlowType: process.env.NEXT_PUBLIC_AUTH_FLOW_TYPE
        }
      });

      logger.debug('[SignInForm] Sign in successful:', {
        isSignedIn: !!signInResult
      });

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
      logger.debug('[SignInForm] Google sign in not implemented yet');
      setError('Google sign in coming soon');
    } catch (error) {
      logger.error('[SignInForm] Google sign in failed:', error);
      setError('Failed to sign in with Google');
    } finally {
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
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/google.svg" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
              <Link href="/auth/forgot" className="font-medium text-indigo-600 hover:text-indigo-500">
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
