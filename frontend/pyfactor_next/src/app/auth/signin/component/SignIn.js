import appCache from '../utils/appCache';

"use client";

import React, { useState } from 'react';
import { appCache } from '../utils/appCache';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { appCache } from '../utils/appCache';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { appCache } from '../utils/appCache';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { appCache } from '../utils/appCache';
import { signIn } from '@/utils/auth';
import logger from '@/utils/logger';

// Initialize global app cache
if (typeof window !== 'undefined') {
  appCache.getAll() = appCache.getAll() || {};
  appCache.getAll().auth = appCache.getAll().auth || {};
}

const REDIRECT_DELAY = 1500; // milliseconds to wait before redirecting

const SignIn = ({ defaultEmail = '', defaultPassword = '', onSuccess, redirectUrl }) => {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    logger.debug('[SignIn] Form submission started');
    
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      logger.debug('[SignIn] Attempting sign in with email:', email);
      
      const result = await signIn(email, password);
      
      logger.debug('[SignIn] Sign in result:', {
        success: result.success,
        nextStep: result.nextStep,
        isComplete: result.isComplete,
        userId: result.userId
      });
      
      // Check if sign in is complete
      if (result.success && result.isComplete) {
        logger.debug('[SignIn] Sign in successful, redirecting...');
        setSuccess('Sign in successful! Redirecting...');
        
        // Import the redirect utility
        const { redirectToDashboard } = await import('@/utils/redirectUtils');
        
        // If we have user info from the sign in result, use it to determine where to redirect
        if (result.userInfo) {
          const { onboardingStatus, setupDone, tenantId } = result.userInfo;
          
          logger.debug('[SignIn] User info available:', { 
            onboardingStatus, 
            setupDone,
            tenantId 
          });
          
          setTimeout(() => {
            // Redirect based on onboarding status
            if (onboardingStatus === 'not_started') {
              router.push('/onboarding/business-info');
            } else if (onboardingStatus === 'COMPLETED' && setupDone === 'TRUE') {
              // Use the tenant-specific redirect with any tenant ID from user info
              redirectToDashboard(router, { 
                tenantId: tenantId,
                source: 'signin-completion'
              });
            } else {
              // Use the tenant-specific redirect
              redirectToDashboard(router, { 
                source: 'signin-fallback'
              });
            }
          }, REDIRECT_DELAY);
        } else {
          // Default redirect if no user info
          setTimeout(() => {
            redirectToDashboard(router, { 
              source: 'signin-default'
            });
          }, REDIRECT_DELAY);
        }
      } else if (result.nextStep === 'CONFIRM_SIGN_UP') {
        // User needs to verify their email - redirect to verification page
        logger.debug('[SignIn] User needs to verify email, redirecting to verification page');
        setError('Please verify your email before signing in.');
        
        // Store email in app cache
        if (typeof window !== 'undefined') {
          appCache.set('auth.verificationEmail', email);
          appCache.set('auth.needsVerification', true);
          
          // Fallback to sessionStorage for backward compatibility
          try {
            sessionStorage.setItem('verificationEmail', email);
            sessionStorage.setItem('needs_verification', 'true');
          } catch (storageError) {
            logger.error('[SignIn] Failed to store verification data in sessionStorage:', storageError);
          }
        }
        
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }, REDIRECT_DELAY);
      } else {
        // Handle other authentication challenges
        setError('Unable to sign in. Please check your credentials.');
        logger.error('[SignIn] Authentication challenge:', result.nextStep);
      }
    } catch (error) {
      logger.error('[SignIn] Sign in error:', { 
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      // Handle common error cases with user-friendly messages
      if (error.code === 'UserNotConfirmedException') {
        logger.debug('[SignIn] User not confirmed, redirecting to verification page');
        setError('Your account needs verification. Redirecting to verification page...');
        
        // Store email in app cache
        if (typeof window !== 'undefined') {
          appCache.set('auth.verificationEmail', email);
          appCache.set('auth.needsVerification', true);
          
          // Fallback to sessionStorage for backward compatibility
          try {
            sessionStorage.setItem('verificationEmail', email);
            sessionStorage.setItem('needs_verification', 'true');
          } catch (storageError) {
            logger.error('[SignIn] Failed to store verification data in sessionStorage:', storageError);
          }
        }
        
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }, REDIRECT_DELAY);
      } else if (error.code === 'NotAuthorizedException') {
        if (error.message.includes('disabled')) {
          setError('Your account has been disabled. Please contact support.');
        } else {
          setError('Incorrect username or password. Please try again.');
        }
      } else if (error.code === 'UserNotFoundException') {
        setError('We couldn\'t find an account with this email address.');
      } else if (error.message && error.message.includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'An error occurred during sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Render your form here */}
    </div>
  );
};

export default SignIn; 