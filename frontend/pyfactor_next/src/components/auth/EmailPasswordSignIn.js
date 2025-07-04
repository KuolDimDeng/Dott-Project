'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import Script from 'next/script';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';
import { secureLogin } from '@/utils/secureAuth';
import { securityLogger } from '@/utils/securityLogger';
import { anomalyDetector } from '@/utils/anomalyDetection';

export default function EmailPasswordSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('error'); // 'error' or 'success'
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    rememberMe: false
  });

  // Check for error from URL params (e.g., from Google OAuth)
  useEffect(() => {
    // Set initial page title based on mode
    document.title = isSignup ? 'Dott: Sign Up' : 'Dott: Sign In';
    
    const errorParam = searchParams.get('error');
    const emailParam = searchParams.get('email');
    
    if (errorParam === 'email_not_verified' && emailParam) {
      setError('Please verify your email address before signing in. Check your inbox for the verification email.');
      setShowResendVerification(true);
      setFormData(prev => ({ ...prev, email: emailParam }));
    } else if (errorParam === 'backend_unavailable') {
      setError('Our servers are temporarily unavailable. Please try again in a few moments.');
      setErrorType('error');
    } else if (errorParam === 'session_creation_failed') {
      setError('Unable to sign in at this time. Please try again or use email/password login.');
      setErrorType('error');
    } else if (errorParam === 'invalid_session') {
      setError('Your session has expired. Please sign in again.');
      setErrorType('error');
    }
  }, [searchParams]);

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setErrorType('error');
    setShowResendVerification(false);
    // Reset confirm password and visibility states when switching modes
    setFormData(prev => ({ ...prev, confirmPassword: '' }));
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Update page title based on mode
    document.title = !isSignup ? 'Dott: Sign Up' : 'Dott: Sign In';
  };

  const showError = (message, type = 'error') => {
    setError(message);
    setErrorType(type);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGoogleLogin = () => {
    // Redirect to Auth0 login with Google connection
    window.location.href = '/api/auth/login?connection=google-oauth2';
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      showError('Please enter your email address first');
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        body: JSON.stringify({ email: formData.email })
      });

      if (response.ok) {
        showError('Password reset email sent! Check your inbox.');
      } else {
        showError('Error sending password reset email');
      }
    } catch (error) {
      showError('Error sending password reset email');
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      showError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        body: JSON.stringify({ email: formData.email })
      });

      if (response.ok) {
        showError('Verification email sent! Please check your inbox.', 'success');
        setShowResendVerification(false);
      } else {
        showError('Error sending verification email. Please try again.');
      }
    } catch (error) {
      showError('Error sending verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    const { email, password, confirmPassword, firstName, lastName } = formData;

    if (!firstName || !lastName) {
      showError('Please enter your first and last name');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }

    try {
      // First create the account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        body: JSON.stringify({
          email,
          password,
          given_name: firstName,
          family_name: lastName,
          name: `${firstName} ${lastName}`
        })
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Error creating account');
      }

      // Show success message and redirect to login
      setIsLoading(false);
      showError('Account created successfully! Please check your email to verify your account before signing in.', 'success');
      
      // Switch to login mode after a delay
      setTimeout(() => {
        setIsSignup(false);
        setError('');
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }, 3000);
    } catch (error) {
      logger.error('[EmailPasswordSignIn] Signup error:', error);
      showError(error.message || 'Error creating account');
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const { email, password } = formData;

    try {
      // Get client IP and user agent for anomaly detection
      const userAgent = navigator.userAgent;
      const ip = 'client'; // In production, get from header
      
      const authResponse = await fetch('/api/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' ,
        credentials: 'include'},
        body: JSON.stringify({
          email,
          password,
          connection: 'Username-Password-Authentication'
        })
      });

      const authResult = await authResponse.json();

      if (!authResponse.ok) {
        // Check for anomalies in failed login
        const anomalies = await anomalyDetector.checkLoginAttempt(email, ip, userAgent, false);
        
        // Log failed login attempt
        await securityLogger.loginFailed(email, authResult.error || 'Authentication failed', 'email-password');
        
        // If high-risk anomalies detected, show additional security message
        if (anomalies.some(a => a.severity === 'high')) {
          showError('Multiple failed login attempts detected. Your account may be temporarily locked for security.');
          return;
        }
        
        // Check if we need to fallback to Universal Login
        if (authResult.requiresUniversalLogin) {
          logger.info('[EmailPasswordSignIn] Password grant not enabled, redirecting to Universal Login');
          // Redirect to standard Auth0 login
          window.location.href = '/api/auth/login';
          return;
        }
        
        // Check for email verification error
        if ((authResult.error === 'invalid_grant' || authResult.error === 'email_not_verified') && 
            (authResult.message?.includes('email') || authResult.message?.includes('verify'))) {
          setShowResendVerification(true);
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification email.');
        }
        
        // Check if error description mentions email verification
        if (authResult.message?.toLowerCase().includes('verify') || 
            authResult.message?.toLowerCase().includes('verification')) {
          setShowResendVerification(true);
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification email.');
        }
        
        throw new Error(authResult.message || authResult.error || 'Authentication failed');
      }

      // Create secure session (cookie-based)
      const sessionResponse = await fetch('/api/auth/session-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies for cross-subdomain
        body: JSON.stringify({
          accessToken: authResult.access_token,
          idToken: authResult.id_token,
          user: authResult.user
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const sessionResult = await sessionResponse.json();
      
      logger.info('[EmailPasswordSignIn] Session response:', {
        success: sessionResult.success,
        hasUser: !!sessionResult.user,
        hasTenant: !!sessionResult.tenant,
        needsOnboarding: sessionResult.needs_onboarding
      });
      
      // Check if session was created successfully
      if (!sessionResult.success) {
        throw new Error('Failed to create session');
      }
      
      // Create bridge token for immediate availability using the real session token
      const bridgeResponse = await fetch('/api/auth/bridge-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionResult.session_token, // Use the actual session token from backend
          userId: authResult.user.sub,
          tenantId: sessionResult.tenant?.id || authResult.user.tenantId || authResult.user.tenant_id,
          email: authResult.user.email
        })
      });
      
      let bridgeToken = null;
      if (bridgeResponse.ok) {
        const bridgeData = await bridgeResponse.json();
        bridgeToken = bridgeData.bridgeToken;
        logger.info('[EmailPasswordSignIn] Bridge token created for session handoff');
      }
      
      // DEPRECATED: Remove localStorage usage after testing
      // Only keeping temporarily for backward compatibility
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SecurityWarning] localStorage usage is deprecated. Use secure cookies instead.');
      }

      // Use unified auth flow handler
      console.log('[EmailPasswordSignIn] About to call handlePostAuthFlow');
      const { handlePostAuthFlow } = await import('@/utils/authFlowHandler.v3');
      const finalUserData = await handlePostAuthFlow({
        user: authResult.user,
        accessToken: authResult.access_token,
        idToken: authResult.id_token
      }, 'email-password');
      
      console.log('[EmailPasswordSignIn] handlePostAuthFlow returned:', {
        hasData: !!finalUserData,
        redirectUrl: finalUserData?.redirectUrl,
        needsOnboarding: finalUserData?.needsOnboarding,
        tenantId: finalUserData?.tenantId || finalUserData?.tenant_id
      });
      
      // Check if handlePostAuthFlow returned null (account closed or error)
      if (!finalUserData) {
        console.log('[EmailPasswordSignIn] handlePostAuthFlow returned null, likely redirected already');
        setIsLoading(false);
        return;
      }

      // If session was created successfully, use secure bridge
      if (sessionResult.success) {
        logger.info('[EmailPasswordSignIn] Session created successfully');
        
        // Check for anomalies in successful login
        await anomalyDetector.checkLoginAttempt(email, ip, userAgent, true);
        
        // Log successful login
        await securityLogger.loginSuccess(
          authResult.user?.sub,
          email,
          'email-password'
        );
        
        // Build redirect URL - IGNORE the authFlowHandler redirect for session-loading
        let redirectUrl;
        // The authFlowHandler.v3 returns '/auth/session-loading' but we handle sessions differently
        // for email/password login with the session bridge pattern
        if (finalUserData.needsOnboarding || sessionResult.needs_onboarding) {
          redirectUrl = '/onboarding';
        } else if (finalUserData.tenantId || finalUserData.tenant_id) {
          redirectUrl = `/${finalUserData.tenantId || finalUserData.tenant_id}/dashboard`;
        } else if (sessionResult.tenant?.id) {
          redirectUrl = `/${sessionResult.tenant.id}/dashboard`;
        } else {
          redirectUrl = '/dashboard';
        }
        
        console.log('[EmailPasswordSignIn] Determined redirect URL:', {
          redirectUrl,
          needsOnboarding: finalUserData.needsOnboarding || sessionResult.needs_onboarding,
          tenantId: finalUserData.tenantId || finalUserData.tenant_id || sessionResult.tenant?.id,
          authFlowHandlerRedirect: finalUserData.redirectUrl // This is /auth/session-loading
        });
        
        // For non-onboarding flows, use secure session bridge
        if (!finalUserData.needsOnboarding && bridgeToken) {
          logger.info('[EmailPasswordSignIn] Using bridge token for session handoff');
          console.log('[EmailPasswordSignIn] DEBUG - Preparing session bridge with:', {
            hasBridgeToken: !!bridgeToken,
            bridgeTokenLength: bridgeToken?.length,
            redirectUrl: redirectUrl,
            needsOnboarding: finalUserData.needsOnboarding
          });
          
          // Store bridge token in sessionStorage for bridge
          const bridgeData = {
            token: bridgeToken, // This is the bridge token from backend, NOT the JWT
            redirectUrl: redirectUrl,
            timestamp: Date.now()
          };
          
          console.log('[EmailPasswordSignIn] DEBUG - Setting sessionStorage:', {
            key: 'session_bridge',
            data: bridgeData
          });
          
          sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
          
          // Verify storage
          const storedData = sessionStorage.getItem('session_bridge');
          console.log('[EmailPasswordSignIn] DEBUG - Verified sessionStorage:', {
            stored: !!storedData,
            canParse: !!storedData && (() => { try { JSON.parse(storedData); return true; } catch { return false; } })()
          });
          
          // Redirect to session bridge
          console.log('[EmailPasswordSignIn] DEBUG - About to navigate to /auth/session-bridge');
          console.log('[EmailPasswordSignIn] DEBUG - Router state:', {
            pathname: window.location.pathname,
            isReady: router.isReady
          });
          
          // Use window.location as a fallback to ensure navigation
          const bridgeUrl = '/auth/session-bridge';
          console.log('[EmailPasswordSignIn] DEBUG - Navigating to:', bridgeUrl);
          
          // Try router.push first
          router.push(bridgeUrl).then(() => {
            console.log('[EmailPasswordSignIn] DEBUG - Router.push completed');
          }).catch((err) => {
            console.error('[EmailPasswordSignIn] DEBUG - Router.push failed:', err);
            // Fallback to window.location
            console.log('[EmailPasswordSignIn] DEBUG - Using window.location fallback');
            window.location.href = bridgeUrl;
          });
        } else if (!finalUserData.needsOnboarding && !bridgeToken) {
          // Fallback: direct redirect if bridge token creation failed
          logger.warn('[EmailPasswordSignIn] No bridge token available, using direct redirect');
          console.log('[EmailPasswordSignIn] DEBUG - Direct redirect to:', redirectUrl);
          router.push(redirectUrl);
        } else {
          // Direct redirect for onboarding (doesn't need session bridge)
          console.log('[EmailPasswordSignIn] DEBUG - Onboarding redirect to:', redirectUrl);
          router.push(redirectUrl);
        }
        
        return;
      }

      // If we get here, something went wrong
      logger.error('[EmailPasswordSignIn] Session creation failed');
      showError('Session setup failed. Please try signing in again.');
      setIsLoading(false);
    } catch (error) {
      logger.error('[EmailPasswordSignIn] Login error:', error);
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
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Error/Success Message */}
          {error && (
            <div className={`px-4 py-3 rounded-md text-sm ${
              errorType === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <div>{error}</div>
              {showResendVerification && errorType === 'error' && (
                <button
                  onClick={handleResendVerification}
                  className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 underline"
                  type="button"
                  disabled={isLoading}
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Name fields (hidden for login, shown for signup) */}
            {isSignup && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="John"
                    required={isSignup}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Doe"
                    required={isSignup}
                  />
                </div>
              </div>
            )}

            {/* Email */}
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
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (only shown during signup) */}
            {isSignup && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    required={isSignup}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me & Forgot password (login only) */}
            {!isSignup && (
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
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSignup ? 'Create Account' : 'Sign in with Email'}</span>
              {isLoading && <div className="loader ml-2"></div>}
            </button>
          </form>

          {/* Social Login Divider (login only) */}
          {!isSignup && (
            <div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or continue with</span>
                </div>
              </div>

              {/* Google Button Only */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </div>
          )}

          {/* Terms */}
          <p className="mt-4 text-center text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <a href="https://dottapps.com/terms" className="font-medium text-blue-600 hover:text-blue-800">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://dottapps.com/privacy" className="font-medium text-blue-600 hover:text-blue-800">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </>
  );
}