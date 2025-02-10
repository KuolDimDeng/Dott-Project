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
  updateUserAttributes as amplifyUpdateAttributes,
  signInWithRedirect,
  getCurrentUser,
} from 'aws-amplify/auth';
import {
  getInitialAttributes,
  getBusinessAttributes,
  getSubscriptionAttributes,
  validateAttributes,
  getCurrentTimestamp,
  validatePreferences,
  recoverMissingAttributes,
} from '@/utils/userAttributes';

export function useAuth() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = useCallback(
    async ({ username, password }) => {
      setIsLoading(true);
      try {
        const signInResponse = await signIn({ username, password });
        logger.debug('Auth hook sign in response:', signInResponse);

        if (signInResponse?.isSignedIn) {
          const { getCurrentUser } = await import('aws-amplify/auth');
          const user = await getCurrentUser();

          try {
            // Check and recover any missing attributes
            const { recoveredAttributes, hasRecovered } =
              recoverMissingAttributes(user.attributes);
            if (hasRecovered) {
              logger.info('Recovered missing attributes during sign in');
              const { attributes: validatedAttributes, errors } =
                validateAttributes(recoveredAttributes);

              if (errors.length > 0) {
                logger.warn(
                  'Validation errors during attribute recovery:',
                  errors
                );
              }

              // Only proceed with update if we have valid attributes
              if (Object.keys(validatedAttributes).length > 0) {
                // Format attributes for Amplify API
                const formattedAttributes = {};
                for (const [key, value] of Object.entries(
                  validatedAttributes
                )) {
                  if (value !== undefined && value !== null) {
                    formattedAttributes[key] = value.toString(); // Ensure value is a string
                  }
                }

                if (Object.keys(formattedAttributes).length > 0) {
                  await amplifyUpdateAttributes(user, formattedAttributes);
                  logger.info(
                    'Successfully updated recovered attributes:',
                    formattedAttributes
                  );
                }
              }
            }

            // Update last login timestamp
            const timestamp = getCurrentTimestamp();
            await amplifyUpdateAttributes(user, {
              'custom:lastlogin': timestamp,
            });
            logger.debug('Last login timestamp updated:', timestamp);

            // Get the latest user attributes after all updates
            const updatedUser = await getCurrentUser();
            const onboardingStatus =
              updatedUser?.attributes?.['custom:onboarding'] || 'business-info';

            if (onboardingStatus === 'complete') {
              toast.success('Signed in successfully');
              router.replace('/dashboard');
            } else {
              router.replace(
                `/onboarding/${onboardingStatus || 'business-info'}`
              );
            }
          } catch (error) {
            logger.error('Failed to update user attributes:', error);
            // Continue with sign in even if attribute updates fail
            router.replace('/onboarding/business-info');
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
    },
    [router, toast]
  );

  const handleSocialSignIn = useCallback(
    async (provider) => {
      setIsLoading(true);
      try {
        await signInWithRedirect({
          provider,
          options: {
            redirectSignIn: process.env.NEXT_PUBLIC_APP_URL,
            redirectSignOut: process.env.NEXT_PUBLIC_APP_URL,
          },
        });
        // The page will redirect to the OAuth provider
      } catch (error) {
        logger.error('Social sign in failed:', error);
        toast.error(getCognitoErrorMessage(error));
        setIsLoading(false);
        throw error;
      }
    },
    [toast]
  );

  const handleSignUp = useCallback(
    async (email, password, attributes = {}) => {
      setIsLoading(true);
      try {
        // Get initial attributes and merge with provided attributes
        const initialAttributes = getInitialAttributes();
        const {
          attributes: validatedAttributes,
          errors,
          warnings,
        } = validateAttributes({
          ...initialAttributes,
          ...attributes,
          email,
        });

        // Log any validation issues
        if (errors.length > 0) {
          logger.error('Validation errors during sign up:', { errors });
          throw new Error('Invalid attribute values provided');
        }

        if (warnings.length > 0) {
          logger.warn('Validation warnings during sign up:', { warnings });
        }

        const { isSignUpComplete, nextStep } = await signUp({
          username: email,
          password,
          options: {
            userAttributes: validatedAttributes,
          },
        });

        if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
          toast.success(
            'Sign up successful. Please check your email for verification code.'
          );
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }
      } catch (error) {
        logger.error('Sign up failed:', error);
        toast.error(getCognitoErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast]
  );

  const updateUserAttributes = useCallback(async (attributes) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No user found');
      }

      // Log incoming attributes for debugging
      logger.debug('Updating user attributes:', attributes);

      // First try to recover any missing attributes
      const { recoveredAttributes, hasRecovered } =
        recoverMissingAttributes(attributes);
      if (hasRecovered) {
        logger.info(
          'Recovered missing attributes during update:',
          recoveredAttributes
        );
      }

      // Then validate the attributes
      const {
        attributes: validatedAttributes,
        errors,
        warnings,
      } = validateAttributes(recoveredAttributes);

      // Log validation results
      logger.debug('Validation results:', {
        validatedAttributes,
        errors,
        warnings,
      });

      if (errors.length > 0) {
        logger.error('Validation errors during attribute update:', { errors });
        throw new Error(
          'Invalid attribute values provided: ' +
            errors.map((e) => e.error).join(', ')
        );
      }

      if (warnings.length > 0) {
        logger.warn('Validation warnings during attribute update:', {
          warnings,
        });
      }

      // Ensure we have attributes to update
      if (
        !validatedAttributes ||
        Object.keys(validatedAttributes).length === 0
      ) {
        logger.warn('No valid attributes to update');
        return {
          success: true,
          hasRecovered,
          warnings: warnings.length > 0 ? warnings : null,
        };
      }

      // Format attributes for Amplify API
      const formattedAttributes = {};
      for (const [key, value] of Object.entries(validatedAttributes)) {
        formattedAttributes[key] = value.toString(); // Ensure value is a string
      }

      // Update all attributes at once
      await amplifyUpdateAttributes(user, formattedAttributes);
      logger.debug(
        'All user attributes updated successfully:',
        formattedAttributes
      );

      return {
        success: true,
        hasRecovered,
        warnings: warnings.length > 0 ? warnings : null,
      };
    } catch (error) {
      logger.error('Failed to update user attributes:', error);
      throw error;
    }
  }, []);

  const updateBusinessInfo = useCallback(
    async (businessId) => {
      try {
        const businessAttributes = getBusinessAttributes(businessId);
        const { attributes: validatedAttributes } =
          validateAttributes(businessAttributes);

        // Format attributes for Amplify API
        const formattedAttributes = {};
        for (const [key, value] of Object.entries(validatedAttributes)) {
          formattedAttributes[key] = value.toString(); // Ensure value is a string
        }

        const user = await getCurrentUser();
        if (!user) {
          throw new Error('No user found');
        }

        await amplifyUpdateAttributes(user, formattedAttributes);
        logger.debug('Business info updated:', formattedAttributes);
      } catch (error) {
        logger.error('Failed to update business info:', error);
        throw error;
      }
    },
    [updateUserAttributes]
  );

  const updateSubscriptionPlan = useCallback(
    async (plan) => {
      try {
        const subscriptionAttributes = getSubscriptionAttributes(plan);
        await updateUserAttributes(subscriptionAttributes);
        logger.debug('Subscription plan updated:', subscriptionAttributes);
      } catch (error) {
        logger.error('Failed to update subscription plan:', error);
        throw error;
      }
    },
    [updateUserAttributes]
  );

  const updateLastLogin = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No user found');
      }

      const timestamp = getCurrentTimestamp();
      const formattedAttributes = {
        'custom:lastlogin': timestamp,
      };

      await amplifyUpdateAttributes(user, formattedAttributes);
      logger.debug('Last login timestamp updated:', timestamp);
    } catch (error) {
      logger.error('Failed to update last login:', error);
      // Don't throw error for last login update
    }
  }, [updateUserAttributes]);

  const updatePreferences = useCallback(
    async (preferences) => {
      try {
        const validatedPreferences = validatePreferences(preferences);
        await updateUserAttributes({
          'custom:preferences': validatedPreferences,
        });
        logger.debug('User preferences updated:', validatedPreferences);
      } catch (error) {
        logger.error('Failed to update preferences:', error);
        throw error;
      }
    },
    [updateUserAttributes]
  );

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

  const handleConfirmSignUp = useCallback(
    async (email, code) => {
      setIsLoading(true);
      try {
        const { isSignUpComplete } = await confirmSignUp({
          username: email,
          confirmationCode: code,
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
    },
    [router, toast]
  );

  const handleResendVerificationCode = useCallback(
    async (email) => {
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
    },
    [toast]
  );

  const handleResetPassword = useCallback(
    async (email) => {
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
    },
    [router, toast]
  );

  const handleConfirmPasswordReset = useCallback(
    async (email, code, newPassword) => {
      setIsLoading(true);
      try {
        const { isSuccess } = await confirmResetPassword({
          username: email,
          confirmationCode: code,
          newPassword,
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
    },
    [router, toast]
  );

  const handleUpdateAttributes = useCallback(
    async (attributes) => {
      setIsLoading(true);
      try {
        await updateUserAttributes({
          userAttributes: attributes,
        });
        toast.success('Profile updated successfully');
      } catch (error) {
        logger.error('Failed to update profile:', error);
        toast.error(getCognitoErrorMessage(error));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return {
    signIn: handleSignIn,
    signInWithGoogle: () => handleSocialSignIn('Google'),
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendVerificationCode: handleResendVerificationCode,
    resetPassword: handleResetPassword,
    confirmPasswordReset: handleConfirmPasswordReset,
    updateAttributes: updateUserAttributes,
    updateBusinessInfo,
    updateSubscriptionPlan,
    updateLastLogin,
    updatePreferences,
    isLoading,
  };
}
