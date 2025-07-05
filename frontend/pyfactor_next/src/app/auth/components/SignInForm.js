'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { appCache } from '@/utils/appCache';
import { useSession } from '@/hooks/useSession-v2';
import { useSecureAuth } from '@/hooks/useSecureAuth';

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
  const { user, tenantId, needsOnboarding, loading: sessionLoading } = useSession();
  const { secureSignIn, loading: authLoading, error: authError } = useSecureAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cookiesEnabled, setCookiesEnabled] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    if (!sessionLoading && user && tenantId) {
      logger.info('[SignInForm] User already authenticated, redirecting to dashboard');
      router.push(`/${tenantId}/dashboard`);
    }
  }, [sessionLoading, user, tenantId, router]);

  // Check for redirect parameter
  const redirect = searchParams.get('redirect') || null;

  useEffect(() => {
    // Check if cookies are enabled
    document.cookie = 'test_cookie=1; SameSite=Lax';
    const cookieEnabled = document.cookie.includes('test_cookie');
    document.cookie = 'test_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setCookiesEnabled(cookieEnabled);
    
    if (!cookieEnabled) {
      setErrors({ general: 'Cookies must be enabled for authentication to work properly.' });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear field-specific error when user starts typing
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
    
    if (!formData.username) {
      newErrors.username = 'Email is required';
    } else if (!formData.username.includes('@')) {
      newErrors.username = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cookiesEnabled) {
      setErrors({ general: 'Please enable cookies to continue.' });
      return;
    }
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      logger.info('[SignInForm] Starting secure sign-in process');
      
      // Use secure sign-in with device fingerprinting
      await secureSignIn(formData.username, formData.password);
      
      // secureSignIn handles navigation, so we just show success
      setSuccessMessage('Sign in successful! Redirecting...');
      
    } catch (error) {
      logger.error('[SignInForm] Sign-in error:', error);
      
      // Handle specific error cases
      if (error.message.includes('temporarily blocked')) {
        setErrors({ general: error.message });
      } else if (error.message.includes('attempts remaining')) {
        setErrors({ general: error.message });
      } else if (error.message.includes('Invalid credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else {
        setErrors({ general: error.message || 'An error occurred during sign in. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking session
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Email address
              </label>
              <input
                id="username"
                name="username"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600">{errors.username}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !cookiesEnabled}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isSubmitting || !cookiesEnabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isSubmitting ? (
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up now
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}