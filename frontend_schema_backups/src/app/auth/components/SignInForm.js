'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn as amplifySignIn } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

export default function SignInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

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
      
      // Check if there's a next step in the auth flow
      if (authResult.nextStep) {
        const { signInStep } = authResult.nextStep;
        
        // Handle different auth challenges
        if (signInStep === 'CONFIRM_SIGN_UP') {
          logger.debug('[SignInForm] User needs to confirm signup');
          setSuccessMessage('Please verify your email before signing in. Redirecting...');
          
          // Store email for verification page
          localStorage.setItem('pyfactor_email', formData.username);
          localStorage.setItem('needs_verification', 'true');
          
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
            const { fetchUserAttributes } = await import('@/config/amplifyUnified');
            const userAttributes = await fetchUserAttributes();
            
            // Check the onboarding status
            const onboardingStatus = (userAttributes['custom:onboarding'] || '').toLowerCase();
            const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';
            
            logger.debug('[SignInForm] User onboarding status:', { 
              onboardingStatus, 
              setupDone 
            });
            
            // Redirect based on onboarding status
            if (onboardingStatus === 'complete' || setupDone) {
              // Onboarding is complete, redirect to dashboard
              logger.debug('[SignInForm] Onboarding complete, redirecting to dashboard');
              router.push('/dashboard');
            } else if (onboardingStatus) {
              // Handle specific onboarding steps
              switch(onboardingStatus) {
                case 'business_info':
                case 'business-info':
                  router.push('/onboarding/subscription');
                  break;
                case 'subscription':
                  router.push('/onboarding/payment');
                  break;
                case 'payment':
                  router.push('/onboarding/setup');
                  break;
                case 'setup':
                  router.push('/onboarding/setup');
                  break;
                default:
                  // If unknown status, start from beginning
                  router.push('/onboarding/business-info');
              }
            } else {
              // No onboarding status, start from beginning
              router.push('/onboarding/business-info');
            }
          } catch (error) {
            logger.error('[SignInForm] Error checking onboarding status:', error);
            // Default fallback: redirect to business info
            router.push('/onboarding/business-info');
          }
          return;
        }
      }
      
      // If we get here, something unexpected happened
      throw new Error('Authentication flow failed to complete');
      
    } catch (error) {
      logger.error('[SignInForm] Sign-in error:', { 
        message: error.message, 
        code: error.code,
        name: error.name 
      });
      
      // Handle specific error cases
      if (error.code === 'UserNotConfirmedException') {
        setError("Your account needs to be verified. We'll redirect you to the verification page.");
        
        // Store email for verification page
        localStorage.setItem('pyfactor_email', formData.username);
        localStorage.setItem('needs_verification', 'true');
        
        // Redirect to verification page
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
        }, 1500);
      } 
      else if (error.code === 'NotAuthorizedException') {
        setError('Incorrect username or password. Please try again.');
      } 
      else if (error.code === 'UserNotFoundException') {
        setError('We couldn\'t find an account with this email address.');
      } 
      else if (error.message?.includes('network') || error.code === 'NetworkError') {
        setError('Network error. Please check your internet connection and try again.');
      } 
      else {
      setError(error.message || 'An error occurred during sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add debugging tools in development mode
  useEffect(() => {
    // Development tools disabled in production mode
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" role="alert">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <p className="text-green-700">{successMessage}</p>
          </div>
        )}

      {/* Email field */}
          <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Email address
            </label>
        <div className="mt-1">
            <input
              id="username"
              name="username"
              type="email"
              autoComplete="email"
            required
              value={formData.username}
              onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isLoading}
            />
        </div>
          </div>

      {/* Password field */}
          <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
        <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
            required
              value={formData.password}
              onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

      {/* Remember me and forgot password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        <div className="text-sm">
          <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </Link>
        </div>
      </div>

      {/* Submit button */}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
        </div>

      {/* Sign up link */}
      <div className="text-sm text-center mt-4">
        <span className="text-gray-600">Don't have an account?</span>{' '}
        <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
        </Link>
        </div>
      </form>
  );
}