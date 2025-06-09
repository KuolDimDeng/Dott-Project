'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

/**
 * Email/Password Sign In Component with Comprehensive Debugging
 * Tracks every step of the authentication process
 */
export default function EmailPasswordSignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugLog, setDebugLog] = useState([]);

  // Add debug message
  const addDebugMessage = (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data
    };
    
    setDebugLog(prev => [...prev, logEntry]);
    logger.info(`[EmailPasswordSignIn] ${message}`, data);
    console.log(`🔍 [${timestamp}] ${message}`, data || '');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    
    addDebugMessage('Starting email/password sign-in process', {
      email: formData.email,
      hasPassword: !!formData.password,
      rememberMe: formData.rememberMe
    });
    
    if (!validateForm()) {
      addDebugMessage('Form validation failed', errors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Step 1: Attempt direct authentication via Auth0
      addDebugMessage('Step 1: Initiating Auth0 authentication');
      
      // First, we need to get the Auth0 login page with credentials
      const auth0LoginUrl = `/api/auth/login?login_hint=${encodeURIComponent(formData.email)}`;
      
      addDebugMessage('Redirecting to Auth0 login with email hint', {
        url: auth0LoginUrl,
        email: formData.email
      });
      
      // For email/password, we need to use Auth0's embedded login
      // This requires calling the Auth0 authentication API directly
      const authResponse = await fetch('/api/auth/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          connection: 'Username-Password-Authentication'
        })
      });
      
      const authResult = await authResponse.json();
      
      addDebugMessage('Authentication response received', {
        status: authResponse.status,
        ok: authResponse.ok,
        hasAccessToken: !!authResult.access_token,
        hasIdToken: !!authResult.id_token,
        error: authResult.error
      });
      
      if (!authResponse.ok) {
        throw new Error(authResult.error || 'Authentication failed');
      }
      
      // Step 2: Create session
      addDebugMessage('Step 2: Creating session with tokens');
      
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: authResult.access_token,
          idToken: authResult.id_token,
          user: authResult.user
        })
      });
      
      const sessionResult = await sessionResponse.json();
      
      addDebugMessage('Session creation response', {
        status: sessionResponse.status,
        ok: sessionResponse.ok,
        hasUser: !!sessionResult.user,
        needsOnboarding: sessionResult.needsOnboarding
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }
      
      // Step 3: Check onboarding status
      addDebugMessage('Step 3: Checking onboarding status');
      
      const profileResponse = await fetch('/api/auth/profile');
      const profileData = await profileResponse.json();
      
      addDebugMessage('Profile data received', {
        hasProfile: !!profileData,
        needsOnboarding: profileData.needsOnboarding,
        onboardingCompleted: profileData.onboardingCompleted,
        tenantId: profileData.tenantId,
        businessName: profileData.businessName
      });
      
      // Step 4: Redirect based on onboarding status
      if (profileData.needsOnboarding || !profileData.onboardingCompleted) {
        addDebugMessage('User needs onboarding, redirecting to onboarding flow');
        router.push('/onboarding');
      } else if (profileData.tenantId) {
        addDebugMessage('User has completed onboarding, redirecting to dashboard', {
          tenantId: profileData.tenantId
        });
        router.push(`/tenant/${profileData.tenantId}/dashboard`);
      } else {
        addDebugMessage('No tenant ID found, redirecting to generic dashboard');
        router.push('/dashboard');
      }
      
    } catch (error) {
      addDebugMessage('Sign-in error occurred', {
        error: error.message,
        stack: error.stack
      });
      
      logger.error('[EmailPasswordSignIn] Sign-in error:', error);
      
      // Set user-friendly error message
      if (error.message.includes('Invalid credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else if (error.message.includes('Too many attempts')) {
        setErrors({ general: 'Too many login attempts. Please try again later.' });
      } else {
        setErrors({ general: error.message || 'Sign-in failed. Please try again.' });
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Sign In with Email
        </h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {errors.general}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } rounded focus:outline-none`}
            required
            autoComplete="email"
            placeholder="user@example.com"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 font-medium mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } rounded focus:outline-none`}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          <a href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </a>
        </div>
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      {/* Debug Log Display */}
      {debugLog.length > 0 && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Log:</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {debugLog.map((entry, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-500">
                  [{new Date(entry.timestamp).toLocaleTimeString()}]
                </span>
                <span className="ml-2 text-gray-700">{entry.message}</span>
                {entry.data && (
                  <pre className="mt-1 ml-4 text-gray-600 overflow-x-auto">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}