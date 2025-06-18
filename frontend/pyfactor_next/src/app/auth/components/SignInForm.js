'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { appCache } from '../../../utils/appCache';
import { useSession } from '@/hooks/useSession';

// Add logging utility
const logger = {
  debug: (message, data) => console.debug('[SignInForm]', message, data || ''),
  info: (message, data) => console.info('[SignInForm]', message, data || ''),
  warn: (message, data) => console.warn('[SignInForm]', message, data || ''),
  error: (message, data) => console.error('[SignInForm]', message, data || '')
};

// Initialize global app cache for auth
if (typeof window !== 'undefined') {
  // Initialize app cache properly
  if (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {
    appCache.set('auth', {});
    appCache.set('user', {});
    appCache.set('tenant', {});
  }
  if (!appCache.get('auth')) appCache.set('auth', {});
  if (!appCache.get('user')) appCache.set('user', {});
  if (!appCache.get('tenant')) appCache.set('tenant', {});
  if (!appCache.get('tenants')) appCache.set('tenants', {});
}

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check if user is already authenticated
  useEffect(() => {
    if (!sessionLoading && session && session.tenantId) {
      logger.info('[SignInForm] User already authenticated, redirecting to dashboard');
      router.push(`/${session.tenantId}/dashboard`);
    }
  }, [session, sessionLoading, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: fieldValue }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setErrors({});
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    try {
      logger.debug('[SignInForm] Starting sign-in process', { 
        username: formData.username,
        hasPassword: !!formData.password,
        rememberMe: formData.rememberMe
      });
      
      // Step 1: Authenticate with Auth0
      const authResponse = await fetch('/api/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        body: JSON.stringify({
          email: formData.username,
          password: formData.password,
          connection: 'Username-Password-Authentication'
        })
      });

      const authResult = await authResponse.json();

      if (!authResponse.ok) {
        // Check if we need to fallback to Universal Login
        if (authResult.requiresUniversalLogin) {
          logger.info('[SignInForm] Password grant not enabled, redirecting to Universal Login');
          window.location.href = '/api/auth/login';
          return;
        }
        
        // Check for email verification error
        if ((authResult.error === 'invalid_grant' || authResult.error === 'email_not_verified') && 
            (authResult.message?.includes('email') || authResult.message?.includes('verify'))) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification email.');
        }
        
        throw new Error(authResult.message || authResult.error || 'Authentication failed');
      }

      // Step 2: Create secure session
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        credentials: 'include',
        body: JSON.stringify({
          accessToken: authResult.access_token,
          idToken: authResult.id_token,
          user: authResult.user
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      // Step 3: Use unified auth flow handler
      const { handlePostAuthFlow } = await import('@/utils/authFlowHandler');
      const finalUserData = await handlePostAuthFlow({
        user: authResult.user,
        accessToken: authResult.access_token,
        idToken: authResult.id_token
      }, 'email-password');

      // Step 4: Redirect based on auth flow result
      // Use a longer delay and window.location for better cookie propagation
      setTimeout(() => {
        const redirectUrl = finalUserData.redirectUrl || 
          (finalUserData.needsOnboarding ? '/onboarding' : 
          (finalUserData.tenantId ? `/${finalUserData.tenantId}/dashboard` : '/dashboard'));
        
        logger.debug('[SignInForm] Redirecting to:', redirectUrl);
        
        // Use window.location.href for better cookie handling across redirects
        window.location.href = redirectUrl;
      }, 500); // 500ms delay to ensure cookies are properly set
      
    } catch (error) {
      logger.error('[SignInForm] Sign-in error:', error);
      setErrors({ 
        general: error.message || 'Sign-in failed. Please check your credentials and try again.' 
      });
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrors({});
    
    try {
      logger.debug('[SignInForm] Initiating Google Sign-In with Auth0');
      
      // Redirect to Auth0 Google OAuth
      const googleLoginUrl = `/api/auth/login?connection=google-oauth2`;
      window.location.href = googleLoginUrl;
    } catch (error) {
      logger.error('[SignInForm] Google Sign-In error:', error);
      setErrors({ general: 'Google Sign-In failed. Please try again.' });
      setIsSubmitting(false);
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
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errors.general}
              </h3>
              {errors.showResendLink && (
                <button
                  type="button"
                  onClick={() => window.location.href = '/auth/resend-verification'}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Resend verification email
                </button>
              )}
              {errors.showResetLink && (
                <Link
                  href="/auth/forgot-password"
                  className="mt-2 block text-sm text-red-600 hover:text-red-500 underline"
                >
                  Reset your password
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {successMessage}
              </h3>
            </div>
          </div>
        </div>
      )}

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
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.username ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {errors.username && (
            <p className="mt-2 text-sm text-red-600">{errors.username}</p>
          )}
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
            value={formData.password}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
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
          disabled={isSubmitting || !cookiesEnabled}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting || !cookiesEnabled
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
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
            disabled={isSubmitting || !cookiesEnabled}
            className={`w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
              isSubmitting || !cookiesEnabled ? 'cursor-not-allowed opacity-50' : ''
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
    </form>
  );
}