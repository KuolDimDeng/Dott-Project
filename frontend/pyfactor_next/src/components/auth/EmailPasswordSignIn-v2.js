'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import sessionManager from '@/utils/sessionManager-v2';
import { logger } from '@/utils/logger';
import { trackAuth } from '@/utils/analytics';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function EmailPasswordSignInV2({ 
  onForgotPassword,
  isModal = false,
  isSignup = false 
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { handleError, showError } = useErrorHandler();

  const clearError = () => setError('');

  const handleSignup = async () => {
    try {
      clearError();

      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      logger.info('[EmailPasswordSignIn-V2] Starting signup process');

      // Create account via backend
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!signupResponse.ok) {
        const error = await signupResponse.json();
        throw new Error(error.message || 'Signup failed');
      }

      // Track signup event
      trackAuth('signup', {
        method: 'email',
        success: true
      });

      // Auto-login after signup using session-v2
      await handleLogin(true);
    } catch (error) {
      logger.error('[EmailPasswordSignIn-V2] Signup error:', error);
      showError(error.message);
      setIsLoading(false);
    }
  };

  const handleLogin = async (isAfterSignup = false) => {
    try {
      clearError();

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      logger.info('[EmailPasswordSignIn-V2] Attempting login');

      // Use session-v2 for authentication
      const result = await sessionManager.createSession(email, password);
      
      if (!result.success) {
        throw new Error('Authentication failed');
      }

      logger.info('[EmailPasswordSignIn-V2] Login successful');

      // Track login event
      trackAuth('login', {
        method: 'email',
        success: true,
        isAfterSignup
      });

      // Get session to check onboarding status
      const session = await sessionManager.getSession();
      
      if (session?.user?.needsOnboarding) {
        logger.info('[EmailPasswordSignIn-V2] Redirecting to onboarding');
        router.push('/onboarding');
      } else if (session?.user?.tenantId) {
        logger.info('[EmailPasswordSignIn-V2] Redirecting to tenant dashboard');
        router.push(`/${session.user.tenantId}/dashboard`);
      } else {
        logger.info('[EmailPasswordSignIn-V2] Redirecting to dashboard');
        router.push('/dashboard');
      }
    } catch (error) {
      logger.error('[EmailPasswordSignIn-V2] Login error:', error);
      showError(error.message || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isSignup) {
      await handleSignup();
    } else {
      await handleLogin();
    }
  };

  return (
    <>
      <style jsx>{`
        .loader {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4F46E5;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          {/* Logo */}
          <div className="text-center">
            <img 
              className="mx-auto h-20 w-auto" 
              src="https://dottapps.com/static/images/PyfactorLandingpage.png" 
              alt="Dott" 
            />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign up
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              )}
            </div>

            {!isSignup && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loader"></div>
                ) : (
                  <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </div>

            {/* OAuth Options */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="ml-2">Google</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}