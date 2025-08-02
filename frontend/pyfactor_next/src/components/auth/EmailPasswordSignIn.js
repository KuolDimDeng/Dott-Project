'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import Script from 'next/script';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';
import { secureLogin } from '@/utils/secureAuth';
import { securityLogger } from '@/utils/securityLogger';
import { anomalyDetector } from '@/utils/anomalyDetection';
import { usePostHog } from 'posthog-js/react';
import { trackEvent, EVENTS } from '@/utils/posthogTracking';
import { useSession } from '@/hooks/useSession-v2';
import PageTitle from '@/components/PageTitle';

export default function EmailPasswordSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { t, i18n } = useTranslation('auth');
  const { session, loading: sessionLoading, isAuthenticated } = useSession();
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

  console.log('🔍 [EmailPasswordSignIn] Component loaded at:', new Date().toISOString());
  console.log('🔍 [EmailPasswordSignIn] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  console.log('🔍 [EmailPasswordSignIn] Search params:', searchParams.toString());
  console.log('🔍 [EmailPasswordSignIn] Session check:', {
    sessionLoading,
    isAuthenticated,
    hasSession: !!session,
    userEmail: session?.user?.email,
    needsOnboarding: session?.user?.needsOnboarding,
    tenantId: session?.user?.tenantId
  });

  // Check if user is already authenticated and redirect
  useEffect(() => {
    console.log('🔍 [EmailPasswordSignIn] Auth check effect triggered:', {
      sessionLoading,
      isAuthenticated,
      hasSession: !!session,
      userEmail: session?.user?.email,
      needsOnboarding: session?.user?.needsOnboarding,
      tenantId: session?.user?.tenantId
    });
    
    if (!sessionLoading && isAuthenticated && session?.user) {
      console.log('🔍 [EmailPasswordSignIn] User already authenticated, redirecting...');
      
      // Determine redirect URL based on onboarding status
      let redirectUrl;
      if (session.user.needsOnboarding) {
        redirectUrl = '/onboarding';
        console.log('🔍 [EmailPasswordSignIn] User needs onboarding, redirecting to:', redirectUrl);
      } else if (session.user.tenantId) {
        redirectUrl = `/${session.user.tenantId}/dashboard`;
        console.log('🔍 [EmailPasswordSignIn] User has tenant, redirecting to:', redirectUrl);
      } else {
        redirectUrl = '/dashboard';
        console.log('🔍 [EmailPasswordSignIn] User authenticated, redirecting to default dashboard:', redirectUrl);
      }
      
      console.log('🔍 [EmailPasswordSignIn] Performing redirect to:', redirectUrl);
      router.push(redirectUrl);
      return;
    }
  }, [sessionLoading, isAuthenticated, session, router]);

  // Handle language parameter from URL
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && i18n.language !== langParam) {
      console.log('🌍 [EmailPasswordSignIn] Setting language from URL:', langParam);
      i18n.changeLanguage(langParam);
    }
  }, [searchParams, i18n]);

  // Check for error from URL params (e.g., from Google OAuth)
  useEffect(() => {
    // Set initial page title based on mode
    // Title is now handled by PageTitle component
    
    const errorParam = searchParams.get('error');
    const emailParam = searchParams.get('email');
    const reasonParam = searchParams.get('reason');
    
    // Check for timeout reason
    if (reasonParam === 'timeout') {
      setError('Your session expired due to inactivity. Please sign in again.');
      setErrorType('error');
    }
    
    if (errorParam === 'email_not_verified' && emailParam) {
      setError(t('signin.errors.emailNotVerified'));
      setShowResendVerification(true);
      setFormData(prev => ({ ...prev, email: emailParam }));
    } else if (errorParam === 'backend_unavailable') {
      setError(t('signin.errors.backendUnavailable'));
      setErrorType('error');
    } else if (errorParam === 'session_creation_failed') {
      setError(t('signin.errors.sessionCreationFailed'));
      setErrorType('error');
    } else if (errorParam === 'invalid_session') {
      setError(t('signin.errors.sessionExpired'));
      setErrorType('error');
    } else if (errorParam === 'token_exchange_failed') {
      setError(t('signin.errors.tokenExchangeFailed'));
      setErrorType('error');
    } else if (errorParam === 'oauth_configuration_error') {
      setError(t('signin.errors.oauthConfigurationError'));
      setErrorType('error');
    }
  }, [searchParams, t]);

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
    // Title is now handled by PageTitle component
    
    // Preserve language parameter in URL
    const langParam = searchParams.get('lang');
    if (langParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('lang', langParam);
      window.history.replaceState({}, '', newUrl.toString());
    }
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
    console.log('🔄 [GoogleOAuth] ========== STEP 1: USER CLICKED GOOGLE SIGN-IN ==========');
    console.log('🔄 [GoogleOAuth] Timestamp:', new Date().toISOString());
    console.log('🔄 [GoogleOAuth] Current URL:', window.location.href);
    console.log('🔄 [GoogleOAuth] User Agent:', navigator.userAgent);
    console.log('🔄 [GoogleOAuth] Session Storage:', {
      hasSession: !!sessionStorage.getItem('dott_session'),
      hasAuth0: !!sessionStorage.getItem('auth0_session')
    });
    console.log('🔄 [GoogleOAuth] Cookies:', document.cookie);
    
    // Track the OAuth attempt
    trackEvent(posthog, EVENTS.OAUTH_STARTED, { 
      provider: 'google',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // Preserve language parameter in OAuth flow
    let oauthUrl = '/api/auth/login?connection=google-oauth2';
    const langParam = searchParams.get('lang');
    if (langParam) {
      console.log('🌐 [GoogleOAuth] Storing language for OAuth:', langParam);
      // Store language in sessionStorage to retrieve after OAuth callback
      sessionStorage.setItem('oauth_language', langParam);
      // Also store in localStorage as backup
      localStorage.setItem('preferredLanguage', langParam);
      oauthUrl += `&ui_locales=${langParam}`;
    } else {
      // If no URL param, check if we have a stored preference
      const storedLang = localStorage.getItem('preferredLanguage') || localStorage.getItem('i18nextLng');
      if (storedLang) {
        console.log('🌐 [GoogleOAuth] Using stored language for OAuth:', storedLang);
        sessionStorage.setItem('oauth_language', storedLang);
        oauthUrl += `&ui_locales=${storedLang}`;
      }
    }
    
    console.log('🔄 [GoogleOAuth] ========== STEP 2: REDIRECTING TO /api/auth/login ==========');
    console.log('🔄 [GoogleOAuth] OAuth URL:', oauthUrl);
    console.log('🔄 [GoogleOAuth] Expected flow:');
    console.log('🔄 [GoogleOAuth]   1. /api/auth/login - Sets PKCE verifier cookie');
    console.log('🔄 [GoogleOAuth]   2. Auth0 redirect with PKCE challenge');
    console.log('🔄 [GoogleOAuth]   3. Google OAuth consent');
    console.log('🔄 [GoogleOAuth]   4. Auth0 callback → /auth/oauth-callback');
    console.log('🔄 [GoogleOAuth]   5. Token exchange with PKCE verifier');
    console.log('🔄 [GoogleOAuth] ========== END STEP 2 ==========');
    
    // Redirect to Auth0 login with Google connection
    window.location.href = oauthUrl;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      showError(t('signin.errors.enterEmailFirst'));
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
        showError(t('signin.errors.passwordResetSent'));
      } else {
        showError(t('signin.errors.passwordResetError'));
      }
    } catch (error) {
      showError(t('signin.errors.passwordResetError'));
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      showError(t('signup.verificationEmail.emailRequired'));
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
        showError(t('signup.verificationEmail.sent'), 'success');
        setShowResendVerification(false);
      } else {
        showError(t('signup.verificationEmail.error'));
      }
    } catch (error) {
      showError(t('signup.verificationEmail.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    const { email, password, confirmPassword, firstName, lastName } = formData;

    // Track sign up started
    trackEvent(posthog, EVENTS.SIGN_UP_STARTED, { email });

    if (!firstName || !lastName) {
      showError(!firstName ? t('signup.errors.firstNameRequired') : t('signup.errors.lastNameRequired'));
      return;
    }

    if (password !== confirmPassword) {
      showError(t('signup.errors.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      showError(t('signup.errors.passwordTooShort'));
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

      // Track sign up completed
      trackEvent(posthog, EVENTS.SIGN_UP_COMPLETED, { email });

      // Show success message and redirect to login
      setIsLoading(false);
      showError(t('signup.errors.accountCreated'), 'success');
      
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

    console.log('[EmailPasswordSignIn] handleLogin called with email:', email);
    console.log('[EmailPasswordSignIn] Password length:', password?.length);

    // Track sign in started
    trackEvent(posthog, EVENTS.SIGN_IN_STARTED, { email });

    try {
      console.log('[EmailPasswordSignIn] Attempting login via /api/auth/consolidated-login');
      
      // Use consolidated login endpoint for atomic operation with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for login
      
      const loginResponse = await fetch('/api/auth/consolidated-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password
        }),
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      console.log('[EmailPasswordSignIn] Login response status:', loginResponse.status);
      console.log('[EmailPasswordSignIn] Login response headers:', loginResponse.headers);

      const loginResult = await loginResponse.json();
      console.log('[EmailPasswordSignIn] Login result:', loginResult);
      console.log('[EmailPasswordSignIn] Login result details:', {
        success: loginResult.success,
        hasSessionToken: !!loginResult.sessionToken,
        hasSession_token: !!loginResult.session_token,
        useSessionBridge: loginResult.useSessionBridge,
        user: loginResult.user ? { email: loginResult.user.email, id: loginResult.user.id } : null,
        tenant: loginResult.tenant ? { id: loginResult.tenant.id, name: loginResult.tenant.name } : null,
        needs_onboarding: loginResult.needs_onboarding
      });

      if (!loginResponse.ok) {
        // Handle rate limiting (429 status)
        if (loginResponse.status === 429) {
          const retryAfter = loginResult.retryAfter || 900; // Default to 15 minutes
          const minutes = Math.ceil(retryAfter / 60);
          showError(`Too many login attempts. Please try again in ${minutes} minutes. This is a security measure to protect your account.`);
          return;
        }
        
        // Get client IP and user agent for anomaly detection
        const userAgent = navigator.userAgent;
        const ip = 'client'; // In production, get from header
        
        // Check for anomalies in failed login
        const anomalies = await anomalyDetector.checkLoginAttempt(email, ip, userAgent, false);
        
        // Log failed login attempt
        await securityLogger.loginFailed(email, loginResult.error || 'Authentication failed', 'email-password');
        
        // If high-risk anomalies detected, show additional security message
        if (anomalies.some(a => a.severity === 'high')) {
          showError('Multiple failed login attempts detected. Your account may be temporarily locked for security.');
          return;
        }
        
        // Check for backend unavailable errors
        if (loginResult.error === 'Backend unavailable' || 
            loginResult.error === 'Service temporarily unavailable' ||
            (loginResult.details && loginResult.details.includes('Connection failed'))) {
          // Log the technical details to help diagnose
          console.error('[EmailPasswordSignIn] Backend unavailable details:', loginResult.technicalDetails);
          
          // Check if it's the Cloudflare DNS error
          if (loginResult.technicalDetails && 
              (loginResult.technicalDetails.errorType === 'CLOUDFLARE_ERROR_1000' ||
               loginResult.technicalDetails.originalError === 'DNS points to prohibited IP')) {
            showError('DNS configuration error. The API is pointing to an invalid address. Please contact support.');
          } else {
            showError('Unable to connect to the server. Please try again in a few moments.');
          }
          return;
        }
        
        // Check if we need to fallback to Universal Login
        if (loginResult.requiresUniversalLogin) {
          logger.info('[EmailPasswordSignIn] Password grant not enabled, redirecting to Universal Login');
          // Redirect to standard Auth0 login
          window.location.href = '/api/auth/login';
          return;
        }
        
        // Check for email verification error
        if ((loginResult.error === 'invalid_grant' || loginResult.error === 'email_not_verified') && 
            (loginResult.message?.includes('email') || loginResult.message?.includes('verify'))) {
          setShowResendVerification(true);
          showError('Please verify your email address before signing in. Check your inbox for the verification email.');
          setIsLoading(false);
          return;
        }
        
        // Check if error description mentions email verification
        if (loginResult.message?.toLowerCase().includes('verify') || 
            loginResult.message?.toLowerCase().includes('verification')) {
          setShowResendVerification(true);
          showError('Please verify your email address before signing in. Check your inbox for the verification email.');
          setIsLoading(false);
          return;
        }
        
        // Display the actual error message from Auth0
        // This will show messages like "Wrong email or password" instead of generic errors
        showError(loginResult.message || loginResult.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      // Login was successful and session was created atomically
      logger.info('[EmailPasswordSignIn] Login successful:', {
        success: loginResult.success,
        hasUser: !!loginResult.user,
        hasTenant: !!loginResult.tenant,
        needsOnboarding: loginResult.needs_onboarding,
        sessionToken: loginResult.session_token
      });
      
      // With consolidated auth, we have all the data we need
      // No need for separate auth flow handler
      const finalUserData = {
        ...loginResult.user,
        tenant_id: loginResult.tenant_id || loginResult.tenant?.id,
        tenantId: loginResult.tenant_id || loginResult.tenant?.id,
        needsOnboarding: loginResult.needs_onboarding,
        businessName: loginResult.tenant?.name,
        subscription_plan: loginResult.tenant?.subscription_plan || loginResult.user?.subscription_plan
      };

      // Determine redirect URL based on onboarding status
      let redirectUrl;
      if (loginResult.needs_onboarding) {
        redirectUrl = '/onboarding';
      } else if (loginResult.tenant?.id) {
        redirectUrl = `/${loginResult.tenant.id}/dashboard`;
      } else {
        redirectUrl = '/dashboard';
      }

      // If session was created successfully, use secure bridge
      if (loginResult.success && loginResult.useSessionBridge) {
        logger.info('[EmailPasswordSignIn] Session created successfully, using session bridge');
        console.log('🔍 [EmailPasswordSignIn] ===== SESSION BRIDGE FLOW START =====');
        console.log('🔍 [EmailPasswordSignIn] Session token:', loginResult.sessionToken || loginResult.session_token ? 'Present' : 'MISSING');
        console.log('🔍 [EmailPasswordSignIn] Token length:', (loginResult.sessionToken || loginResult.session_token)?.length);
        
        // CRITICAL DEBUG: Log the exact token we're about to store
        const tokenToStore = loginResult.sessionToken || loginResult.session_token;
        console.log('🔴 [EmailPasswordSignIn] CRITICAL: Token to store:', tokenToStore);
        console.log('🔴 [EmailPasswordSignIn] Token first 20 chars:', tokenToStore?.substring(0, 20));
        console.log('🔴 [EmailPasswordSignIn] Token last 20 chars:', tokenToStore?.substring(tokenToStore.length - 20));
        console.log('🔴 [EmailPasswordSignIn] Full loginResult:', JSON.stringify(loginResult, null, 2));
        
        // Store session data in sessionStorage for the bridge
        const bridgeData = {
          token: tokenToStore,
          redirectUrl: redirectUrl,
          timestamp: Date.now(),
          email: loginResult.user?.email,
          tenantId: loginResult.tenant?.id || loginResult.tenant_id
        };
        
        console.log('🔍 [EmailPasswordSignIn] Bridge data to store:', {
          hasToken: !!bridgeData.token,
          tokenLength: bridgeData.token?.length,
          redirectUrl: bridgeData.redirectUrl,
          email: bridgeData.email,
          tenantId: bridgeData.tenantId
        });
        console.log('🔍 [EmailPasswordSignIn] Storing bridge data in sessionStorage');
        sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
        
        // Verify it was stored
        const storedData = sessionStorage.getItem('session_bridge');
        console.log('🔍 [EmailPasswordSignIn] Verification - bridge data stored:', !!storedData);
        console.log('🔍 [EmailPasswordSignIn] ===== SESSION BRIDGE FLOW END =====')
        
        // Identify user in PostHog with complete data
        if (posthog) {
          const { identifyUser } = await import('@/lib/posthog');
          const userDataForPostHog = {
            ...loginResult.user,
            ...finalUserData,
            tenant_id: finalUserData?.tenantId || finalUserData?.tenant_id || loginResult.tenant?.id,
            business_name: loginResult.tenant?.name || finalUserData?.businessName,
            subscription_plan: loginResult.tenant?.subscription_plan || finalUserData?.subscription_plan,
            role: finalUserData?.role || loginResult.user?.role || 'USER'
          };
          identifyUser(userDataForPostHog);
        }
        
        // Track sign in completed
        trackEvent(posthog, EVENTS.SIGN_IN_COMPLETED, { 
          email,
          userId: loginResult.user?.sub,
          method: 'email-password'
        });
        
        // Redirect to session bridge page
        console.log('🚀 [EmailPasswordSignIn] Redirecting to session bridge...');
        console.log('🚀 [EmailPasswordSignIn] Expected flow:');
        console.log('🚀 [EmailPasswordSignIn]   1. Navigate to /auth/session-bridge');
        console.log('🚀 [EmailPasswordSignIn]   2. Bridge reads token from sessionStorage');
        console.log('🚀 [EmailPasswordSignIn]   3. Bridge calls /api/auth/establish-session-ajax');
        console.log('🚀 [EmailPasswordSignIn]   4. API sets httpOnly cookies');
        console.log('🚀 [EmailPasswordSignIn]   5. Bridge redirects to:', redirectUrl);
        router.push('/auth/session-bridge');
        return;
      } else if (loginResult.success) {
        logger.info('[EmailPasswordSignIn] Session created successfully (no bridge)');
        
        // Get client IP and user agent for anomaly detection
        const userAgent = navigator.userAgent;
        const ip = 'client'; // In production, get from header
        
        // Check for anomalies in successful login
        await anomalyDetector.checkLoginAttempt(email, ip, userAgent, true);
        
        // Log successful login
        await securityLogger.loginSuccess(
          loginResult.user?.sub,
          email,
          'email-password'
        );
        
        // Build redirect URL based on onboarding status
        let redirectUrl;
        if (loginResult.needs_onboarding) {
          redirectUrl = '/onboarding';
        } else if (loginResult.tenant?.id) {
          redirectUrl = `/${loginResult.tenant.id}/dashboard`;
        } else {
          redirectUrl = '/dashboard';
        }
        
        console.log('[EmailPasswordSignIn] Determined redirect URL:', {
          redirectUrl,
          needsOnboarding: loginResult.needs_onboarding,
          tenantId: loginResult.tenant?.id
        });
        
        // Session is already created by consolidated auth, just redirect
        logger.info('[EmailPasswordSignIn] Redirecting to:', redirectUrl);
        console.log('[EmailPasswordSignIn] About to call router.push with:', redirectUrl);
        
        // Simple direct navigation - session cookies are already set by backend
        try {
          await router.push(redirectUrl);
          console.log('[EmailPasswordSignIn] Router.push completed successfully');
        } catch (routerError) {
          console.error('[EmailPasswordSignIn] Router.push failed:', routerError);
          // Fallback to window.location
          window.location.href = redirectUrl;
        }
        return;
      }
      
      // If we get here, login failed
      showError(t('signin.errors.genericError'));
      setIsLoading(false);
    } catch (error) {
      logger.error('[EmailPasswordSignIn] Login error:', error);
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        showError('The request timed out. Please check your internet connection and try again.');
      } else if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
        showError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        showError(error.message || t('signin.errors.invalidCredentials'));
      }
      
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[EmailPasswordSignIn] Form submitted, isSignup:', isSignup);
    console.log('[EmailPasswordSignIn] Form data:', { 
      email: formData.email, 
      hasPassword: !!formData.password,
      passwordLength: formData.password?.length 
    });
    
    setIsLoading(true);
    setError('');

    if (isSignup) {
      console.log('[EmailPasswordSignIn] Calling handleSignup');
      await handleSignup();
    } else {
      console.log('[EmailPasswordSignIn] Calling handleLogin');
      await handleLogin();
    }
  };

  // Show loading spinner while checking session
  if (sessionLoading) {
    console.log('🔍 [EmailPasswordSignIn] Showing session loading state');
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-center">
            <img 
              className="mx-auto h-20 w-auto" 
              src="https://dottapps.com/static/images/PyfactorLandingpage.png" 
              alt="Dott" 
            />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">{t('oauth.processing')}</h2>
            <div className="mt-4 flex justify-center">
              <div className="loader"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle />
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
              {isSignup ? t('signup.title') : t('signin.title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isSignup ? (
                <>
                  {t('signup.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t('signup.signinLink')}
                  </button>
                </>
              ) : (
                <>
                  {t('signin.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t('signin.signupLink')}
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
                  {t('signup.verificationEmail.resendButton')}
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
                    {t('signup.firstNameLabel')}
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
                    {t('signup.lastNameLabel')}
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
                {t(isSignup ? 'signup.emailLabel' : 'signin.emailLabel')}
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
                {t(isSignup ? 'signup.passwordLabel' : 'signin.passwordLabel')}
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
                  {t('signup.confirmPasswordLabel')}
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
                    {t('signin.rememberMe')}
                  </label>
                </div>
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {t('signin.forgotPassword')}
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
              <span>{isSignup ? t('signup.signupButton') : t('signin.signinButton')}</span>
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
                  <span className="px-2 bg-white text-gray-500">{t('signin.orContinueWith')}</span>
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
                  {t('signin.googleSignin')}
                </button>
              </div>
            </div>
          )}

          {/* Terms */}
          <p className="mt-4 text-center text-sm text-gray-600">
            {isSignup ? t('signup.termsText') : t('signin.termsText', { defaultValue: 'By signing in, you agree to our' })}{' '}
            <a href="https://dottapps.com/terms" className="font-medium text-blue-600 hover:text-blue-800">
              {t('signup.termsLink')}
            </a>{' '}
            {t('signup.andText')}{' '}
            <a href="https://dottapps.com/privacy" className="font-medium text-blue-600 hover:text-blue-800">
              {t('signup.privacyLink')}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}