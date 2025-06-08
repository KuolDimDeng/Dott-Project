'use client';


import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue, removeCacheValue } from '@/utils/appCache';

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
  const [resendSuccess, setResendSuccess] = useState(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [secondsToRedirect, setSecondsToRedirect] = useState(3);

  useEffect(() => {
    // Try to get email from URL parameters, then AppCache
    const cachedEmail = getCacheValue('auth_email');
    const emailToUse = paramEmail || cachedEmail || '';
    
    if (emailToUse) {
      setEmail(emailToUse);
      logger.debug('[VerifyEmail] Email set from params or AppCache', { 
        source: paramEmail ? 'url' : 'AppCache',
        email: emailToUse 
      });
    }
  }, [paramEmail]);

  // Handle redirect countdown after successful verification
  useEffect(() => {
    if (verificationComplete && secondsToRedirect > 0) {
      const countdownInterval = setInterval(() => {
        setSecondsToRedirect(prev => prev - 1);
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    } else if (verificationComplete && secondsToRedirect === 0) {
      router.push('/auth/signin');
    }
  }, [verificationComplete, secondsToRedirect, router]);

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    if (error) setError(null);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email) {
      setError('Email address is required');
      return;
    }
    
    if (!code || code.length < 6) {
      setError('Please enter a valid verification code');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      logger.debug('[VerifyEmail] Attempting to verify email', { email, codeLength: code.length });
      
      // Check if we already know the user is confirmed from AppCache
      const verifiedEmail = getCacheValue('auth_verified_email');
      if (verifiedEmail === email) {
        logger.debug('[VerifyEmail] Email already verified according to AppCache');
        
        // Set verification flags in AppCache
        setCacheValue('auth_just_verified', 'true');
        setCacheValue('auth_email_verified_timestamp', Date.now());
        
        // Clean up verification data
        removeCacheValue('auth_email');
        removeCacheValue('auth_needs_verification');
        
        // Show success message
        setSuccessMessage('Email already verified! Redirecting to sign in page...');
        setVerificationComplete(true);
        return;
      }
      
      try {
        // Verify the email with Cognito
        const { isSignUpComplete, nextStep } = await confirmSignUp({
          username: email,
          confirmationCode: code
        });
        
        logger.debug('[VerifyEmail] Email verification result', { 
          isSignUpComplete, 
          nextStep: nextStep?.signUpStep 
        });
        
        if (isSignUpComplete) {
          // Set verification flags in AppCache
          setCacheValue('auth_verified_email', email);
          setCacheValue('auth_just_verified', 'true');
          setCacheValue('auth_email_verified_timestamp', Date.now());
          
          // Clean up verification data
          removeCacheValue('auth_email');
          removeCacheValue('auth_needs_verification');
          
          // Show success message
          setSuccessMessage('Email verified successfully! Redirecting to sign in page...');
          setVerificationComplete(true);
        } else {
          throw new Error('Email verification failed. Please try again.');
        }
      } catch (verifyError) {
        // Special handling for already confirmed users
        if (verifyError.message?.includes('User cannot be confirmed') && verifyError.message?.includes('CONFIRMED')) {
          // User is already confirmed, this is actually a success case
          logger.info('[VerifyEmail] User is already confirmed, treating as success');
          
          // Set verification flags in AppCache
          setCacheValue('auth_verified_email', email);
          setCacheValue('auth_just_verified', 'true');
          setCacheValue('auth_email_verified_timestamp', Date.now());
          
          // Clean up verification data
          removeCacheValue('auth_email');
          removeCacheValue('auth_needs_verification');
          
          // Show success message
          setSuccessMessage('Account already verified! Redirecting to sign in page...');
          setVerificationComplete(true);
          return;
        }
        
        // Log and re-throw for normal error handling
        logger.error('[VerifyEmail] Error verifying email:', verifyError);
        throw verifyError;
      }
    } catch (error) {
      logger.error('[VerifyEmail] Verification error:', error);
      
      // Handle different error types
      if (error.name === 'CodeMismatchException') {
        setError('The verification code is incorrect. Please try again.');
      } else if (error.name === 'ExpiredCodeException') {
        setError('The verification code has expired. Please request a new code.');
      } else if (error.name === 'UserNotFoundException') {
        setError('We couldn\'t find an account with this email address.');
      } else if (error.message?.includes('network') || error.name === 'NetworkError') {
        setError('Network error. Please check your internet connection and try again.');
      } 
      // Special handling for already confirmed users
      else if (error.message?.includes('User is already confirmed')) {
        // User is already confirmed, treat as success
        logger.info('[VerifyEmail] User is already confirmed, redirecting to sign in');
        
        // Set verification flags in AppCache
        setCacheValue('auth_verified_email', email);
        setCacheValue('auth_just_verified', 'true');
        setCacheValue('auth_email_verified_timestamp', Date.now());
        
        // Clean up verification data
        removeCacheValue('auth_email');
        removeCacheValue('auth_needs_verification');
        
        // Show success message
        setSuccessMessage('Your account is already verified! Redirecting to sign in...');
        setVerificationComplete(true);
        
        // Don't show error for this case
        return;
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address to receive a new code');
      return;
    }
    
    setIsResending(true);
    setError(null);
    setResendSuccess(null);
    
    try {
      logger.debug('[VerifyEmail] Resending verification code', { email });
      
      // Resend the code via Cognito
      const result = await resendSignUpCode({
        username: email
      });
      
      logger.debug('[VerifyEmail] Code resent successfully', { 
        destination: result.destination?.deliveryMedium
      });
      
      // Show success message
      setResendSuccess(`A new verification code has been sent to your email`);
    } catch (error) {
      logger.error('[VerifyEmail] Error resending code:', error);
      
      // Handle different error types
      if (error.name === 'LimitExceededException') {
        setError('You\'ve requested too many codes. Please wait a few minutes and try again.');
      } else if (error.name === 'UserNotFoundException') {
        setError('We couldn\'t find an account with this email address.');
      } else if (error.message?.includes('network') || error.name === 'NetworkError') {
        setError('Network error. Please check your internet connection and try again.');
      } 
      // Special handling for already confirmed users
      else if (error.message?.includes('User is already confirmed')) {
        // User is already confirmed, treat as success
        logger.info('[VerifyEmail] User is already confirmed, redirecting to sign in');
        
        // Set verification flags
        setCacheValue('auth_verified_email', email);
        setCacheValue('auth_just_verified', 'true');
        setCacheValue('auth_email_verified_timestamp', Date.now());
        
        // Clean up verification data
        removeCacheValue('auth_email');
        removeCacheValue('auth_needs_verification');
        
        // Show success message
        setSuccessMessage('Your account is already verified! Redirecting to sign in...');
        setVerificationComplete(true);
        
        // Don't show error for this case
        return;
      } else {
        setError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Verify Your Email</h2>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md" role="alert">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md">
            <p className="text-green-700">{successMessage}</p>
            {verificationComplete && (
              <p className="text-green-700 mt-2">Redirecting in {secondsToRedirect} seconds...</p>
            )}
          </div>
        )}
        
        {/* Resend success message */}
        {resendSuccess && !successMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
            <p className="text-blue-700">{resendSuccess}</p>
          </div>
        )}
        
        {!verificationComplete && (
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                  disabled={isVerifying || isResending || verificationComplete}
                  placeholder="your@email.com"
                />
              </div>
            </div>
            
            {/* Verification code field */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1 relative">
                <input
                  id="code"
                  name="code"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={handleCodeChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Enter 6-digit code"
                  disabled={isVerifying || isResending || verificationComplete}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code sent to your email
              </p>
            </div>
            
            {/* Verify button */}
            <div>
              <button
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                  ${isVerifying 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  } transition-colors duration-150`}
                disabled={isVerifying || isResending || verificationComplete}
              >
                {isVerifying ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </div>
                ) : 'Verify Email'}
              </button>
            </div>
            
            {/* Resend code */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResendCode}
                className={`text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none ${isResending || verificationComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isResending || verificationComplete}
              >
                {isResending ? 'Sending...' : 'Resend verification code'}
              </button>
              
              <Link 
                href="/auth/signin" 
                className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors duration-150"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 