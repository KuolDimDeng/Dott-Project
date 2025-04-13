'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { Auth } from 'aws-amplify';
import { API } from 'aws-amplify';
import { getCognitoAuth } from '@/utils/cognito';
import { logInfo, logError, logDebug } from '@/utils/logger';

// Initialize global app cache for auth
if (typeof window !== 'undefined') {
  window.__APP_CACHE = window.__APP_CACHE || {};
  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
  window.__APP_CACHE.verification = window.__APP_CACHE.verification || {};
}

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined' && !window.__APP_CACHE) {
  window.__APP_CACHE = { auth: {}, user: {}, verification: {} };
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramEmail = searchParams.get('email');
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resendError, setResendError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Initialize app cache for auth if it doesn't exist
    if (!window.__APP_CACHE) {
      window.__APP_CACHE = {};
    }
    if (!window.__APP_CACHE.auth) {
      window.__APP_CACHE.auth = {};
    }

    // Get email from URL query params or app cache or sessionStorage
    const params = new URLSearchParams(window.location.search);
    const emailFromURL = params.get('email');

    if (emailFromURL) {
      setEmail(emailFromURL);
      // Store email in app cache
      window.__APP_CACHE.auth.verificationEmail = emailFromURL;
      // Fallback to sessionStorage for backward compatibility
      sessionStorage.setItem('verificationEmail', emailFromURL);
      console.log('Email from URL:', emailFromURL);
    } else {
      // Try to get email from app cache or sessionStorage
      const cachedEmail = window.__APP_CACHE.auth.verificationEmail || sessionStorage.getItem('verificationEmail');
      if (cachedEmail) {
        setEmail(cachedEmail);
        console.log('Email from cache:', cachedEmail);
      }
    }

    // Check if email is already verified from app cache
    const isEmailVerified = window.__APP_CACHE.auth.emailVerified === true;
    if (isEmailVerified) {
      setVerified(true);
    }
  }, []);

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    if (error) setError(null);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Please enter your email address.');
      setIsVerifying(false);
      return;
    }

    if (!code) {
      setError('Please enter your verification code.');
      setIsVerifying(false);
      return;
    }

    try {
      console.log('Verifying email:', email, 'with code:', code);
      
      // Initialize app cache if it doesn't exist
      if (!window.__APP_CACHE) {
        window.__APP_CACHE = {};
      }
      
      // Initialize auth section if it doesn't exist
      if (!window.__APP_CACHE.auth) {
        window.__APP_CACHE.auth = {};
      }

      // Check if the email is already verified in the app cache
      if (window.__APP_CACHE.auth.emailVerified && 
          window.__APP_CACHE.auth.verifiedEmail === email) {
        console.log('Email already verified according to app cache');
        setSuccessMessage('Your email has already been verified! You can now sign in.');
        setVerified(true);
        setIsVerifying(false);
        return;
      }

      // Attempt to verify the email with Cognito
      const cognitoAuth = getCognitoAuth();
      await cognitoAuth.confirmSignUp(email, code);
      
      console.log('Email verification successful');
      
      // Set verification status in app cache
      window.__APP_CACHE.auth.emailVerified = true;
      window.__APP_CACHE.auth.verifiedEmail = email;
      
      // Fallback to sessionStorage for compatibility
      try {
        sessionStorage.setItem('email_verified', 'true');
        sessionStorage.setItem('verified_email', email);
      } catch (storageError) {
        console.error('Error storing verification status in sessionStorage:', storageError);
      }
      
      setSuccessMessage('Your email has been verified successfully! You can now sign in.');
      setVerified(true);
      
    } catch (error) {
      console.error('Error verifying email:', error);
      
      if (error.code === 'CodeMismatchException') {
        setError('The verification code is incorrect. Please try again.');
      } else if (error.code === 'ExpiredCodeException') {
        setError('The verification code has expired. Please request a new code.');
      } else if (error.code === 'UserNotFoundException') {
        setError('This email address is not registered. Please sign up first.');
      } else if (error.message?.includes('verified')) {
        // Handle case where the email is already verified
        setSuccessMessage('Your email is already verified. You can sign in now!');
        setVerified(true);
        
        // Update verification status in app cache
        window.__APP_CACHE.auth.emailVerified = true;
        window.__APP_CACHE.auth.verifiedEmail = email;
        
        // Fallback to sessionStorage for compatibility
        try {
          sessionStorage.setItem('email_verified', 'true');
          sessionStorage.setItem('verified_email', email);
        } catch (storageError) {
          console.error('Error storing verification status in sessionStorage:', storageError);
        }
      } else {
        setError('Failed to verify your email. Please try again later.');
      }
    }
    
    setIsVerifying(false);
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(null);
    setError(null);
    setSuccessMessage(null);
    
    if (!email) {
      setResendError('Please enter your email address');
      setIsResending(false);
      return;
    }
    
    try {
      console.log('Resending verification code to:', email);
      
      // Initialize app cache if it doesn't exist
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
      }
      
      // Check if we've already sent a code recently
      const lastCodeSentTime = window.__APP_CACHE.auth.lastCodeSentTime || 0;
      const now = Date.now();
      
      if (lastCodeSentTime && (now - lastCodeSentTime < 60000)) {
        setResendError('Please wait at least 1 minute before requesting a new code.');
        setIsResending(false);
        return;
      }

      // Resend the verification code
      const cognitoAuth = getCognitoAuth();
      await cognitoAuth.resendSignUp(email);
      
      // Update app cache with code sent time
      window.__APP_CACHE.auth.lastCodeSentTime = now;
      window.__APP_CACHE.auth.pendingVerificationEmail = email;
        
      // Fallback to sessionStorage for compatibility
      try {
        sessionStorage.setItem('pending_verification_email', email);
        sessionStorage.setItem('last_code_sent_time', now.toString());
      } catch (storageError) {
        console.error('Error storing code sent status in sessionStorage:', storageError);
      }
        
      setResendSuccess('A new verification code has been sent to your email address.');
      setSuccessMessage('A new verification code has been sent to your email address.');
      
    } catch (error) {
      console.error('Error resending verification code:', error);
      
      if (error.code === 'UserNotFoundException') {
        setResendError('This email address is not registered. Please sign up first.');
      } else if (error.code === 'LimitExceededException') {
        setResendError('You have exceeded the limit for sending verification codes. Please try again later.');
      } else if (error.message?.includes('already confirmed')) {
        // Email is already verified
        setResendSuccess('Your email is already verified. You can sign in now!');
        setVerified(true);
        
        // Update verification status in app cache
        window.__APP_CACHE.auth.emailVerified = true;
        window.__APP_CACHE.auth.verifiedEmail = email;
        
        // Fallback to sessionStorage for compatibility
        try {
          sessionStorage.setItem('email_verified', 'true');
          sessionStorage.setItem('verified_email', email);
        } catch (storageError) {
          console.error('Error storing verification status in sessionStorage:', storageError);
        }
      } else {
        setResendError('Failed to resend verification code. Please try again later.');
      }
    }
    
    setIsResending(false);
  };

  return (
    <div>
      {/* Error messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" role="alert">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {resendError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" role="alert">
          <p className="text-red-700">{resendError}</p>
        </div>
      )}
      
      {/* Success messages */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}
      
      {resendSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <p className="text-green-700">{resendSuccess}</p>
        </div>
      )}
      
      <form onSubmit={handleVerify} className="space-y-6">
        {/* Email field */}
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
              onChange={handleEmailChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isVerifying || isResending}
            />
          </div>
        </div>
        
        {/* Verification code field */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <div className="mt-1">
            <input
              id="code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={handleCodeChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter 6-digit code"
              disabled={isVerifying || isResending}
            />
          </div>
        </div>
        
        {/* Verify button */}
        <div>
          <button
            type="submit"
            disabled={isVerifying || isResending}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isVerifying || isResending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </div>
        
        {/* Resend code button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || isVerifying}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
          >
            {isResending ? 'Sending...' : 'Didn\'t receive the code? Resend'}
          </button>
        </div>
        
        {/* Back to sign in */}
        <div className="text-sm text-center mt-4">
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            Back to Sign In
          </Link>
        </div>
      </form>
      
      {/* Development mode debug section */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 border-t pt-4">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Debug Tools</summary>
            <div className="mt-2 space-y-2 p-2 bg-gray-50 rounded">
              <button
                type="button"
                onClick={() => {
                  // Store verification data in app cache
                  if (!window.__APP_CACHE) window.__APP_CACHE = {};
                  if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
                  window.__APP_CACHE.auth.verifiedEmail = email;
                  window.__APP_CACHE.auth.justVerified = true;
                  window.__APP_CACHE.auth.emailVerified = true; 
                  window.__APP_CACHE.auth.emailVerifiedTimestamp = Date.now().toString();

                  // Also keep in sessionStorage as fallback
                  try {
                    sessionStorage.setItem('verifiedEmail', email);
                    sessionStorage.setItem('justVerified', 'true');
                    sessionStorage.setItem('emailVerified', 'true');
                    sessionStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
                  } catch (err) {
                    console.error('Failed to store verification data in sessionStorage:', err);
                  }
                  setSuccessMessage('Email verification bypassed! Redirecting to sign in...');
                  setTimeout(() => router.push('/auth/signin'), 1500);
                }}
                className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                Bypass Verification Process
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
} 