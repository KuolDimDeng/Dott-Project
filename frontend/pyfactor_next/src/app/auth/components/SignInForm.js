'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession';
import ConfigureAmplify from '@/components/ConfigureAmplify';

const REDIRECT_DELAY = 3000; // Increased delay to ensure session is properly established

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isLoading: isAuthLoading } = useAuth();
  const { refreshSession, isAuthenticated } = useSession();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const maxSessionAttempts = 5;

  useEffect(() => {
    logger.debug('[SignInForm] Component mounted', {
      hasCallbackUrl: !!searchParams.get('callbackUrl'),
      callbackUrl: searchParams.get('callbackUrl'),
      isAuthenticated
    });

    return () => {
      logger.debug('[SignInForm] Component unmounting');
    };
  }, [searchParams, isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    logger.debug('[SignInForm] Form field updated:', { 
      field: name,
      length: value.length,
      isEmpty: value.length === 0
    });

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      logger.debug('[SignInForm] Clearing previous error');
      setError('');
    }
  };

  const verifySession = async (maxAttempts = 5, initialDelay = 1000) => {
    logger.debug('[SignInForm] Verifying session establishment:', {
      attempt: sessionAttempts + 1,
      maxAttempts,
      initialDelay
    });

    if (sessionAttempts >= maxAttempts) {
      logger.error('[SignInForm] Failed to establish session after multiple attempts');
      throw new Error('Failed to establish session after multiple attempts');
    }

    // Wait for delay before checking
    const currentDelay = initialDelay * Math.pow(1.5, sessionAttempts);
    logger.debug(`[SignInForm] Waiting ${currentDelay}ms before checking session`);
    await new Promise(resolve => setTimeout(resolve, currentDelay));

    // Attempt to refresh session with multiple strategies
    try {
      // First try normal refresh
      const refreshResult = await refreshSession();
      if (refreshResult) {
        logger.debug('[SignInForm] Session verified on attempt #' + (sessionAttempts + 1));
        return true;
      }
      
      // If that fails, try a forced refresh
      try {
        logger.debug('[SignInForm] Attempting forced session refresh');
        const { tokens } = await fetchAuthSession({ forceRefresh: true });
        if (tokens?.idToken) {
          logger.debug('[SignInForm] Forced session refresh succeeded');
          return true;
        }
      } catch (forceError) {
        logger.warn('[SignInForm] Forced refresh failed:', forceError);
      }
      
      // If still not successful, retry
      setSessionAttempts(prev => prev + 1);
      return verifySession(maxAttempts, initialDelay);
    } catch (error) {
      logger.error('[SignInForm] Session verification error:', error);
      setSessionAttempts(prev => prev + 1);
      return verifySession(maxAttempts, initialDelay);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsRedirecting(false);
    setSessionAttempts(0);

    logger.debug('[SignInForm] Form submission started:', {
      username: formData.username,
      hasPassword: !!formData.password,
      formComplete: !!(formData.username && formData.password)
    });

    try {
      // Validate form data
      if (!formData.username || !formData.password) {
        const missingFields = [];
        if (!formData.username) missingFields.push('username');
        if (!formData.password) missingFields.push('password');
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      logger.debug('[SignInForm] Starting sign in process with enhanced logging');

      // Add more detailed logging before sign in attempt
      logger.debug('[SignInForm] Auth state before sign in:', {
        isAuthLoading,
        isAuthenticated,
        username: formData.username
      });

      // Attempt sign in with enhanced error handling
      try {
        const signInResult = await signIn({
          username: formData.username,
          password: formData.password,
          options: {
            authFlowType: 'USER_PASSWORD_AUTH'
          }
        });
        
        logger.debug('[SignInForm] Sign in result received:', {
          success: signInResult.success,
          hasError: !!signInResult.error,
          hasNextStep: !!signInResult.nextStep,
          nextStep: signInResult.nextStep?.signInStep,
          hasUser: !!signInResult.user
        });

        if (!signInResult.success) {
          if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
            logger.debug('[SignInForm] User needs to confirm signup, redirecting to verification');
            router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
            return;
          }
          throw new Error(signInResult.error || 'Sign in failed');
        }
      } catch (signInError) {
        logger.error('[SignInForm] Detailed sign in error:', {
          message: signInError.message,
          name: signInError.name,
          code: signInError.code,
          stack: signInError.stack
        });
        throw signInError;
      }

      logger.debug('[SignInForm] Sign in successful, verifying session establishment');

      // Add a longer initial wait to allow token propagation
      const tokenPropagationDelay = 2000;
      logger.debug(`[SignInForm] Waiting ${tokenPropagationDelay}ms for token propagation`);
      await new Promise(resolve => setTimeout(resolve, tokenPropagationDelay));
      
      // Verify session is properly established
      try {
        await verifySession(maxSessionAttempts, 1500); // Increased initial delay
        logger.debug('[SignInForm] Session verified successfully');
      } catch (sessionError) {
        logger.error('[SignInForm] Session verification failed:', sessionError);
        
        // Final attempt with a different approach
        logger.debug('[SignInForm] Attempting final session establishment with direct check');
        try {
          const { tokens } = await fetchAuthSession({ forceRefresh: true });
          if (tokens?.idToken) {
            logger.debug('[SignInForm] Final direct session check succeeded');
          } else {
            logger.warn('[SignInForm] Final direct session check failed, but proceeding with redirect');
          }
        } catch (finalError) {
          logger.error('[SignInForm] Final session check error:', finalError);
        }
      }

      logger.debug('[SignInForm] Preparing redirect');

      setIsRedirecting(true);

      // Additional delay to ensure all auth processes complete
      await new Promise(resolve => setTimeout(resolve, REDIRECT_DELAY));

      // Get callback URL or default to onboarding
      const callbackUrl = searchParams.get('callbackUrl') || '/onboarding/business-info';
      
      logger.debug('[SignInForm] Redirecting to:', {
        callbackUrl,
        isOnboarding: callbackUrl.startsWith('/onboarding/')
      });

      // Use router.push for client-side navigation
      router.push(callbackUrl);

    } catch (error) {
      logger.error('[SignInForm] Sign in error:', {
        error: error.message,
        name: error.name,
        username: formData.username,
        code: error.code,
        stack: error.stack,
        sessionAttempts,
        formState: {
          hasUsername: !!formData.username,
          hasPassword: !!formData.password
        }
      });
      setError(error.message || 'An error occurred during sign in. Please try again.');
      setIsRedirecting(false);
    }
  };

  const isLoading = isAuthLoading || isRedirecting;

  logger.debug('[SignInForm] Render state:', {
    isLoading,
    isAuthLoading,
    isRedirecting,
    hasError: !!error,
    hasUsername: !!formData.username,
    hasPassword: !!formData.password,
    hasCallbackUrl: !!searchParams.get('callbackUrl'),
    sessionAttempts,
    isAuthenticated
  });

  return (
    <>
      <ConfigureAmplify />
      <form 
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-md mx-auto p-6"
      >
        <h1 className="text-2xl font-bold text-center mb-2">
          Sign In
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              required
              id="username"
              name="username"
              type="email"
              autoComplete="email"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              autoFocus
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-light focus:ring-primary-light text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              required
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-light focus:ring-primary-light text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-main hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              <span>{isRedirecting ? 'Redirecting...' : 'Signing in...'}</span>
            </div>
          ) : (
            'Sign In'
          )}
        </button>

        <div className="mt-4 text-center">
          <a
            href="/auth/forgot-password"
            className="text-sm text-primary-main hover:text-primary-dark"
          >
            Forgot password?
          </a>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a 
              href="/auth/signup" 
              className="text-primary-main hover:text-primary-dark font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </form>
    </>
  );
}