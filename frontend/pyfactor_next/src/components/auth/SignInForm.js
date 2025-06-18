'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { useSession } from '@/hooks/useSession-v2';

export default function SignInForm({ propEmail, setParentEmail, mode, setMode, redirectPath, newAccount, plan }) {
  const [email, setEmail] = useState(propEmail || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  // Sync email value with parent if prop changes
  useEffect(() => {
    if (propEmail !== undefined && propEmail !== email) {
      setEmail(propEmail);
    }
  }, [propEmail]);

  // Update parent email when local email changes
  useEffect(() => {
    if (setParentEmail && email !== propEmail) {
      setParentEmail(email);
    }
  }, [email, setParentEmail, propEmail]);

  // Check if user is already authenticated
  useEffect(() => {
    if (!sessionLoading && session && session.tenantId) {
      logger.info('[SignInForm] User already authenticated, redirecting to dashboard');
      const dashboardUrl = redirectPath || `/${session.tenantId}/dashboard`;
      router.push(dashboardUrl);
    }
  }, [session, sessionLoading, router, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[SignInForm] Starting Auth0 sign-in process', { email });
      
      // For email/password sign in, redirect to Auth0 with login_hint
      const loginUrl = `/api/auth/login?login_hint=${encodeURIComponent(email)}`;
      if (redirectPath) {
        loginUrl += `&return_url=${encodeURIComponent(redirectPath)}`;
      }
      window.location.href = loginUrl;
      
    } catch (error) {
      logger.error('[SignInForm] Sign-in error:', error);
      setError(error.message || 'Sign-in failed. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.debug('[SignInForm] Initiating Google Sign-In with Auth0');
      
      // Redirect to Auth0 Google OAuth
      let googleLoginUrl = `/api/auth/login?connection=google-oauth2`;
      if (redirectPath) {
        googleLoginUrl += `&return_url=${encodeURIComponent(redirectPath)}`;
      }
      window.location.href = googleLoginUrl;
    } catch (error) {
      logger.error('[SignInForm] Google Sign-In error:', error);
      setError('Google Sign-In failed. Please try again.');
      setIsLoading(false);
    }
  };

  // If session is loading, show loading state
  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>

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
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
              isLoading ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="ml-2">Sign in with Google</span>
          </button>
        </div>
      </div>

      {mode === 'signin' && (
        <div className="text-center text-sm">
          <span className="text-gray-600">Don\'t have an account? </span>
          <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </div>
      )}
    </form>
  );
}