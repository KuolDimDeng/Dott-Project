'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

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

  useEffect(() => {
    // Try to get email from URL parameters, then localStorage, then empty string
    const storedEmail = localStorage.getItem('pyfactor_email');
    const emailToUse = paramEmail || storedEmail || '';
    
    if (emailToUse) {
      setEmail(emailToUse);
      logger.debug('[VerifyEmail] Email set from params or localStorage', { 
        source: paramEmail ? 'url' : 'localStorage',
        email: emailToUse 
      });
    }
  }, [paramEmail]);

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
      
      // Check if we already know the user is confirmed from localStorage
      const verifiedEmail = localStorage.getItem('verifiedEmail');
      if (verifiedEmail === email) {
        logger.debug('[VerifyEmail] Email already verified according to localStorage, skipping confirmSignUp');
        
        // Set verification flags
        localStorage.setItem('justVerified', 'true');
        localStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
        
        // Clean up verification data
        localStorage.removeItem('pyfactor_email');
        localStorage.removeItem('needs_verification');
        
        // Try to verify the email attribute directly
        try {
          const baseUrl = window.location.origin;
          logger.debug('[VerifyEmail] Ensuring email_verified attribute is set via admin API');
          
          const adminResponse = await fetch(`${baseUrl}/api/admin/verify-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
          });
          
          if (adminResponse.ok) {
            logger.debug('[VerifyEmail] Successfully marked email as verified via admin API');
          } else {
            logger.warn('[VerifyEmail] Failed to mark email as verified via admin API');
          }
        } catch (adminError) {
          logger.warn('[VerifyEmail] Error calling admin verify-email API', { 
            error: adminError.message 
          });
        }
        
        // Show success message
        setSuccessMessage('Email already verified! Redirecting to sign in page...');
        
        // Redirect to sign-in page
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
        
        return;
      }
      
      try {
        // Actually verify the email with Cognito
        const { isSignUpComplete, nextStep } = await confirmSignUp({
          username: email,
          confirmationCode: code
        });
        
        logger.debug('[VerifyEmail] Email verification result', { 
          isSignUpComplete, 
          nextStep: nextStep?.signUpStep 
        });
        
        if (isSignUpComplete) {
          // Set verification flags
          localStorage.setItem('verifiedEmail', email);
          localStorage.setItem('justVerified', 'true');
          localStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
          
          // Clean up verification data
          localStorage.removeItem('pyfactor_email');
          localStorage.removeItem('needs_verification');
          
          // Show success message
          setSuccessMessage('Email verified successfully! Redirecting to sign in page...');
          
          // Redirect to sign-in page
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1500);
        } else {
          throw new Error('Email verification failed. Please try again.');
        }
      } catch (verifyError) {
        // Special handling for already confirmed users
        if (verifyError.message?.includes('User cannot be confirmed') && verifyError.message?.includes('CONFIRMED')) {
          // User is already confirmed, this is actually a success case
          logger.info('[VerifyEmail] User is already confirmed, treating as success');
          
          // Try to verify the email through admin API since the user is already confirmed
          try {
            const baseUrl = window.location.origin;
            logger.debug('[VerifyEmail] Attempting to mark email as verified via admin API');
            
            const adminResponse = await fetch(`${baseUrl}/api/admin/verify-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ email })
            });
            
            if (adminResponse.ok) {
              logger.debug('[VerifyEmail] Successfully marked email as verified via admin API');
            } else {
              logger.warn('[VerifyEmail] Failed to mark email as verified via admin API');
            }
          } catch (adminError) {
            logger.warn('[VerifyEmail] Error calling admin verify-email API', { 
              error: adminError.message 
            });
          }
          
          // Set verification flags
          localStorage.setItem('verifiedEmail', email);
          localStorage.setItem('justVerified', 'true');
          localStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
          
          // Clean up verification data
          localStorage.removeItem('pyfactor_email');
          localStorage.removeItem('needs_verification');
          
          // Show success message
          setSuccessMessage('Account already verified! Redirecting to sign in page...');
          
          // Redirect to sign-in page
          setTimeout(() => {
            router.push('/auth/signin');
          }, 1500);
        } else {
          throw verifyError; // Re-throw for the outer catch block to handle
        }
      }
    } catch (error) {
      logger.error('[VerifyEmail] Verification error:', error);
      
      // Handle specific errors
      if (error.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please check your email for the correct code.');
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new code.');
      } else if (error.code === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
      } else if (error.message?.includes('network') || error.code === 'NetworkError') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'An error occurred during verification. Please try again.');
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
    
    try {
      logger.debug('[VerifyEmail] Resending verification code', { email });
      
      // Actually resend the code via Cognito
      const result = await resendSignUpCode({
        username: email
      });
      
      logger.debug('[VerifyEmail] Code resent successfully', { 
        destination: result.destination?.deliveryMedium,
        hasDestination: !!result.destination,
        rawResult: JSON.stringify(result)
      });
      
      // Try to backup confirm with admin API to ensure account exists
      try {
        const baseUrl = window.location.origin;
        logger.debug('[VerifyEmail] Attempting admin confirmation after resend', { email });
        
        const adminResponse = await fetch(`${baseUrl}/api/admin/confirm-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });
        
        if (adminResponse.ok) {
          logger.debug('[VerifyEmail] Admin confirmation successful after resend');
        } else {
          // Non-fatal error, we still sent the code
          logger.warn('[VerifyEmail] Admin confirmation failed after resend', { 
            status: adminResponse.status
          });
        }
      } catch (adminError) {
        // Ignore admin API errors - the code was still sent
        logger.warn('[VerifyEmail] Admin API error after resend', { 
          error: adminError.message 
        });
      }
      
      setSuccessMessage(`A new verification code has been sent to ${result.destination?.deliveryMedium === 'EMAIL' ? 'your email' : 'you'}`);
      
      // Store information that we sent a code
      try {
        localStorage.setItem('verificationCodeSent', 'true');
        localStorage.setItem('verificationCodeTimestamp', Date.now().toString());
        localStorage.setItem('pendingVerificationEmail', email);
      } catch (storageError) {
        logger.warn('[VerifyEmail] Failed to update localStorage', { 
          error: storageError.message 
        });
      }
      
      // Automatically clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      logger.error('[VerifyEmail] Error resending code:', { 
        message: error.message, 
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      
      // Handle specific errors
      if (error.code === 'LimitExceededException') {
        setError('Too many requests. Please try again later.');
      } else if (error.code === 'UserNotFoundException') {
        setError('We couldn\'t find an account with this email address.');
      } else if (error.message?.includes('network') || error.code === 'NetworkError') {
        setError('Network error. Please check your internet connection and try again.');
      } 
      // Special handling for already confirmed users
      else if (error.message?.includes('User is already confirmed')) {
        // User is already confirmed, treat as success
        logger.info('[VerifyEmail] User is already confirmed, redirecting to sign in');
        
        // Set verification flags
        localStorage.setItem('verifiedEmail', email);
        localStorage.setItem('justVerified', 'true');
        localStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
        
        // Clean up verification data
        localStorage.removeItem('pyfactor_email');
        localStorage.removeItem('needs_verification');
        
        // Show success message
        setSuccessMessage('Your account is already verified! Redirecting to sign in...');
        
        // Redirect to sign-in page after a short delay
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
        
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
    <div>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4" role="alert">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <p className="text-green-700">{successMessage}</p>
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
                  localStorage.setItem('verifiedEmail', email);
                  localStorage.setItem('justVerified', 'true');
                  localStorage.setItem('emailVerifiedTimestamp', Date.now().toString());
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