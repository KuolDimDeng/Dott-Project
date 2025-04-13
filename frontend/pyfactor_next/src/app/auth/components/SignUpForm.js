'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { clearAllAuthData } from '@/utils/authUtils';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Password must be at least 8 characters and contain at least one number, one uppercase letter, and one special character
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

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

  // Define clearExistingSession function that can be called from both useEffect and handleSubmit
  const clearExistingSession = async () => {
    try {
      logger.debug('[SignUpForm] Clearing any existing auth session');
      await clearAllAuthData();
    } catch (error) {
      logger.error('[SignUpForm] Error clearing auth session:', error);
    }
  };

  // Add early in the component right after initial state setup
  useEffect(() => {
    // Force clear any existing session when signup component loads
    clearExistingSession();
  }, []);

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
    
    if (loading) return; // Prevent double submission
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }
    
    // Reset errors and set loading state
    setErrors({});
    setErrorMessage(null);
    setLoading(true);
    
    try {
      // Ensure Amplify is properly configured
      await clearExistingSession();
      
      // Generate tenant ID with a UUID
      const generatedTenantId = crypto.randomUUID();
      
      logger.debug('[SignUpForm] Starting sign-up process', { 
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        generatedTenantId
      });
      
      // Check if domain is disabled by calling the admin API
      try {
        // First check if the endpoint exists using a HEAD request
        let endpointExists = false;
        try {
          const checkEndpoint = await fetch('/api/admin/check-domain-disabled', {
            method: 'HEAD'
          });
          endpointExists = checkEndpoint.ok;
        } catch (endpointError) {
          // Endpoint doesn't exist or is not accessible
          logger.warn('[SignUpForm] Domain check endpoint not available:', endpointError);
          endpointExists = false;
        }
        
        // Only proceed with the actual check if the endpoint exists
        if (endpointExists) {
          const disabledResponse = await fetch('/api/admin/check-domain-disabled', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: formData.username
            })
          });
          
          if (disabledResponse.ok) {
            const responseText = await disabledResponse.text();
            // Only try to parse if the response isn't empty
            if (responseText && responseText.trim()) {
              try {
                const disabledData = JSON.parse(responseText);
                
                if (disabledData.isDisabled) {
                  setErrorMessage('This email domain has been disabled. Please use a different email address.');
                  setLoading(false);
                  return;
                }
              } catch (parseError) {
                logger.error('[SignUpForm] Error parsing domain check response:', parseError);
                // Continue with signup despite parse error
              }
            }
          }
        }
      } catch (checkError) {
        logger.error('[SignUpForm] Error checking disabled status:', checkError);
        // Continue with normal signup
      }
      
      // Use email address as username since Cognito is configured to require email as username
      const username = formData.username; // Use the email address directly
      
      console.log('[SignUpForm] Using email as username for signup:', username);
      
      // Normal sign-up process using email as username
      const { isSignUpComplete, userId, userSub, nextStep } = await signUp({
        username: username, // Use email as username as required by Cognito
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.username,
            'custom:firstname': formData.firstName,
            'custom:lastname': formData.lastName,
            'custom:tenant_ID': generatedTenantId,
            'custom:userrole': 'OWNER',
            'custom:onboarding': 'not_started',
            'custom:setupdone': 'false',
            'custom:created_at': new Date().toISOString(),
            'custom:updated_at': new Date().toISOString()
          },
          autoSignIn: false // Don't automatically sign in after signup
        }
      });
      
      logger.debug('[SignUpForm] Sign-up result', { 
        isSignUpComplete, 
        userId,
        nextStep: nextStep?.signUpStep,
        tenantId: generatedTenantId,
        username: username
      });
      
      // No longer store in localStorage or cookies - everything is in Cognito
      
      // Ensure tenant record exists in database
      try {
        const baseUrl = window.location.origin;
        logger.debug('[SignUpForm] Creating tenant record in database for tenant ID:', generatedTenantId);
        
        const tenantResponse = await fetch(`${baseUrl}/api/tenant/ensure-db-record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantId: generatedTenantId,
            userId: userSub,
            email: formData.username,
            businessName: `${formData.firstName}'s Business`,
            businessType: 'Other',
            businessCountry: 'US'
          })
        });
        
        if (tenantResponse.ok) {
          const tenantResult = await tenantResponse.json();
          logger.debug('[SignUpForm] Tenant record created successfully:', tenantResult);
        } else {
          logger.warn('[SignUpForm] Failed to create tenant record in database:', 
            await tenantResponse.text().catch(() => 'Unknown error'));
        }
      } catch (tenantError) {
        logger.warn('[SignUpForm] Error creating tenant record:', tenantError);
        // Continue with the flow even if tenant creation fails
      }
      
      // Check if there's a next step in the sign-up flow
      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        // Success message
        setSuccessMessage('Account created successfully! Redirecting to verification page...');
        
        // Attempt admin confirmation in case the email doesn't arrive
        try {
          const baseUrl = window.location.origin;
          logger.debug('[SignUpForm] Attempting admin confirmation after signup', { 
            email: formData.username,
            username: username
          });
          
          const adminResponse = await fetch(`${baseUrl}/api/admin/confirm-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              email: formData.username,
              username: username
            })
          });
          
          if (adminResponse.ok) {
            logger.debug('[SignUpForm] Admin confirmation successful after signup');
          } else {
            logger.warn('[SignUpForm] Admin confirmation failed after signup', {
              status: adminResponse.status
            });
          }
        } catch (adminError) {
          logger.warn('[SignUpForm] Error calling admin API after signup', { 
            error: adminError.message 
          });
        }
        
        // Redirect to verification page with email as query parameter
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
        }, 1500);
      } else {
        // Unexpected flow - handle error
        throw new Error('Unexpected sign-up flow: Missing confirmation step');
      }
    } catch (error) {
      console.error('[SignUpForm] Sign-up error:', error);
      
      // Handle specific error cases
      if (error.name === 'UsernameExistsException') {
        // Should be unlikely since we're using a random UUID for username
        setErrorMessage('An unexpected error occurred. Please try again.');
        
        // Log detailed error for debugging
        console.error('[SignUpForm] UsernameExistsException with generated UUID. This should not happen.', error);
      } else if (error.name === 'InvalidPasswordException') {
        setErrorMessage('Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, numbers, and symbols.');
      } else if (error.name === 'UserLambdaValidationException') {
        // This often happens when email already exists
        setErrorMessage('This email is already registered. Please sign in instead or use a different email.');
      } else {
        // Generic error handling
        setErrorMessage(error.message || 'An error occurred during sign-up. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General form error */}
        {errors.form && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4" role="alert">
            <p className="text-red-700">{errors.form}</p>
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4" role="alert">
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
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.username ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.username && (
              <p className="mt-2 text-sm text-red-600">{errors.username}</p>
            )}
          </div>
        </div>
        
        {/* First Name field */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <div className="mt-1">
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={formData.firstName}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.firstName ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.firstName && (
              <p className="mt-2 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>
        </div>
        
        {/* Last Name field */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <div className="mt-1">
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={formData.lastName}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.lastName ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.lastName && (
              <p className="mt-2 text-sm text-red-600">{errors.lastName}</p>
            )}
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
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
          </div>
        </div>
        
        {/* Confirm password field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`appearance-none block w-full px-3 py-2 border ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
        
        {/* Add an error container for custom error handling */}
        <div id="error-container">
          {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
} 