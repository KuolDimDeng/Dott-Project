'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

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
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSuccessMessage('');
    
    try {
      logger.debug('[SignUpForm] Starting sign-up process', { 
        username: formData.username 
      });
      
      // Actual sign-up process
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: formData.username,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.username,
          },
          autoSignIn: false // Don't automatically sign in after signup
        }
      });
      
      logger.debug('[SignUpForm] Sign-up result', { 
        isSignUpComplete, 
        userId,
        nextStep: nextStep?.signUpStep 
      });
      
      // Store information needed for verification
      localStorage.setItem('pyfactor_email', formData.username);
      localStorage.setItem('needs_verification', 'true');
      localStorage.setItem('signupTimestamp', Date.now().toString());
      
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
      logger.error('[SignUpForm] Sign-up error:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      // Handle specific error types
      if (error.code === 'UsernameExistsException') {
        setErrors({
          username: 'An account with this email already exists. Try signing in instead.'
        });
      } else if (error.code === 'InvalidPasswordException') {
        setErrors({
          password: 'Password does not meet requirements. Please choose a stronger password.'
        });
      } else if (error.message?.includes('network') || error.code === 'NetworkError') {
        setErrors({
          form: 'Network error. Please check your internet connection and try again.'
        });
      } else {
        setErrors({
          form: error.message || 'An error occurred during sign up. Please try again.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
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
  );
} 