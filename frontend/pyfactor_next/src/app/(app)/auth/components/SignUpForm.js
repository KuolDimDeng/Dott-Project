'use client';


import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Auth0 doesn't use separate signUp - redirect to login with signup hint
import { logger } from '@/utils/logger';
import { clearAllAuthData } from '@/utils/authUtils';
import { setCacheValue } from '@/utils/appCache';
import { handleAuthError, checkCookiesEnabled } from '@/utils/authErrorHandler';
import { captureEvent } from '@/lib/posthog';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Password must be at least 8 characters and contain at least one number, one uppercase letter, and one special character
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

/**
 * Clear any existing session before showing the sign up form
 */
async function clearExistingSession() {
  try {
    await clearAllAuthData();
    console.debug('[SignUp] Successfully cleared existing session');
  } catch (error) {
    console.error('[SignUp] Error clearing existing session:', error);
    // Continue with sign up even if session clearing fails
  }
}

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [cookiesEnabled, setCookiesEnabled] = useState(true);

  // Add early in the component right after initial state setup
  useEffect(() => {
    // Clear any existing session when the component mounts
    clearExistingSession();
    
    // Check if cookies are enabled
    const enabled = checkCookiesEnabled();
    setCookiesEnabled(enabled);
    if (!enabled) {
      setErrorMessage('Cookies must be enabled to sign up. Please enable cookies in your browser settings.');
    }
    
    // Track signup page view
    captureEvent('signup_page_viewed');
  }, []); // Empty dependency array means this runs once on mount

  // Form validation function
  const validateForm = () => {
    const newErrors = {};

    // Validate email
    if (!formData.username) {
      newErrors.username = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.username)) {
      newErrors.username = 'Please enter a valid email address';
    }

    // Validate first name
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    // Validate last name
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters and include uppercase, number, and special character';
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous messages
    setSuccessMessage('');
    setErrorMessage('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      logger.debug('[SignUpForm] Starting sign-up process', { 
        username: formData.username,
        hasPassword: !!formData.password,
        hasFirstName: !!formData.firstName,
        hasLastName: !!formData.lastName
      });
      
      // Track signup attempt
      captureEvent('signup_attempted', {
        email: formData.username,
        has_first_name: !!formData.firstName,
        has_last_name: !!formData.lastName
      });
      
      // Redirect to Auth0 signup
      // Store signup data temporarily
      await setCacheValue('pendingSignup', {
        email: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      
      // Redirect to Auth0 login with signup hint
      window.location.href = `/api/auth/login?screen_hint=signup&login_hint=${encodeURIComponent(formData.username)}`;
      return;
    } catch (error) {
      logger.error('[SignUpForm] Sign-up error:', error);
      
      // Use comprehensive error handler
      const handled = handleAuthError(error, { context: 'signup' });
      
      // Handle specific actions
      switch (handled.action) {
        case 'redirect_signin':
          setErrorMessage(handled.message);
          setTimeout(() => {
            router.push('/auth/signin');
          }, 2000);
          break;
          
        case 'retry':
          if (handled.code === 'weak_password') {
            setErrors({ password: handled.message });
          } else if (handled.code === 'invalid_email') {
            setErrors({ username: handled.message });
          } else {
            setErrorMessage(handled.message);
          }
          break;
          
        case 'wait':
          setErrorMessage(handled.message);
          setIsSubmitting(true); // Keep button disabled
          setTimeout(() => {
            setIsSubmitting(false);
            setErrorMessage('');
          }, handled.waitTime || 60000);
          break;
          
        default:
          setErrorMessage(handled.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error message */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md" role="alert">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md" role="alert">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}
        
        {/* Email field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1 relative">
            <input
              id="username"
              name="username"
              type="email"
              autoComplete="email"
              required
              value={formData.username}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.username ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
              placeholder="you@example.com"
              aria-invalid={errors.username ? "true" : "false"}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.username}</p>
            )}
          </div>
        </div>
        
        {/* First Name and Last Name fields in a flex row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name field */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <div className="mt-1 relative">
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={formData.firstName}
                onChange={handleChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.firstName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                aria-invalid={errors.firstName ? "true" : "false"}
              />
              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.firstName}</p>
              )}
            </div>
          </div>
          
          {/* Last Name field */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <div className="mt-1 relative">
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={handleChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.lastName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                aria-invalid={errors.lastName ? "true" : "false"}
              />
              {errors.lastName && (
                <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.lastName}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.password}</p>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            8+ characters with uppercase, number, and special character (!@#$%^&*)
          </p>
        </div>
        
        {/* Confirm password field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <div className="mt-1 relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
              aria-invalid={errors.confirmPassword ? "true" : "false"}
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 animate-fadeIn" role="alert">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || !cookiesEnabled}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${isSubmitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors duration-150`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </div>
            ) : 'Create Account'}
          </button>
        </div>
        
        {/* Sign In link */}
        <div className="text-sm text-center mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-150">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
} 