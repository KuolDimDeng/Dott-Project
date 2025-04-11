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
    setErrorMessage('');
    setLoading(true);
    
    // Generate a unique tenant ID for this user
    let generatedTenantId;
    try {
      // Generate UUID using crypto API if available
      generatedTenantId = crypto.randomUUID();
      console.log('[SignUpForm] Generated tenant ID:', generatedTenantId);
      setTenantId(generatedTenantId);
    } catch (cryptoError) {
      // Fallback to simple UUID if crypto not available
      generatedTenantId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      console.log('[SignUpForm] Generated fallback tenant ID:', generatedTenantId);
      setTenantId(generatedTenantId);
    }
    
    try {
      console.log('[SignUpForm] Starting signup with tenant ID:', generatedTenantId);
      
      try {
        // First check if this user exists but is disabled
        const checkResponse = await fetch('/api/user/check-disabled', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.username }),
        });
        
        const checkResult = await checkResponse.json();
        console.log('[SignUpForm] Check disabled result:', checkResult);
        
        // If the user exists and is disabled, offer to reactivate their account
        if (checkResult.success && checkResult.exists && checkResult.isDisabled) {
          setLoading(false);
          
          // Display a confirmation dialog or a dedicated UI for reactivation
          const wantsToReactivate = window.confirm(
            'Your account was previously closed. Would you like to reactivate it? ' +
            'This will restore your previous data. Click OK to reactivate or Cancel to create a new account.'
          );
          
          if (wantsToReactivate) {
            setLoading(true);
            // Call the reactivation API
            const reactivateResponse = await fetch('/api/user/reactivate-account', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                email: formData.username, 
                username: checkResult.username,
                tenantId: checkResult.tenantInfo?.id
              }),
            });
            
            const reactivateResult = await reactivateResponse.json();
            console.log('[SignUpForm] Reactivation result:', reactivateResult);
            
            if (reactivateResult.success) {
              // Now try to sign in with the reactivated account
              try {
                await signIn({ username: formData.username, password: formData.password });
                router.push('/dashboard');
                return;
              } catch (signInError) {
                console.error('[SignUpForm] Error signing in after reactivation:', signInError);
                setErrorMessage('Account reactivated, but could not sign in. Please try signing in manually.');
                setLoading(false);
                return;
              }
            } else {
              setErrorMessage(`Could not reactivate account: ${reactivateResult.message}`);
              setLoading(false);
              return;
            }
          }
          // If they don't want to reactivate, we'll continue with normal signup
          // but this will likely fail with "User already exists" error
          setLoading(true);
        }
      } catch (checkError) {
        console.error('[SignUpForm] Error checking disabled status:', checkError);
        // Continue with normal signup
      }
      
      // Normal sign-up process
      const { isSignUpComplete, userId, userSub } = await signUp({
        username: formData.username,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.username,
            'custom:tenant_ID': generatedTenantId, // Use generatedTenantId instead of tenantId
            'custom:userrole': 'OWNER'    // Set user role to OWNER for new sign-ups
          },
          autoSignIn: false // Don't automatically sign in after signup
        }
      });
      
      logger.debug('[SignUpForm] Sign-up result', { 
        isSignUpComplete, 
        userId,
        nextStep: nextStep?.signUpStep,
        tenantId: generatedTenantId
      });
      
      // Store information needed for verification
      localStorage.setItem('pyfactor_email', formData.username);
      localStorage.setItem('needs_verification', 'true');
      localStorage.setItem('signupTimestamp', Date.now().toString());
      localStorage.setItem('tenantId', generatedTenantId); // Use generatedTenantId
      
      // Also set as cookie for server-side access
      document.cookie = `tenantId=${generatedTenantId}; path=/; max-age=${60*60*24*7}; samesite=lax`;
      document.cookie = `businessid=${generatedTenantId}; path=/; max-age=${60*60*24*7}; samesite=lax`;
      
      // Check if there's a next step in the sign-up flow
      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        // Success message
        setSuccessMessage('Account created successfully! Redirecting to verification page...');
        
        // Attempt admin confirmation in case the email doesn't arrive
        try {
          const baseUrl = window.location.origin;
          logger.debug('[SignUpForm] Attempting admin confirmation after signup', { 
            email: formData.username
          });
          
          const adminResponse = await fetch(`${baseUrl}/api/admin/confirm-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: formData.username })
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
        
        // Redirect to verification page
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(formData.username)}`);
        }, 1500);
      } else {
        // Unexpected flow - handle error
        throw new Error('Unexpected sign-up flow: Missing confirmation step');
      }
    } catch (error) {
      console.error('[SignUpForm] Sign-up error:', error);
      
      // Handle "User already exists" error by suggesting login or reactivation
      if (error.name === 'UsernameExistsException') {
        setErrorMessage('An account with this email already exists. Please sign in or reactivate your account if it was previously closed.');
        
        // Create a button that takes them to the reactivation flow
        const reactivationLink = document.createElement('a');
        reactivationLink.href = '#';
        reactivationLink.textContent = 'Reactivate Closed Account';
        reactivationLink.onclick = async (e) => {
          e.preventDefault();
          
          try {
            setLoading(true);
            // Check if the user account is disabled
            const checkResponse = await fetch('/api/user/check-disabled', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: formData.username }),
            });
            
            const checkResult = await checkResponse.json();
            
            if (checkResult.success && checkResult.exists && checkResult.isDisabled) {
              // Call the reactivation API
              const reactivateResponse = await fetch('/api/user/reactivate-account', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  email: formData.username, 
                  username: checkResult.username,
                  tenantId: checkResult.tenantInfo?.id
                }),
              });
              
              const reactivateResult = await reactivateResponse.json();
              
              if (reactivateResult.success) {
                setLoading(false);
                alert('Your account has been reactivated! Please sign in with your email and password.');
                router.push('/auth/signin');
              } else {
                setLoading(false);
                setErrorMessage(`Could not reactivate account: ${reactivateResult.message}`);
              }
            } else if (checkResult.success && checkResult.exists && !checkResult.isDisabled) {
              setLoading(false);
              setErrorMessage('This account is already active. Please sign in with your email and password.');
            } else {
              setLoading(false);
              setErrorMessage('Account not found. Please sign up for a new account.');
            }
          } catch (reactivationError) {
            setLoading(false);
            console.error('[SignUpForm] Reactivation error:', reactivationError);
            setErrorMessage('Error checking account status. Please try again.');
          }
        };
        
        // Add a container for error message and reactivation link
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
          errorContainer.innerHTML = '';
          const errorText = document.createElement('p');
          errorText.className = 'text-red-500 text-sm mt-2';
          errorText.textContent = errorMessage;
          errorContainer.appendChild(errorText);
          
          const linkContainer = document.createElement('div');
          linkContainer.className = 'mt-2';
          linkContainer.appendChild(reactivationLink);
          errorContainer.appendChild(linkContainer);
        }
      } else {
        setErrorMessage(error.message || 'An error occurred during sign-up');
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