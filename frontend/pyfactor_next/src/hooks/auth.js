'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast/ToastProvider';
import { logger } from '@/utils/logger';
import { getCognitoErrorMessage } from '@/config/amplify';
import {
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signOut,
  updateUserAttributes,
  signInWithRedirect,
} from 'aws-amplify/auth';

export function useAuth() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(async ({ username, password }) => {  // Changed to accept object
    setIsLoading(true);
    try {
      const signInResponse = await signIn({ username, password });
      logger.debug('Auth hook sign in response:', signInResponse);
      
      if (signInResponse?.isSignedIn) {
        const { getCurrentUser } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        const onboardingStatus = user?.attributes?.['custom:onboarding'];
        
        if (onboardingStatus === 'complete') {
          toast.success('Signed in successfully');
          router.replace('/dashboard');
        } else {
          router.replace(`/onboarding/${onboardingStatus || 'business-info'}`);
        }
      }
      return signInResponse;
    } catch (error) {
      logger.error('Sign in failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleSocialSignIn = useCallback(async (provider) => {
    setIsLoading(true);
    try {
      await signInWithRedirect({ 
        provider,
        options: {
          redirectSignIn: process.env.NEXT_PUBLIC_APP_URL,
          redirectSignOut: process.env.NEXT_PUBLIC_APP_URL,
        }
      });
      // The page will redirect to the OAuth provider
    } catch (error) {
      logger.error('Social sign in failed:', error);
      toast.error(getCognitoErrorMessage(error));
      setIsLoading(false);
      throw error;
    }
  }, [toast]);

  const handleSignUp = useCallback(async (email, password, attributes = {}) => {
    setIsLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            ...attributes,
          },
        },
      });
      
      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        toast.success('Sign up successful. Please check your email for verification code.');
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      logger.error('Sign up failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/auth/signin');
    } catch (error) {
      logger.error('Sign out failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleConfirmSignUp = useCallback(async (email, code) => {
    setIsLoading(true);
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      if (isSignUpComplete) {
        toast.success('Email verified successfully');
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Email verification failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleResendVerificationCode = useCallback(async (email) => {
    setIsLoading(true);
    try {
      await resendSignUpCode({ username: email });
      toast.success('Verification code resent successfully');
    } catch (error) {
      logger.error('Failed to resend verification code:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleResetPassword = useCallback(async (email) => {
    setIsLoading(true);
    try {
      const { nextStep } = await resetPassword({ username: email });
      toast.success('Password reset instructions sent to your email');
      router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleConfirmPasswordReset = useCallback(async (email, code, newPassword) => {
    setIsLoading(true);
    try {
      const { isSuccess } = await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });
      if (isSuccess) {
        toast.success('Password reset successful');
        router.push('/auth/signin');
      }
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const handleUpdateAttributes = useCallback(async (attributes) => {
    setIsLoading(true);
    try {
      await updateUserAttributes({
        userAttributes: attributes
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      logger.error('Failed to update profile:', error);
      toast.error(getCognitoErrorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    signIn: handleSignIn,
    signInWithGoogle: () => handleSocialSignIn('Google'),
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendVerificationCode: handleResendVerificationCode,
    resetPassword: handleResetPassword,
    confirmPasswordReset: handleConfirmPasswordReset,
    updateAttributes: handleUpdateAttributes,
    isLoading,
  };
}
